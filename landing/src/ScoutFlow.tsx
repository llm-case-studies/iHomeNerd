import React, { useState, useEffect } from 'react';
import { X, Search, Server, Monitor, Smartphone, Wifi, ArrowRight, CheckCircle2, Copy, Terminal, Cpu, ExternalLink, Brain } from 'lucide-react';

interface ScoutFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

type FlowStep = 'scanning' | 'found' | 'not-found' | 'install';
type Platform = 'linux' | 'macos' | 'windows' | 'unknown';

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

function detectDevice(): 'phone' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone/.test(ua)) return 'phone';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

export default function ScoutFlow({ isOpen, onClose }: ScoutFlowProps) {
  const [step, setStep] = useState<FlowStep>('scanning');
  const [platform] = useState<Platform>(detectPlatform);
  const [device] = useState(detectDevice);
  const [brainInfo, setBrainInfo] = useState<any>(null);
  const [manualIp, setManualIp] = useState('');
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  // On open, try to find a Brain on localhost or common ports
  useEffect(() => {
    if (!isOpen) return;
    setStep('scanning');
    setBrainInfo(null);

    const tryDiscover = async () => {
      const targets = [
        'https://localhost:17777',
        'http://localhost:17777',
        'https://127.0.0.1:17777',
      ];

      for (const base of targets) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(`${base}/discover`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            setBrainInfo(data);
            setStep('found');
            return;
          }
        } catch {
          // Expected — most targets won't respond
        }
      }

      // No Brain found locally
      setStep('not-found');
    };

    tryDiscover();
  }, [isOpen]);

  const handleManualConnect = async () => {
    if (!manualIp.trim()) return;
    setScanning(true);
    const ip = manualIp.trim();
    const targets = [
      `https://${ip}:17777`,
      `http://${ip}:17777`,
      `https://${ip}`,
    ];

    for (const base of targets) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${base}/discover`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          setBrainInfo(data);
          setStep('found');
          setScanning(false);
          return;
        }
      } catch {
        // continue
      }
    }

    setScanning(false);
    alert(`Couldn't find a Brain at ${ip}. Make sure iHomeNerd is running on that machine.`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installCommand = 'curl -sSL https://get.ihomenerd.com | bash';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-color rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-xl font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Search size={22} />
            </div>
            Get Started with iHomeNerd
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-input rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">

          {/* Step: Scanning */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center justify-center h-[350px] text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-bg-input border-t-accent animate-spin" />
                <Wifi className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" size={28} />
              </div>
              <div>
                <p className="text-lg font-medium mb-2">Looking for a Brain on your network...</p>
                <p className="text-sm text-text-secondary">
                  Checking if iHomeNerd is already running nearby.
                </p>
              </div>
            </div>
          )}

          {/* Step: Brain Found */}
          {step === 'found' && brainInfo && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 bg-success/10 border border-success/20 rounded-xl">
                <CheckCircle2 className="text-success shrink-0" size={28} />
                <div>
                  <p className="font-bold text-lg text-success">Brain Found!</p>
                  <p className="text-sm text-text-secondary mt-1">
                    iHomeNerd is running on your {brainInfo.hostname ? 'network' : 'machine'}.
                  </p>
                </div>
              </div>

              {/* Brain details */}
              <div className="bg-bg-input rounded-xl p-5 border border-border-color space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Hostname</span>
                  <span className="font-mono font-medium">{brainInfo.hostname || 'localhost'}</span>
                </div>
                {brainInfo.ip && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">LAN Address</span>
                    <span className="font-mono font-medium">{brainInfo.ip}:{brainInfo.port}</span>
                  </div>
                )}
                {brainInfo.gpu && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">GPU</span>
                    <span className="font-mono font-medium">{brainInfo.gpu.name} ({Math.round(brainInfo.gpu.vram_mb / 1024)}GB)</span>
                  </div>
                )}
                {brainInfo.models && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Models</span>
                    <span className="font-mono font-medium">{brainInfo.models.length} loaded</span>
                  </div>
                )}
              </div>

              <a
                href={`https://${brainInfo.ip || 'localhost'}:${brainInfo.port || 17777}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-all hover:scale-[1.02]"
              >
                Open Command Center
                <ExternalLink size={18} />
              </a>

              <p className="text-xs text-text-secondary text-center">
                Your browser may warn about the self-signed certificate — that's normal.
                Click "Advanced" then "Proceed" to continue.
              </p>
            </div>
          )}

          {/* Step: Not Found */}
          {step === 'not-found' && (
            <div className="space-y-6">

              {/* Scout → Brain explainer */}
              <div className="bg-bg-input/50 rounded-xl p-6 border border-border-color">
                <h3 className="font-bold text-lg mb-4">How iHomeNerd works</h3>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-2">
                      {device === 'phone' ? <Smartphone size={28} /> : <Monitor size={28} />}
                    </div>
                    <p className="text-sm font-medium">This device</p>
                    <p className="text-xs text-text-secondary">Scout</p>
                  </div>
                  <ArrowRight className="text-text-secondary shrink-0" size={24} />
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-2">
                      <Server size={28} />
                    </div>
                    <p className="text-sm font-medium">GPU machine</p>
                    <p className="text-xs text-text-secondary">Brain</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary text-center">
                  You're the <strong>Scout</strong> — browsing from {device === 'phone' ? 'your phone' : 'this computer'}.
                  The <strong>Brain</strong> runs on a machine with a GPU.
                  {device !== 'desktop' ? " That's probably your desktop PC or a home server." : ''}
                </p>
              </div>

              {/* Already have a Brain running? */}
              <div className="bg-bg-input/30 rounded-xl p-5 border border-border-color">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Wifi size={16} className="text-accent" />
                  Already have iHomeNerd running somewhere?
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    placeholder="Enter IP address (e.g. 192.168.1.100)"
                    className="flex-1 bg-bg-input border border-border-color rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                  />
                  <button
                    onClick={handleManualConnect}
                    disabled={scanning || !manualIp.trim()}
                    className="px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {scanning ? 'Checking...' : 'Connect'}
                  </button>
                </div>
              </div>

              {/* Install a new Brain */}
              <div>
                <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Cpu size={18} className="text-accent" />
                  Install a Brain
                </h4>

                {platform === 'linux' && (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                      Run this on the machine with the GPU
                      {device !== 'desktop' ? ' (not this device!)' : ''}:
                    </p>
                    <div className="relative bg-[#0D0D0D] rounded-xl p-4 font-mono text-sm text-green-400 border border-[#333]">
                      <div className="flex items-center gap-2 text-text-secondary text-xs mb-2">
                        <Terminal size={12} />
                        Terminal
                      </div>
                      <code>{installCommand}</code>
                      <button
                        onClick={() => copyToClipboard(installCommand)}
                        className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-text-secondary hover:text-white"
                        title="Copy"
                      >
                        {copied ? <CheckCircle2 size={16} className="text-success" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary">
                      The script detects your GPU, installs Docker if needed,
                      downloads the right AI models, and starts iHomeNerd.
                      Takes ~5 minutes.
                    </p>
                  </div>
                )}

                {platform === 'macos' && (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                      {device === 'desktop'
                        ? 'Good news — Apple Silicon Macs run AI models natively!'
                        : 'You\'ll want to install this on your Mac, not your phone:'}
                    </p>
                    <div className="relative bg-[#0D0D0D] rounded-xl p-4 font-mono text-sm text-green-400 border border-[#333]">
                      <div className="flex items-center gap-2 text-text-secondary text-xs mb-2">
                        <Terminal size={12} />
                        Terminal
                      </div>
                      <code>brew install ihomenerd</code>
                      <button
                        onClick={() => copyToClipboard('brew install ihomenerd')}
                        className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-text-secondary hover:text-white"
                        title="Copy"
                      >
                        {copied ? <CheckCircle2 size={16} className="text-success" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Requires Homebrew. M1/M2/M3/M4 Macs use Metal acceleration — no NVIDIA needed!
                      <br /><span className="text-text-secondary/50">(Homebrew formula coming soon)</span>
                    </p>
                  </div>
                )}

                {platform === 'windows' && (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                      Windows installer coming soon! For now, you can use Docker:
                    </p>
                    <ol className="text-sm text-text-secondary space-y-2 list-decimal pl-5">
                      <li>Install <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener" className="text-accent underline">Docker Desktop</a> (with WSL2 backend)</li>
                      <li>Enable GPU in Docker Desktop settings</li>
                      <li>Open PowerShell and run:
                        <div className="relative bg-[#0D0D0D] rounded-lg p-3 font-mono text-xs text-green-400 border border-[#333] mt-2">
                          <code>docker run -d --gpus all -p 17777:17777 ghcr.io/llm-case-studies/ihomenerd</code>
                          <button
                            onClick={() => copyToClipboard('docker run -d --gpus all -p 17777:17777 ghcr.io/llm-case-studies/ihomenerd')}
                            className="absolute top-2 right-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-text-secondary hover:text-white"
                          >
                            {copied ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </li>
                    </ol>
                    <p className="text-xs text-text-secondary/50">
                      Native Windows installer (.exe) is on the roadmap.
                    </p>
                  </div>
                )}

                {platform === 'unknown' && (
                  <p className="text-sm text-text-secondary">
                    iHomeNerd runs on Linux (primary), macOS, and Windows.
                    Visit this page from one of those platforms for install instructions.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
