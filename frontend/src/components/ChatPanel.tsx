import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User } from 'lucide-react';
import { api, getCapabilityDetail, isCapabilityAvailable, NodeCapabilities } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  capabilities?: NodeCapabilities | null;
}

export function ChatPanel({ capabilities = null }: ChatPanelProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatDetail = getCapabilityDetail(capabilities, 'chat');
  const chatAvailable = capabilities ? isCapabilityAvailable(capabilities, 'chat') : true;
  const chatRoute = chatDetail?.backend || chatDetail?.model || 'local route';
  const chatTier = chatDetail?.tier || 'capability gated';

  // Set initial greeting based on language
  useEffect(() => {
    let greeting = "Hello! I am iHomeNerd, your local AI brain. How can I help you today?";
    if (i18n.language === 'zh') greeting = "你好！我是 iHomeNerd，您的本地 AI 大脑。今天我能帮您什么？";
    else if (i18n.language === 'ko') greeting = "안녕하세요! 저는 귀하의 로컬 AI 두뇌인 iHomeNerd입니다. 오늘 무엇을 도와드릴까요?";
    else if (i18n.language === 'ja') greeting = "こんにちは！私はあなたのローカルAIブレイン、iHomeNerdです。今日はどのようなご用件でしょうか？";
    else if (i18n.language === 'ru') greeting = "Привет! Я iHomeNerd, ваш локальный ИИ-мозг. Чем я могу помочь вам сегодня?";
    else if (i18n.language === 'de') greeting = "Hallo! Ich bin iHomeNerd, Ihr lokales KI-Gehirn. Wie kann ich Ihnen heute helfen?";
    else if (i18n.language === 'fr') greeting = "Bonjour ! Je suis iHomeNerd, votre cerveau IA local. Comment puis-je vous aider aujourd'hui ?";
    else if (i18n.language === 'it') greeting = "Ciao! Sono iHomeNerd, il tuo cervello IA locale. Come posso aiutarti oggi?";
    else if (i18n.language === 'es') greeting = "¡Hola! Soy iHomeNerd, tu cerebro de IA local. ¿Cómo puedo ayudarte hoy?";
    else if (i18n.language === 'pt') greeting = "Olá! Sou o iHomeNerd, seu cérebro de IA local. Como posso ajudar você hoje?";

    setMessages([{
      id: '1',
      role: 'assistant',
      content: greeting
    }]);
  }, [i18n.language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chatAvailable) return;
    
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Map to the format expected by the API
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.chat(apiMessages, null, i18n.language);
      
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: response.role as 'assistant',
          content: response.content,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      const message = error instanceof Error ? error.message : 'Could not reach the local AI brain.';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-bg-surface border border-border-color text-accent'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div
              className={`px-5 py-3 rounded-2xl max-w-[80%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-user-bubble text-text-primary rounded-tr-sm'
                  : 'bg-agent-bubble border border-border-color text-text-primary rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 flex-row"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-bg-surface border border-border-color text-accent">
              <Bot size={16} />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-agent-bubble border border-border-color text-text-primary rounded-tl-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 pt-0">
        {capabilities && !chatAvailable && (
          <div className="mb-3 rounded-xl border border-border-color bg-bg-surface px-4 py-3 text-sm text-text-secondary">
            Chat is not active on this node yet. Install or enable a local dialogue backend before using this tab.
          </div>
        )}
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              chatAvailable
                ? (i18n.language === 'zh' ? "问问你的本地大脑任何问题..." : "Ask your local brain anything...")
                : "Chat is not available on this node yet."
            }
            disabled={isLoading || !chatAvailable}
            className="w-full bg-bg-input border border-border-color rounded-xl py-4 pl-5 pr-14 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-accent hover:bg-accent-hover disabled:bg-bg-surface disabled:text-text-secondary text-white rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="text-center mt-3 text-xs text-text-secondary font-mono">
          {chatAvailable
            ? `Capability: chat • ${chatRoute} • ${chatTier}`
            : 'Capability: chat • Not installed on this node yet'}
        </div>
      </div>
    </div>
  );
}
