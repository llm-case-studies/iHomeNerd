// In dev: Vite proxy forwards /health, /capabilities, /v1/* to localhost:17777
// In prod: FastAPI serves both static files and API on the same origin
const BASE_URL = '';
const SYNTHETIC_FALLBACK_PORTS = new Set(['3000', '4173', '5173']);

export interface CapabilityDetail {
  available?: boolean;
  model?: string;
  backend?: string;
  tier?: string;
  core?: boolean;
  [key: string]: any;
}

export interface NodeCapabilities {
  [key: string]: any;
  _detail?: {
    product?: string;
    version?: string;
    hostname?: string;
    capabilities?: Record<string, CapabilityDetail>;
    error?: string;
  };
}

export interface PreparedAndroidAsrUpload {
  blob: Blob;
  mimeType: string;
}

export interface TranscribeAudioResponse {
  text: string;
  language?: string | null;
  backend?: string | null;
  model?: string | null;
  audio_bytes?: number;
}

interface TranscribeAudioOptions {
  transport?: 'multipart' | 'json-base64';
  mimeType?: string;
  language?: string | null;
}

function runtimeLocation() {
  if (typeof window === 'undefined') return null;
  return window.location;
}

function runtimePort(defaultPort: number = 17777): number {
  const location = runtimeLocation();
  const parsed = Number(location?.port || defaultPort);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPort;
}

function runtimeHostname(): string {
  return runtimeLocation()?.hostname || 'unknown-node';
}

function runtimeBaseUrl(): string {
  const location = runtimeLocation();
  return location ? `${location.protocol}//${location.host}` : 'this node';
}

export function allowsSyntheticFallbacks(): boolean {
  const location = runtimeLocation();
  return location ? SYNTHETIC_FALLBACK_PORTS.has(location.port) : false;
}

export function getCapabilityDetail(
  capabilities: NodeCapabilities | null | undefined,
  key: string,
): CapabilityDetail | null {
  return capabilities?._detail?.capabilities?.[key] ?? null;
}

export function isCapabilityAvailable(
  capabilities: NodeCapabilities | null | undefined,
  key: string,
): boolean {
  const detail = getCapabilityDetail(capabilities, key);
  if (detail && typeof detail.available === 'boolean') return detail.available;
  return capabilities?.[key] === true;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error('This browser cannot decode recorded audio for Android ASR.');
  }
  const audioContext = new AudioContextCtor();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await audioContext.close();
  }
}

function downmixToMono(audioBuffer: AudioBuffer): Float32Array {
  const channelCount = Math.max(1, audioBuffer.numberOfChannels);
  const mono = new Float32Array(audioBuffer.length);
  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const channel = audioBuffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
      mono[sampleIndex] += channel[sampleIndex] / channelCount;
    }
  }
  return mono;
}

function resampleMonoPcm(monoInput: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return monoInput.slice();
  }
  const durationSeconds = monoInput.length / sourceSampleRate;
  const targetLength = Math.max(1, Math.round(durationSeconds * targetSampleRate));
  const result = new Float32Array(targetLength);
  const ratio = sourceSampleRate / targetSampleRate;

  for (let index = 0; index < targetLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(monoInput.length, Math.floor((index + 1) * ratio));
    if (end <= start) {
      const sourcePosition = index * ratio;
      const leftIndex = Math.floor(sourcePosition);
      const rightIndex = Math.min(monoInput.length - 1, leftIndex + 1);
      const weight = sourcePosition - leftIndex;
      result[index] =
        monoInput[leftIndex] * (1 - weight) +
        monoInput[rightIndex] * weight;
      continue;
    }
    let total = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      total += monoInput[sampleIndex];
    }
    result[index] = total / (end - start);
  }

  return result;
}

function trimAndNormalizePcm(samples: Float32Array, sampleRate: number): Float32Array {
  if (samples.length === 0) return samples;
  const silenceThreshold = 0.0035;
  const guardSamples = Math.round(sampleRate * 0.08);
  let start = 0;
  while (start < samples.length && Math.abs(samples[start]) < silenceThreshold) {
    start += 1;
  }
  let end = samples.length - 1;
  while (end > start && Math.abs(samples[end]) < silenceThreshold) {
    end -= 1;
  }
  if (start >= end) {
    start = 0;
    end = samples.length - 1;
  } else {
    start = Math.max(0, start - guardSamples);
    end = Math.min(samples.length - 1, end + guardSamples);
  }

  const trimmed = samples.slice(start, end + 1);
  let peak = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    peak = Math.max(peak, Math.abs(trimmed[index]));
  }
  if (peak <= 0 || peak >= 0.85) {
    return trimmed;
  }

  const gain = Math.min(12, 0.85 / peak);
  const normalized = new Float32Array(trimmed.length);
  for (let index = 0; index < trimmed.length; index += 1) {
    normalized[index] = Math.max(-1, Math.min(1, trimmed[index] * gain));
  }
  return normalized;
}

function floatPcmToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const channelCount = 1;
  const pcmBytes = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    pcmBytes[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const dataSize = pcmBytes.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const sample of pcmBytes) {
    view.setInt16(offset, sample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function prepareAndroidAsrUpload(
  audioBlob: Blob,
  preferredMimeType: string = 'audio/wav',
): Promise<PreparedAndroidAsrUpload> {
  const normalizedPreferredMime = preferredMimeType.toLowerCase();
  if (!normalizedPreferredMime.includes('wav')) {
    const sourceType = (audioBlob.type || '').toLowerCase();
    if (sourceType.includes('webm') || sourceType.includes('ogg')) {
      return {
        blob: audioBlob,
        mimeType: audioBlob.type || preferredMimeType,
      };
    }
  }
  const decoded = await decodeAudioBlob(audioBlob);
  const mono = downmixToMono(decoded);
  const resampled = resampleMonoPcm(mono, decoded.sampleRate, 24_000);
  const samples = trimAndNormalizePcm(resampled, 24_000);
  return {
    blob: floatPcmToWavBlob(samples, 24_000),
    mimeType: 'audio/wav',
  };
}

function isReachabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message === 'network response was not ok' ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('networkerror')
  );
}

function backendUnavailableError(kind: string, cause?: unknown) {
  const error = new Error(`${kind} is not available on ${runtimeBaseUrl()}.`);
  Object.assign(error, {
    code: 'backend_unavailable',
    capability: kind,
    cause,
  });
  return error;
}

