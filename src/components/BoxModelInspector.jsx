import { useState, useRef, useCallback } from 'react';
import { useCode } from '../context/CodeContext';
import { Box, Upload, Code2, Lightbulb, Brain, ChevronRight, Loader2, Sparkles, X, Image as ImageIcon, Clipboard } from 'lucide-react';
import GlobalLoader from './globalloader';

/**
 * BoxModelInspector Component
 * Allows users to upload UI images and paste CSS code
 * to get detailed Box Model explanations and viva tips
 */
function BoxModelInspector() {
  const { 
    analyzeBoxModelContent, 
    aiResponse, 
    aiLoading, 
    aiError, 
    clearAIResponse 
  } = useCode();
  
  const [cssCode, setCssCode] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const fileInputRef = useRef(null);

  const handleAnalyze = async () => {
    if (!cssCode.trim() && !imageDescription.trim()) {
      alert('Please provide CSS code or describe your UI');
      return;
    }

    clearAIResponse();
    setHasAnalyzed(true);
    await analyzeBoxModelContent(cssCode, imageDescription);
  };

  const handleClear = () => {
    setCssCode('');
    setUploadedImage(null);
    setImageDescription('');
    clearAIResponse();
    setHasAnalyzed(false);
  };

  // Handle file upload
  const handleFileUpload = useCallback((file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage({
        name: file.name,
        data: e.target.result,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag and drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Handle paste from clipboard
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // Create a custom name for pasted images
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = file.type.split('/')[1] || 'png';
          const customFile = new File([file], `pasted-image-${timestamp}.${extension}`, { type: file.type });
          handleFileUpload(customFile);
        }
        break;
      }
    }
  }, [handleFileUpload]);

  const removeImage = () => {
    setUploadedImage(null);
  };

  // Simple markdown parser for display
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeContent = [];

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${idx}`} className="bg-black/40 border border-[#C5A059]/10 rounded-xl p-4 overflow-x-auto my-4">
              <code className="text-slate-200 text-sm">{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(<h3 key={idx} className="text-lg font-display font-bold text-[#FFE0A3] mt-6 mb-3">{line.slice(4)}</h3>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={idx} className="text-xl font-display font-bold text-[#FFE0A3] mt-8 mb-4">{line.slice(3)}</h2>);
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={idx} className="text-2xl font-display font-bold gold-gradient-text mt-6 mb-4">{line.slice(2)}</h1>);
      }
      // Viva tips
      else if (line.includes('**Viva') || line.toLowerCase().includes('viva tip')) {
        elements.push(
          <div key={idx} className="viva-tip-box px-4 py-3 mt-4 mb-2">
            <p className="text-sm text-slate-200" dangerouslySetInnerHTML={{ 
              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
            }} />
          </div>
        );
      }
      // List items
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={idx} className="text-slate-300 text-sm ml-4 mb-2 flex items-start gap-2">
            <ChevronRight size={14} className="text-[#C5A059] mt-1 shrink-0" />
            <span dangerouslySetInnerHTML={{ 
              __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
            }} />
          </li>
        );
      }
      else if (/^\d+\.\s/.test(line.trim())) {
        elements.push(
          <li key={idx} className="text-slate-300 text-sm ml-4 mb-2 list-decimal list-inside">
            <span dangerouslySetInnerHTML={{ 
              __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
            }} />
          </li>
        );
      }
      // Regular paragraphs
      else if (line.trim()) {
        elements.push(
          <p key={idx} className="text-slate-300 text-sm leading-relaxed mb-3" dangerouslySetInnerHTML={{ 
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#C5A059]">$1</strong>')
              .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded text-[#FFE0A3] text-xs">$1</code>')
          }} />
        );
      }
    });

    return elements;
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
            <Box className="text-[#C5A059]" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-slate-100">Box Model Inspector</h2>
            <p className="text-xs text-slate-500">Upload UI screenshots or paste CSS for Box Model analysis</p>
          </div>
        </div>
        
        {hasAnalyzed && (
          <button 
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#C5A059] transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Input Section */}
        <div className="w-[45%] flex flex-col gap-4">
          {/* Image Upload Zone */}
          <div className="product-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon size={16} className="text-[#C5A059]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Upload UI Screenshot</h3>
            </div>
            
            {uploadedImage ? (
              <div className="relative group">
                <img 
                  src={uploadedImage.data} 
                  alt="Uploaded UI" 
                  className="w-full h-32 object-contain rounded-xl bg-black/20"
                />
                <button 
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
                <p className="text-xs text-slate-400 mt-2 truncate">{uploadedImage.name}</p>
              </div>
            ) : (
              <div 
                className={`upload-zone h-32 flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onPaste={handlePaste}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Upload size={20} className="text-[#C5A059]/60" />
                  <Clipboard size={20} className="text-[#C5A059]/60" />
                </div>
                <p className="text-xs text-slate-400">Drop, click to upload, or paste (Ctrl+V)</p>
                <p className="text-[10px] text-slate-600 mt-1">PNG, JPG, WEBP (max 5MB)</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />

            {/* Image description */}
            <div className="mt-4">
              <label className="text-xs text-slate-500 mb-2 block">Describe the UI (optional)</label>
              <input
                type="text"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                placeholder="e.g., Card with shadow and padding"
                className="w-full glass-input rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* CSS Code Input */}
          <div className="product-card p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Code2 size={16} className="text-[#C5A059]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Paste CSS Code</h3>
            </div>
            
            <textarea
              value={cssCode}
              onChange={(e) => setCssCode(e.target.value)}
              placeholder={`.card {
  margin: 20px;
  padding: 16px 24px;
  border: 2px solid #333;
  width: 300px;
  box-sizing: border-box;
}`}
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder:text-slate-600 resize-none leading-relaxed glass-input rounded-xl p-4 font-mono"
            />
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <span className="text-xs text-slate-500">
                {cssCode.split('\n').length} lines
              </span>
              
              <button
                onClick={handleAnalyze}
                disabled={aiLoading || (!cssCode.trim() && !imageDescription.trim())}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <Loader2 size={16} className="text-[#C5A059] animate-spin" />
                ) : (
                  <Sparkles size={16} className="text-[#C5A059]" />
                )}
                <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">
                  {aiLoading ? 'Analyzing...' : 'Analyze Box Model'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {aiError ? (
            <div className="feedback-card p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400">!</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-400">Error</h4>
                <p className="text-xs text-slate-400 mt-1">{aiError}</p>
              </div>
            </div>
          ) : aiLoading ? (
            <div className="feedback-card p-12 flex flex-col items-center justify-center">
              <GlobalLoader size={60} message="Analyzing Box Model properties..." />
            </div>
          ) : aiResponse?.content ? (
            <div className="feedback-card p-6 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
                  <Brain className="text-[#C5A059]" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Professor's Feedback</h3>
                  <p className="text-xs text-slate-500">Box Model analysis and explanations</p>
                </div>
              </div>
              
              <div className="ai-response">
                {renderMarkdown(aiResponse.content)}
              </div>

              {/* Viva Tips Summary */}
              <div className="viva-tip-box p-4 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="text-[#C5A059]" />
                  <h4 className="text-sm font-bold text-[#C5A059]">Box Model Viva Tips</h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-[#C5A059] mt-0.5" />
                    <span><strong className="text-[#FFE0A3]">Box Model</strong> = Content + Padding + Border + Margin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-[#C5A059] mt-0.5" />
                    <span><strong className="text-[#FFE0A3]">box-sizing: border-box</strong> includes padding and border in total width</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-[#C5A059] mt-0.5" />
                    <span><strong className="text-[#FFE0A3]">Margin collapse</strong>: Adjacent vertical margins combine (take larger value)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={12} className="text-[#C5A059] mt-0.5" />
                    <span>Padding affects background color area; margin is transparent</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="feedback-card p-12 flex flex-col items-center justify-center text-center flex-1">
              <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 flex items-center justify-center mb-4">
                <Box className="text-[#C5A059]" size={28} />
              </div>
              <h3 className="text-lg font-display font-bold text-slate-200 mb-2">Ready to Analyze</h3>
              <p className="text-sm text-slate-400 max-w-md">
                Upload a UI screenshot or paste CSS code to get detailed Box Model explanations with viva preparation tips.
              </p>
              
              {/* Box Model Visual Hint */}
              <div className="mt-6 p-4 rounded-xl border border-[#C5A059]/10 bg-black/20">
                <div className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest">Box Model Preview</div>
                <div className="relative">
                  <div className="bg-[#8E6E32]/20 p-3 rounded text-[10px] text-center text-slate-400">
                    Margin
                    <div className="bg-[#C5A059]/20 p-3 rounded">
                      Border
                      <div className="bg-[#FFE0A3]/20 p-3 rounded">
                        Padding
                        <div className="bg-[#C5A059]/30 p-2 rounded text-[#FFE0A3]">
                          Content
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BoxModelInspector;
