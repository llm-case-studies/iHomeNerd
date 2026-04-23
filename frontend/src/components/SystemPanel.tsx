import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRightLeft,
  Clock,
  Cpu,
  HardDrive,
  Network,
  Play,
  Power,
  RefreshCcw,
  Search,
  Server,
  ShieldCheck,
  Square,
  Terminal,
  Wrench,
} from 'lucide-react';
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
  offline?: boolean;
  managedNode?: ManagedNodeSummary;
}

interface ManagedNodeSummary {
  id: string;
  state: string;
  managed: boolean;
  runtimeKind: string;
  controlHost: string;
  sshUser: string;
  sshPort: number;
  installPath: string;
  installSupported: boolean;
  lastSeen?: string | null;
  metadata?: Record<string, any>;
}

interface ManagedNode {
  id: string;
  hostname: string;
  ip: string;
  controlHost: string;
  sshUser: string;
  sshPort: number;
  platform: string;
  arch: string;
  runtimeKind: string;
  installPath: string;
  serviceName: string;
  state: string;
  managed: boolean;
  installSupported: boolean;
  lastSeen?: string | null;
  metadata?: Record<string, any>;
}

interface ClusterState {
  gateway?: {
    hostname: string;
    ip: string;
    url: string;
  };
  nodes?: ClusterNode[];
}

interface ControlPreflight {
  host: string;
  sshUser: string;
  sshPort: number;
  hostname: string;
  ip: string;
  os: string;
  distro: string;
  arch: string;
  ramBytes: number;
  diskBytes: number;
  docker: { installed: boolean; ready: boolean; version: string };
  sudoNoPass: boolean;
  curlReady: boolean;
  gpu?: { name: string; vramMb: number } | null;
  runtimeKind: string;
  ihnRunning: boolean;
  recommendedRoles: string[];
  recommendedStrengths: string[];
  recommendedModels: string[];
  support: { promote: boolean; manage: boolean };
  blockers: string[];
}

interface EnvironmentDevice {
  id: string;
  name: string;
  ip: string;
  os?: string;
  status?: string;
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

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
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
  const [managedNodes, setManagedNodes] = useState<ManagedNode[]>([]);
  const [environment, setEnvironment] = useState<{ devices?: EnvironmentDevice[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ host: '', sshUser: 'alex', sshPort: 22, installPath: '~/.ihomenerd', nodeName: '' });
  const [preflight, setPreflight] = useState<ControlPreflight | null>(null);
  const [controlBusy, setControlBusy] = useState<string | null>(null);
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<Record<string, string>>({});
  const [actionOutput, setActionOutput] = useState<Record<string, string>>({});
  const [updateChecks, setUpdateChecks] = useState<Record<string, any>>({});