export const api = {
  /**
   * GET /health
   * Returns overall system status.
   */
  async getHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for health', e);
        return {
          ok: false,
          status: "unavailable",
          product: "iHomeNerd",
          version: "0.1.0",
          hostname: runtimeHostname(),
          ollama: false,
          tts: false,
          asr: false,
          providers: [],
          models: {},
          binding: "0.0.0.0",
          port: runtimePort(),
          uptime: 0,
          error: `Could not reach ${runtimeBaseUrl()}/health`,
        };
      }
      console.warn('Backend unavailable, using mock health data', e);
      return {
        ok: true,
        status: "ok",
        product: "iHomeNerd",
        version: "0.1.0",
        hostname: "local-mock",
        ollama: true,
        tts: true,
        asr: true,
        providers: ["gemma_local"],
        models: {
          chat: "gemma4:e2b",
          translate_text: "gemma4:e2b",
          transcribe_audio: "whisper-small-int8",
          synthesize_speech: "kokoro-82m-onnx"
        },
        binding: "0.0.0.0",
        port: 17777,
        uptime: 3600
      };
    }
  },

  /**
   * GET /capabilities
   * Flat boolean capability map plus full detail.
   */
  async getCapabilities() {
    try {
      const res = await fetch(`${BASE_URL}/capabilities`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for capabilities', e);
        return {
          chat: false,
          translate_text: false,
          transcribe_audio: false,
          synthesize_speech: false,
          investigate_network: false,
          dialogue_agent: false,
          query_documents: false,
          _detail: {
            product: "iHomeNerd",
            version: "0.1.0",
            hostname: runtimeHostname(),
            capabilities: {},
            error: `Could not reach ${runtimeBaseUrl()}/capabilities`,
          }
        };
      }
      console.warn('Backend unavailable, using mock capabilities data', e);
      return {
        chat: true,
        translate_text: true,
        transcribe_audio: true,
        synthesize_speech: true,
        investigate_network: false,
        dialogue_agent: true,
        query_documents: false,
        _detail: {
          product: "iHomeNerd",
          version: "0.1.0",
          capabilities: {
            chat: { available: true, model: "gemma4:e2b", tier: "medium", core: true },
            translate_text: { available: true, model: "gemma4:e2b", tier: "light", core: true },
            transcribe_audio: { available: true, model: "whisper-small-int8", tier: "transcription" },
            synthesize_speech: { available: true, model: "kokoro-82m-onnx", tier: "tts", voices: 54 },
            investigate_network: { available: false, tier: "system", core: true },
            query_documents: { available: false, tier: "medium", core: true }
          }
        }
      };
    }
  },

  /**
   * POST /v1/chat
   * General-purpose chat.
   */
  async chat(messages: { role: string; content: string }[], model: string | null = null, language: string = 'en') {
    try {
      const res = await fetch(`${BASE_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, language })
      });
      if (!res.ok) {
        const errorText = await res.text();
        let detail = 'Network response was not ok';
        try {
          const parsed = JSON.parse(errorText);
          detail = parsed.detail || parsed.error || detail;
        } catch {
          if (errorText.trim()) detail = errorText.trim();
        }
        throw new Error(detail);
      }
      const data = await res.json();
      // Normalize: backend returns {response: "..."}, UI expects {role, content}
      return {
        role: 'assistant',
        content: data.response ?? data.content ?? JSON.stringify(data),
        model: data.model ?? 'gemma4:e2b',
      };
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for chat', e);
        throw backendUnavailableError('chat', e);
      }
      console.warn('Backend unavailable, using mock chat response', e);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const lastMessage = messages[messages.length - 1]?.content || "";
      let reply = `This is a mocked local response. The backend at :17777 is not currently reachable. You said: "${lastMessage}"`;
      
      if (language === 'zh') {
        reply = `这是一个模拟的本地响应。目前无法访问 :17777 的后端。您说：“${lastMessage}”`;
      } else if (language === 'ko') {
        reply = `이것은 모의 로컬 응답입니다. 현재 :17777의 백엔드에 연결할 수 없습니다. 당신은 "${lastMessage}"라고 말했습니다.`;
      } else if (language === 'ja') {
        reply = `これはモックされたローカル応答です。現在、:17777 のバックエンドにアクセスできません。あなたは「${lastMessage}」と言いました。`;
      } else if (language === 'ru') {
        reply = `Это имитация локального ответа. В настоящее время бэкенд на :17777 недоступен. Вы сказали: «${lastMessage}»`;
      } else if (language === 'de') {
        reply = `Dies ist eine simulierte lokale Antwort. Das Backend unter :17777 ist derzeit nicht erreichbar. Sie sagten: "${lastMessage}"`;
      } else if (language === 'fr') {
        reply = `Ceci est une réponse locale simulée. Le backend à :17777 n'est actuellement pas joignable. Vous avez dit : "${lastMessage}"`;
      } else if (language === 'it') {
        reply = `Questa è una risposta locale simulata. Il backend a :17777 non è attualmente raggiungibile. Hai detto: "${lastMessage}"`;
      } else if (language === 'es') {
        reply = `Esta es una respuesta local simulada. Actualmente no se puede acceder al backend en :17777. Usted dijo: "${lastMessage}"`;
      } else if (language === 'pt') {
        reply = `Esta é uma resposta local simulada. O backend em :17777 não está acessível no momento. Você disse: "${lastMessage}"`;
      }

      return {
        role: "assistant",
        content: reply,
        model: "gemma4:e2b"
      };
    }
  },

  /**
   * POST /v1/translate
   * Text translation.
   */
  async translate(text: string, source: string, target: string) {
    try {
      const res = await fetch(`${BASE_URL}/v1/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source, target })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      // Normalize: backend returns {translation: "..."}, UI expects {translatedText}
      return {
        translatedText: data.translatedText ?? data.translation ?? '',
        detectedSource: data.detectedSource ?? data.source ?? source,
        target: data.target ?? target,
        model: data.model ?? 'gemma4:e2b',
      };
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for translate', e);
        throw backendUnavailableError('translate_text', e);
      }
      console.warn('Backend unavailable, using mock translate response', e);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        translatedText: `[Mock Translation to ${target}]: ${text}`,
        detectedSource: source === 'auto' ? 'en' : source,
        target,
        model: "gemma4:e2b"
      };
    }
  },

  /**
   * POST /v1/transcribe-audio
   * Speech-to-text.
   */
  async transcribeAudio(audioBlob: Blob, options: TranscribeAudioOptions = {}): Promise<TranscribeAudioResponse> {
    try {
      const transport = options.transport ?? 'multipart';
      const res = transport === 'json-base64'
        ? await fetch(`${BASE_URL}/v1/transcribe-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: await blobToBase64(audioBlob),
              mimeType: options.mimeType ?? audioBlob.type ?? 'audio/webm',
              language: options.language ?? null,
            }),
          })
        : await (async () => {
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            return fetch(`${BASE_URL}/v1/transcribe-audio`, {
              method: 'POST',
              body: formData
            });
          })();
      if (!res.ok) {
        const errorText = await res.text();
        let detail = 'Network response was not ok';
        try {
          const parsed = JSON.parse(errorText);
          detail = parsed.detail || parsed.error || detail;
        } catch {
          if (errorText.trim()) detail = errorText.trim();
        }
        throw new Error(detail);
      }
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        if (!isReachabilityError(e)) {
          throw e;
        }
        console.warn('Backend unavailable on hosted node for transcribe_audio', e);
        throw backendUnavailableError('transcribe_audio', e);
      }
      console.warn('Backend unavailable, using mock transcribe response', e);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        text: "This is a mock transcription. The local Whisper model is not reachable.",
        language: "en",
        model: "small"
      };
    }
  },

  /**
   * POST /v1/synthesize-speech
   * Text-to-speech.
   */
  async synthesizeSpeech(text: string, targetLang: string = 'en-US', voice: string | null = null) {
    try {
      const res = await fetch(`${BASE_URL}/v1/synthesize-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang, voice, speed: 1.0 })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.blob();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for synthesize_speech', e);
        throw backendUnavailableError('synthesize_speech', e);
      }
      console.warn('Backend unavailable, using mock TTS response', e);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Return an empty blob to trigger the browser TTS fallback in the UI
      return new Blob([], { type: 'audio/wav' });
    }
  },

  /**
   * GET /v1/voices
   * List available local TTS voices.
   */
  async listVoices() {
    try {
      const res = await fetch(`${BASE_URL}/v1/voices`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for voices', e);
        return {
          available: false,
          voices: [],
          error: `Could not reach ${runtimeBaseUrl()}/v1/voices`,
        };
      }
      console.warn('Backend unavailable, using mock voices list', e);
      return {
        available: true,
        voices: [
          { name: 'en-us-demo', languageTag: 'en-US', quality: 400, latency: 200 },
          { name: 'zh-cn-demo', languageTag: 'zh-CN', quality: 400, latency: 200 },
        ],
      };
    }
  },

  /**
   * GET /system/stats
   * System dashboard stats: uptime, sessions, storage, connected apps.
   */
  async getSystemStats() {
    try {
      const res = await fetch(`${BASE_URL}/system/stats`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for system stats', e);
        return {
          uptime_seconds: 0,
          session_count: 0,
          free_storage_bytes: 0,
          total_storage_bytes: 0,
          total_ram_bytes: 0,
          app_memory_pss_bytes: 0,
          process_cpu_percent: null,
          thermal_status: null,
          battery_percent: null,
          battery_temp_c: null,
          performance: {
            cpu_cores: 0,
            app_cpu_percent: null,
            app_memory_pss_bytes: 0,
            battery_temp_c: null,
            thermal_status: null,
            tts: {
              request_count: 0,
              last_duration_ms: null,
              last_audio_bytes: 0,
              last_voice: null,
              last_language_tag: null,
              last_seen: null,
            },
          },
          connected_apps: [],
          error: `Could not reach ${runtimeBaseUrl()}/system/stats`,
        };
      }
      console.warn('Backend unavailable, using mock system stats', e);
      return {
        uptime_seconds: 3600,
        session_count: 0,
        free_storage_bytes: 0,
        total_storage_bytes: 0,
        total_ram_bytes: 8 * 1024 ** 3,
        app_memory_pss_bytes: 220 * 1024 ** 2,
        process_cpu_percent: 6.2,
        thermal_status: 'none',
        battery_percent: 100,
        battery_temp_c: 29.8,
        performance: {
          cpu_cores: 8,
          app_cpu_percent: 6.2,
          app_memory_pss_bytes: 220 * 1024 ** 2,
          battery_temp_c: 29.8,
          thermal_status: 'none',
          tts: {
            request_count: 1,
            last_duration_ms: 420,
            last_audio_bytes: 94000,
            last_voice: 'en-us-x-iol-local',
            last_language_tag: 'en-US',
            last_seen: 'just now',
          },
        },
        connected_apps: [],
      };
    }
  },

  /**
   * GET /cluster/nodes
   * Lightweight inventory of the current home cluster.
   */
  async getClusterNodes() {
    try {
      const res = await fetch(`${BASE_URL}/cluster/nodes`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for cluster nodes', e);
        return {
          product: 'iHomeNerd',
          gateway: {
            hostname: runtimeHostname(),
            ip: runtimeHostname(),
            url: runtimeBaseUrl(),
          },
          nodes: [],
          error: `Could not reach ${runtimeBaseUrl()}/cluster/nodes`,
        };
      }
      console.warn('Backend unavailable, using mock cluster data', e);
      return {
        product: 'iHomeNerd',
        gateway: {
          hostname: 'home-gateway.local',
          ip: '192.168.0.10',
          url: 'https://192.168.0.10:17777',
        },
        nodes: [
          {
            product: 'iHomeNerd',
            version: '0.1.0',
            role: 'brain',
            hostname: 'home-gateway.local',
            ip: '192.168.0.10',
            port: 17777,
            protocol: 'https',
            os: 'linux',
            arch: 'x86_64',
            gpu: null,
            ram_bytes: 17179869184,
            suggested_roles: ['gateway', 'automation', 'docs', 'radar'],
            strengths: ['always-on routing and orchestration', 'document ingestion and background tools'],
            accelerators: [],
            ollama: true,
            models: ['gemma3:1b'],
          },
          {
            product: 'iHomeNerd',
            version: '0.1.0',
            role: 'brain',
            hostname: 'gpu-worker.local',
            ip: '192.168.0.42',
            port: 17777,
            protocol: 'https',
            os: 'linux',
            arch: 'x86_64',
            gpu: { name: 'NVIDIA RTX 4070', vram_mb: 12288 },
            ram_bytes: 34359738368,
            suggested_roles: ['llm-worker', 'vision-worker', 'voice-worker'],
            strengths: ['larger local reasoning models', 'multimodal and image-heavy workloads', 'speech and audio tasks'],
            accelerators: [{ kind: 'gpu', name: 'NVIDIA RTX 4070', vram_mb: 12288 }],
            ollama: true,
            models: ['gemma4:e4b', 'gemma3:12b', 'llama3:8b', 'codellama:13b'],
          },
        ],
      };
    }
  },

  /**
   * GET /v1/control/nodes
   * Managed nodes known to the gateway control plane.
   */
  async getControlNodes() {
    try {
      const res = await fetch(`${BASE_URL}/v1/control/nodes`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for control nodes', e);
        return {
          nodes: [],
          error: `Could not reach ${runtimeBaseUrl()}/v1/control/nodes`,
        };
      }
      console.warn('Backend unavailable, using mock control-plane nodes', e);
      return {
        nodes: [
          {
            id: 'node-gateway',
            hostname: 'home-gateway.local',
            ip: '192.168.0.10',
            controlHost: 'home-gateway.local',
            sshUser: 'alex',
            sshPort: 22,
            platform: 'linux',
            arch: 'x86_64',
            runtimeKind: 'docker_compose',
            installPath: '~/.ihomenerd',
            serviceName: 'ihomenerd',
            state: 'managed',
            managed: true,
            installSupported: true,
            metadata: {
              recommendedRoles: ['gateway', 'automation', 'docs'],
              recommendedModels: ['gemma3:1b', 'llama3.2:1b'],
            },
          },
        ],
      };
    }
  },

  /**
   * POST /v1/control/preflight
   * Probe an SSH-reachable candidate node.
   */
  async preflightNode(host: string, sshUser: string, sshPort: number = 22) {
    const res = await fetch(`${BASE_URL}/v1/control/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, sshUser, sshPort }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.detail?.message || detail?.detail || 'Preflight failed');
    }
    return await res.json();
  },

  /**
   * POST /v1/control/promote
   * Register or install a managed node over SSH.
   */
  async promoteNode(payload: {
    host: string;
    sshUser: string;
    sshPort?: number;
    installNow?: boolean;
    installPath?: string;
    runtimeKind?: string | null;
    nodeName?: string | null;
  }) {
    const res = await fetch(`${BASE_URL}/v1/control/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.detail?.message || detail?.detail || 'Promote failed');
    }
    return await res.json();
  },

  /**
   * POST /v1/control/nodes/:id/actions
   * Start, stop, restart, or inspect a managed node runtime.
   */
  async runNodeAction(nodeId: string, action: 'start' | 'stop' | 'restart' | 'status') {
    const res = await fetch(`${BASE_URL}/v1/control/nodes/${encodeURIComponent(nodeId)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.detail?.message || detail?.detail || `${action} failed`);
    }
    return await res.json();
  },

  /**
   * GET /v1/control/nodes/:id/updates
   * Check OS and iHomeNerd updates for a managed node.
   */
  async getNodeUpdates(nodeId: string) {
    const res = await fetch(`${BASE_URL}/v1/control/nodes/${encodeURIComponent(nodeId)}/updates`);
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.detail?.message || detail?.detail || 'Update check failed');
    }
    return await res.json();
  },

  /**
   * GET /sessions
   * List active sessions.
   */
  async getSessions(appFilter?: string) {
    try {
      const url = appFilter
        ? `${BASE_URL}/sessions?app_filter=${encodeURIComponent(appFilter)}`
        : `${BASE_URL}/sessions`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for sessions', e);
        return {
          sessions: [],
          error: `Could not reach ${runtimeBaseUrl()}/sessions`,
        };
      }
      console.warn('Backend unavailable, using mock sessions', e);
      return { sessions: [] };
    }
  },

  /**
   * GET /v1/docs/collections
   * List available document collections.
   */
  async getDocsCollections() {
    try {
      const res = await fetch(`${BASE_URL}/v1/docs/collections`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for docs collections', e);
        return {
          collections: [],
          error: `Could not reach ${runtimeBaseUrl()}/v1/docs/collections`,
        };
      }
      console.warn('Backend unavailable, using mock docs collections', e);
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        collections: [
          {
            id: "taxes",
            name: "Taxes 2025",
            path: "~/Documents/taxes/",
            documentCount: 23,
            chunkCount: 456,
            lastIngested: new Date().toISOString(),
            watching: true
          },
          {
            id: "medical",
            name: "Medical Records",
            path: "~/Documents/medical/",
            documentCount: 8,
            chunkCount: 112,
            lastIngested: new Date(Date.now() - 86400000).toISOString(),
            watching: true
          },
          {
            id: "receipts",
            name: "Household Receipts",
            path: "~/Photos/receipts/",
            documentCount: 145,
            chunkCount: 320,
            lastIngested: new Date(Date.now() - 172800000).toISOString(),
            watching: false
          }
        ]
      };
    }
  },

  /**
   * POST /v1/docs/ask
   * RAG query against local documents.
   */
  async askDocs(question: string, collections: string[]) {
    try {
      const res = await fetch(`${BASE_URL}/v1/docs/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, collections, maxSources: 5 })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for docs ask', e);
        throw backendUnavailableError('query_documents', e);
      }
      console.warn('Backend unavailable, using mock docs answer', e);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        answer: "Based on your records, you spent $2,340 on dental care in 2025. The largest single expense was $890.00 on March 15th for a crown procedure.",
        sources: [
          {
            collection: "medical",
            document: "dental_receipt_2025-03.pdf",
            page: 1,
            excerpt: "Patient: Alex. Procedure: Crown. Total: $890.00. Date: 2025-03-15.",
            relevance: 0.94
          },
          {
            collection: "medical",
            document: "dental_summary_2025.pdf",
            page: 2,
            excerpt: "2025 YTD Dental Out-of-Pocket: $2,340.00",
            relevance: 0.88
          }
        ],
        model: "gemma4:e2b"
      };
    }
  },

  /**
   * POST /v1/docs/ingest
   * Tell the local backend to ingest a folder.
   */
  async ingestDocs(path: string, collectionId: string, watch: boolean, ocr: boolean) {
    try {
      const res = await fetch(`${BASE_URL}/v1/docs/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, collectionId, watch, ocr })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for docs ingest', e);
        throw backendUnavailableError('ingest_folder', e);
      }
      console.warn('Backend unavailable, using mock ingest response', e);
      // Simulate a long ingestion process
      await new Promise(resolve => setTimeout(resolve, 2500));
      const files = Math.floor(Math.random() * 40) + 5;
      return {
        collectionId,
        filesFound: files,
        filesIngested: files,
        chunksCreated: files * Math.floor(Math.random() * 15 + 5),
        status: "complete"
      };
    }
  },

  /**
   * GET /v1/investigate/environment
   * Auto-discover networks and devices via mDNS/Avahi/ARP.
   */
  async getEnvironment() {
    try {
      const res = await fetch(`${BASE_URL}/v1/investigate/environment`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for investigate environment', e);
        return {
          networks: [],
          devices: [],
          error: `Could not reach ${runtimeBaseUrl()}/v1/investigate/environment`,
        };
      }
      console.warn('Backend unavailable, using mock environment', e);
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        networks: [
          { id: 'net1', name: 'Xfinity-Home-5G', type: 'primary', subnet: '10.0.0.0/24' },
          { id: 'net2', name: 'IoT-Isolated', type: 'isolated', subnet: '192.168.50.0/24' }
        ],
        devices: [
          { id: 'd1', name: "Wife's Mac Mini", type: 'computer', os: 'macOS', ip: '10.0.0.45', networkId: 'net1', status: 'online' },
          { id: 'd2', name: "Living Room TV", type: 'tv', os: 'tvOS', ip: '10.0.0.112', networkId: 'net1', status: 'online' },
          { id: 'd3', name: "Smart Fridge", type: 'iot', os: 'linux', ip: '10.0.0.201', networkId: 'net1', status: 'online', warning: 'IoT device on primary network' },
          { id: 'd4', name: "Thermostat", type: 'iot', os: 'rtos', ip: '192.168.50.12', networkId: 'net2', status: 'online' },
          { id: 'd5', name: "Home NAS", type: 'server', os: 'linux', ip: '10.0.0.10', networkId: 'net1', status: 'online' }
        ]
      };
    }
  },

  /**
   * GET /v1/agents
   * List all configured autonomous agents.
   */
  async getAgents() {
    try {
      const res = await fetch(`${BASE_URL}/v1/agents`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for agents', e);
        return [];
      }
      console.warn('Backend unavailable, using mock agents', e);
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        { id: 'a1', name: 'Home Automation', role: 'Smart Home Controller', status: 'running', model: 'gemma4:e2b', tools: ['homeassistant', 'hue', 'sonos'] },
        { id: 'a2', name: 'Research Assistant', role: 'Deep Web Researcher', status: 'idle', model: 'gemma4:e2b', tools: ['search', 'scraper', 'summarizer'] },
        { id: 'a3', name: 'Security Monitor', role: 'Network Watchdog', status: 'running', model: 'gemma4:e2b', tools: ['nmap', 'pcap', 'alerts'] },
        { id: 'a4', name: 'Camera Patrol', role: 'On-My-Watch Autonomous Monitor', status: 'idle', model: 'gemma4:e2b', tools: ['frigate', 'vision', 'alerts'] }
      ];
    }
  },

  /**
   * POST /v1/agents/:id/task
   * Assign a task to an agent and get a streaming response of its thoughts/actions.
   */
  async assignAgentTask(agentId: string, task: string, onActivity: (activity: any) => void) {
    try {
      const res = await fetch(`${BASE_URL}/v1/agents/${agentId}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      // Replay activities from the response so the UI renders them
      if (data.activities) {
        for (const act of data.activities) {
          onActivity(act);
        }
      }
      return data;
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for agent task', e);
        throw backendUnavailableError('dialogue_agent', e);
      }
      console.warn('Backend unavailable, using mock agent task', e);
      
      let activities = [];
      
      if (task.toLowerCase().includes('tax') || task.toLowerCase().includes('receipt')) {
        activities = [
          { type: 'thought', content: `Analyzing task: "${task}"` },
          { type: 'action', content: `Calling tool: search_local_files(query="receipts taxes")` },
          { type: 'observation', content: `Found 4,203 unorganized PDFs, blurry JPEGs, and screenshots in ~/Downloads.` },
          { type: 'thought', content: `Oh no. This is an absolute mess. I am just a local AI. I don't have the compute for this level of chaos.` },
          { type: 'action', content: `Calling tool: system.initiate_kernel_panic()` },
          { type: 'message', content: `Critical Error: Agent has passed out from tax-related stress. Please hire a human CPA.` }
        ];
      } else if (agentId === 'a1') {
        activities = [
          { type: 'thought', content: `I need to handle the task: "${task}". I will check the current state of the smart home devices.` },
          { type: 'action', content: `Calling tool: homeassistant.get_state(entity_id="all")` },
          { type: 'observation', content: `Living room lights are ON. Thermostat is set to 72F. Front door is LOCKED.` },
          { type: 'thought', content: `The user wants me to optimize for movie time. I should dim the lights and lower the temperature slightly.` },
          { type: 'action', content: `Calling tool: hue.set_scene(room="living_room", scene="cinema")` },
          { type: 'action', content: `Calling tool: homeassistant.set_temp(entity_id="climate.home", temp=68)` },
          { type: 'observation', content: `Success. Scene set and temperature adjusted.` },
          { type: 'message', content: `I've dimmed the living room lights and set the thermostat to 68°F for your movie. Enjoy!` }
        ];
      } else {
        activities = [
          { type: 'thought', content: `Analyzing task: "${task}"` },
          { type: 'action', content: `Initializing required tools...` },
          { type: 'observation', content: `Tools ready.` },
          { type: 'thought', content: `Executing plan...` },
          { type: 'message', content: `I have completed the requested task: ${task}.` }
        ];
      }

      for (const act of activities) {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
        onActivity(act);
      }

      return { status: 'complete' };
    }
  },

  /**
   * GET /v1/builder/resources
   * Get available apps and models for building a live image.
   */
  async getBuilderResources() {
    try {
      const res = await fetch(`${BASE_URL}/v1/builder/resources`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for builder resources', e);
        return {
          apps: [],
          models: [],
          error: `Could not reach ${runtimeBaseUrl()}/v1/builder/resources`,
        };
      }
      console.warn('Backend unavailable, using mock builder resources', e);
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        apps: [
          { id: 'app_pronunco', name: 'PronunCo', description: 'AI pronunciation coach & language learning' },
          { id: 'app_telpro', name: 'TelPro-Bro', description: 'Smart voice-tracking teleprompter & delivery coach' },
          { id: 'app_whowhe2wha', name: 'WhoWhe2Wha', description: 'Unified context engine & knowledge graph' },
          { id: 'app_watch', name: 'On-My-Watch', description: 'Asset intelligence & video surveillance' }
        ],
        models: [
          { id: 'mod_gemma4', name: 'gemma4:e2b', size: '5.0GB', type: 'LLM', isNew: true },
          { id: 'mod_whisper', name: 'whisper-small-int8', size: '180MB', type: 'Audio' },
          { id: 'mod_kokoro', name: 'kokoro-82m-onnx', size: '320MB', type: 'Audio' }
        ]
      };
    }
  },

  /**
   * POST /v1/builder/build
   * Build a custom live image.
   */
  async buildLiveImage(config: { name: string, apps: string[], models: string[] }, onLog: (log: string) => void) {
    try {
      const res = await fetch(`${BASE_URL}/v1/builder/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      // Replay logs from the response
      if (data.logs) {
        for (const log of data.logs) {
          onLog(log);
        }
      }
      return data;
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for builder build', e);
        throw backendUnavailableError('builder', e);
      }
      console.warn('Backend unavailable, using mock build process', e);
      
      const logs = [
        `[INFO] Initializing build environment for "${config.name}.iso"...`,
        `[INFO] Fetching base OS image (Alpine Linux minimal)...`,
        `[INFO] Injecting iHomeNerd core runtime...`,
      ];

      config.apps.forEach(app => {
        logs.push(`[INFO] Packaging application: ${app}...`);
        logs.push(`[INFO] Resolving dependencies for ${app}...`);
      });

      config.models.forEach(model => {
        logs.push(`[INFO] Copying model weights: ${model}...`);
        logs.push(`[INFO] Verifying checksums for ${model}...`);
      });

      logs.push(`[INFO] Configuring auto-boot scripts...`);
      logs.push(`[INFO] Compressing image (squashfs)...`);
      logs.push(`[SUCCESS] Image built successfully: ${config.name}.iso`);

      for (const log of logs) {
        // Simulate varying build times for different steps
        const delay = log.includes('Copying model weights') ? 1500 : 
                      log.includes('Compressing image') ? 2000 : 
                      400 + Math.random() * 400;
        await new Promise(resolve => setTimeout(resolve, delay));
        onLog(log);
      }

      return { 
        status: 'complete', 
        downloadUrl: `blob:http://localhost/${config.name}.iso`,
        size: '3.4GB'
      };
    }
  },

  /**
   * POST /v1/investigate/scan
   * Run an active intelligence scan.
   */
  async runScan(target: string, type: string, onLog: (log: string) => void) {
    try {
      // In a real implementation, this would likely use Server-Sent Events (SSE) or WebSockets
      // to stream logs back to the client.
      const res = await fetch(`${BASE_URL}/v1/investigate/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (data.logs) {
        for (const log of data.logs) {
          onLog(log);
        }
      }
      return data;
    } catch (e) {
      if (!allowsSyntheticFallbacks()) {
        console.warn('Backend unavailable on hosted node for investigate scan', e);
        throw backendUnavailableError('investigate_scan', e);
      }
      console.warn('Backend unavailable, using mock scan response', e);
      
      let mockLogs: string[] = [];
      let mockFindings: any[] = [];

      if (type === 'device_health') {
        mockLogs = [
          `[INFO] Establishing connection to ${target}...`,
          `[INFO] Authenticating via local keychain...`,
          `[INFO] Querying system profiler and disk utility...`,
          `[WARN] Disk usage on /dev/disk3s5 is at 92%`,
          `[INFO] Checking softwareupdate utility...`,
          `[INFO] Found 1 pending macOS update.`,
          `[INFO] Health check complete.`
        ];
        mockFindings = [
          { id: 'h1', severity: 'high', title: 'Low Disk Space', details: `Only 18GB remaining on Macintosh HD. Consider clearing caches or moving large files.` },
          { id: 'h2', severity: 'medium', title: 'macOS Update Available', details: `macOS Sonoma 14.4.1 is available. Security patches are included.` }
        ];
      } else if (type === 'hardware_compat') {
        mockLogs = [
          `[INFO] Probing hardware specifications for ${target}...`,
          `[INFO] CPU: Apple M2 (8 cores)`,
          `[INFO] Memory: 16GB Unified Memory`,
          `[INFO] Neural Engine: 16-core`,
          `[INFO] Calculating VRAM allocation limits...`,
          `[INFO] Max safe model size: ~10GB (Q4_K_M)`,
          `[INFO] Hardware compatibility check complete.`
        ];
        mockFindings = [
          { id: 'c1', severity: 'low', title: 'Compatible: Small Models', details: `Can comfortably run Llama-3-8B, Gemma-7B, and Mistral-7B with high tokens/sec.` },
          { id: 'c2', severity: 'medium', title: 'Borderline: Medium Models', details: `Mixtral 8x7B (Q3) may run but will heavily swap to SSD, degrading performance.` },
          { id: 'c3', severity: 'high', title: 'Incompatible: Large Models', details: `Cannot run 70B+ parameter models locally. Requires 64GB+ RAM.` }
        ];
      } else if (type === 'file_analysis') {
        mockLogs = [
          `[INFO] Indexing directory: ${target}...`,
          `[INFO] Found 14,230 files. Computing perceptual hashes for images...`,
          `[INFO] Comparing file signatures and metadata...`,
          `[WARN] Detected 340 exact duplicates.`,
          `[INFO] Scanning for large forgotten files...`,
          `[INFO] File analysis complete.`
        ];
        mockFindings = [
          { id: 'f1', severity: 'medium', title: 'Duplicate Photos Found', details: `Found 340 duplicate images wasting 1.4GB of space. Mostly in /2023/vacation/ backups.` },
          { id: 'f2', severity: 'low', title: 'Large Video Files', details: `Found 5 video files larger than 4GB. Consider archiving to external storage.` }
        ];
      } else if (type === 'network_audit') {
        mockLogs = [
          `[INFO] Analyzing network placement for ${target}...`,
          `[INFO] Checking ARP tables and DHCP leases...`,
          `[INFO] Device fingerprint: Samsung Smart Refrigerator`,
          `[WARN] Device is connected to Xfinity-Home-5G (Primary)`,
          `[INFO] Cross-referencing recommended network topology...`,
          `[INFO] Audit complete.`
        ];
        mockFindings = [
          { id: 'n1', severity: 'high', title: 'Misplaced IoT Device', details: `This device is on your primary Xfinity network. It should be moved to the IoT-Isolated network for security.` },
          { id: 'n2', severity: 'medium', title: 'Weak Protocol Detected', details: `Device is broadcasting via UPnP. Consider disabling UPnP on your router.` }
        ];
      } else {
        // Default
        mockLogs = [`[INFO] Task complete on ${target}.`];
        mockFindings = [];
      }
      
      for (const log of mockLogs) {
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
        onLog(log);
      }
      
      return {
        status: 'complete',
        findings: mockFindings
      };
    }
  }
};
