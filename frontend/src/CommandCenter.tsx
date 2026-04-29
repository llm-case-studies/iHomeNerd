import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, MessageSquare, Mic, FileText, Languages, Search, Bot, Server, Package, Globe as GlobeIcon, HelpCircle } from 'lucide-react';
import { ChatPanel } from './components/ChatPanel';
import { TranslatePanel } from './components/TranslatePanel';
import { SystemPanel } from './components/SystemPanel';
import { TalkPanel } from './components/TalkPanel';
import { DocsPanel } from './components/DocsPanel';
import { InvestigatePanel } from './components/InvestigatePanel';
import { AgentsPanel } from './components/AgentsPanel';
import { BuilderPanel } from './components/BuilderPanel';
import { HelpModal } from './components/HelpModal';
import { api, NodeCapabilities } from './lib/api';

type TabId = 'chat' | 'talk' | 'docs' | 'translate' | 'investigate' | 'agents' | 'builder' | 'system';

interface Tab {
  id: TabId;
  labelKey: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: 'chat', labelKey: 'tab_chat', icon: MessageSquare },
  { id: 'talk', labelKey: 'tab_talk', icon: Mic },
  { id: 'docs', labelKey: 'tab_docs', icon: FileText },
  { id: 'translate', labelKey: 'tab_translate', icon: Languages },
  { id: 'investigate', labelKey: 'tab_investigate', icon: Search },
  { id: 'agents', labelKey: 'tab_agents', icon: Bot },
  { id: 'builder', labelKey: 'tab_builder', icon: Package },
  { id: 'system', labelKey: 'tab_system', icon: Server },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [capabilities, setCapabilities] = useState<NodeCapabilities | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCapabilities() {
      try {
        const data = await api.getCapabilities();
        if (!cancelled) {
          setCapabilities(data);
        }
      } catch (error) {
        console.error('Failed to load capability map', error);
      }
    }

    loadCapabilities();
    const interval = window.setInterval(loadCapabilities, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatPanel capabilities={capabilities} />;
      case 'translate':
        return <TranslatePanel capabilities={capabilities} />;
      case 'system':
        return <SystemPanel />;
      case 'talk':
        return <TalkPanel capabilities={capabilities} />;
      case 'docs':
        return <DocsPanel />;
      case 'investigate':
        return <InvestigatePanel />;
      case 'agents':
        return <AgentsPanel />;
      case 'builder':
        return <BuilderPanel />;
      default:
        return null;
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏠</span>
          <h1 className="text-lg font-semibold tracking-tight">{t('app_title')}</h1>
          <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-success/10 border border-success/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-xs font-medium text-success">{t('status_online')}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <GlobeIcon size={16} className="absolute left-3 text-text-secondary pointer-events-none" />
            <select 
              value={i18n.language} 
              onChange={handleLanguageChange}
              className="appearance-none bg-bg-input border border-border-color rounded-lg py-1.5 pl-9 pr-8 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
            >
              <option value="en">English</option>
              <option value="zh">中文 (Mandarin)</option>
              <option value="ko">한국어 (Korean)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="ru">Русский (Russian)</option>
              <option value="de">Deutsch (German)</option>
              <option value="fr">Français (French)</option>
              <option value="it">Italiano (Italian)</option>
              <option value="es">Español (Spanish)</option>
              <option value="pt">Português (Brasil)</option>
            </select>
            <div className="absolute right-3 pointer-events-none text-text-secondary text-xs">▼</div>
          </div>
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-input rounded-lg transition-colors"
            aria-label={t('help.title', 'Help')}
          >
            <HelpCircle size={20} />
          </button>
          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-input rounded-lg transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex items-center px-4 border-b border-border-color bg-bg-surface overflow-x-auto no-scrollbar shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-bg-input/50'
              }`}
            >
              <Icon size={16} />
              {t(tab.labelKey)}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-bg-primary">
        {renderActivePanel()}
      </main>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
