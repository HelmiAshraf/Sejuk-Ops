import { useState, useRef, useEffect } from 'react';
import { queryAIStream, type ConversationMessage } from '../../api/ai';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import { Bot, Send, Sparkles, User, Zap } from 'lucide-react';

interface UIMessage {
  role: 'user' | 'ai';
  content: string;
  toolUsed?: string | null;
  streaming?: boolean;
}

const SUGGESTED = [
  'What jobs did Ali complete last week?',
  'Which technician completed the most jobs this week?',
  'How many jobs were completed today?',
  'Are there any completed jobs with no photos?',
  'What is the total revenue this month?',
  'Which technician might be overloaded this week?',
];

export default function AIQueryPage() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build conversation history for memory — only user/assistant turns
  const buildHistory = (): ConversationMessage[] =>
    messages
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    setInput('');
    setLoading(true);
    setStatusText('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: question }]);

    // Add placeholder AI message (streaming in progress)
    setMessages(prev => [...prev, { role: 'ai', content: '', streaming: true }]);

    const history = buildHistory();
    let accumulated = '';
    let toolUsed: string | null = null;

    try {
      for await (const event of queryAIStream(question, history)) {
        if (event.type === 'status' && event.message) {
          setStatusText(event.message);
        } else if (event.type === 'delta' && event.text) {
          accumulated += event.text;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'ai', content: accumulated, streaming: true };
            return updated;
          });
        } else if (event.type === 'done') {
          toolUsed = event.toolUsed ?? null;
        } else if (event.type === 'error') {
          accumulated = event.message ?? 'An error occurred. Please try again.';
        }
      }
    } catch {
      accumulated = 'Sorry, I could not process that. Please try again.';
    }

    // Finalise message (remove streaming flag)
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: 'ai', content: accumulated, streaming: false, toolUsed };
      return updated;
    });

    setLoading(false);
    setStatusText('');
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={22} className="text-blue-500" /> AI Operations Assistant
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ask questions about service orders, technicians, and performance
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-gray-600 transition mt-1"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Chat window */}
      <Card>
        <div className="h-[460px] overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={40} className="text-blue-200 mb-3" />
              <p className="text-gray-400 text-sm">Ask me anything about your operations data</p>
              <p className="text-gray-300 text-xs mt-1">Powered by Claude + live database queries</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={16} className="text-blue-600" />
                </div>
              )}

              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                {msg.role === 'ai' ? (
                  <>
                    {msg.content ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">{statusText || 'Thinking...'}</span>
                    )}
                    {msg.streaming && msg.content && (
                      <span className="inline-block w-1 h-4 bg-blue-500 ml-0.5 animate-pulse rounded" />
                    )}
                    {/* Show which tool was used (transparency for demo) */}
                    {msg.toolUsed && !msg.streaming && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                        <Zap size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-400">{msg.toolUsed.replace('query_', '').replace(/_/g, ' ')}</span>
                      </div>
                    )}
                  </>
                ) : (
                  msg.content
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ask(input)}
            placeholder="Ask about orders, technicians, revenue..."
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <Button onClick={() => ask(input)} disabled={!input.trim() || loading}>
            <Send size={16} />
          </Button>
        </div>
      </Card>

      {/* Suggested questions */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Try asking</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              disabled={loading}
              className="text-sm bg-white border border-gray-200 rounded-full px-4 py-1.5 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
