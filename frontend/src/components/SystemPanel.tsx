import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowRightLeft, Clock, Cpu, HardDrive, Network, Power, RefreshCcw, Server, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface ClusterNode {
  hostname: string;
  ip: string;
  os: string;
  gpu?: { name: string; vram_mb?: number } | null;
  ram_bytes?: number;
  suggested_roles?: string[];
  strengths?: string[];
  models?: string[];
  ollama?: boolean;
}

interface ClusterState {
  gateway?: {
    hostname: string;
    ip: string;
    url: string;
  };
  nodes?: ClusterNode[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatRam(bytes?: number): string {
  if (!bytes) return 'RAM unknown';
  return `${Math.round(bytes / (1024 ** 3))} GB RAM`;
}

function prettifyRole(role: string): string {
  return role
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function pickModels(models: string[] = [], preferred: string[]): string[] {
  const found = preferred.filter(candidate => models.includes(candidate));
  return found.length > 0 ? found : models.slice(0, 3);
}

function getNodeFit(node: ClusterNode) {
  const roles = node.suggested_roles || [];
  const models = node.models || [];

  if (roles.includes('gateway')) {
    return {
      title: 'Gateway / Control Plane',
      workloads: 'routing, trust, updates, docs, automations',
      defaults: pickModels(models, ['gemma3:1b', 'llama3.2:1b', 'llama3.2:3b']),
      avoid: 'larger interactive chat and code models as the default landing spot',
    };
  }

  if (roles.includes('llm-worker') || !!node.gpu) {
    return {
      title: 'GPU Worker',
      workloads: 'chat, code, multimodal, image-heavy tasks',
      defaults: pickModels(models, ['gemma4:e4b', 'gemma3:12b', 'llama3:8b', 'codellama:13b']),
      avoid: 'idle always-on gateway duty if another node can stay up instead',
    };
  }

  return {
    title: 'Light Specialist',
    workloads: 'speech, OCR, translation, background tools',
    defaults: pickModels(models, ['gemma3:1b', 'llama3.2:1b']),
    avoid: 'large local reasoning workloads and heavy vision inference',
  };
}

export function SystemPanel() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [cluster, setCluster] = useState<ClusterState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [healthData, capsData, statsData, clusterData] = await Promise.all([
          api.getHealth(),
          api.getCapabilities(),
          api.getSystemStats(),
          api.getClusterNodes(),
        ]);
        setHealth(healthData);
        setCapabilities(capsData);
        setStats(statsData);
        setCluster(clusterData);
      } catch (error) {
        console.error("Failed to load system data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Refresh stats every 30 seconds
    const interval = setInterval(async () => {
      try {
        const [healthData, statsData, clusterData] = await Promise.all([
          api.getHealth(),
          api.getSystemStats(),
          api.getClusterNodes(),
        ]);
        setHealth(healthData);
        setStats(statsData);
        setCluster(clusterData);
      } catch { /* ignore refresh errors */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !health || !capabilities || !cluster) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <Server size={32} className="text-accent mb-4" />
          <div className="text-text-secondary">Loading system status...</div>
        </div>
      </div>
    );
  }

  const capsList = capabilities._detail?.capabilities || {};

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto w-full p-6 space-y-8 overflow-y-auto h-full"
    >
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={t('sys_status')} value={health.status === 'ok' ? 'Healthy' : 'Degraded'} valueColor={health.status === 'ok' ? 'text-success' : 'text-warning'} />
        <StatCard icon={Cpu} label="Active Models" value={`${Object.keys(health.models || {}).length} Loaded`} />
        <StatCard icon={Network} label="Active Sessions" value={String(stats?.session_count ?? 0)} />
        <StatCard icon={HardDrive} label="Local Storage" value={formatBytes(stats?.storage_bytes ?? 0)} />
      </div>

      {/* Uptime */}
      {stats?.uptime_seconds != null && (
        <div className="flex items-center gap-2 text-sm text-text-secondary px-1">
          <Clock size={14} />
          <span>Uptime: {formatUptime(stats.uptime_seconds)}</span>
        </div>
      )}

      {/* Cluster Inventory */}
      <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border-color flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
              <Server size={20} className="text-accent" />
              {t('sys_nodes_title', 'Home Nodes')}
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              {cluster.gateway?.hostname
                ? `Gateway: ${cluster.gateway.hostname} (${cluster.gateway.ip})`
                : 'The gateway is the control plane for node routing, trust, and managed actions.'}
            </p>
          </div>
          <span className="px-3 py-1 bg-bg-input text-text-secondary text-xs rounded-full border border-border-color">
            {cluster.nodes?.length ?? 0} node{(cluster.nodes?.length ?? 0) === 1 ? '' : 's'}
          </span>
        </div>
        <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {(cluster.nodes || []).map((node) => (
            <NodeCard
              key={node.ip}
              node={node}
              isGateway={node.ip === cluster.gateway?.ip}
            />
          ))}
        </div>
      </div>

      {/* Control Plane Direction */}
      <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border-color">
          <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-accent" />
            {t('sys_control_plane_title', 'Control Plane Direction')}
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            The gateway should grow into a home control plane: not just routing requests, but managing updates, installs, and node lifecycle safely.
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <RoadmapCard
            icon={RefreshCcw}
            title="Updates"
            body="Check OS updates and iHomeNerd updates separately, show changelog and reboot risk, and make apply explicit."
          />
          <RoadmapCard
            icon={ArrowRightLeft}
            title="Promote by SSH"
            body="Turn a discovered Linux box into a managed node from the UI: preflight, copy Home CA, install runtime, and register it back."
          />
          <RoadmapCard
            icon={Power}
            title="Managed Start / Stop"
            body="Let the gateway start and stop node services over SSH or systemd. Full power-on should depend on Wake-on-LAN or other out-of-band support."
          />
        </div>
      </div>

      {/* Capabilities Table */}
      <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border-color flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Server size={20} className="text-accent" />
            {t('sys_registry')}
          </h3>
          <span className="px-3 py-1 bg-success/10 text-success text-xs font-mono rounded-full border border-success/20">
            API: v1
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-input/50 text-text-secondary text-sm">
                <th className="px-6 py-3 font-medium">Capability</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Model Backend</th>
                <th className="px-6 py-3 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border-color">
              {Object.entries(capsList).map(([name, detail]: [string, any]) => (
                <CapabilityRow 
                  key={name}
                  name={name} 
                  status={detail.available ? "Available" : "Coming Soon"} 
                  model={detail.model || "-"} 
                  tier={detail.tier} 
                  pending={!detail.available} 
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Apps */}
      <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border-color">
          <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <ShieldCheck size={20} className="text-accent" />
            Connected Apps & Plugins
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stats?.connected_apps?.length > 0 ? (
            stats.connected_apps.map((app: any) => {
              const hasActivity = app.active_sessions > 0;
              const status = hasActivity
                ? `Active (${app.active_sessions} session${app.active_sessions > 1 ? 's' : ''})`
                : app.registered ? 'Registered' : 'Unknown';
              const lastSeen = app.last_seen
                ? new Date(app.last_seen * 1000).toLocaleTimeString()
                : '-';
              return (
                <AppCard
                  key={app.name}
                  name={app.name}
                  status={status}
                  lastSeen={lastSeen}
                  inactive={!hasActivity}
                />
              );
            })
          ) : (
            <div className="col-span-full text-center text-text-secondary py-4">
              No plugins registered yet
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, valueColor = "text-text-primary" }: any) {
  return (
    <div className="bg-bg-surface border border-border-color rounded-2xl p-5 flex items-start gap-4">
      <div className="p-3 bg-bg-input rounded-xl text-accent">
        <Icon size={24} />
      </div>
      <div>
        <div className="text-sm text-text-secondary mb-1">{label}</div>
        <div className={`text-xl font-semibold ${valueColor}`}>{value}</div>
      </div>
    </div>
  );
}

function CapabilityRow({ name, status, model, tier, pending = false }: any) {
  return (
    <tr className="hover:bg-bg-input/30 transition-colors">
      <td className="px-6 py-4 font-mono text-text-primary">{name}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          pending 
            ? 'bg-warning/10 text-warning border-warning/20' 
            : 'bg-success/10 text-success border-success/20'
        }`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-text-secondary font-mono text-xs">{model}</td>
      <td className="px-6 py-4">
        <span className="px-2 py-1 bg-bg-input rounded text-xs text-text-secondary capitalize">{tier}</span>
      </td>
    </tr>
  );
}

function AppCard({ name, status, lastSeen, inactive = false }: any) {
  return (
    <div className={`p-4 rounded-xl border ${inactive ? 'border-border-color bg-bg-input/30 opacity-70' : 'border-accent/30 bg-accent/5'}`}>
      <div className="font-medium text-text-primary mb-1">{name}</div>
      <div className="flex items-center justify-between text-xs">
        <span className={inactive ? 'text-text-secondary' : 'text-success'}>{status}</span>
        <span className="text-text-secondary font-mono">{lastSeen}</span>
      </div>
    </div>
  );
}

function NodeCard({ node, isGateway }: { node: ClusterNode; isGateway: boolean }) {
  const fit = getNodeFit(node);
  const gpuLabel = node.gpu
    ? `${node.gpu.name}${node.gpu.vram_mb ? ` (${Math.round(node.gpu.vram_mb / 1024)} GB VRAM)` : ''}`
    : 'CPU / integrated only';
  const modelSummary = (node.models || []).slice(0, 4).join(', ');

  return (
    <div className="rounded-2xl border border-border-color bg-bg-input/20 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-base font-medium text-text-primary">{node.hostname}</div>
            {isGateway && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success border border-success/20">
                Gateway
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary font-mono mt-1">{node.ip}</div>
        </div>
        <div className="text-right text-xs text-text-secondary">
          <div>{formatRam(node.ram_bytes)}</div>
          <div className="mt-1">{gpuLabel}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(node.suggested_roles || []).map((role) => (
          <span
            key={role}
            className="px-2 py-1 rounded-full text-xs bg-bg-surface border border-border-color text-text-secondary"
          >
            {prettifyRole(role)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-text-secondary mb-1">Best fit</div>
          <div className="font-medium text-text-primary">{fit.title}</div>
          <div className="text-text-secondary mt-1">{fit.workloads}</div>
        </div>
        <div>
          <div className="text-text-secondary mb-1">Recommended default models</div>
          <div className="font-medium text-text-primary">
            {fit.defaults.length > 0 ? fit.defaults.join(', ') : 'No model pack selected yet'}
          </div>
          <div className="text-text-secondary mt-1">Avoid by default: {fit.avoid}</div>
        </div>
      </div>

      {node.strengths && node.strengths.length > 0 && (
        <div>
          <div className="text-xs text-text-secondary mb-2">Strengths</div>
          <div className="flex flex-wrap gap-2">
            {node.strengths.map((strength) => (
              <span key={strength} className="px-2 py-1 rounded-lg text-xs bg-accent/5 border border-accent/20 text-text-secondary">
                {strength}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-border-color text-xs text-text-secondary">
        <div>Ollama: {node.ollama ? 'ready' : 'offline'}</div>
        <div className="mt-1">Installed models: {modelSummary || 'none yet'}</div>
      </div>
    </div>
  );
}

function RoadmapCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border-color bg-bg-input/20 p-5">
      <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <div className="font-medium text-text-primary mb-2">{title}</div>
      <div className="text-sm text-text-secondary leading-relaxed">{body}</div>
    </div>
  );
}
