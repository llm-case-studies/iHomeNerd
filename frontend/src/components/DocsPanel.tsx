import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, Database, Search, Plus, FileText, Send, Bot, User, Loader2, ChevronRight, ChevronDown, X, HardDrive } from 'lucide-react';
import { api, getCapabilityDetail, isCapabilityAvailable, type NodeCapabilities } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface Collection {
  id: string;
  name: string;
  path: string;
  documentCount: number;
  chunkCount: number;
  lastIngested: string;
  watching: boolean;
}

interface Source {
  collection: string;
  document: string;
  page: number;
  excerpt: string;
  relevance: number;
}

interface Interaction {
  id: string;
  question: string;
  answer?: string;
  sources?: Source[];
  isLoading?: boolean;
}

type GroundedDrillKind = 'vocabulary' | 'menu_order' | 'package_label' | 'quickstart_manual';

function groundedDrillKindLabel(kind: GroundedDrillKind): string {
  switch (kind) {
    case 'menu_order':
      return 'Order Speech';
    case 'package_label':
      return 'Package Label';
    case 'quickstart_manual':
      return 'Quickstart Manual';
    default:
      return 'Vocabulary';
  }
}

function buildGroundedDrillPrompt(options: {
  ocrText: string;
  drillKind: GroundedDrillKind;
  detectedLanguage?: string | null;
  selectedLanguage?: string | null;
}) {
  const likelyLanguage = options.detectedLanguage || options.selectedLanguage || 'unknown';
  return [
    'You are helping create a tiny grounded language-learning drill from OCR text captured from a real object.',
    'The OCR may be noisy. Keep only phrases that look coherent and useful. Ignore obvious garbage, random symbols, and duplicated junk.',
    `Drill kind: ${groundedDrillKindLabel(options.drillKind)}.`,
    `Likely source language: ${likelyLanguage}.`,
    'Return compact markdown with these sections only:',
    '## Source Language',
    '## Useful Phrases',
    '- 3 to 6 bullet points',
    '- each bullet must keep the original source phrase and add a short English gloss',
    '## Speak It',
    '- 2 short practice lines the learner can say aloud',
    '## Quick Challenge',
    '- 1 short prompt that asks the learner to produce a phrase',
    'Do not invent product details that are not supported by the OCR text.',
    'If the OCR is weak, say so briefly and salvage only the most trustworthy words or short phrases.',
    '',
    'OCR text:',
    options.ocrText.slice(0, 1800),
  ].join('\n');
}

