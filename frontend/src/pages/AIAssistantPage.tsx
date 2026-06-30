import { Bot, Mic, Send, Shield, Volume2, VolumeX, SquareSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Card,
  LoadingState,
  SafetyDisclaimer,
  SourceBadge,
} from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import { usePredictionSession } from '../context/PredictionContext';
import * as agentService from '../services/agentService';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
};

const quickPrompts = [
  'Explain this prediction',
  'Generate clinical summary',
  'What vitals are abnormal?',
  'What should be monitored?',
  'Why is this high risk?',
  'Create alert message',
];

const OUT_OF_SCOPE =
  'I can only help with sepsis prediction results, patient risk explanation, clinical summaries, alerts, feedback, and monitoring support.';

export default function AIAssistantPage() {
  const { assistantContext } = usePredictionSession();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content:
        'Hello. I am SepsisAI Assistant. I can help explain prediction results, risk levels, abnormal vitals, alerts, and monitoring support within scope.',
      source: 'fallback',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    );

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakOnce = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    setIsSpeaking(true);
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (text: string, useVoice = false) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = { id: Date.now(), role: 'user', content: text.trim() };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const context = assistantContext ?? {
        patientId: undefined,
        risk_level: 'Medium Risk',
        sepsis_probability: 0.5,
        abnormal_features: [],
      };

      const response = useVoice
        ? await agentService.voiceQuery(text, context.patientId, {
            risk_level: context.risk_level,
            sepsis_probability: context.sepsis_probability,
            abnormal_features: context.abnormal_features,
          })
        : await agentService.chat(text, context.patientId, {
            risk_level: context.risk_level,
            sepsis_probability: context.sepsis_probability,
            abnormal_features: context.abnormal_features,
          });

      const reply = response.reply ?? OUT_OF_SCOPE;
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: reply, source: response.source },
      ]);

      if (useVoice) {
        speakOnce(reply);
      }
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Assistant unavailable.',
          source: 'fallback',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = () => {
    if (isListening) return;
    
    if (!voiceSupported) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          role: 'assistant',
          content: 'Voice input is not supported in this browser. Please type your question instead.',
          source: 'fallback',
        },
      ]);
      return;
    }

    const SpeechRecognitionCtor =
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const recognition: any = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) sendMessage(transcript, true);
      try { recognition.stop(); } catch (e) {}
    };
    recognition.start();
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <PageHeader
        title="SepsisAI Assistant"
        description="Scoped clinical decision-support chat powered by the backend Gemini assistant."
      />

      <Card className="mb-4 flex-shrink-0 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100">
            <Bot size={18} className="text-[#006970]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">SepsisAI Assistant</h2>
            <p className="text-xs text-slate-500">
              {assistantContext
                ? `Context loaded for ${assistantContext.patientId ?? 'current patient'}`
                : 'Run a prediction first for richer context, or ask general project help.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-3 flex flex-shrink-0 flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => sendMessage(prompt)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-[#006970] hover:text-[#006970]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <Card className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                message.role === 'user' ? 'bg-[#00478d]/10 text-[#00478d]' : 'bg-teal-100 text-[#006970]'
              }`}
            >
              {message.role === 'user' ? 'You' : <Bot size={13} />}
            </div>
            <div className={`max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              {message.source && message.role === 'assistant' && <SourceBadge source={message.source} />}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  message.role === 'user'
                    ? 'rounded-tr-sm bg-[#00478d] text-white'
                    : 'rounded-tl-sm bg-[#F0FDFA] text-slate-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}
        {loading && <LoadingState message="Assistant is thinking…" />}
        <div ref={endRef} />
      </Card>

      <div className="mt-3 flex flex-shrink-0 items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 focus-within:border-[#00478d] focus-within:ring-2 focus-within:ring-[#00478d]/20">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage(input)}
            placeholder="Ask about prediction results, risk, vitals, alerts, or monitoring…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            onClick={startVoiceInput}
            className={`hover:text-slate-800 ${isListening ? 'text-red-500' : 'text-slate-500'}`}
            title="Voice input"
            disabled={isListening}
          >
            <Mic size={15} />
          </button>
          {isSpeaking ? (
            <button
              type="button"
              onClick={stopSpeaking}
              className="text-red-500 hover:text-red-700"
              title="Stop Voice"
            >
              <VolumeX size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
                if (lastAssistant) {
                  speakOnce(lastAssistant.content);
                }
              }}
              className="text-slate-500 hover:text-slate-800"
              title="Read last reply"
            >
              <Volume2 size={15} />
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={!input.trim() || loading}
          onClick={() => sendMessage(input)}
          className="rounded-xl bg-[#00478d] p-2.5 text-white hover:bg-[#00386f] disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-shrink-0 items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
        <Shield size={14} className="mt-0.5 text-[#00478d]" />
        <SafetyDisclaimer compact />
      </div>
    </div>
  );
}
