import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bot, Play, Square, Settings, Activity, Plus, Terminal, Wrench, BrainCircuit, Send, Loader2, CheckCircle2, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'sleeping';
  model: string;
  tools: string[];
}

interface AgentActivity {
  type: 'thought' | 'action' | 'observation' | 'message';
  content: string;
}

export function AgentsPanel() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  const [taskInput, setTaskInput] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [activities, setActivities] = useState<Record<string, AgentActivity[]>>({});
  
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await api.getAgents();
        setAgents(data);
        if (data.length > 0) {
          setSelectedAgent(data[0]);
        }
      } catch (error) {
        console.error("Failed to load agents", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAgents();
  }, []);

  // Auto-scroll activity feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [activities, selectedAgent]);

  const handleToggleAgent = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    setAgents(prev => prev.map(a => {
      if (a.id === agent.id) {
        return { ...a, status: a.status === 'running' ? 'idle' : 'running' };
      }
      return a;
    }));
  };

  const handleAssignTask = async () => {
    if (!selectedAgent || !taskInput.trim() || isWorking) return;
    
    const task = taskInput;
    setTaskInput('');
    setIsWorking(true);
    
    // Add initial task message
    setActivities(prev => ({
      ...prev,
      [selectedAgent.id]: [
        ...(prev[selectedAgent.id] || []),
        { type: 'message', content: `Task assigned: ${task}` }
      ]
    }));

    try {
      await api.assignAgentTask(selectedAgent.id, task, (activity) => {
        setActivities(prev => ({
          ...prev,
          [selectedAgent.id]: [...(prev[selectedAgent.id] || []), activity]
        }));
      });
    } catch (error) {
      console.error("Task failed", error);
    } finally {
      setIsWorking(false);
    }
  };

  const currentActivities = selectedAgent ? (activities[selectedAgent.id] || []) : [];

  return (
    <div className="flex h-full max-w-7xl mx-auto w-full p-6 gap-6">
      
      {/* Left Sidebar: Agent Roster */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-border-color flex items-center justify-between bg-bg-surface/50 backdrop-blur-sm z-10">
            <div>
              <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
                <Bot size={20} className="text-accent" />
                {t('agent_title')}
              </h2>
              <p className="text-xs text-text-secondary mt-1">{t('agent_desc')}</p>
            </div>
            <button className="p-2 hover:bg-bg-input rounded-lg text-text-secondary hover:text-text-primary transition-colors">
              <Plus size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
                <Loader2 className="animate-spin mb-2" size={24} /> 
                <span className="text-sm">Loading agents...</span>
              </div>
            ) : (
              agents.map(agent => (
                <div 
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAgent?.id === agent.id 
                      ? 'bg-accent/10 border-accent/30 shadow-sm' 
                      : 'bg-bg-input/30 border-transparent hover:bg-bg-input'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${agent.status === 'running' ? 'bg-success/20 text-success' : 'bg-bg-surface text-text-secondary'}`}>
                        <Bot size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-text-primary text-sm">{agent.name}</div>
                        <div className="text-xs text-text-secondary">{agent.role}</div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleToggleAgent(agent, e)}
                      className={`p-1.5 rounded-md transition-colors ${
                        agent.status === 'running' 
                          ? 'bg-error/10 text-error hover:bg-error/20' 
                          : 'bg-success/10 text-success hover:bg-success/20'
                      }`}
                      title={agent.status === 'running' ? 'Stop Agent' : 'Start Agent'}
                    >
                      {agent.status === 'running' ? <Square size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-surface text-text-secondary border border-border-color">
                      {agent.model}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-text-secondary ml-auto">
                      <Wrench size={10} />
                      {agent.tools.length} tools
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Agent Workspace */}
      <div className="w-2/3 flex flex-col gap-4">
        {selectedAgent ? (
          <>
            {/* Agent Header */}
            <div className="bg-bg-surface border border-border-color rounded-2xl p-5 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${selectedAgent.status === 'running' ? 'bg-success/20 text-success' : 'bg-bg-input text-text-secondary'}`}>
                  <Bot size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                    {selectedAgent.name}
                    {selectedAgent.status === 'running' && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
                    <span className="flex items-center gap-1"><BrainCircuit size={14} /> {selectedAgent.model}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Wrench size={14} /> {selectedAgent.tools.join(', ')}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-bg-input rounded-lg text-text-secondary transition-colors">
                <Settings size={20} />
              </button>
            </div>

            {/* Activity Feed */}
            <div className="flex-1 bg-[#0D0D0D] border border-border-color rounded-2xl overflow-hidden flex flex-col relative">
              <div className="bg-[#1A1A1A] px-4 py-3 border-b border-[#333] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <Activity size={16} />
                  Agent Activity Stream
                </div>
                {isWorking && <Loader2 size={14} className="text-accent animate-spin" />}
              </div>
              
              <div 
                ref={feedRef}
                className="flex-1 p-6 overflow-y-auto space-y-4"
              >
                {currentActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-secondary/50">
                    <Bot size={48} className="mb-4 opacity-20" />
                    <p>Agent is standing by.</p>
                    <p className="text-sm">Assign a task below to begin.</p>
                  </div>
                ) : (
                  currentActivities.map((act, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i} 
                      className={`flex gap-3 text-sm ${act.type === 'message' ? 'bg-accent/10 p-4 rounded-xl border border-accent/20' : ''}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {act.type === 'thought' && <BrainCircuit size={16} className="text-purple-400" />}
                        {act.type === 'action' && <Wrench size={16} className="text-blue-400" />}
                        {act.type === 'observation' && <Search size={16} className="text-green-400" />}
                        {act.type === 'message' && <CheckCircle2 size={18} className="text-accent" />}
                      </div>
                      <div className="flex-1">
                        {act.type !== 'message' && (
                          <span className="text-xs font-mono uppercase tracking-wider opacity-50 block mb-1">
                            {act.type}
                          </span>
                        )}
                        <div className={`${act.type === 'message' ? 'text-text-primary font-medium' : 'text-text-secondary font-mono'}`}>
                          {act.content}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Task Input */}
            <div className="bg-bg-surface border border-border-color rounded-2xl p-2 shrink-0 flex items-end gap-2">
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAssignTask();
                  }
                }}
                placeholder={t('agent_assign') + ` ${selectedAgent.name}...`}
                disabled={isWorking || selectedAgent.status !== 'running'}
                className="flex-1 bg-transparent border-none resize-none max-h-32 min-h-[44px] py-3 px-4 text-text-primary focus:outline-none disabled:opacity-50"
                rows={1}
              />
              <button
                onClick={handleAssignTask}
                disabled={!taskInput.trim() || isWorking || selectedAgent.status !== 'running'}
                className="p-3 bg-accent hover:bg-accent-hover disabled:bg-bg-input disabled:text-text-secondary text-white rounded-xl transition-colors shrink-0 mb-0.5 mr-0.5"
              >
                <Send size={18} />
              </button>
            </div>
            {selectedAgent.status !== 'running' && (
              <div className="text-center text-xs text-warning mt-[-8px]">
                Agent must be running to accept tasks.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 bg-bg-surface border border-border-color rounded-2xl flex items-center justify-center text-text-secondary">
            Select an agent to view details and assign tasks.
          </div>
        )}
      </div>

    </div>
  );
}
