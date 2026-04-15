import React, { useState, useEffect } from 'react';
import { Cpu, Server, Monitor, Usb, CheckCircle2, X, MessageSquare, Eye, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HardwareCheckerProps {
  isOpen: boolean;
  onClose: () => void;
}

type AcceleratorType = 'none' | 'coral' | 'gpu';

export default function HardwareChecker({ isOpen, onClose }: HardwareCheckerProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'scanning' | 'question' | 'result'>('scanning');
  const [sysInfo, setSysInfo] = useState({ cores: 0, ram: 0, gpu: 'Unknown' });
  const [isTargetDevice, setIsTargetDevice] = useState<boolean | null>(null);
  const [accelerator, setAccelerator] = useState<AcceleratorType>('none');

  useEffect(() => {
    if (isOpen) {
      setStep('scanning');
      setIsTargetDevice(null);
      setAccelerator('none');
      
      // Simulate scanning delay for UX
      const timer = setTimeout(() => {
        // Extract hardware info from browser
        const cores = navigator.hardwareConcurrency || 2;
        const ram = (navigator as any).deviceMemory || 4; // deviceMemory is not standard in all TS definitions
        
        // WebGL trick to get GPU
        let gpu = 'Unknown GPU';
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
          }
        } catch (e) {
          console.warn("Could not retrieve GPU info");
        }

        setSysInfo({ cores, ram, gpu });
        setStep('question');
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-color rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Cpu className="text-accent" />
            {t('hw_modal_title')}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-input rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px] flex flex-col justify-center">
          
          {step === 'scanning' && (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-bg-input border-t-accent animate-spin"></div>
                <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary" size={24} />
              </div>
              <p className="text-lg font-medium animate-pulse">{t('hw_step_scanning')}</p>
            </div>
          )}

          {step === 'question' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-bg-input rounded-xl p-4 border border-border-color">
                <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">{t('hw_sys_info')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-text-secondary"><Cpu size={16}/> {t('hw_cores')}</span>
                    <span className="font-mono font-medium">{sysInfo.cores}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-text-secondary"><Server size={16}/> {t('hw_ram')}</span>
                    <span className="font-mono font-medium">~{sysInfo.ram} GB+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-text-secondary"><Monitor size={16}/> {t('hw_gpu')}</span>
                    <span className="font-mono font-medium text-right max-w-[200px] truncate" title={sysInfo.gpu}>{sysInfo.gpu}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-text-secondary">{t('hw_accel_label')}</label>
                <select 
                  value={accelerator}
                  onChange={(e) => setAccelerator(e.target.value as AcceleratorType)}
                  className="w-full bg-bg-input border border-border-color rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="none">{t('hw_accel_none')}</option>
                  <option value="coral">{t('hw_accel_coral')}</option>
                  <option value="gpu">{t('hw_accel_gpu')}</option>
                </select>
              </div>

              <div className="text-center space-y-4 pt-2">
                <p className="text-lg font-medium">{t('hw_target_q')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setIsTargetDevice(true); setStep('result'); }}
                    className="px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
                  >
                    {t('hw_btn_yes')}
                  </button>
                  <button 
                    onClick={() => { setIsTargetDevice(false); setStep('result'); }}
                    className="px-4 py-3 bg-bg-input hover:bg-border-color border border-border-color text-text-primary rounded-xl font-medium transition-colors"
                  >
                    {t('hw_btn_no')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 p-4 bg-success/10 border border-success/20 rounded-xl text-success">
                <CheckCircle2 className="shrink-0" size={24} />
                <p className="font-medium">{t('hw_result_good')}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{t('hw_cap_title')}</h3>
                
                <div className="grid gap-3">
                  {/* LLM Capability */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-input border border-border-color">
                    <MessageSquare size={18} className="text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('hw_cap_llm')}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {accelerator === 'gpu' ? t('hw_cap_gpu_llm') : 
                         accelerator === 'coral' ? t('hw_cap_coral_llm') : 
                         t('hw_cap_cpu_llm')}
                      </p>
                    </div>
                  </div>

                  {/* Vision Capability */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-input border border-border-color">
                    <Eye size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('hw_cap_vision')}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {accelerator === 'gpu' ? t('hw_cap_gpu_vision') : 
                         accelerator === 'coral' ? t('hw_cap_coral_vision') : 
                         t('hw_cap_cpu_vision')}
                      </p>
                    </div>
                  </div>

                  {/* Voice Capability */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-input border border-border-color">
                    <Mic size={18} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('hw_cap_voice')}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {accelerator === 'gpu' ? t('hw_cap_gpu_voice') : 
                         accelerator === 'coral' ? t('hw_cap_coral_voice') : 
                         t('hw_cap_cpu_voice')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full px-4 py-3 bg-bg-surface hover:bg-bg-input border border-border-color text-text-primary rounded-xl font-medium transition-colors"
              >
                {t('hw_btn_close')}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
