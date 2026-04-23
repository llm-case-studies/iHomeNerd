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
    return 'Best near-term recommendation for most Windows visitors. Wait for the guided VM artifact if you want the easiest first trial without Docker friction, BIOS changes, or touching your main install.';
  }
  if (platform === 'macos') {
    return 'Best near-term recommendation for most Mac visitors. Wait for the guided VM artifact if you want the cleanest low-risk trial before changing another machine.';
  }
  if (platform === 'linux') {
    return 'Good near-term path if you want a disposable trial without changing your current Linux setup. For now, Docker is the more practical early-adopter route.';
  }
  return 'For most first-time visitors, the guided VM path should become the safest place to start before trying bare metal.';
}

function getDockerSummary(platform: Platform): string {
  if (platform === 'windows') {
    return 'Docker is the practical path today if you are willing to use a trusted AI as your guide. Prefer a spare machine, especially a Linux box you can already SSH into, over your main Windows install. Docker still changes the host, so do not treat it as risk-free isolation.';
  }
  if (platform === 'macos') {
    return 'Docker is the practical path today if containers already make sense to you. Prefer a spare machine, especially a Linux box you can already SSH into, over your main Mac, and use a trusted AI to walk through the tradeoffs before you run commands.';
  }
  if (platform === 'linux') {
    return 'Docker is the practical early-adopter path on Linux if you already self-host or are comfortable getting AI-guided help. A spare mini-PC, wipeable Linux box, or headless GPU machine with SSH is ideal.';
  }
  return 'Docker is the practical early-adopter path today, ideally on a spare machine or headless Linux box you can already SSH into, but it is not the low-friction default for a cold visitor.';
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
  const githubUrl = 'https://github.com/llm-case-studies/iHomeNerd';

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
                <p className="text-lg font-semibold mb-2">Pick the path that matches your patience.</p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Docker is the practical early-adopter path today if you run it on a spare or
                  sandbox machine and use a trusted AI to guide you. A headless Linux box that you
                  can already reach over SSH is one of the best current cases. The guided VM path
                  should be easier soon. Docker still changes the host, so use a machine you can
                  repair or wipe. The current Docker path is repo-based, not a polished one-line
                  Docker image. The live image is the longer-term spare-PC path unless you are
                  comfortable building pieces yourself.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChooserCard
                  icon={<Brain size={22} />}
                  title="Ask Your Trusted AI"
                  description="Share this page or the public GitHub repo with GPT, Claude, Gemini, Grok, or DeepSeek. Tell it what hardware you have and ask whether Docker now, VM soon, or live image later fits your patience and skill level."
                  action={
                    <div className="flex flex-wrap gap-3">
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
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-color bg-bg-input hover:bg-bg-primary transition-colors text-sm font-medium"
                      >
                        <ExternalLink size={16} className="text-accent" />
                        GitHub Repo
                      </a>
                    </div>
                  }
                />

                <ChooserCard
                  icon={<Package size={22} />}
                  title="Docker: Try Now on a Sandbox"
                  description={getDockerSummary(platform)}
                />

                <ChooserCard
                  icon={<Monitor size={22} />}
                  title="VM: Wait for the Easier Trial"
                  description={getVmSummary(platform)}
                />

                <ChooserCard
                  icon={<Server size={22} />}
                  title="Live Image: Spare-PC Path"
                  description="Best eventual path when you have an unused PC or mini-PC. Public live-image download flow is longer-term; DIY builders can experiment earlier."
                />
              </div>

              <div className="rounded-2xl border border-border-color bg-bg-input/40 p-5">
                <h3 className="font-bold text-lg mb-2">Current Docker reality</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Today&apos;s Docker path uses the public repo plus its compose and installer files.
                  If an AI invents a `docker run some-image:latest` command without pointing to the
                  exact repo files or installer script, it is guessing. The public target-machine
                  installer today is <code>bash get-ihomenerd.sh</code>. Expect the Command Center at
                  <code>https://&lt;box&gt;:17777</code> and the setup/bootstrap page at
                  <code>http://&lt;box&gt;:17778/setup</code>.
                </p>
              </div>

              <div className="rounded-2xl border border-border-color bg-bg-input/40 p-5">
                <h3 className="font-bold text-lg mb-2">Common situations</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  Use the hardware you already have to choose the least painful first step.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <ScenarioTile
                    title="Busy laptop you do not want to touch"
                    description="Wait for the guided VM. Do not start with Docker on your daily machine if you are trying to avoid friction."
                  />
                  <ScenarioTile
                    title="Headless Linux box on your LAN, SSH already works"
                    description="Best Docker-today case. Install there, then open the LAN URL from your laptop, phone, or tablet."
                  />
                  <ScenarioTile
                    title="Spare mini-PC or wipeable Linux machine"
                    description="Good Docker-now target with trusted-AI help. Later, the live image should become the cleaner appliance path."
                  />
                  <ScenarioTile
                    title="Kid's gaming rig or unknown-state GPU box"
                    description="Wait for the live image unless you first verify it is safe to wipe, recover, and reach remotely."
                  />
                </div>
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

function ScenarioTile({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border-color bg-bg-primary/70 p-4">
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}
