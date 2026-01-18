import { useState, useEffect, useRef } from 'react';

/**
 * PreviewPage Component
 * Standalone fullscreen preview page for new tab viewing
 * Syncs with main app via BroadcastChannel
 */
export default function PreviewPage() {
  const iframeRef = useRef(null);
  const [code, setCode] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // First, try to get code from sessionStorage
    const storedCode = sessionStorage.getItem('dsy-preview-code');
    if (storedCode) {
      setCode(storedCode);
      if (iframeRef.current) {
        iframeRef.current.srcdoc = storedCode;
      }
    }

    // Setup BroadcastChannel for live updates
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('dsy-preview-sync');
      
      channel.onmessage = (event) => {
        if (event.data.type === 'CODE_UPDATE' && event.data.code) {
          setCode(event.data.code);
          if (iframeRef.current) {
            iframeRef.current.srcdoc = event.data.code;
          }
          setConnected(true);
        }
      };

      // Request latest code from main app
      channel.postMessage({ type: 'REQUEST_CODE' });
      setConnected(true);

      return () => {
        channel.close();
      };
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0A090F] flex flex-col">
      {/* Minimal Header */}
      <header className="h-10 flex items-center justify-between px-4 bg-[#1A1625] border-b border-[#C5A059]/10">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo (1).png" 
            alt="DSY Core" 
            className="w-6 h-6 rounded object-contain"
          />
          <span className="text-sm font-bold text-[#C5A059] uppercase tracking-widest">
            DSY Core Preview
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-slate-500'}`} />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {connected ? 'Live Sync' : 'Offline'}
            </span>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => {
              if (iframeRef.current && code) {
                iframeRef.current.srcdoc = code;
              }
            }}
            className="p-1.5 hover:bg-white/5 rounded transition-colors"
            title="Refresh"
          >
            <span className="material-icons-round text-sm text-slate-400">refresh</span>
          </button>
          
          {/* Close Button */}
          <button
            onClick={() => window.close()}
            className="p-1.5 hover:bg-white/5 rounded transition-colors"
            title="Close"
          >
            <span className="material-icons-round text-sm text-slate-400">close</span>
          </button>
        </div>
      </header>

      {/* Preview Area */}
      <div className="flex-1 relative">
        {!code ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 flex items-center justify-center mb-4">
              <span className="material-icons-round text-3xl text-[#C5A059]/40">code</span>
            </div>
            <p className="text-sm text-slate-400 mb-2">Waiting for preview...</p>
            <p className="text-xs text-slate-600">
              Generate code in the main DSY Core tab
            </p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-same-origin"
            title="Live Preview"
          />
        )}
      </div>
    </div>
  );
}
