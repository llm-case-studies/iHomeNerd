import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Cpu, HardDrive, Network, Server, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

export function SystemPanel() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [healthData, capsData] = await Promise.all([
          api.getHealth(),
          api.getCapabilities()
        ]);
        setHealth(healthData);
        setCapabilities(capsData);
      } catch (error) {
        console.error("Failed to load system data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !health || !capabilities) {
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
        <StatCard icon={Network} label="Active Sessions" value="2" />
        <StatCard icon={HardDrive} label="Local Storage" value="4.2 GB" />
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
          <AppCard name="PronunCo" status="Connected" lastSeen="2 mins ago" />
          <AppCard name="TelPro-Bro" status="Disconnected" lastSeen="5 hours ago" inactive />
          <AppCard name="iScamHunter" status="Pending Plugin" lastSeen="-" inactive />
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
