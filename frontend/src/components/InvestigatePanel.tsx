import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Terminal, Wifi, Play, Loader2, AlertTriangle, Info, CheckCircle2, HardDrive, Cpu, FileImage, Monitor, Smartphone, Server, Radio, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

type ScanType = 'network_audit' | 'device_health' | 'hardware_compat' | 'file_analysis';

interface Network {
  id: string;
  name: string;
  type: string;
  subnet: string;
}

interface Device {
  id: string;
  name: string;
  type: string;
  os: string;
  ip: string;
  networkId: string;
  status: string;
  warning?: string;
}

interface Finding {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  details: string;
}

export function InvestigatePanel() {
  const { t } = useTranslation();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingEnv, setIsLoadingEnv] = useState(true);
  
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [scanType, setScanType] = useState<ScanType>('device_health');
  
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  // Load environment on mount
  useEffect(() => {
    async function loadEnv() {
      try {
        const env = await api.getEnvironment();
        setNetworks(env.networks);
        setDevices(env.devices);
        if (env.devices.length > 0) {
          setSelectedDevice(env.devices[0]);
        }
      } catch (error) {
        console.error("Failed to load environment", error);
      } finally {
        setIsLoadingEnv(false);
      }
    }
    loadEnv();
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartScan = async () => {
    if (!selectedDevice || isScanning) return;
    
    setIsScanning(true);
    setLogs([`> Initiating ${scanType.replace('_', ' ')} on ${selectedDevice.name} (${selectedDevice.ip})...`]);
    setFindings([]);

    try {
      const result = await api.runScan(selectedDevice.name, scanType, (newLog) => {
        setLogs(prev => [...prev, newLog]);
      });
      
      setFindings(result.findings);
    } catch (error) {
      setLogs(prev => [...prev, `[ERROR] Task failed to complete.`]);
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-error bg-error/10 border-error/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-success bg-success/10 border-success/20';
      default: return 'text-text-secondary bg-bg-input border-border-color';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle size={18} className="text-error" />;
      case 'medium': return <Info size={18} className="text-warning" />;
      case 'low': return <CheckCircle2 size={18} className="text-success" />;
      default: return <Info size={18} />;
    }
  };

  const getScanIcon = () => {
    switch (scanType) {
      case 'network_audit': return <Wifi size={16} />;
      case 'device_health': return <HardDrive size={16} />;
      case 'hardware_compat': return <Cpu size={16} />;
      case 'file_analysis': return <FileImage size={16} />;
      default: return <Search size={16} />;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'computer': return <Monitor size={16} />;
      case 'tv': return <Monitor size={16} />;
      case 'phone': return <Smartphone size={16} />;
      case 'server': return <Server size={16} />;
      case 'iot': return <Radio size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  return (
    <div className="flex h-full max-w-7xl mx-auto w-full p-6 gap-6">
      
      {/* Left Sidebar: Radar / Environment */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-border-color flex items-center justify-between bg-bg-surface/50 backdrop-blur-sm z-10">
            <div>
              <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
                <Wifi size={20} className="text-accent" />
                {t('inv_title')}
              </h2>
              <p className="text-xs text-text-secondary mt-1">{t('inv_desc')}</p>
            </div>
            <div className="relative flex h-3 w-3">
              {!isLoadingEnv && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-40"></span>}
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isLoadingEnv ? (
              <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
                <Loader2 className="animate-spin mb-2" size={24} /> 
                <span className="text-sm">Scanning environment...</span>
              </div>
            ) : (
              networks.map(network => (
                <div key={network.id} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary uppercase tracking-wider">
                    <div className={`w-2 h-2 rounded-full ${network.type === 'primary' ? 'bg-success' : 'bg-warning'}`}></div>
                    {network.name}
                    <span className="text-xs font-mono text-text-secondary normal-case ml-auto">{network.subnet}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {devices.filter(d => d.networkId === network.id).map(device => (
                      <div 
                        key={device.id}
                        onClick={() => setSelectedDevice(device)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          selectedDevice?.id === device.id 
                            ? 'bg-accent/10 border-accent/30 shadow-sm' 
                            : 'bg-bg-input/30 border-transparent hover:bg-bg-input'
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg ${selectedDevice?.id === device.id ? 'bg-accent text-white' : 'bg-bg-surface text-text-secondary'}`}>
                          {getDeviceIcon(device.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-text-primary truncate text-sm">{device.name}</div>
                            {device.warning && (
                              <ShieldAlert size={14} className="text-warning shrink-0" title={device.warning} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary font-mono">
                            <span>{device.ip}</span>
                            <span>•</span>
                            <span>{device.os}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Task & Terminal */}
      <div className="w-2/3 flex flex-col gap-4">
        
        {/* Task Config */}
        <div className="bg-bg-surface border border-border-color rounded-2xl p-5 shrink-0">
          {selectedDevice ? (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-2">Target Device</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-bg-input border border-border-color rounded-xl">
                  {getDeviceIcon(selectedDevice.type)}
                  <div>
                    <div className="text-sm font-medium text-text-primary">{selectedDevice.name}</div>
                    <div className="text-xs text-text-secondary font-mono">{selectedDevice.ip}</div>
                  </div>
                  {selectedDevice.warning && (
                    <div className="ml-auto flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded-md">
                      <AlertTriangle size={12} />
                      Misplaced
                    </div>
                  )}
                </div>
              </div>
              
              <div className="w-64">
                <label className="block text-sm font-medium text-text-secondary mb-2">Investigation Task</label>
                <div className="relative">
                  <select 
                    value={scanType}
                    onChange={(e) => setScanType(e.target.value as ScanType)}
                    disabled={isScanning}
                    className="w-full bg-bg-input border border-border-color rounded-xl py-3 px-4 text-text-primary appearance-none focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  >
                    <option value="device_health">Device Health Check</option>
                    <option value="hardware_compat">AI Hardware Compatibility</option>
                    <option value="file_analysis">File & Duplicate Analysis</option>
                    <option value="network_audit">Network Placement Audit</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                    {getScanIcon()}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleStartScan}
                disabled={isScanning}
                className="h-[50px] px-6 bg-accent hover:bg-accent-hover disabled:bg-bg-input disabled:text-text-secondary text-white font-medium rounded-xl transition-colors flex items-center gap-2 shrink-0"
              >
                {isScanning ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Working...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    {t('inv_run')}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="h-[74px] flex items-center justify-center text-text-secondary text-sm">
              Select a device from the radar to begin investigation.
            </div>
          )}
        </div>

        {/* Terminal & Findings Split */}
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* Terminal Output */}
          <div className="flex-1 bg-[#0D0D0D] border border-border-color rounded-2xl overflow-hidden flex flex-col relative">
            <div className="bg-[#1A1A1A] px-4 py-2 border-b border-[#333] flex items-center gap-2 shrink-0">
              <Terminal size={14} className="text-text-secondary" />
              <span className="text-xs font-mono text-text-secondary">ihomenerd@local:~/investigate</span>
            </div>
            <div 
              ref={terminalRef}
              className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400/90 leading-relaxed space-y-1"
            >
              {logs.length === 0 ? (
                <div className="text-text-secondary/50 italic">Ready to initiate investigation sequence...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`${log.includes('[WARN]') ? 'text-warning' : log.includes('[ERROR]') ? 'text-error' : ''}`}>
                    {log}
                  </div>
                ))
              )}
              {isScanning && (
                <div className="flex items-center gap-2 mt-2 text-text-secondary">
                  <span className="w-2 h-4 bg-green-400/80 animate-pulse inline-block"></span>
                </div>
              )}
            </div>
          </div>

          {/* Findings Panel */}
          <div className="w-80 bg-bg-surface border border-border-color rounded-2xl flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-border-color bg-bg-surface/50 shrink-0 flex items-center justify-between">
              <h3 className="font-medium text-text-primary flex items-center gap-2">
                <Search size={18} className="text-accent" />
                Report
              </h3>
              <span className="text-xs font-medium px-2 py-1 bg-bg-input rounded-md text-text-secondary">
                {findings.length} Items
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!isScanning && findings.length === 0 && logs.length > 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center">
                  <CheckCircle2 size={40} className="text-success mb-3 opacity-50" />
                  <p>Task complete.</p>
                  <p className="text-sm">No actionable items found.</p>
                </div>
              ) : findings.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-secondary text-sm italic text-center">
                  {isScanning ? 'Analyzing target...' : 'Run a task to see the intelligence report.'}
                </div>
              ) : (
                findings.map((finding, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={finding.id} 
                    className={`p-4 rounded-xl border ${getSeverityColor(finding.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getSeverityIcon(finding.severity)}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">{finding.title}</h4>
                        <p className="text-xs opacity-80 leading-relaxed">{finding.details}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
