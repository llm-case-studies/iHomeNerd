import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Info, Video, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useTranslation();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-bg-surface border border-border-color rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <HelpCircle size={24} />
                </div>
                <h2 className="text-xl font-semibold text-text-primary">
                  {t('help.title', 'iHomeNerd Command Center Guide')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-input rounded-lg transition-colors"
                aria-label={t('help.close', 'Close')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Video Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <Video size={20} className="text-accent" />
                  <h3 className="text-lg font-medium">{t('help.videoTitle', 'Introduction Video')}</h3>
                </div>
                
                <div className="relative w-full aspect-video bg-bg-input rounded-xl border border-border-color overflow-hidden group">
                  {!isVideoPlaying ? (
                    <>
                      <img 
                        src="https://picsum.photos/seed/ihomenerd/1280/720?blur=4" 
                        alt="Video Thumbnail" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <button 
                          onClick={() => setIsVideoPlaying(true)}
                          className="w-16 h-16 flex items-center justify-center bg-accent text-white rounded-full shadow-lg transform transition-transform group-hover:scale-110"
                        >
                          <Play size={32} className="ml-1" />
                        </button>
                        <p className="text-sm font-medium text-white drop-shadow-md">
                          {t('help.videoPlaceholder', 'Explainer video will be placed here')}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <p className="text-text-secondary text-sm">
                        [ Video Player Placeholder ]<br/>
                        Replace this with your actual &lt;video&gt; or &lt;iframe&gt;
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Tabs Explanation Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <Info size={20} className="text-accent" />
                  <h3 className="text-lg font-medium">{t('help.tabsTitle', 'Features Overview')}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'chat', title: 'Chat', desc: t('help.tabs.chat', 'Chat: Interact with the system via text, issue commands, and get status updates.') },
                    { id: 'talk', title: 'Talk', desc: t('help.tabs.talk', 'Talk: Voice interface for interacting with the iHomeNerd system hands-free.') },
                    { id: 'docs', title: 'Docs', desc: t('help.tabs.docs', 'Docs: Access system documentation, manuals, and API references.') },
                    { id: 'translate', title: 'Translate', desc: t('help.tabs.translate', 'Translate: Real-time translation tool for multilingual environments.') },
                    { id: 'investigate', title: 'Investigate', desc: t('help.tabs.investigate', 'Investigate: Deep dive into system logs, diagnostics, and anomalies.') },
                    { id: 'agents', title: 'Agents', desc: t('help.tabs.agents', 'Agents: Manage autonomous AI assistants and their tasks.') },
                    { id: 'builder', title: 'Builder', desc: t('help.tabs.builder', 'Builder: Create custom dashboards, widgets, and UI components.') },
                    { id: 'system', title: 'System', desc: t('help.tabs.system', 'System: Core system settings, updates, and maintenance tasks.') },
                  ].map((tab) => (
                    <div key={tab.id} className="p-4 bg-bg-input/50 border border-border-color rounded-xl hover:bg-bg-input transition-colors">
                      <h4 className="font-medium text-text-primary mb-1">{tab.title}</h4>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {tab.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
