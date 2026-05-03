import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Square, Play, Volume2, Loader2, StopCircle } from 'lucide-react';
import {
  api,
  allowsSyntheticFallbacks,
  getCapabilityDetail,
  isCapabilityAvailable,
  NodeCapabilities,
  prepareAndroidAsrUpload,
} from '../lib/api';
import { useTranslation } from 'react-i18next';

// Map i18n language codes to BCP-47 for Kokoro TTS
const TTS_LANG_MAP: Record<string, string> = {
  en: 'en-US', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP',
  ru: 'ru-RU', de: 'de-DE', fr: 'fr-FR', it: 'it-IT',
  es: 'es-ES', pt: 'pt-BR',
};

const PREFERRED_RECORDING_MIME_TYPES = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

interface TtsVoiceOption {
  name: string;
  languageTag: string;
  quality?: number;
  latency?: number;
}

interface TalkPanelProps {
  capabilities?: NodeCapabilities | null;
}

interface AsrLanguageOption {
  value: string;
  label: string;
}

const FALLBACK_ASR_LANGUAGES: AsrLanguageOption[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español (ES)' },
];

export function TalkPanel({ capabilities = null }: TalkPanelProps) {
  const { t, i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [lastAsrLanguage, setLastAsrLanguage] = useState<string | null>(null);
  const [lastAsrBackend, setLastAsrBackend] = useState<string | null>(null);
  const [ttsDraft, setTtsDraft] = useState('Hello from iHomeNerd.');
  const [voices, setVoices] = useState<TtsVoiceOption[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedAsrLanguage, setSelectedAsrLanguage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const ttsLang = TTS_LANG_MAP[i18n.language] || 'en-US';
  const asrDetail = getCapabilityDetail(capabilities, 'transcribe_audio');
  const chatDetail = getCapabilityDetail(capabilities, 'chat');
  const ttsDetail = getCapabilityDetail(capabilities, 'synthesize_speech');
  const canTranscribe = capabilities ? isCapabilityAvailable(capabilities, 'transcribe_audio') : true;
  const canChat = capabilities ? isCapabilityAvailable(capabilities, 'chat') : true;
  const canSpeak = capabilities ? isCapabilityAvailable(capabilities, 'synthesize_speech') : true;
  const canReplyAndSpeak = canChat && canSpeak;
  const asrUploadTransport = typeof asrDetail?.upload_transport === 'string' ? asrDetail.upload_transport : null;
  const prefersAndroidAsrUpload = asrUploadTransport === 'json-base64';
  const preferredAsrUploadMimeType =
    typeof asrDetail?.preferred_upload_mime_type === 'string'
      ? asrDetail.preferred_upload_mime_type
      : 'audio/wav';
  const supportedAsrLanguages = useMemo<AsrLanguageOption[]>(() => {
    const rawLanguages = Array.isArray(asrDetail?.languages) ? asrDetail.languages : [];
    const displayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames([i18n.language || 'en'], { type: 'language' })
      : null;
    const normalized = rawLanguages
      .filter((value): value is string => typeof value === 'string' && value.includes('-'))
      .map((value) => ({
        value,
        label: displayNames?.of(value.split('-')[0]) || value,
      }));
    return normalized.length > 0 ? normalized : FALLBACK_ASR_LANGUAGES;
  }, [asrDetail, i18n.language]);
  const missingTalkCapabilities = [
    !canTranscribe ? 'ASR' : null,
    !canChat ? 'dialogue' : null,
    !canSpeak ? 'TTS' : null,
  ].filter(Boolean).join(', ');
  const languagePrefix = ttsLang.split('-')[0].toLowerCase();
  const filteredVoices = useMemo(() => {
    const matching = voices.filter((voice) => {
      const tag = (voice.languageTag || '').toLowerCase();
      return tag.startsWith(ttsLang.toLowerCase()) || tag.startsWith(languagePrefix);
    });
    return matching.length > 0 ? matching : voices;
  }, [voices, ttsLang, languagePrefix]);

  useEffect(() => {
    const preferred = TTS_LANG_MAP[i18n.language] || 'en-US';
    if (supportedAsrLanguages.some((option) => option.value === selectedAsrLanguage)) {
      return;
    }
    const bestMatch =
      supportedAsrLanguages.find((option) => option.value === preferred) ||
      supportedAsrLanguages.find((option) => option.value.startsWith(preferred.split('-')[0])) ||
      supportedAsrLanguages[0];
    setSelectedAsrLanguage(bestMatch?.value || 'en-US');
  }, [i18n.language, selectedAsrLanguage, supportedAsrLanguages]);

  useEffect(() => {
    let cancelled = false;

    async function loadVoices() {
      if (!canSpeak) {
        setVoices([]);
        return;
      }
      setIsLoadingVoices(true);
      try {
        const response = await api.listVoices();
        if (!cancelled) {
          setVoices(Array.isArray(response.voices) ? response.voices : []);
        }
      } catch (error) {
        console.error("Voice list error:", error);
        if (!cancelled) {
          setVoices([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVoices(false);
        }
      }
    }

    loadVoices();
    return () => {
      cancelled = true;
    };
  }, [canSpeak]);

  const pickRecordingMimeType = () => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }
    return PREFERRED_RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = async () => {
    if (!canTranscribe) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = pickRecordingMimeType();
      const mediaRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioMimeType = mediaRecorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm';
        const recordedBlob = new Blob(audioChunksRef.current, { type: audioMimeType });
        setIsProcessing(true);
        try {
          const preparedUpload = prefersAndroidAsrUpload
            ? await prepareAndroidAsrUpload(recordedBlob, preferredAsrUploadMimeType)
            : { blob: recordedBlob, mimeType: audioMimeType };
          const res = await api.transcribeAudio(preparedUpload.blob, {
            transport: prefersAndroidAsrUpload ? 'json-base64' : 'multipart',
            mimeType: preparedUpload.mimeType,
            language: selectedAsrLanguage || ttsLang,
          });
          setTranscript(res.text);
          setLastAsrLanguage(typeof res.language === 'string' ? res.language : (selectedAsrLanguage || null));
          setLastAsrBackend(typeof res.backend === 'string' ? res.backend : null);
        } catch (error) {
          console.error("Transcription error:", error);
          const message = error instanceof Error ? error.message : 'Could not transcribe audio.';
          setTranscript(`Error: ${message}`);
          setLastAsrLanguage(selectedAsrLanguage || null);
          setLastAsrBackend(typeof asrDetail?.backend === 'string' ? asrDetail.backend : null);
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript(null);
      setReply(null);
      setLastAsrLanguage(null);
      setLastAsrBackend(null);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access is required to use the Talk panel.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleReplyAndSpeak = async () => {
    if (!transcript || isPlaying || !canReplyAndSpeak) return;
    setIsPlaying(true);

    try {
      // Step 1: Send transcript to the active local dialogue backend
      const chatRes = await api.chat(
        [{ role: 'user', content: transcript }],
        null,
        i18n.language,
      );
      const replyText = chatRes.content;
      setReply(replyText);

      // Step 2: Synthesize the reply via the active local TTS backend
      const audioBlob = await api.synthesizeSpeech(replyText, ttsLang, selectedVoice || null);
      if (audioBlob.size > 0) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else if (allowsSyntheticFallbacks()) {
        fallbackTTS(replyText);
      } else {
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("Talk pipeline error:", err);
      if (reply && allowsSyntheticFallbacks()) {
        fallbackTTS(reply);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handleSpeakSample = async () => {
    if (!canSpeak || !ttsDraft.trim() || isPlaying) return
    setIsPlaying(true)

    try {
      const audioBlob = await api.synthesizeSpeech(ttsDraft.trim(), ttsLang, selectedVoice || null)
      if (audioBlob.size > 0) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else if (allowsSyntheticFallbacks()) {
        fallbackTTS(ttsDraft.trim());
      } else {
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("TTS sample error:", err);
      if (allowsSyntheticFallbacks()) {
        fallbackTTS(ttsDraft.trim());
      } else {
        setIsPlaying(false);
      }
    }
  };

  const fallbackTTS = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLang;
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full max-w-4xl mx-auto w-full p-6"
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        
        {/* Microphone Button */}
        <div className="relative mb-12">
          {isRecording && (
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-error/20 rounded-full blur-xl"
            />
          )}
          <button
            onClick={toggleRecording}
            disabled={isProcessing || !canTranscribe}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border-4 ${
              isRecording 
                ? 'bg-error/10 border-error text-error' 
                : isProcessing
                  ? 'bg-bg-surface border-border-color text-text-secondary cursor-not-allowed'
                  : !canTranscribe
                    ? 'bg-bg-surface border-border-color text-text-secondary cursor-not-allowed'
                  : 'bg-bg-surface border-border-color text-accent hover:border-accent hover:bg-accent/5'
            }`}
          >
            {isProcessing ? (
              <Loader2 size={40} className="animate-spin" />
            ) : isRecording ? (
              <Square size={40} fill="currentColor" />
            ) : (
              <Mic size={48} />
            )}
          </button>
        </div>

        {/* Transcript Area */}
        <div className="w-full max-w-2xl bg-bg-surface border border-border-color rounded-2xl p-8 min-h-[200px] flex flex-col relative">
          <div className="absolute top-4 left-6 flex items-center gap-2 text-xs font-mono text-text-secondary">
            <Volume2 size={14} />
            <span>
              ASR: {canTranscribe ? (lastAsrBackend || asrDetail?.backend || asrDetail?.model || 'local runtime') : 'not installed'}
            </span>
            {canTranscribe && (lastAsrLanguage || selectedAsrLanguage) && (
              <>
                <span>•</span>
                <span>Recognition: {lastAsrLanguage || selectedAsrLanguage}</span>
              </>
            )}
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center mt-4 gap-4">
            {isRecording ? (
              <div className="flex items-center gap-2 text-error animate-pulse">
                <div className="w-2 h-2 rounded-full bg-error"></div>
                <span>Listening...</span>
              </div>
            ) : isProcessing ? (
              <div className="flex items-center gap-2 text-accent animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Transcribing locally...</span>
              </div>
            ) : transcript ? (
              <>
                <p className="text-lg text-text-secondary leading-relaxed text-center">
                  You: "{transcript}"
                </p>
                {lastAsrLanguage && (
                  <p className="text-xs font-mono text-text-secondary text-center">
                    Recognized with {lastAsrLanguage}
                  </p>
                )}
                {reply && (
                  <p className="text-xl text-text-primary leading-relaxed text-center font-medium">
                    Nerd: "{reply}"
                  </p>
                )}
                {!canReplyAndSpeak && (
                  <p className="text-sm text-text-secondary text-center">
                    Transcript is available, but reply + speech are not enabled on this node yet.
                  </p>
                )}
              </>
            ) : (
              <div className="text-text-secondary text-center space-y-2">
                {canTranscribe ? (
                  <p>
                    Click the microphone to start speaking. <br/>
                    Audio is routed through this node&apos;s local ASR runtime.
                  </p>
                ) : (
                  <p>
                    This node serves the Talk UI, but local ASR is not active yet.
                  </p>
                )}
                {capabilities && missingTalkCapabilities && (
                  <p className="text-xs font-mono">
                    Missing: {missingTalkCapabilities}
                  </p>
                )}
              </div>
            )}
          </div>

          {canTranscribe && (
            <div className="mt-6 rounded-xl border border-border-color bg-bg-input/20 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-text-secondary" htmlFor="talk-asr-language-select">
                  Recognition Language
                </label>
                <span className="text-xs font-mono text-text-secondary">
                  {supportedAsrLanguages.length} local language{supportedAsrLanguages.length === 1 ? '' : 's'}
                </span>
              </div>
              <select
                id="talk-asr-language-select"
                value={selectedAsrLanguage}
                onChange={(e) => setSelectedAsrLanguage(e.target.value)}
                className="w-full bg-bg-input border border-border-color rounded-xl px-3 py-2 text-text-primary outline-none focus:border-accent transition-colors"
              >
                {supportedAsrLanguages.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} · {option.value}
                  </option>
                ))}
              </select>
              <div className="text-xs text-text-secondary">
                This Motorola currently has local ASR models for English and Spanish only.
              </div>
            </div>
          )}

          {canSpeak && (
            <div className="mt-6 rounded-xl border border-border-color bg-bg-input/20 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-text-secondary" htmlFor="talk-voice-select">
                  Voice
                </label>
                <span className="text-xs font-mono text-text-secondary">
                  {isLoadingVoices ? 'Loading voices...' : `${filteredVoices.length} matching voices`}
                </span>
              </div>
              <select
                id="talk-voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-bg-input border border-border-color rounded-xl px-3 py-2 text-text-primary outline-none focus:border-accent transition-colors"
              >
                <option value="">Auto ({ttsLang})</option>
                {filteredVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.languageTag} · {voice.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!transcript && !isRecording && !isProcessing && !canTranscribe && canSpeak && (
            <div className="mt-8 space-y-3">
              <div className="rounded-xl border border-border-color bg-bg-input/50 p-4 space-y-3">
                <div className="text-sm text-text-secondary">
                  TTS-only mode is available on this node. Enter text to verify the live Android speech backend.
                </div>
                <textarea
                  value={ttsDraft}
                  onChange={(e) => setTtsDraft(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-input border border-border-color rounded-xl p-3 text-text-primary placeholder:text-text-secondary resize-none outline-none focus:border-accent transition-colors"
                  placeholder="Enter text to speak..."
                />
                <div className="flex justify-center">
                  <button
                    onClick={handleSpeakSample}
                    disabled={!ttsDraft.trim() || isPlaying}
                    className="flex items-center gap-2 px-4 py-2 bg-bg-input hover:bg-border-color text-text-primary rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isPlaying ? <StopCircle size={16} /> : <Play size={16} />}
                    {isPlaying ? 'Speaking sample...' : 'Speak sample'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {transcript && !isRecording && !isProcessing && (
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={handleReplyAndSpeak}
                disabled={isPlaying || !canReplyAndSpeak}
                className="flex items-center gap-2 px-4 py-2 bg-bg-input hover:bg-border-color text-text-primary rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isPlaying ? <StopCircle size={16} /> : <Play size={16} />}
                {isPlaying ? 'Thinking & speaking...' : canReplyAndSpeak ? 'Ask Nerd & Speak' : 'Reply + speech unavailable'}
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-mono text-text-secondary">
            <span>Chat: {canChat ? (chatDetail?.backend || chatDetail?.model || 'local route') : 'not installed'}</span>
            <span>•</span>
            <span>TTS: {canSpeak ? (ttsDetail?.backend || ttsDetail?.model || 'local runtime') : 'not installed'}</span>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