  async function refreshClusterAndControl() {
    const [clusterData, controlData] = await Promise.all([
      api.getClusterNodes(),
      api.getControlNodes(),
    ]);
    setCluster(clusterData);
    setManagedNodes(controlData.nodes || []);
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [healthData, capsData, statsData, clusterData, controlData, environmentData] = await Promise.all([
          api.getHealth(),
          api.getCapabilities(),
          api.getSystemStats(),
          api.getClusterNodes(),
          api.getControlNodes(),
          api.getEnvironment(),
        ]);
        setHealth(healthData);
        setCapabilities(capsData);
        setStats(statsData);
        setCluster(clusterData);
        setManagedNodes(controlData.nodes || []);
        setEnvironment(environmentData);
      } catch (error) {
        console.error("Failed to load system data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const interval = setInterval(async () => {
      try {
        const [healthData, statsData] = await Promise.all([
          api.getHealth(),
          api.getSystemStats(),
        ]);
        setHealth(healthData);
        setStats(statsData);
        await refreshClusterAndControl();
      } catch {
        /* ignore refresh errors */
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const candidateDevices = useMemo(
    () =>
      (environment?.devices || [])
        .filter(device => device.ip && device.status !== 'offline' && device.ip !== cluster?.gateway?.ip)
        .slice(0, 8),
    [environment, cluster?.gateway?.ip]
  );

  async function runPreflight() {
    setControlBusy('preflight');
    setControlError(null);
    setControlMessage(null);
    try {
      const result = await api.preflightNode(form.host.trim(), form.sshUser.trim(), Number(form.sshPort));
      setPreflight(result);
      if (!form.nodeName && result.hostname) {
        setForm(prev => ({ ...prev, nodeName: result.hostname }));
      }
    } catch (error) {
      setPreflight(null);
      setControlError(error instanceof Error ? error.message : 'Preflight failed');
    } finally {
      setControlBusy(null);
    }
  }

  async function promoteNode(installNow: boolean) {
    setControlBusy(installNow ? 'install' : 'register');
    setControlError(null);
    setControlMessage(null);
    try {
      const result = await api.promoteNode({
        host: form.host.trim(),
        sshUser: form.sshUser.trim(),
        sshPort: Number(form.sshPort),
        installNow,
        installPath: form.installPath.trim() || '~/.ihomenerd',
        nodeName: form.nodeName.trim() || undefined,
        runtimeKind: preflight?.runtimeKind ?? undefined,
      });
      setPreflight(result.preflight || preflight);
      setControlMessage(
        installNow
          ? `${result.node.hostname} is now managed by the gateway`
          : `${result.node.hostname} was saved as a candidate node`
      );
      await refreshClusterAndControl();
    } catch (error) {
      setControlError(error instanceof Error ? error.message : 'Promote failed');
    } finally {
      setControlBusy(null);
    }
  }

  async function runManagedAction(nodeId: string, action: 'start' | 'stop' | 'restart' | 'status') {
    setActionBusy(prev => ({ ...prev, [nodeId]: action }));
    try {
      const result = await api.runNodeAction(nodeId, action);
      setActionOutput(prev => ({ ...prev, [nodeId]: result.stdout || `${titleCase(action)} completed` }));
      await refreshClusterAndControl();
    } catch (error) {
      setActionOutput(prev => ({
        ...prev,
        [nodeId]: error instanceof Error ? error.message : `${titleCase(action)} failed`,
      }));
    } finally {
      setActionBusy(prev => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
    }
  }

  async function checkUpdates(nodeId: string) {
    setActionBusy(prev => ({ ...prev, [nodeId]: 'updates' }));
    try {
      const result = await api.getNodeUpdates(nodeId);
      setUpdateChecks(prev => ({ ...prev, [nodeId]: result }));
    } catch (error) {
      setActionOutput(prev => ({
        ...prev,
        [nodeId]: error instanceof Error ? error.message : 'Update check failed',
      }));
    } finally {
      setActionBusy(prev => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
    }
  }

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={t('sys_status')} value={health.status === 'ok' ? 'Healthy' : 'Degraded'} valueColor={health.status === 'ok' ? 'text-success' : 'text-warning'} />
        <StatCard icon={Cpu} label="Active Models" value={`${Object.keys(health.models || {}).length} Loaded`} />
        <StatCard icon={Network} label="Active Sessions" value={String(stats?.session_count ?? 0)} />
        <StatCard icon={HardDrive} label="Local Storage" value={formatBytes(stats?.storage_bytes ?? 0)} />
      </div>

      {stats?.uptime_seconds != null && (
        <div className="flex items-center gap-2 text-sm text-text-secondary px-1">
          <Clock size={14} />
          <span>Uptime: {formatUptime(stats.uptime_seconds)}</span>
        </div>
      )}

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
              key={`${node.ip}-${node.hostname}`}
              node={node}
              isGateway={node.ip === cluster.gateway?.ip}
            />
          ))}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border-color">
          <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-accent" />
            {t('sys_control_plane_title', 'Gateway Control Plane')}
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            The gateway stays light and responsive. It routes work, checks updates, promotes SSH-reachable nodes, and starts or stops managed runtimes.
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4">
            <div className="rounded-2xl border border-border-color bg-bg-input/20 p-5 space-y-4">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <Search size={18} className="text-accent" />
                Promote a Node by SSH
              </div>
              <p className="text-sm text-text-secondary">
                Use this for a Linux box you can already reach over SSH. macOS preflight and managed actions are viable, but automatic install is still Linux-only.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-text-secondary">
                  Host or IP
                  <input
                    className="mt-1 w-full rounded-xl border border-border-color bg-bg-surface px-3 py-2 text-text-primary"
                    value={form.host}
                    onChange={(e) => setForm(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="Acer-HL.local or 192.168.0.8"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  SSH user
                  <input
                    className="mt-1 w-full rounded-xl border border-border-color bg-bg-surface px-3 py-2 text-text-primary"
                    value={form.sshUser}
                    onChange={(e) => setForm(prev => ({ ...prev, sshUser: e.target.value }))}
                    placeholder="alex"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  SSH port
                  <input
                    className="mt-1 w-full rounded-xl border border-border-color bg-bg-surface px-3 py-2 text-text-primary"
                    type="number"
                    value={form.sshPort}
                    onChange={(e) => setForm(prev => ({ ...prev, sshPort: Number(e.target.value) || 22 }))}
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Install path
                  <input
                    className="mt-1 w-full rounded-xl border border-border-color bg-bg-surface px-3 py-2 text-text-primary"
                    value={form.installPath}
                    onChange={(e) => setForm(prev => ({ ...prev, installPath: e.target.value }))}
                    placeholder="~/.ihomenerd"
                  />
                </label>
              </div>

              <label className="text-sm text-text-secondary block">
                Node name override
                <input
                  className="mt-1 w-full rounded-xl border border-border-color bg-bg-surface px-3 py-2 text-text-primary"
                  value={form.nodeName}
                  onChange={(e) => setForm(prev => ({ ...prev, nodeName: e.target.value }))}
                  placeholder="Optional friendly name"
                />
              </label>

              {candidateDevices.length > 0 && (
                <div>
                  <div className="text-xs text-text-secondary mb-2">Discovered LAN candidates</div>
                  <div className="flex flex-wrap gap-2">
                    {candidateDevices.map((device) => (
                      <button
                        key={device.id}
                        className="px-3 py-1.5 rounded-full border border-border-color bg-bg-surface text-xs text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                        onClick={() => setForm(prev => ({ ...prev, host: device.ip, nodeName: prev.nodeName || device.name }))}
                      >
                        {device.name} · {device.ip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={runPreflight}
                  disabled={!form.host.trim() || !form.sshUser.trim() || controlBusy !== null}
                  className="px-4 py-2 rounded-xl bg-accent text-black font-medium disabled:opacity-50"
                >
                  {controlBusy === 'preflight' ? 'Checking...' : 'Run Preflight'}
                </button>
                <button
                  onClick={() => promoteNode(false)}
                  disabled={!preflight || controlBusy !== null}
                  className="px-4 py-2 rounded-xl border border-border-color text-text-primary disabled:opacity-50"
                >
                  {controlBusy === 'register' ? 'Saving...' : 'Save Candidate'}
                </button>
                <button
                  onClick={() => promoteNode(true)}
                  disabled={!preflight || !preflight.support.promote || controlBusy !== null}
                  className="px-4 py-2 rounded-xl bg-success/15 border border-success/30 text-success disabled:opacity-50"
                >
                  {controlBusy === 'install' ? 'Installing...' : 'Install on Node'}
                </button>
              </div>

              {controlError && (
                <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                  {controlError}
                </div>
              )}
              {controlMessage && (
                <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                  {controlMessage}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border-color bg-bg-input/20 p-5 space-y-4">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <Terminal size={18} className="text-accent" />
                Preflight Summary
              </div>
              {preflight ? (
                <>
                  <div className="text-sm text-text-secondary">
                    <div className="font-medium text-text-primary">{preflight.hostname} ({preflight.ip})</div>
                    <div className="mt-1">
                      {titleCase(preflight.os)} · {preflight.distro} · {preflight.arch}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Metric label="Docker" value={preflight.docker.ready ? `ready (${preflight.docker.version || 'installed'})` : 'not ready'} />
                    <Metric label="Runtime" value={titleCase(preflight.runtimeKind)} />
                    <Metric label="RAM" value={formatRam(preflight.ramBytes)} />
                    <Metric label="Disk" value={formatBytes(preflight.diskBytes || 0)} />
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-2">Recommended roles</div>
                    <div className="flex flex-wrap gap-2">
                      {preflight.recommendedRoles.map((role) => (
                        <span key={role} className="px-2 py-1 rounded-full text-xs bg-bg-surface border border-border-color text-text-secondary">
                          {prettifyRole(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-2">Recommended models</div>
                    <div className="text-sm text-text-primary">
                      {preflight.recommendedModels.join(', ') || 'No model pack suggested'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-2">Strengths</div>
                    <div className="flex flex-wrap gap-2">
                      {preflight.recommendedStrengths.map((strength) => (
                        <span key={strength} className="px-2 py-1 rounded-lg text-xs bg-accent/5 border border-accent/20 text-text-secondary">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className={preflight.support.promote ? 'text-success' : 'text-warning'}>
                      Install from gateway: {preflight.support.promote ? 'supported now' : 'not yet supported'}
                    </div>
                    <div className={preflight.support.manage ? 'text-success' : 'text-warning'}>
                      Managed lifecycle: {preflight.support.manage ? 'supported' : 'not yet supported'}
                    </div>
                    {preflight.blockers.length > 0 && (
                      <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 text-warning">
                        {preflight.blockers.join(' · ')}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-text-secondary">
                  Preflight tells you whether a node is a good gateway, GPU worker, or light specialist, and whether the gateway can install it automatically.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border-color bg-bg-input/20 p-5">
            <div className="flex items-center gap-2 text-text-primary font-medium mb-4">
              <Wrench size={18} className="text-accent" />
              Managed Nodes
            </div>
            {managedNodes.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {managedNodes.map((node) => (
                  <ManagedNodeCard
                    key={node.id}
                    node={node}
                    busyAction={actionBusy[node.id]}
                    lastOutput={actionOutput[node.id]}
                    updateResult={updateChecks[node.id]}
                    onAction={runManagedAction}
                    onCheckUpdates={checkUpdates}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-text-secondary">
                No managed nodes yet. Start with an SSH-reachable Linux box, or preflight a mac-mini / iMac to see what runtime support is already there.
              </div>
            )}
          </div>
        </div>
      </div>

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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-color bg-bg-surface px-3 py-3">
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="text-sm text-text-primary mt-1">{value}</div>
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
  const managed = node.managedNode;

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
            {node.offline && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning border border-warning/20">
                Offline
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

      <div className="pt-3 border-t border-border-color text-xs text-text-secondary space-y-1">
        <div>Ollama: {node.ollama ? 'ready' : 'offline'}</div>
        <div>Installed models: {modelSummary || 'none yet'}</div>
        {managed && (
          <>
            <div>Managed state: {titleCase(managed.state)}</div>
            <div>Runtime: {titleCase(managed.runtimeKind || 'unknown')}</div>
          </>
        )}
      </div>
    </div>
  );
}

function ManagedNodeCard({
  node,
  busyAction,
  lastOutput,
  updateResult,
  onAction,
  onCheckUpdates,
}: {
  node: ManagedNode;
  busyAction?: string;
  lastOutput?: string;
  updateResult?: any;
  onAction: (nodeId: string, action: 'start' | 'stop' | 'restart' | 'status') => void;
  onCheckUpdates: (nodeId: string) => void;
}) {
  const roles = node.metadata?.recommendedRoles || [];
  const models = node.metadata?.recommendedModels || [];
  const blockers = node.metadata?.blockers || [];

  return (
    <div className="rounded-2xl border border-border-color bg-bg-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-medium text-text-primary">{node.hostname || node.controlHost}</div>
          <div className="text-xs text-text-secondary font-mono mt-1">
            {node.controlHost} · {node.platform || 'unknown'} · {titleCase(node.runtimeKind || 'unknown')}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${
          node.state === 'managed'
            ? 'bg-success/10 text-success border-success/20'
            : node.state === 'degraded'
              ? 'bg-warning/10 text-warning border-warning/20'
              : 'bg-bg-input text-text-secondary border-border-color'
        }`}>
          {titleCase(node.state)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-text-secondary mb-1">Recommended roles</div>
          <div className="flex flex-wrap gap-2">
            {roles.length > 0 ? roles.map((role: string) => (
              <span key={role} className="px-2 py-1 rounded-full text-xs bg-bg-input border border-border-color text-text-secondary">
                {prettifyRole(role)}
              </span>
            )) : <span className="text-text-secondary">No role guidance yet</span>}
          </div>
        </div>
        <div>
          <div className="text-text-secondary mb-1">Suggested model pack</div>
          <div className="text-text-primary">{models.length > 0 ? models.join(', ') : 'No model pack recorded'}</div>
        </div>
      </div>

      <div className="text-xs text-text-secondary space-y-1">
        <div>SSH: {node.sshUser}@{node.controlHost}:{node.sshPort}</div>
        <div>Install path: {node.installPath || '~/.ihomenerd'}</div>
        <div>Automatic install: {node.installSupported ? 'supported' : 'not yet supported'}</div>
      </div>

      {blockers.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 text-xs text-warning">
          {blockers.join(' · ')}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <ActionButton icon={Activity} label="Status" busy={busyAction === 'status'} onClick={() => onAction(node.id, 'status')} />
        <ActionButton icon={Play} label="Start" busy={busyAction === 'start'} onClick={() => onAction(node.id, 'start')} />
        <ActionButton icon={Square} label="Stop" busy={busyAction === 'stop'} onClick={() => onAction(node.id, 'stop')} />
        <ActionButton icon={RefreshCcw} label="Restart" busy={busyAction === 'restart'} onClick={() => onAction(node.id, 'restart')} />
        <ActionButton icon={Wrench} label="Check Updates" busy={busyAction === 'updates'} onClick={() => onCheckUpdates(node.id)} />
      </div>

      {updateResult && (
        <div className="rounded-xl border border-border-color bg-bg-input/40 px-4 py-3 text-sm text-text-secondary space-y-2">
          <div className="text-text-primary font-medium">Update check</div>
          <div>OS: {titleCase(updateResult.os?.platform || 'unknown')} · {updateResult.os?.packageManager || 'no package manager detected'}</div>
          <div>iHN source: {updateResult.ihn?.gitManaged ? `git @ ${updateResult.ihn?.head || 'unknown'}` : 'non-git install'}</div>
          <div>
            Pending OS updates: {updateResult.os?.updates?.length > 0 ? updateResult.os.updates.join(' | ') : 'none detected'}
          </div>
        </div>
      )}

      {lastOutput && (
        <div className="rounded-xl border border-border-color bg-bg-input/40 px-4 py-3 text-xs text-text-secondary whitespace-pre-wrap">
          {lastOutput}
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon: Icon, label, busy, onClick }: { icon: any; label: string; busy?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border-color bg-bg-input text-text-primary disabled:opacity-50"
    >
      <Icon size={14} />
      <span>{busy ? `${label}...` : label}</span>
    </button>
  );
}
