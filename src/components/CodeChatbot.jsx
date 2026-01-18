import { useState, useRef, useEffect, useCallback } from 'react';
import { useCode } from '../context/CodeContext';
import { QUICK_PROMPTS } from '../services/chatbotService';

/**
 * Draggable and resizable AI Code Chatbot component
 * Matches the DSY Core luxury dark theme with gold accents
 */
function CodeChatbot() {
  const {
    chatbotMessages,
    chatbotLoading,
    sendChatbotMessage,
    clearChatbotHistory,
    applyChatbotCodeChanges,
    pendingCodeChanges,
  } = useCode();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState({ x: window.innerWidth - 520, y: 100 });
  const [size, setSize] = useState({ width: 480, height: 520 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const chatContainerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatbotMessages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle dragging
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.chatbot-drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y))
      });
    }
    if (isResizing) {
      setSize({
        width: Math.max(320, e.clientX - position.x),
        height: Math.max(300, e.clientY - position.y)
      });
    }
  }, [isDragging, isResizing, dragOffset, position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || chatbotLoading) return;
    
    const message = inputValue.trim();
    setInputValue('');
    await sendChatbotMessage(message);
  };

  // Handle keyboard
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Use quick prompt
  const handleQuickPrompt = (prompt) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  // Apply code changes
  const handleApplyChanges = () => {
    if (pendingCodeChanges) {
      applyChatbotCodeChanges();
    }
  };

  // Format message content with code blocks
  const formatMessage = (content) => {
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w*:?\w*\.?\w*)\s*\n?([\s\S]*?)```/);
        if (match) {
          const lang = match[1] || 'code';
          const code = match[2];
          return (
            <div key={index} className="my-2 rounded-lg overflow-hidden bg-black/40 border border-white/10">
              <div className="px-3 py-1 bg-white/5 text-[10px] text-slate-400 uppercase tracking-wider">
                {lang}
              </div>
              <pre className="p-3 text-xs text-slate-300 overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
      }
      // Regular text - preserve line breaks
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <>
      {/* Toggle Button in Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
          isOpen
            ? 'bg-[#C5A059] text-[#0A090F]'
            : 'text-slate-500 hover:text-slate-200'
        }`}
        title="AI Code Analyzer"
      >
        <span className="material-icons-round text-xs mr-1.5">smart_toy</span>
        AI Chat
      </button>

      {/* Chatbot Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          style={{
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            background: 'linear-gradient(180deg, rgba(26, 22, 37, 0.98) 0%, rgba(10, 9, 15, 0.98) 100%)',
            border: '1px solid rgba(197, 160, 89, 0.2)',
            backdropFilter: 'blur(20px)',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Header - Drag Handle */}
          <div className="chatbot-drag-handle flex items-center justify-between px-4 py-3 border-b border-[#C5A059]/10 cursor-move select-none">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                <span className="material-icons-round text-[#C5A059] text-sm">smart_toy</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">AI Code Analyzer</h3>
                <p className="text-[10px] text-slate-500">Ask about your code</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChatbotHistory}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Clear chat"
              >
                <span className="material-icons-round text-slate-400 text-sm">delete_outline</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Close"
              >
                <span className="material-icons-round text-slate-400 text-sm">close</span>
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 border-b border-white/5 flex gap-2 overflow-x-auto">
            {QUICK_PROMPTS.map((item, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(item.prompt)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 hover:bg-[#C5A059]/10 text-slate-400 hover:text-[#C5A059] border border-white/5 hover:border-[#C5A059]/20 transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {chatbotMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 flex items-center justify-center mb-4">
                  <span className="material-icons-round text-[#C5A059] text-2xl">chat_bubble_outline</span>
                </div>
                <h4 className="text-sm font-medium text-slate-300 mb-1">Ask me anything!</h4>
                <p className="text-xs text-slate-500 max-w-[200px]">
                  I can explain your code, answer questions, or help you make changes.
                </p>
              </div>
            ) : (
              chatbotMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-[#C5A059]/20 text-slate-100 border border-[#C5A059]/20'
                        : 'bg-white/5 text-slate-300 border border-white/5'
                    }`}
                  >
                    {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                  </div>
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {chatbotLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-slate-400">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Apply Changes Button - shown when AI suggests code changes */}
          {pendingCodeChanges && (
            <div className="px-4 py-2 border-t border-white/5 bg-green-500/10">
              <button
                onClick={handleApplyChanges}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:shadow-lg hover:shadow-green-500/20 transition-all"
              >
                <span className="material-icons-round text-sm">check_circle</span>
                Apply Code Changes
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-[#C5A059]/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your code..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-[#C5A059]/40 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                disabled={chatbotLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || chatbotLoading}
                className="px-4 py-2.5 rounded-xl bg-[#C5A059] text-[#0A090F] font-bold text-sm hover:bg-[#D4AF61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons-round text-sm">send</span>
              </button>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
            }}
          >
            <svg
              className="w-full h-full text-slate-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}

export default CodeChatbot;
