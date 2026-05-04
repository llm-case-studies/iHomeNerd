import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Box, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface ModelEntry {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface ModelsData {
  available: ModelEntry[];
  loaded: string | null;
  backend: string | null;
  _error?: { status: number; detail: string };
}

interface LoadResult {
  loaded: string | null;
  load_time_seconds: number | null;
  backend: string | null;
  _error?: { status: number; detail: string };
}

function errorSeverity(status: number): 'warn' | 'error' | 'info' {
  if (status === 400) return 'warn';
  if (status === 502 || status === 503) return 'error';
  return 'info';
}

export function ModelsPanel() {
  const { t } = useTranslation();
  const [data, setData] = useState<ModelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ status: number; detail: string } | null>(null);
  const [loadSuccess, setLoadSuccess] = useState<{ modelId: string; seconds: number } | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      const result = await api.getModels();
      setData(result);
    } catch {
      setData({ available: [], loaded: null, backend: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleLoad = async (modelId: string) => {
    setLoadingModel(modelId);
    setLoadError(null);
    setLoadSuccess(null);

    try {
      const result: LoadResult = await api.loadModel(modelId);
      if (result._error) {
        setLoadError(result._error);
      } else {
        setLoadSuccess({ modelId: result.loaded || modelId, seconds: result.load_time_seconds ?? 0 });
        setData((prev) =>
          prev ? { ...prev, loaded: result.loaded, backend: result.backend ?? prev.backend } : prev,
        );
      }
    } catch (e) {
      setLoadError({ status: 0, detail: e instanceof Error ? e.message : 'Load request failed' });
    } finally {
      setLoadingModel(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <Box size={32} className="text-accent mb-4" />
          <div className="text-text-secondary">Loading models...</div>
        </div>
      </div>
    );
  }

  const models = data?.available || [];
  const loadedId = data?.loaded;
  const backend = data?.backend;
  const fetchError = data?._error;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto w-full p-6 space-y-6 overflow-y-auto h-full"
    >
      <div className="bg-bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border-color flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
              <Box size={20} className="text-accent" />
              Models
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Available models on this node. Select one to load.
            </p>
          </div>
          {backend && (
            <span className="px-3 py-1 bg-bg-input text-text-secondary text-xs font-mono rounded-full border border-border-color">
              {backend}
            </span>
          )}
        </div>

        {fetchError && (
          <div className="mx-6 mt-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Cannot list models: [{fetchError.status}] {fetchError.detail}
          </div>
        )}

        {loadingModel && (
          <div className="mx-6 mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-input/30 border border-border-color text-sm text-text-secondary">
            <Loader2 size={16} className="animate-spin text-accent" />
            Loading {loadingModel}...
          </div>
        )}

        {loadError && (
          <div className={`mx-6 mt-5 rounded-xl border px-4 py-3 text-sm ${
            errorSeverity(loadError.status) === 'error'
              ? 'border-warning/30 bg-warning/10 text-warning'
              : errorSeverity(loadError.status) === 'warn'
                ? 'border-border-color bg-bg-surface text-text-secondary'
                : 'border-border-color bg-bg-input/30 text-text-secondary'
          }`}>
            <span className="inline-flex items-center gap-1.5 mr-2">
              <AlertTriangle size={14} />
              [{loadError.status}]
            </span>
            {loadError.detail}
          </div>
        )}

        {loadSuccess && (
          <div className="mx-6 mt-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success flex items-center gap-2">
            <CheckCircle2 size={16} />
            {loadSuccess.modelId} loaded in {loadSuccess.seconds.toFixed(2)} s
          </div>
        )}

        <div className="p-6">
          {models.length === 0 && !fetchError && (
            <div className="text-center text-text-secondary py-8">
              No models available on this node yet.
            </div>
          )}

          {models.length > 0 && (
            <div className="space-y-2">
              {models.map((model) => {
                const isLoaded = model.id === loadedId;
                const isBusy = loadingModel === model.id;

                return (
                  <div
                    key={model.id}
                    className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-colors ${
                      isLoaded
                        ? 'border-accent/30 bg-accent/5'
                        : 'border-border-color bg-bg-input/20 hover:bg-bg-input/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {model.name || model.id}
                        </span>
                        {isLoaded && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success border border-success/20 shrink-0">
                            active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary font-mono mt-0.5 truncate">
                        {model.id}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoad(model.id)}
                      disabled={isBusy || isLoaded}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                        isLoaded
                          ? 'bg-success/10 text-success border border-success/20 cursor-default'
                          : isBusy
                            ? 'bg-bg-input text-text-secondary border border-border-color cursor-wait'
                            : 'bg-accent text-black hover:bg-accent-hover disabled:opacity-50'
                      }`}
                    >
                      {isBusy ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin" />
                          Loading
                        </span>
                      ) : isLoaded ? (
                        'Loaded'
                      ) : (
                        'Load'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-text-secondary font-mono">
        Capability: models • {backend || 'v1'} • {models.length} model{models.length === 1 ? '' : 's'} available
      </div>
    </motion.div>
  );
}
