import { useCode } from '../context/CodeContext';

/**
 * ChatHistoryDrawer Component
 * Slide-out drawer showing all saved chat history with auto-generated titles
 */
export default function ChatHistoryDrawer() {
  const {
    chatHistory,
    currentChatId,
    isHistoryDrawerOpen,
    loadChat,
    deleteChat,
    startNewChat,
    toggleHistoryDrawer,
  } = useCode();

  if (!isHistoryDrawerOpen) return null;

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={toggleHistoryDrawer}
      />
      
      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 z-50 w-80 bg-[#0A090F] border-r border-[#C5A059]/10 flex flex-col shadow-2xl shadow-black/50 animate-slide-in-left">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#C5A059]/10 bg-[#1A1625]/50">
          <div className="flex items-center space-x-2">
            <span className="material-icons-round text-[#C5A059]">history</span>
            <h2 className="font-display text-lg font-bold text-slate-200">History</h2>
          </div>
          <button 
            onClick={toggleHistoryDrawer}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="material-icons-round text-slate-400">close</span>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-white/5">
          <button
            onClick={() => {
              startNewChat();
              toggleHistoryDrawer();
            }}
            className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF61] text-[#0A090F] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#C5A059]/20 hover:shadow-[#C5A059]/40 hover:scale-[1.02] transition-all"
          >
            <span className="material-icons-round text-sm mr-2">add</span>
            New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto py-2">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 flex items-center justify-center mb-4">
                <span className="material-icons-round text-3xl text-[#C5A059]/40">chat_bubble_outline</span>
              </div>
              <p className="text-sm text-slate-400 mb-2">No chats yet</p>
              <p className="text-xs text-slate-600">
                Your chat history will appear here after you generate code.
              </p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`group relative mx-2 mb-1 rounded-xl transition-all cursor-pointer ${
                  currentChatId === chat.id
                    ? 'bg-[#C5A059]/15 border border-[#C5A059]/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div
                  onClick={() => loadChat(chat.id)}
                  className="p-3"
                >
                  {/* Title */}
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className={`text-sm font-medium line-clamp-2 pr-6 ${
                      currentChatId === chat.id ? 'text-[#C5A059]' : 'text-slate-300'
                    }`}>
                      {chat.title || 'Untitled Design'}
                    </h3>
                  </div>
                  
                  {/* Meta info */}
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                    <span className="material-icons-round text-xs">schedule</span>
                    <span>{formatDate(chat.createdAt)}</span>
                    {chat.assets?.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="material-icons-round text-xs">image</span>
                        <span>{chat.assets.length}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this chat?')) {
                      deleteChat(chat.id);
                    }
                  }}
                  className="absolute right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                  title="Delete chat"
                >
                  <span className="material-icons-round text-sm text-red-400">delete_outline</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">
            {chatHistory.length} {chatHistory.length === 1 ? 'chat' : 'chats'} saved
          </p>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
