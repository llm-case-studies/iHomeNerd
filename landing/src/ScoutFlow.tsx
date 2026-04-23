import React, { useEffect, useState } from 'react';
import {
  X,
  Search,
  Server,
  Monitor,
  CheckCircle2,
  Copy,
  ExternalLink,
  Brain,
  Package,
  Wifi,
  ArrowRight,
} from 'lucide-react';

interface ScoutFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

type FlowStep = 'chooser' | 'found';
type Platform = 'linux' | 'macos' | 'windows' | 'unknown';

interface BrainInfo {
  hostname?: string;
  ip?: string;
  port?: number;
  gpu?: {
    name: string;
    vram_mb: number;
  };
  models?: unknown[];
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

function getVmSummary(platform: Platform): string {
  if (platform === 'windows') {
    return 'Best default recommendation for most Windows visitors. Start with the VM path if you want the easiest first trial without BIOS changes or touching your main install. The guided VM artifact is still being finalized.';
  }
  if (platform === 'macos') {
    return 'Best default recommendation for most Mac visitors. A VM is the cleanest low-risk trial when you want to evaluate iHomeNerd before changing another machine. The guided VM artifact is still being finalized.';
  }
  if (platform === 'linux') {
    return 'Good planning path if you want a disposable trial without changing your current Linux setup. It is still simpler than boot media for many users, but the guided VM artifact is still being finalized.';
  }
  return 'For most first-time visitors, a VM is still the safest place to start before trying bare metal, but the guided VM artifact is still being finalized.';
}

function getDockerSummary(platform: Platform): string {
  if (platform === 'windows') {
    return 'Treat Docker as the advanced Windows path. It usually means Docker Desktop, WSL2, and more moving parts than a VM-first trial.';
  }
  if (platform === 'macos') {
    return 'Use Docker on macOS only if containers already make sense to you. It is more self-hoster-oriented than a first-time evaluation path.';
  }
  if (platform === 'linux') {
    return 'Docker is appropriate when you already self-host and want container control. It should not be the first recommendation for a cold visitor.';
  }
  return 'Docker is the advanced self-hosting lane, not the default path for a first visit.';
}

export default function ScoutFlow({ isOpen, onClose }: ScoutFlowProps) {
  const [step, setStep] = useState<FlowStep>('chooser');
  const [platform] = useState<Platform>(detectPlatform);
  const [brainInfo, setBrainInfo] = useState<BrainInfo | null>(null);
  const [manualIp, setManualIp] = useState('');
  const [scanning, setScanning] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('chooser');
    setBrainInfo(null);
    setManualIp('');
    setScanning(false);
    setCopiedToken(null);
    setConnectionError(null);
  }, [isOpen]);

  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : 'https://staging.ihomenerd.com/';

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 2000);
    } catch {
      setCopiedToken(null);
    }
  };

  const tryDiscoverTargets = async (targets: string[], failureMessage: string) => {
    setScanning(true);
    setConnectionError(null);

    for (const base of targets) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(`${base}/discover`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as BrainInfo;
          setBrainInfo(data);
          setStep('found');
          setScanning(false);
          return;
        }
      } catch {
        // Ignore and continue to the next target.
      } finally {
        window.clearTimeout(timeout);
      }
    }

    setScanning(false);
    setConnectionError(failureMessage);
  };

  const handleLocalhostCheck = async () => {
    await tryDiscoverTargets(
      [
        'https://localhost:17777',
        'http://localhost:17777',
        'https://127.0.0.1:17777',
      ],
      "Couldn't find iHomeNerd on this machine. If it is running somewhere else, connect by IP instead.",
    );
  };

  const handleManualConnect = async () => {
    const ip = manualIp.trim();
    if (!ip) return;

    await tryDiscoverTargets(
      [
        `https://${ip}:17777`,
        `http://${ip}:17777`,
        `https://${ip}`,
      ],
      `Couldn't find iHomeNerd at ${ip}. Make sure that machine is running the service and reachable on your network.`,
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-color rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-xl font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Search size={22} />
            </div>
            Choose How to Try iHomeNerd
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-input rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 min-h-[420px]">
          {step === 'chooser' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-accent/20 bg-accent/10 p-5">
                <p className="text-lg font-semibold mb-2">Start with the path that adds the least friction.</p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  This chooser explains the recommended paths and can connect to an already-running
                  Brain. Public VM and live-image trial artifacts, polished installers, and a fuller
                  guided setup flow are still being finalized.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChooserCard
                  icon={<Brain size={22} />}
                  title="Ask Your Trusted AI"
                  description="Share this page with GPT, Claude, Gemini, Grok, or DeepSeek. Tell it what hardware you have and ask it to compare the paths described here instead of inventing a path that is not on this page."
                  action={
                    <button
                      onClick={() => copyToClipboard(shareUrl, 'page-link')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-color bg-bg-input hover:bg-bg-primary transition-colors text-sm font-medium"
                    >
                      {copiedToken === 'page-link' ? (
                        <CheckCircle2 size={16} className="text-success" />
                      ) : (
                        <Copy size={16} className="text-accent" />
                      )}
                      {copiedToken === 'page-link' ? 'Link Copied' : 'Copy Page Link'}
                    </button>
                  }
                />

                <ChooserCard
                  icon={<Monitor size={22} />}
                  title="VM-First Guidance"
                  description={getVmSummary(platform)}
                />

                <ChooserCard
                  icon={<Server size={22} />}
                  title="Spare-PC Guidance"
                  description="Best when you have an unused PC or mini-PC. This is still the right bare-metal direction, but the public live-image download flow is still being finalized."
                />

                <ChooserCard
                  icon={<Package size={22} />}
                  title="Advanced Docker"
                  description={getDockerSummary(platform)}
                />
              </div>

              <div className="rounded-2xl border border-border-color bg-bg-input/40 p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2">Already have iHomeNerd running?</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    If you already started a Brain on this machine or somewhere else on your LAN,
                    connect directly instead of re-reading the install story.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleLocalhostCheck}
                    disabled={scanning}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-medium transition-colors"
                  >
                    <Wifi size={16} />
                    {scanning ? 'Checking...' : 'Try This Machine'}
                  </button>

                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={manualIp}
                      onChange={(e) => setManualIp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                      placeholder="Enter IP address (for example 192.168.1.100)"
                      className="flex-1 bg-bg-input border border-border-color rounded-lg px-4 py-3 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                    <button
                      onClick={handleManualConnect}
                      disabled={scanning || !manualIp.trim()}
                      className="px-4 py-3 rounded-lg border border-border-color bg-bg-primary hover:bg-bg-input disabled:opacity-60 text-sm font-medium transition-colors"
                    >
                      Connect
                    </button>
                  </div>
                </div>

                {connectionError && (
                  <p className="text-sm text-error">{connectionError}</p>
                )}
              </div>
            </div>
          )}

          {step === 'found' && brainInfo && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 bg-success/10 border border-success/20 rounded-xl">
                <CheckCircle2 className="text-success shrink-0" size={28} />
                <div>
                  <p className="font-bold text-lg text-success">Brain Found</p>
                  <p className="text-sm text-text-secondary mt-1">
                    iHomeNerd is already reachable, so you can skip the install path chooser.
                  </p>
                </div>
              </div>

              <div className="bg-bg-input rounded-xl p-5 border border-border-color space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-text-secondary">Hostname</span>
                  <span className="font-mono font-medium text-right">{brainInfo.hostname || 'localhost'}</span>
                </div>
                {brainInfo.ip && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-text-secondary">LAN Address</span>
                    <span className="font-mono font-medium text-right">
                      {brainInfo.ip}:{brainInfo.port || 17777}
                    </span>
                  </div>
                )}
                {brainInfo.gpu && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-text-secondary">GPU</span>
                    <span className="font-mono font-medium text-right">
                      {brainInfo.gpu.name} ({Math.round(brainInfo.gpu.vram_mb / 1024)}GB)
                    </span>
                  </div>
                )}
                {brainInfo.models && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-text-secondary">Models</span>
                    <span className="font-mono font-medium text-right">{brainInfo.models.length} loaded</span>
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

              <button
                onClick={() => {
                  setStep('chooser');
                  setConnectionError(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-bg-input hover:bg-bg-primary border border-border-color rounded-xl font-medium transition-colors"
              >
                Choose Another Path
                <ArrowRight size={18} className="text-accent" />
              </button>

              <p className="text-xs text-text-secondary text-center">
                Your browser may warn about the self-signed certificate. If it does, open the
                advanced details and continue to the local service.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChooserCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-color bg-bg-input/20 p-5 h-full">
      <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-display font-bold mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  );
}
