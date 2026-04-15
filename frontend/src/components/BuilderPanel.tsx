import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, Cpu, Layers, Terminal, Download, Play, Loader2, CheckCircle2, HardDrive, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface AppResource {
  id: string;
  name: string;
  description: string;
}

interface ModelResource {
  id: string;
  name: string;
  size: string;
  type: string;
  isNew?: boolean;
}

export function BuilderPanel() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<AppResource[]>([]);
  const [models, setModels] = useState<ModelResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [imageName, setImageName] = useState('iHomeNerd_Custom');
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildComplete, setBuildComplete] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadResources() {
      try {
        const data = await api.getBuilderResources();
        setApps(data.apps);
        setModels(data.models);
      } catch (error) {
        console.error("Failed to load builder resources", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadResources();
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [buildLogs]);

  const toggleApp = (id: string) => {
    const next = new Set(selectedApps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedApps(next);
  };

  const toggleModel = (id: string) => {
    const next = new Set(selectedModels);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedModels(next);
  };

  const handleBuild = async () => {
    if (isBuilding || !imageName.trim()) return;
    
    setIsBuilding(true);
    setBuildComplete(false);
    setBuildLogs([`> Starting build process for ${imageName}.iso...`]);

    const config = {
      name: imageName,
      apps: apps.filter(a => selectedApps.has(a.id)).map(a => a.name),
      models: models.filter(m => selectedModels.has(m.id)).map(m => m.name)
    };

    try {
      await api.buildLiveImage(config, (log) => {
        setBuildLogs(prev => [...prev, log]);
      });
      setBuildComplete(true);
    } catch (error) {
      setBuildLogs(prev => [...prev, `[ERROR] Build failed.`]);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex h-full max-w-7xl mx-auto w-full p-6 gap-6">
      
      {/* Left Column: Configuration */}
      <div className="w-1/2 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        
        <div className="bg-bg-surface border border-border-color rounded-2xl p-6 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{t('build_title')}</h2>
              <p className="text-sm text-text-secondary">{t('build_desc')}</p>
            </div>
          </div>
        </div>

        {/* Apps Selection */}
        <div className="bg-bg-surface border border-border-color rounded-2xl p-6 shrink-0">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-4">
            <Layers size={16} className="text-accent" />
            Select Applications
          </h3>
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-text-secondary" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {apps.map(app => (
                <div 
                  key={app.id}
                  onClick={() => toggleApp(app.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedApps.has(app.id) 
                      ? 'bg-accent/10 border-accent/50 shadow-sm' 
                      : 'bg-bg-input/50 border-border-color hover:border-text-secondary/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-text-primary">{app.name}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedApps.has(app.id) ? 'bg-accent border-accent' : 'border-text-secondary/50'
                    }`}>
                      {selectedApps.has(app.id) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary leading-snug">{app.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Models Selection */}
        <div className="bg-bg-surface border border-border-color rounded-2xl p-6 shrink-0">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-accent" />
            Pre-install Models
          </h3>
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-text-secondary" /></div>
          ) : (
            <div className="space-y-2">
              {models.map(model => (
                <div 
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedModels.has(model.id) 
                      ? 'bg-accent/10 border-accent/50 shadow-sm' 
                      : 'bg-bg-input/50 border-border-color hover:border-text-secondary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedModels.has(model.id) ? 'bg-accent border-accent' : 'border-text-secondary/50'
                    }`}>
                      {selectedModels.has(model.id) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-text-primary flex items-center gap-2">
                        {model.name}
                        {model.isNew && (
                          <span className="flex items-center gap-1 text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            <Sparkles size={10} /> New
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary font-mono mt-0.5">{model.type} • {model.size}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Build Output */}
      <div className="w-1/2 flex flex-col gap-4">
        
        {/* Build Config */}
        <div className="bg-bg-surface border border-border-color rounded-2xl p-5 shrink-0">
          <label className="block text-sm font-medium text-text-secondary mb-2">Image Name</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <HardDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input 
                type="text" 
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                disabled={isBuilding}
                className="w-full bg-bg-input border border-border-color rounded-xl py-3 pl-11 pr-12 text-text-primary font-mono text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary font-mono text-sm pointer-events-none">.iso</span>
            </div>
            
            <button 
              onClick={handleBuild}
              disabled={isBuilding || !imageName.trim()}
              className="h-[46px] px-6 bg-accent hover:bg-accent-hover disabled:bg-bg-input disabled:text-text-secondary text-white font-medium rounded-xl transition-colors flex items-center gap-2 shrink-0"
            >
              {isBuilding ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  <Play size={18} />
                  {t('build_btn')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 bg-[#0D0D0D] border border-border-color rounded-2xl overflow-hidden flex flex-col relative">
          <div className="bg-[#1A1A1A] px-4 py-2 border-b border-[#333] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-text-secondary" />
              <span className="text-xs font-mono text-text-secondary">ihomenerd@local:~/builder</span>
            </div>
            {buildComplete && (
              <span className="text-xs text-success font-medium flex items-center gap-1">
                <CheckCircle2 size={14} /> Build Complete
              </span>
            )}
          </div>
          <div 
            ref={terminalRef}
            className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400/90 leading-relaxed space-y-1"
          >
            {buildLogs.length === 0 ? (
              <div className="text-text-secondary/50 italic">Select apps and models, then click Build Image to begin.</div>
            ) : (
              buildLogs.map((log, i) => (
                <div key={i} className={`${log.includes('[SUCCESS]') ? 'text-success font-semibold' : log.includes('[ERROR]') ? 'text-error' : ''}`}>
                  {log}
                </div>
              ))
            )}
            {isBuilding && (
              <div className="flex items-center gap-2 mt-2 text-text-secondary">
                <span className="w-2 h-4 bg-green-400/80 animate-pulse inline-block"></span>
              </div>
            )}
          </div>
          
          {/* Download Overlay */}
          {buildComplete && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2"
            >
              <button className="px-6 py-3 bg-success hover:bg-success/90 text-white font-medium rounded-full shadow-lg shadow-success/20 flex items-center gap-2 transition-transform hover:scale-105">
                <Download size={18} />
                Download {imageName}.iso
              </button>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
