import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Loader2 } from 'lucide-react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  const checkKey = async () => {
    try {
      setChecking(true);
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (selected) {
          onKeySelected();
        }
      } else {
        // Fallback for dev environments without the specific wrapper, though prompt implies it exists.
        console.warn("window.aistudio not found");
      }
    } catch (e) {
      console.error("Error checking API key", e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (!aistudio) return;
    try {
      await aistudio.openSelectKey();
      // Assume success as per guidelines, but good to re-check
      await checkKey();
      onKeySelected();
    } catch (e) {
      console.error("Selection failed", e);
      // If "Requested entity was not found", we might need to reset, 
      // but openSelectKey handles the UI. Just log here.
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8 text-indigo-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Veo Studio Access</h2>
        <p className="text-zinc-400 mb-8">
          To generate videos with Veo 3.1, you need to connect a paid Google Cloud Project API key.
        </p>

        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
        >
          Select API Key
        </button>

        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1 transition-colors"
        >
          Learn about billing <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default ApiKeySelector;