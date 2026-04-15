import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRightLeft, Copy, Check, Loader2, Languages } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
];

export function TranslatePanel() {
  const { t } = useTranslation();
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!sourceText.trim() || isTranslating) return;
    
    setIsTranslating(true);
    try {
      const response = await api.translate(sourceText, sourceLang, targetLang);
      setTargetText(response.translatedText);
    } catch (error) {
      console.error("Translation error:", error);
      setTargetText("Error: Could not reach the local AI brain for translation.");
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = () => {
    if (!targetText) return;
    navigator.clipboard.writeText(targetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full max-w-6xl mx-auto w-full p-6"
    >
      <div className="flex items-center justify-between mb-6 bg-bg-surface p-2 rounded-xl border border-border-color">
        <div className="flex items-center gap-3 px-2">
          <Languages className="text-accent" />
          <div>
            <h2 className="text-lg font-semibold">{t('trans_title')}</h2>
            <p className="text-xs text-text-secondary">{t('trans_desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="bg-transparent text-text-primary font-medium px-4 py-2 outline-none cursor-pointer"
        >
          {LANGUAGES.map(l => <option key={`src-${l.code}`} value={l.code} className="bg-bg-surface">{l.name}</option>)}
        </select>
        
        <button className="p-2 text-text-secondary hover:text-accent transition-colors">
          <ArrowRightLeft size={20} />
        </button>

        <select 
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="bg-transparent text-text-primary font-medium px-4 py-2 outline-none cursor-pointer"
        >
          {LANGUAGES.filter(l => l.code !== 'auto').map(l => <option key={`tgt-${l.code}`} value={l.code} className="bg-bg-surface">{l.name}</option>)}
        </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        {/* Source */}
        <div className="flex flex-col bg-bg-surface border border-border-color rounded-2xl overflow-hidden focus-within:border-accent transition-colors">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Enter text to translate..."
            className="flex-1 bg-transparent p-6 text-text-primary placeholder:text-text-secondary resize-none outline-none text-lg leading-relaxed"
          />
          <div className="p-4 border-t border-border-color flex justify-between items-center bg-bg-input/50">
            <span className="text-xs text-text-secondary font-mono">{sourceText.length} chars</span>
            <button 
              onClick={handleTranslate}
              disabled={!sourceText.trim() || isTranslating}
              className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-input disabled:text-text-secondary text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isTranslating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Translating...
                </>
              ) : (
                t('trans_btn')
              )}
            </button>
          </div>
        </div>

        {/* Target */}
        <div className="flex flex-col bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
          <div className="flex-1 p-6 text-text-primary text-lg leading-relaxed whitespace-pre-wrap">
            {targetText || <span className="text-text-secondary/50">Translation will appear here...</span>}
          </div>
          <div className="p-4 border-t border-border-color flex justify-between items-center bg-bg-input/50">
            <span className="text-xs text-text-secondary font-mono">Model: translategemma-4b</span>
            <button 
              onClick={copyToClipboard}
              disabled={!targetText}
              className="p-2 text-text-secondary hover:text-accent disabled:opacity-50 transition-colors"
              title="Copy translation"
            >
              {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