export function DocsPanel() {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<NodeCapabilities | null>(null);
  
  // Ingest Modal State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestName, setIngestName] = useState('');
  const [ingestPath, setIngestPath] = useState('');
  const [ingestWatch, setIngestWatch] = useState(true);
  const [ingestOcr, setIngestOcr] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [ocrBackend, setOcrBackend] = useState('');
  const [ocrDetectedLanguage, setOcrDetectedLanguage] = useState('');
  const [ocrWarning, setOcrWarning] = useState('');
  const [ocrLegibilityScore, setOcrLegibilityScore] = useState<number | null>(null);
  const [ocrMode, setOcrMode] = useState<'fast' | 'thorough'>('fast');
  const [ocrLanguage, setOcrLanguage] = useState('auto');
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const [drillKind, setDrillKind] = useState<GroundedDrillKind>('vocabulary');
  const [groundedDrill, setGroundedDrill] = useState('');
  const [groundedDrillError, setGroundedDrillError] = useState('');
  const [isGeneratingDrill, setIsGeneratingDrill] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const ocrDetail = getCapabilityDetail(capabilities, 'analyze_image');
  const ocrAvailable = isCapabilityAvailable(capabilities, 'analyze_image');
  const chatAvailable = isCapabilityAvailable(capabilities, 'chat');
  const ocrTransport = ocrDetail?.upload_transport === 'json-base64' ? 'json-base64' : 'multipart';
  const ocrModeChoices = Array.isArray(ocrDetail?.ocr_modes) && ocrDetail?.ocr_modes.length > 0
    ? ocrDetail.ocr_modes
    : ['fast', 'thorough'];
  const ocrLanguageChoices = Array.isArray(ocrDetail?.supported_language_hints) && ocrDetail?.supported_language_hints.length > 0
    ? ocrDetail.supported_language_hints
    : ['auto', 'en', 'es', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko'];

  useEffect(() => {
    async function loadCollections() {
      try {
        const [collectionsResult, capabilitiesResult] = await Promise.allSettled([
          api.getDocsCollections(),
          api.getCapabilities(),
        ]);

        if (collectionsResult.status === 'fulfilled') {
          const data = collectionsResult.value;
          setCollections(data.collections);
          setSelectedCollections(new Set(data.collections.map((c: Collection) => c.id)));
        } else {
          console.error("Failed to load collections", collectionsResult.reason);
        }

        if (capabilitiesResult.status === 'fulfilled') {
          setCapabilities(capabilitiesResult.value);
        } else {
          console.error("Failed to load capabilities", capabilitiesResult.reason);
        }
      } catch (error) {
        console.error("Failed to load collections", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollections();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interactions]);

  const toggleCollection = (id: string) => {
    const newSet = new Set(selectedCollections);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCollections(newSet);
  };

  const handleAsk = async () => {
    if (!input.trim() || selectedCollections.size === 0) return;
    
    const newInteraction: Interaction = {
      id: Date.now().toString(),
      question: input,
      isLoading: true
    };
    
    setInteractions(prev => [...prev, newInteraction]);
    setInput('');

    try {
      const response = await api.askDocs(newInteraction.question, Array.from(selectedCollections));
      setInteractions(prev => prev.map(interaction => 
        interaction.id === newInteraction.id 
          ? { ...interaction, answer: response.answer, sources: response.sources, isLoading: false }
          : interaction
      ));
    } catch (error) {
      setInteractions(prev => prev.map(interaction => 
        interaction.id === newInteraction.id 
          ? { ...interaction, answer: "Error: Could not query local documents.", isLoading: false }
          : interaction
      ));
    }
  };

  const handleIngest = async () => {
    if (!ingestName.trim() || !ingestPath.trim() || isIngesting) return;
    
    setIsIngesting(true);
    const collectionId = ingestName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    try {
      const result = await api.ingestDocs(ingestPath, collectionId, ingestWatch, ingestOcr);
      
      // Add the new mock collection to the UI
      const newCollection: Collection = {
        id: result.collectionId,
        name: ingestName,
        path: ingestPath,
        documentCount: result.filesIngested,
        chunkCount: result.chunksCreated,
        lastIngested: new Date().toISOString(),
        watching: ingestWatch
      };
      
      setCollections(prev => [newCollection, ...prev]);
      setSelectedCollections(prev => new Set(prev).add(newCollection.id));
      
      // Reset and close modal
      setIngestName('');
      setIngestPath('');
      setIngestWatch(true);
      setIngestOcr(false);
      setShowIngestModal(false);
    } catch (error) {
      console.error("Ingestion failed", error);
      alert("Failed to ingest folder. Check console for details.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleOcrFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setOcrFile(nextFile);
    setOcrText('');
    setOcrError('');
    setOcrBackend('');
    setOcrDetectedLanguage('');
    setOcrWarning('');
    setOcrLegibilityScore(null);
    setGroundedDrill('');
    setGroundedDrillError('');
  };

  const handleRunOcr = async () => {
    if (!ocrFile || isRunningOcr) return;
    setIsRunningOcr(true);
    setOcrText('');
    setOcrError('');
    setOcrBackend('');
    setOcrDetectedLanguage('');
    setOcrWarning('');
    setOcrLegibilityScore(null);
    setGroundedDrill('');
    setGroundedDrillError('');
    try {
      const result = await api.ocrImage(ocrFile, {
        transport: ocrTransport,
        mimeType: ocrFile.type || 'image/jpeg',
        language: ocrLanguage === 'auto' ? null : ocrLanguage,
        mode: ocrMode,
      });
      setOcrText(result.text);
      setOcrBackend(result.backend || result.model || '');
      setOcrDetectedLanguage(result.detected_language || '');
      setOcrWarning(result.warning || '');
      setOcrLegibilityScore(typeof result.legibility_score === 'number' ? result.legibility_score : null);
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : 'OCR failed on this node.');
    } finally {
      setIsRunningOcr(false);
    }
  };

  const handleGenerateGroundedDrill = async () => {
    if (!ocrText.trim() || isGeneratingDrill) return;
    setIsGeneratingDrill(true);
    setGroundedDrill('');
    setGroundedDrillError('');
    try {
      const prompt = buildGroundedDrillPrompt({
        ocrText,
        drillKind,
        detectedLanguage: ocrDetectedLanguage || null,
        selectedLanguage: ocrLanguage === 'auto' ? null : ocrLanguage,
      });
      const response = await api.chat([{ role: 'user', content: prompt }], null, 'en');
      setGroundedDrill(response.content || '');
    } catch (error) {
      setGroundedDrillError(error instanceof Error ? error.message : 'Could not generate a grounded drill on this node.');
    } finally {
      setIsGeneratingDrill(false);
    }
  };

  return (
    <div className="flex h-full max-w-7xl mx-auto w-full p-6 gap-6 relative">
      
      {/* Left Sidebar: Collections */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-bg-surface border border-border-color rounded-2xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileText size={16} className="text-accent" />
              Image OCR
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Extract text directly from an uploaded image on this node.
            </p>
          </div>

          <input
            ref={ocrFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleOcrFilePicked}
            className="hidden"
          />

          <div className="flex gap-2">
            <select
              value={ocrLanguage}
              onChange={event => setOcrLanguage(event.target.value)}
              className="px-3 py-2 bg-bg-input border border-border-color text-text-primary text-sm rounded-lg"
            >
              {ocrLanguageChoices.map((choice: string) => (
                <option key={choice} value={choice}>
                  {choice === 'auto' ? 'Auto' : choice}
                </option>
              ))}
            </select>
            <select
              value={ocrMode}
              onChange={event => setOcrMode(event.target.value as 'fast' | 'thorough')}
              className="px-3 py-2 bg-bg-input border border-border-color text-text-primary text-sm rounded-lg"
            >
              {ocrModeChoices.map((choice: string) => (
                <option key={choice} value={choice}>
                  {choice === 'thorough' ? 'Thorough' : 'Fast'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => ocrFileInputRef.current?.click()}
              className="px-3 py-2 bg-bg-input hover:bg-border-color text-text-primary text-sm rounded-lg transition-colors"
            >
              Choose Image
            </button>
            <button
              onClick={handleRunOcr}
              disabled={!ocrAvailable || !ocrFile || isRunningOcr}
              className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-input disabled:text-text-secondary text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {isRunningOcr ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Running...
                </>
              ) : (
                'Run OCR'
              )}
            </button>
          </div>

          <div className="text-xs text-text-secondary min-h-4">
            {ocrAvailable
              ? (ocrFile ? `Selected: ${ocrFile.name}` : 'Choose a jpeg, png, or webp image.')
              : 'OCR is not available on this node yet.'}
          </div>

          {ocrBackend && (
            <div className="text-[11px] font-mono text-success bg-success/10 px-2 py-1 rounded">
              OCR backend: {ocrBackend}
            </div>
          )}

          {(ocrDetectedLanguage || ocrLegibilityScore !== null) && (
            <div className="text-[11px] font-mono text-text-secondary bg-bg-input/40 px-2 py-1 rounded space-x-3">
              {ocrDetectedLanguage && <span>Detected: {ocrDetectedLanguage}</span>}
              {ocrLegibilityScore !== null && <span>Legibility: {Math.round(ocrLegibilityScore * 100)}%</span>}
            </div>
          )}

          {ocrError && (
            <div className="text-xs text-error bg-error/10 px-3 py-2 rounded-lg">
              {ocrError}
            </div>
          )}

          {ocrWarning && (
            <div className="text-xs text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg">
              {ocrWarning}
            </div>
          )}

          {ocrText && (
            <div className="bg-bg-input/40 border border-border-color rounded-xl p-3 max-h-56 overflow-y-auto">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Extracted Text
              </div>
              <pre className="text-xs text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                {ocrText}
              </pre>
            </div>
          )}

          <div className="border-t border-border-color pt-3 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bot size={15} className="text-accent" />
                Grounded Drill
              </h4>
              <p className="text-xs text-text-secondary mt-1">
                Turn the OCR text into a tiny local practice drill. Best for menus, labels, packaging, and quickstart instructions.
              </p>
            </div>

            <div className="flex gap-2">
              <select
                value={drillKind}
                onChange={event => setDrillKind(event.target.value as GroundedDrillKind)}
                className="px-3 py-2 bg-bg-input border border-border-color text-text-primary text-sm rounded-lg flex-1"
              >
                <option value="vocabulary">Vocabulary</option>
                <option value="menu_order">Order Speech</option>
                <option value="package_label">Package Label</option>
                <option value="quickstart_manual">Quickstart Manual</option>
              </select>
              <button
                onClick={handleGenerateGroundedDrill}
                disabled={!chatAvailable || !ocrText.trim() || isGeneratingDrill}
                className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-input disabled:text-text-secondary text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                {isGeneratingDrill ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Thinking...
                  </>
                ) : (
                  'Generate Drill'
                )}
              </button>
            </div>

            <div className="text-xs text-text-secondary min-h-4">
              {chatAvailable
                ? (ocrText.trim()
                  ? 'Uses the local chat model to turn OCR text into a compact drill.'
                  : 'Run OCR first, then generate a drill from the extracted text.')
                : 'Local chat is not available on this node yet.'}
            </div>

            {groundedDrillError && (
              <div className="text-xs text-error bg-error/10 px-3 py-2 rounded-lg">
                {groundedDrillError}
              </div>
            )}

            {groundedDrill && (
              <div className="bg-bg-input/40 border border-border-color rounded-xl p-3 max-h-72 overflow-y-auto">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Generated Drill
                </div>
                <pre className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                  {groundedDrill}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-border-color flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
              <Database size={20} className="text-accent" />
              Local Collections
            </h2>
            <button 
              onClick={() => setShowIngestModal(true)}
              className="p-1.5 bg-bg-input hover:bg-border-color text-text-primary rounded-lg transition-colors" 
              title="Ingest New Folder"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-text-secondary">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading...
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center p-6 text-text-secondary">
                No collections found. Add a folder to start.
              </div>
            ) : (
              collections.map(collection => (
                <div 
                  key={collection.id}
                  onClick={() => toggleCollection(collection.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                    selectedCollections.has(collection.id) 
                      ? 'bg-accent/10 border-accent/30' 
                      : 'bg-bg-input/30 border-transparent hover:bg-bg-input'
                  }`}
                >
                  <div className={`mt-0.5 ${selectedCollections.has(collection.id) ? 'text-accent' : 'text-text-secondary'}`}>
                    <Folder size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary truncate">{collection.name}</div>
                    <div className="text-xs text-text-secondary font-mono truncate mt-1">{collection.path}</div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><FileText size={12} /> {collection.documentCount} docs</span>
                      <span>•</span>
                      <span>{collection.chunkCount} chunks</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedCollections.has(collection.id) ? 'bg-accent border-accent text-white' : 'border-text-secondary/50'
                  }`}>
                    {selectedCollections.has(collection.id) && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Q&A */}
      <div className="w-2/3 flex flex-col bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border-color bg-bg-surface/50 backdrop-blur-sm z-10">
          <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Search size={20} className="text-accent" />
            Document Copilot
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Ask questions about your selected local documents. Data never leaves your machine.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {interactions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>Select collections on the left and ask a question below.</p>
              <p className="text-sm mt-2 opacity-70">Try: "How much did I spend on dental in 2025?"</p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <div key={interaction.id} className="space-y-6">
                {/* User Question */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-accent text-white">
                    <User size={16} />
                  </div>
                  <div className="px-5 py-3 rounded-2xl max-w-[80%] leading-relaxed bg-user-bubble text-text-primary rounded-tr-sm">
                    {interaction.question}
                  </div>
                </motion.div>

                {/* Assistant Answer */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-bg-input border border-border-color text-accent">
                    <Bot size={16} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="px-5 py-4 rounded-2xl bg-agent-bubble border border-border-color text-text-primary rounded-tl-sm leading-relaxed">
                      {interaction.isLoading ? (
                        <div className="flex items-center gap-2 text-accent">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Searching local documents...</span>
                        </div>
                      ) : (
                        interaction.answer
                      )}
                    </div>
                    
                    {/* Sources */}
                    {interaction.sources && interaction.sources.length > 0 && (
                      <div className="pl-2">
                        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Sources</div>
                        <div className="grid grid-cols-1 gap-2">
                          {interaction.sources.map((source, idx) => (
                            <SourceCard key={idx} source={source} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-5 border-t border-border-color bg-bg-surface">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder={selectedCollections.size === 0 ? "Select a collection first..." : "Ask your documents..."}
              disabled={selectedCollections.size === 0 || interactions.some(i => i.isLoading)}
              className="w-full bg-bg-input border border-border-color rounded-xl py-4 pl-5 pr-14 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleAsk}
              disabled={!input.trim() || selectedCollections.size === 0 || interactions.some(i => i.isLoading)}
              className="absolute right-2 p-2 bg-accent hover:bg-accent-hover disabled:bg-bg-surface disabled:text-text-secondary text-white rounded-lg transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Ingest Modal Overlay */}
      <AnimatePresence>
        {showIngestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border-color rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border-color flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <HardDrive size={20} className="text-accent" />
                  Ingest Local Folder
                </h3>
                <button 
                  onClick={() => !isIngesting && setShowIngestModal(false)}
                  className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Collection Name</label>
                  <input 
                    type="text" 
                    value={ingestName}
                    onChange={e => setIngestName(e.target.value)}
                    placeholder="e.g. Taxes 2026"
                    disabled={isIngesting}
                    className="w-full bg-bg-input border border-border-color rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Local Folder Path</label>
                  <input 
                    type="text" 
                    value={ingestPath}
                    onChange={e => setIngestPath(e.target.value)}
                    placeholder="e.g. ~/Documents/taxes"
                    disabled={isIngesting}
                    className="w-full bg-bg-input border border-border-color rounded-lg px-4 py-2.5 text-text-primary font-mono text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  />
                  <p className="text-xs text-text-secondary mt-1.5">
                    The Nerd will scan this folder for PDFs, text, and images.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={ingestWatch}
                      onChange={e => setIngestWatch(e.target.checked)}
                      disabled={isIngesting}
                      className="w-4 h-4 rounded border-border-color text-accent focus:ring-accent bg-bg-input"
                    />
                    <span className="text-sm text-text-primary">Watch folder for new files</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={ingestOcr}
                      onChange={e => setIngestOcr(e.target.checked)}
                      disabled={isIngesting}
                      className="w-4 h-4 rounded border-border-color text-accent focus:ring-accent bg-bg-input"
                    />
                    <span className="text-sm text-text-primary">Enable OCR (for scanned receipts/images)</span>
                  </label>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border-color bg-bg-input/30 flex justify-end gap-3">
                <button 
                  onClick={() => setShowIngestModal(false)}
                  disabled={isIngesting}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleIngest}
                  disabled={!ingestName.trim() || !ingestPath.trim() || isIngesting}
                  className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-input disabled:text-text-secondary text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isIngesting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Ingesting...
                    </>
                  ) : (
                    'Start Ingestion'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SourceCard: React.FC<{ source: Source }> = ({ source }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-bg-input/50 border border-border-color rounded-lg overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-bg-input transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className="text-accent shrink-0" />
          <span className="text-sm font-medium text-text-primary truncate">{source.document}</span>
          <span className="text-xs text-text-secondary shrink-0">Page {source.page}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-success bg-success/10 px-2 py-0.5 rounded">
            {(source.relevance * 100).toFixed(0)}% match
          </span>
          {expanded ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 py-3 border-t border-border-color bg-bg-input/30">
          <p className="text-sm text-text-secondary font-mono leading-relaxed">
            "{source.excerpt}"
          </p>
        </div>
      )}
    </div>
  );
}
