import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, Square, Play, Volume2, Loader2, StopCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

// Map i18n language codes to BCP-47 for Kokoro TTS
const TTS_LANG_MAP: Record<string, string> = {
  en: 'en-US', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP',
  ru: 'ru-RU', de: 'de-DE', fr: 'fr-FR', it: 'it-IT',
  es: 'es-ES', pt: 'pt-BR',
};

export function TalkPanel() {
  const { t, i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const ttsLang = TTS_LANG_MAP[i18n.language] || 'en-US';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        try {
          const res = await api.transcribeAudio(audioBlob);
          setTranscript(res.text);
        } catch (error) {
          console.error("Transcription error:", error);
          setTranscript("Error: Could not transcribe audio.");
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript(null);
      setReply(null);
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
    if (!transcript || isPlaying) return;
    setIsPlaying(true);

    try {
      // Step 1: Send transcript to Gemma 4 brain for a response
      const chatRes = await api.chat(
        [{ role: 'user', content: transcript }],
        null,
        i18n.language,
      );
      const replyText = chatRes.content;
      setReply(replyText);

      // Step 2: Synthesize the reply via Kokoro TTS
      const audioBlob = await api.synthesizeSpeech(replyText, ttsLang);
      if (audioBlob.size > 0) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else {
        fallbackTTS(replyText);
      }
    } catch (err) {
      console.error("Talk pipeline error:", err);
      if (reply) {
        fallbackTTS(reply);
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
            disabled={isProcessing}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border-4 ${
              isRecording 
                ? 'bg-error/10 border-error text-error' 
                : isProcessing
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
            <span>ASR: whisper-small-int8</span>
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
                {reply && (
                  <p className="text-xl text-text-primary leading-relaxed text-center font-medium">
                    Nerd: "{reply}"
                  </p>
                )}
              </>
            ) : (
              <p className="text-text-secondary text-center">
                Click the microphone to start speaking. <br/>
                Audio is transcribed locally on your machine.
              </p>
            )}
          </div>

          {transcript && !isRecording && !isProcessing && (
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={handleReplyAndSpeak}
                disabled={isPlaying}
                className="flex items-center gap-2 px-4 py-2 bg-bg-input hover:bg-border-color text-text-primary rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isPlaying ? <StopCircle size={16} /> : <Play size={16} />}
                {isPlaying ? 'Thinking & speaking...' : 'Ask Nerd & Speak'}
              </button>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
