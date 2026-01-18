import { useState, useEffect, useRef } from 'react';

/**
 * LivePreview Component
 * Renders generated HTML/CSS code in a sandboxed iframe
 */
export default function LivePreview({ code, isLoading }) {
  const iframeRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;

    try {
      setError(null);
      // The code is already a complete HTML document from compileLivePreview
      if (iframeRef.current) {
        iframeRef.current.srcdoc = code;
      }
    } catch (err) {
      setError(err.message);
    }
  }, [code]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A090F]">
        <div className="relative">
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 border-2 border-[#C5A059]/20 rounded-full animate-ping" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-2 border-[#C5A059]/40 rounded-full animate-pulse" />
          </div>
          <div className="w-12 h-12 border-2 border-t-[#C5A059] border-r-[#C5A059]/50 border-b-[#C5A059]/20 border-l-[#C5A059]/10 rounded-full animate-spin" />
        </div>
        <p className="mt-6 text-sm text-slate-400 font-medium">Generating your code...</p>
        <p className="mt-2 text-xs text-slate-600">This may take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A090F] p-8">
        <span className="material-icons-round text-4xl text-red-400/60 mb-4">error_outline</span>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Preview Error</h3>
        <p className="text-sm text-slate-400 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A090F]">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C5A059]/10 mb-4">
            <span className="material-icons-round text-3xl text-[#C5A059]">code</span>
          </div>
          <h3 className="text-xl font-display font-bold text-slate-200">No Preview Available</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Write a prompt and click "Send to AI" to generate code and see a live preview here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container w-full h-full relative bg-white rounded-lg overflow-hidden">
      {/* Preview Header */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-[#1A1625] border-b border-[#C5A059]/10 flex items-center px-3 z-10">
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[10px] font-mono text-slate-500">Live Preview</span>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            className="p-1 hover:bg-white/5 rounded transition-colors"
            onClick={() => iframeRef.current && (iframeRef.current.srcdoc = code)}
            title="Refresh Preview"
          >
            <span className="material-icons-round text-xs text-slate-500">refresh</span>
          </button>
          <button 
            className="p-1 hover:bg-white/5 rounded transition-colors"
            onClick={() => {
              const container = document.querySelector('.preview-container');
              if (container) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  container.requestFullscreen();
                }
              }
            }}
            title="Toggle Fullscreen"
          >
            <span className="material-icons-round text-xs text-slate-500">fullscreen</span>
          </button>
          <button 
            className="p-1 hover:bg-white/5 rounded transition-colors"
            onClick={() => {
              // Store code in session storage and open new tab
              sessionStorage.setItem('dsy-preview-code', code);
              window.open(`${window.location.origin}${window.location.pathname}#/preview`, '_blank');
            }}
            title="Open in New Tab"
          >
            <span className="material-icons-round text-xs text-slate-500">open_in_new</span>
          </button>
        </div>
      </div>

      {/* Iframe - Only allow-same-origin for srcdoc, no scripts needed for HTML/CSS */}
      <iframe
        ref={iframeRef}
        className="w-full h-full pt-8 border-0"
        sandbox="allow-same-origin"
        title="Live Preview"
      />
    </div>
  );
}
