import React, { useState } from 'react';
import { X, LogIn, AlertTriangle, Loader2 } from 'lucide-react';
import { useCode } from '../context/CodeContext';

export default function LoginModal({ isOpen, onClose }) {
  const { switchSession } = useCode();
  const [dsyId, setDsyId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dsyId.trim()) return;
    
    // Auto-format: Add DSY- prefix if missing and user just typed numbers/letters
    let formattedId = dsyId.trim();
    if (!formattedId.startsWith('DSY-') && formattedId.length === 6) {
        formattedId = `DSY-${formattedId}`;
    }

    setIsLoading(true);
    setError(null);

    const result = await switchSession(formattedId.toUpperCase());
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setDsyId('');
      }, 1500);
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <LogIn className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Retrieve Session</h2>
          </div>
          <p className="text-gray-400 text-sm">
            Enter your <b>DSY ID</b> to load your project from the cloud.
          </p>
        </div>
        
        {/* Warning */}
        <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 items-start">
             <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
             <p className="text-xs text-yellow-200/80">
                <b>Warning:</b> Switching sessions will discard your current unsaved temporary work unless you have synced it first.
             </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">
              SESSION ID
            </label>
            <input
              type="text"
              value={dsyId}
              onChange={(e) => setDsyId(e.target.value)}
              placeholder="DSY-XXXXXX"
              className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono uppercase tracking-wider"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-center text-sm font-medium">
                Session Loaded Successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrieving Project...
                </>
            ) : (
                'Load Session'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
