import React, { useState } from 'react';
import { Shield, Cpu, Lock, Zap, Server, Mic, FileText, Languages, Search, Bot, Package, ArrowRight, GlobeIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HardwareChecker from './HardwareChecker';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isHwCheckerOpen, setIsHwCheckerOpen] = useState(false);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent/30">
      {/* Navigation */}
      <nav className="border-b border-border-color bg-bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <span className="font-display font-bold text-xl tracking-tight">iHomeNerd</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <a href="#features" className="hidden sm:block text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">{t('nav_features')}</a>
            <a href="#security" className="hidden sm:block text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">{t('nav_security')}</a>
            
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

            <a
              href="#download"
              className="text-sm font-medium bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {t('nav_open_cc')}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            {t('hero_badge')}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-8 leading-tight">
            {t('hero_title1')} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">{t('hero_title2')}</span>
          </h1>
          
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('hero_desc')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#download"
              className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              {t('hero_btn_launch')}
              <ArrowRight size={20} />
            </a>
            <button 
              onClick={() => setIsHwCheckerOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-bg-surface hover:bg-bg-input border border-border-color rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Cpu size={20} className="text-accent" />
              {t('hero_btn_check_hw')}
            </button>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-8 py-4 bg-bg-surface hover:bg-bg-input border border-border-color rounded-xl font-medium transition-colors flex items-center justify-center"
            >
              {t('hero_btn_explore')}
            </a>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section id="security" className="py-24 bg-bg-surface/30 border-y border-border-color">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-success/10 text-success flex items-center justify-center mb-6">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">{t('sec_private_title')}</h3>
              <p className="text-text-secondary leading-relaxed">
                {t('sec_private_desc')}
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-6">
                <Zap size={32} />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">{t('sec_latency_title')}</h3>
              <p className="text-text-secondary leading-relaxed">
                {t('sec_latency_desc')}
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                <Shield size={32} />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">{t('sec_airgap_title')}</h3>
              <p className="text-text-secondary leading-relaxed">
                {t('sec_airgap_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">{t('feat_title1')} <br/>{t('feat_title2')}</h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              {t('feat_desc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Mic size={24} />}
              title={t('feat_voice_title')}
              description={t('feat_voice_desc')}
              color="text-blue-400"
              bg="bg-blue-400/10"
            />
            <FeatureCard 
              icon={<FileText size={24} />}
              title={t('feat_docs_title')}
              description={t('feat_docs_desc')}
              color="text-emerald-400"
              bg="bg-emerald-400/10"
            />
            <FeatureCard 
              icon={<Languages size={24} />}
              title={t('feat_trans_title')}
              description={t('feat_trans_desc')}
              color="text-amber-400"
              bg="bg-amber-400/10"
            />
            <FeatureCard 
              icon={<Search size={24} />}
              title={t('feat_radar_title')}
              description={t('feat_radar_desc')}
              color="text-rose-400"
              bg="bg-rose-400/10"
            />
            <FeatureCard 
              icon={<Bot size={24} />}
              title={t('feat_agents_title')}
              description={t('feat_agents_desc')}
              color="text-purple-400"
              bg="bg-purple-400/10"
            />
            <FeatureCard 
              icon={<Package size={24} />}
              title={t('feat_build_title')}
              description={t('feat_build_desc')}
              color="text-cyan-400"
              bg="bg-cyan-400/10"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-bg-surface border-t border-border-color relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/5"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">{t('cta_title')}</h2>
          <p className="text-xl text-text-secondary mb-10">
            {t('cta_desc')}
          </p>
          <a
            href="#download"
            className="inline-flex items-center gap-2 px-8 py-4 bg-text-primary text-bg-primary hover:bg-white rounded-xl font-bold transition-all hover:scale-105"
          >
            {t('nav_open_cc')}
            <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border-color bg-bg-primary text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xl">🏠</span>
          <span className="font-display font-bold text-lg">iHomeNerd</span>
        </div>
        <p className="text-text-secondary text-sm">
          {t('footer_rights', { year: new Date().getFullYear() })} <br/>
          {t('footer_built')}
        </p>
      </footer>

      <HardwareChecker 
        isOpen={isHwCheckerOpen} 
        onClose={() => setIsHwCheckerOpen(false)} 
      />
    </div>
  );
}

function FeatureCard({ icon, title, description, color, bg }: { icon: React.ReactNode, title: string, description: string, color: string, bg: string }) {
  return (
    <div className="p-8 rounded-2xl bg-bg-surface border border-border-color hover:border-accent/50 transition-colors group">
      <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
