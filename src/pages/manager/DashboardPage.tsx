import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrders } from '../../api/orders';
import { queryAIStream, type ConversationMessage } from '../../api/ai';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import type { Order, OrderStatus } from '../../types';
import { ArrowRight, Bot, ChevronLeft, ChevronRight, RotateCcw, Send, Sparkles, X, Wrench, Clock, CheckCircle2, DollarSign, Trophy, Zap } from 'lucide-react';

interface TechStat { name: string; completed: number; inProgress: number; }
interface AIMessage { role: 'user' | 'ai'; content: string; streaming?: boolean; }

const LS_KEY = 'dashboard_ai_messages';

const PIPELINE: { status: OrderStatus; label: string; bg: string; text: string }[] = [
  { status: 'New',         label: 'New',         bg: 'bg-slate-100',   text: 'text-slate-500' },
  { status: 'Assigned',    label: 'Assigned',     bg: 'bg-blue-50',     text: 'text-blue-600' },
  { status: 'In Progress', label: 'In Progress',  bg: 'bg-amber-50',    text: 'text-amber-600' },
  { status: 'Job Done',    label: 'Job Done',     bg: 'bg-emerald-50',  text: 'text-emerald-600' },
  { status: 'Reviewed',    label: 'Reviewed',     bg: 'bg-violet-50',   text: 'text-violet-600' },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [techStats, setTechStats] = useState<TechStat[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const [aiOpen, setAiOpen] = useState(true); // true = 45% chat, false = 25% chat (desktop)
  const [mobileAiOpen, setMobileAiOpen] = useState(false); // mobile full-screen chat

  // Shuffle quick-asks on every mount so order rotates each navigation
  const [shuffledAsks] = useState(() => {
    const ALL = [
      'Top technician this week?',
      'Jobs with no photos?',
      "Today's revenue?",
      'Anyone overloaded?',
      'How many jobs done this month?',
      'Which jobs need attention first?',
    ];
    return [...ALL].sort(() => Math.random() - 0.5);
  });

  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const aiBottomRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const briefingStarted = useRef(!!sessionStorage.getItem('dashboard_briefing_done'));

  useEffect(() => {
    const stable = messages.filter(m => !m.streaming);
    if (stable.length > 0) localStorage.setItem(LS_KEY, JSON.stringify(stable));
  }, [messages]);

  useEffect(() => {
    Promise.all([
      getOrders(),
      supabase.from('job_completions').select('final_amount, technician_id'),
      supabase.from('technicians').select('id, name'),
    ]).then(([ords, { data: completions }, { data: technicians }]) => {
      setOrders(ords);
      setTotalRevenue((completions ?? []).reduce((s, c) => s + (c.final_amount ?? 0), 0));
      const nameById: Record<string, string> = {};
      (technicians ?? []).forEach(t => { nameById[t.id] = t.name; });
      const techMap: Record<string, TechStat> = {};
      (completions ?? []).forEach(c => {
        const name = nameById[c.technician_id]; if (!name) return;
        if (!techMap[name]) techMap[name] = { name, completed: 0, inProgress: 0 };
        techMap[name].completed++;
      });
      ords.forEach(o => {
        const name = o.technician?.name;
        if (!name || o.status !== 'In Progress') return;
        if (!techMap[name]) techMap[name] = { name, completed: 0, inProgress: 0 };
        techMap[name].inProgress++;
      });
      setTechStats(Object.values(techMap).sort((a, b) => b.completed - a.completed));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const buildHistory = useCallback((): ConversationMessage[] =>
    messages.filter(m => !m.streaming).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user', content: m.content,
    })), [messages]);

  const askAI = useCallback(async (question: string, isAuto = false) => {
    if (!question.trim() || aiLoading) return;
    setAiInput(''); setAiLoading(true); setStatusText('');
    if (!isAuto) setMessages(prev => [...prev, { role: 'user', content: question }]);
    setMessages(prev => [...prev, { role: 'ai', content: '', streaming: true }]);
    const history = isAuto ? [] : buildHistory();
    let out = '';
    try {
      for await (const ev of queryAIStream(question, history)) {
        if (ev.type === 'status' && ev.message) setStatusText(ev.message);
        else if (ev.type === 'delta' && ev.text) {
          out += ev.text;
          setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'ai', content: out, streaming: true }; return u; });
        } else if (ev.type === 'error') out = ev.message ?? 'Error.';
      }
    } catch { out = 'Could not connect.'; }
    setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'ai', content: out, streaming: false }; return u; });
    setAiLoading(false); setStatusText('');
    if (!isAuto) aiInputRef.current?.focus();
  }, [aiLoading, buildHistory]);

  useEffect(() => {
    if (!loading && !briefingStarted.current && messages.length === 0) {
      briefingStarted.current = true;
      sessionStorage.setItem('dashboard_briefing_done', '1');
      const ip = orders.filter(o => o.status === 'In Progress').length;
      const pr = orders.filter(o => o.status === 'Job Done').length;
      askAI(`Operations briefing: ${ip} jobs in progress, ${pr} pending review. Top technician, any concerns. 3-4 bullets, direct and actionable.`, true);
    }
  }, [askAI, loading, messages.length, orders]);

  const clearChat = () => { setMessages([]); localStorage.removeItem(LS_KEY); };

  if (loading) return <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>;

  const inProgress    = orders.filter(o => o.status === 'In Progress').length;
  const pendingReview = orders.filter(o => o.status === 'Job Done').length;
  const completed     = orders.filter(o => ['Reviewed', 'Closed'].includes(o.status)).length;
  const pipelineCounts = PIPELINE.map(p => ({ ...p, count: orders.filter(o => o.status === p.status).length }));
  const maxCompleted  = Math.max(...techStats.map(t => t.completed), 1);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });


  return (
    <div className="-mx-4 md:-mx-8 md:flex md:rounded-none md:border-y md:border-slate-200 md:shadow-sm bg-white relative">

      {/* ───────────────── LEFT · Dashboard ───────────────── */}
      <div className="flex-1 min-w-0 md:border-r border-slate-200 transition-all duration-300">

        {/* Page header */}
        <div className="px-5 md:px-6 pt-5 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-medium">{dateStr}</p>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">{greeting}</h1>
            </div>
            {pendingReview > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold text-amber-700">{pendingReview} to review</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-5 space-y-4">

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Active Jobs */}
            <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-sm shadow-blue-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-200">Active Jobs</span>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Wrench size={13} className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold font-mono leading-none">{inProgress}</p>
              <p className="text-[11px] text-blue-200 mt-1.5">in progress now</p>
            </div>

            {/* Needs Review */}
            <div className={`rounded-2xl p-4 shadow-sm ${pendingReview > 0 ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-slate-100 text-slate-500'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-semibold uppercase tracking-widest ${pendingReview > 0 ? 'text-amber-100' : 'text-slate-400'}`}>Needs Review</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${pendingReview > 0 ? 'bg-white/20' : 'bg-slate-200'}`}>
                  <Clock size={13} className={pendingReview > 0 ? 'text-white' : 'text-slate-400'} />
                </div>
              </div>
              <p className={`text-3xl font-bold font-mono leading-none ${pendingReview > 0 ? 'text-white' : 'text-slate-400'}`}>{pendingReview}</p>
              <p className={`text-[11px] mt-1.5 ${pendingReview > 0 ? 'text-amber-100' : 'text-slate-400'}`}>{pendingReview > 0 ? 'action required' : 'all clear'}</p>
            </div>

            {/* Completed */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Completed</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-3xl font-bold font-mono leading-none text-emerald-600">{completed}</p>
              <p className="text-[11px] text-slate-400 mt-1.5">reviewed & closed</p>
            </div>

            {/* Revenue */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Revenue</span>
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <DollarSign size={13} className="text-violet-600" />
                </div>
              </div>
              <p className="text-xl font-bold font-mono leading-none text-violet-600 truncate">
                {totalRevenue > 0 ? `RM ${totalRevenue.toLocaleString('en-MY')}` : 'RM 0'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5">from completions</p>
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">Pipeline</h2>
              <span className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">{orders.length} jobs</span>
            </div>
            <div className="flex items-center gap-1">
              {pipelineCounts.map((s, i) => (
                <div key={s.status} className="flex items-center flex-1 min-w-0">
                  <div className={`flex-1 rounded-xl ${s.bg} border border-slate-200 px-2 py-2.5 text-center min-w-0`}>
                    <p className={`text-[10px] font-semibold ${s.text} truncate leading-tight mb-1`}>{s.label}</p>
                    <p className="text-xl font-bold font-mono text-slate-900">{s.count}</p>
                  </div>
                  {i < pipelineCounts.length - 1 && (
                    <ArrowRight size={10} className="text-slate-300 flex-shrink-0 mx-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Technician Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-800">Technician Performance</h2>
            </div>
            {techStats.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {techStats.map((t, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const pct = Math.round((t.completed / maxCompleted) * 100);
                  const barColors = ['bg-blue-500', 'bg-slate-400', 'bg-slate-300'];
                  return (
                    <div key={t.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className="text-base w-6 flex-shrink-0 text-center">
                        {medals[i] ?? <span className="text-xs font-bold text-slate-300">#{i+1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-slate-800 truncate">{t.name}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {t.inProgress > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                <Zap size={9} />
                                {t.inProgress}
                              </span>
                            )}
                            <span className="text-sm font-bold font-mono text-slate-700">{t.completed}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColors[i] ?? 'bg-slate-200'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Toggle tab on the divider — desktop only */}
      <button
        onClick={() => setAiOpen(o => !o)}
        title={aiOpen ? 'Slim chat (25%)' : 'Expand chat (45%)'}
        className="hidden md:flex sticky top-1/2 z-20 items-center justify-center w-5 h-12 rounded-l-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all duration-300 self-start mt-[40vh] -mr-0 flex-shrink-0"
      >
        {aiOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* ───────────────── RIGHT · AI Panel — desktop only ───────────────── */}
      <div
        className="hidden md:flex flex-col bg-white overflow-hidden transition-all duration-300 self-stretch"
        style={{ width: aiOpen ? '45%' : '25%', minHeight: 'calc(100dvh - 56px)' }}
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={17} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm leading-tight">Operations Assistant</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${aiLoading ? 'bg-yellow-300 animate-pulse' : 'bg-emerald-300'}`} />
                  <span className="text-xs text-blue-200 truncate">
                    {aiLoading ? statusText || 'Thinking...' : 'Live · AI-powered'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={clearChat} disabled={aiLoading} title="Clear chat"
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition disabled:opacity-40 flex-shrink-0">
              <RotateCcw size={13} />
            </button>
          </div>

        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
                <Bot size={24} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Operations Assistant</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[220px] leading-relaxed">
                Ask about jobs, revenue, technician workload, or missing photos
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white px-4 py-3 rounded-tr-sm shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.role === 'ai' ? (
                      msg.content ? (
                        <>
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-slate-900">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.streaming && <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle animate-pulse rounded" />}
                        </>
                      ) : (
                        <span className="text-xs italic text-slate-400">{statusText || 'Thinking...'}</span>
                      )
                    ) : msg.content}
                  </div>
                </div>
              ))}
              <div ref={aiBottomRef} />
            </>
          )}
        </div>

        {/* Quick asks — horizontal scroll, shuffled order on each mount */}
        {!aiLoading && messages.some(m => m.content && !m.streaming) && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex gap-1.5 overflow-x-auto no-scrollbar">
            {shuffledAsks.map(q => (
              <button key={q} onClick={() => askAI(q)}
                className="text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition whitespace-nowrap flex-shrink-0">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-sm transition-all">
            <input
              ref={aiInputRef}
              type="text"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askAI(aiInput)}
              placeholder="Ask about your operations..."
              disabled={aiLoading}
              className="flex-1 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 min-w-0"
            />
            <button
              onClick={() => askAI(aiInput)}
              disabled={!aiInput.trim() || aiLoading}
              className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────── MOBILE · FAB ───────────────── */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        {/* Label badge top-left of button */}
        <div className="absolute -top-2 -left-2 pointer-events-none">
          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow leading-tight whitespace-nowrap">
            {messages.length > 0 ? `${messages.filter(m => m.role === 'ai' && !m.streaming).length} msgs` : 'Ask AI'}
          </span>
        </div>
        <button
          onClick={() => setMobileAiOpen(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Sparkles size={22} />
        </button>
      </div>

      {/* ───────────────── MOBILE · Full-screen chat ───────────────── */}
      {mobileAiOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={17} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm leading-tight">Operations Assistant</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${aiLoading ? 'bg-yellow-300 animate-pulse' : 'bg-emerald-300'}`} />
                    <span className="text-xs text-blue-200 truncate">
                      {aiLoading ? statusText || 'Thinking...' : 'Live · AI-powered'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearChat} disabled={aiLoading} title="Clear chat"
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition disabled:opacity-40">
                  <RotateCcw size={13} />
                </button>
                <button onClick={() => setMobileAiOpen(false)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
                  <Bot size={24} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Operations Assistant</p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[220px] leading-relaxed">
                  Ask about jobs, revenue, technician workload, or missing photos
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Bot size={14} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white px-4 py-3 rounded-tr-sm shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.role === 'ai' ? (
                        msg.content ? (
                          <>
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-slate-900">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.streaming && <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle animate-pulse rounded" />}
                          </>
                        ) : (
                          <span className="text-xs italic text-slate-400">{statusText || 'Thinking...'}</span>
                        )
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={aiBottomRef} />
              </>
            )}
          </div>

          {/* Quick asks */}
          {!aiLoading && messages.some(m => m.content && !m.streaming) && (
            <div className="border-t border-slate-200 bg-white px-4 py-3 flex gap-1.5 overflow-x-auto no-scrollbar">
              {shuffledAsks.map(q => (
                <button key={q} onClick={() => askAI(q)}
                  className="text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition whitespace-nowrap flex-shrink-0">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-sm transition-all">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askAI(aiInput)}
                placeholder="Ask about your operations..."
                disabled={aiLoading}
                className="flex-1 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 min-w-0"
              />
              <button
                onClick={() => askAI(aiInput)}
                disabled={!aiInput.trim() || aiLoading}
                className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
