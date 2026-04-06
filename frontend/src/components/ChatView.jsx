import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProcessingSteps from './ProcessingSteps';
import FileUploadModal from './FileUploadModal';
import ThinkingSteps from './ThinkingSteps';
import { uploadFiles } from '../services/ingest_service';
import { authHeaders } from '../services/auth_service';

const mdComponents = {
  h1: ({children}) => <h1 className="text-2xl font-bold mt-5 mb-2 text-gray-900 dark:text-gray-100">{children}</h1>,
  h2: ({children}) => <h2 className="text-xl font-bold mt-4 mb-1.5 text-gray-900 dark:text-gray-100">{children}</h2>,
  h3: ({children}) => <h3 className="text-lg font-semibold mt-3 mb-1 text-gray-900 dark:text-gray-100">{children}</h3>,
  p:  ({children}) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
  ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({children}) => <li className="leading-relaxed">{children}</li>,
  strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
  em: ({children}) => <em className="italic">{children}</em>,
  a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted" style={{ color: '#00C9B1' }}>{children}</a>,
  blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-500 dark:text-gray-400 mb-3">{children}</blockquote>,
  hr: () => <hr className="border-gray-200 dark:border-gray-700 my-4" />,
  table: ({children}) => <div className="overflow-x-auto mb-3"><table className="w-full text-sm border-collapse">{children}</table></div>,
  thead: ({children}) => <thead className="bg-gray-100 dark:bg-[#2a2a2a]">{children}</thead>,
  th: ({children}) => <th className="px-3 py-2 text-left font-semibold border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{children}</th>,
  td: ({children}) => <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{children}</td>,
  code: ({ inline, className, children }) => {
    const language = className?.replace('language-', '') || 'text';
    return inline
      ? <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-pink-500 dark:text-pink-400">{children}</code>
      : <SyntaxHighlighter language={language} style={oneDark} customStyle={{ borderRadius: '8px', fontSize: '13px', margin: '0 0 12px 0' }}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>;
  },
};

function SourceBadges({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {sources.map((src, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {src}
        </span>
      ))}
    </div>
  );
}

function TypewriterMessage({ content, sources, onComplete, skip }) {
  const [displayed, setDisplayed] = useState(skip ? content : '');
  const [done, setDone] = useState(!!skip);
  const idx = useRef(0);

  useEffect(() => {
    if (skip) { setDisplayed(content); setDone(true); return; }
    idx.current = 0;
    setDisplayed('');
    setDone(false);

    const words = content.split(' ');
    const interval = setInterval(() => {
      idx.current += 1;
      setDisplayed(words.slice(0, idx.current).join(' '));
      if (idx.current >= words.length) {
        clearInterval(interval);
        setDone(true);
        setTimeout(() => onComplete?.(), 100);
      }
    }, 38);

    return () => clearInterval(interval);
  }, [content, skip]);

  return (
    <div className="px-1">
      <div className="text-[17px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{displayed}</ReactMarkdown>
      </div>
      {done && <SourceBadges sources={sources} />}
      <img
        src="/Archelon_logo.png"
        alt=""
        className={`block w-7 h-7 object-contain opacity-50 mt-2 ${!done ? 'animate-spin-slow' : ''}`}
      />
    </div>
  );
}

const ANIMATED_HINTS = [
  'Ask Arex...',
  'Share me your resume.',
  'What projects have you worked on?',
  'Tell me about your experience.',
  'What are your skills?',
];

function useAnimatedPlaceholder(active, textareaRef, defaultPlaceholder = 'Ask Arex...') {
  const idleTimer = useRef(null);
  const animTimer = useRef(null);
  const hintIdx = useRef(0);

  const clearTimers = () => {
    clearTimeout(idleTimer.current);
    clearTimeout(animTimer.current);
  };

  const setPlaceholder = (text) => {
    if (textareaRef.current) textareaRef.current.placeholder = text;
  };

  const runAnimation = () => {
    const hints = ANIMATED_HINTS;
    let charIdx = 0;
    const text = hints[hintIdx.current % hints.length];

    const typeChar = () => {
      charIdx++;
      setPlaceholder(text.slice(0, charIdx));
      if (charIdx < text.length) {
        animTimer.current = setTimeout(typeChar, 40);
      } else {
        animTimer.current = setTimeout(eraseChar, 1200);
      }
    };

    const eraseChar = () => {
      charIdx--;
      setPlaceholder(text.slice(0, charIdx));
      if (charIdx > 0) {
        animTimer.current = setTimeout(eraseChar, 25);
      } else {
        hintIdx.current++;
        animTimer.current = setTimeout(runAnimation, 400);
      }
    };

    typeChar();
  };

  const resetIdle = () => {
    if (!active) return;
    clearTimers();
    setPlaceholder(defaultPlaceholder);
    idleTimer.current = setTimeout(runAnimation, 10000);
  };

  useEffect(() => {
    if (!active) { clearTimers(); setPlaceholder(defaultPlaceholder); return; }
    idleTimer.current = setTimeout(runAnimation, 10000);
    return clearTimers;
  }, [active]);

  return { resetIdle };
}

const MODELS = [
  { id: 'mistral-large-latest',  name: 'mistral-large-latest',   desc: 'Most capable',        group: 'Mistral',   img: '/mistral.png' },
  { id: 'mistral-small-latest',  name: 'mistral-small-latest',   desc: 'Fast & efficient',    group: 'Mistral',   img: '/Small.png' },
  { id: 'codestral-latest',      name: 'codestral-latest',       desc: 'Code specialized',    group: 'Mistral',   img: '/Codestral.png' },
  { id: 'archelon-arca',         name: 'archelon-arca',          desc: 'Coming soon',         group: 'Archelon',  img: '/Archelon_logo.png', disabled: true },
  { id: 'archelon-tega',         name: 'archelon-tega',          desc: 'Coming soon',         group: 'Archelon',  img: '/Archelon_logo.png', disabled: true },
];

function ModelSelector({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const model = MODELS.find(m => m.id === selected) ?? MODELS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const groups = ['Mistral', 'Archelon'];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
      >
        <img src={model.img} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />
        <span>{model.name}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-9 left-0 z-50 w-64 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#1e1e1e]">
          <div className="px-3 pt-3 pb-1">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#00C9B1' }}>Select Model</p>
          </div>
          {groups.map(group => (
            <div key={group}>
              <div className="px-3 py-1.5">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">{group}</p>
              </div>
              {MODELS.filter(m => m.group === group).map(m => (
                <button
                  key={m.id}
                  type="button"
                  disabled={m.disabled}
                  onClick={() => { if (!m.disabled) { onChange(m.id); setOpen(false); } }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                    m.disabled
                      ? 'opacity-30 cursor-not-allowed grayscale'
                      : selected === m.id
                      ? 'bg-gray-100 dark:bg-[#2a2a2a]'
                      : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-[#2a2a2a]">
                    <img src={m.img} alt="" className="w-6 h-6 object-contain opacity-80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{m.desc}</div>
                  </div>
                  {selected === m.id && !m.disabled && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#00C9B1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700/60">
            <p className="text-[10px] text-gray-400 dark:text-gray-600">Archelon models coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatView({ agentData, onAddFile, messages, setMessages, isGreetingLoading, onDocumentsUpdated, onTokensUsed, onRequestBusy }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState(null);  // { id, content, sources }
  const streamingIdRef = useRef(null);
  const streamDoneRef = useRef(false);
  const [resumeFlow, setResumeFlow] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [processingMsgId, setProcessingMsgId] = useState(null);
  const [pendingResponse, setPendingResponse] = useState({});
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionInputTokens, setSessionInputTokens] = useState(0);
  const [sessionOutputTokens, setSessionOutputTokens] = useState(0);
  const [agentTotalTokens, setAgentTotalTokens] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Auto-send greeting when agent chat opens for the first time
  useEffect(() => {
    if (agentData && messages.length === 0) {
      handleSend('Hi', true);
    }
  }, [agentData?.id]);

  useEffect(() => {
    if (!agentData?.id) return;
    setSessionTokens(0);
    setSessionInputTokens(0);
    setSessionOutputTokens(0);
    fetch(`${import.meta.env.VITE_API_URL}/api/chat/tokens/${agentData.id}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    })
      .then(r => r.json())
      .then(d => setAgentTotalTokens(d.total_tokens ?? 0))
      .catch(() => {});
  }, [agentData?.id]);
  const [selectedModel, setSelectedModel] = useState('mistral-large-latest');
  const processingStarted = useRef(false);
  const messagesEndRef = useRef(null);

  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const scrollContainerRef = useRef(null);
  const isBusyRef = useRef(false);

  const textareaRef = useRef(null);
  const isArex = !agentData;
  const agentName = agentData ? agentData.name : 'Arex';
  const defaultPlaceholder = isArex ? 'Ask Arex...' : `Ask ${agentName}...`;
  const isBusy = isTyping || !!streamingMsg || isProcessingDoc;
  const { resetIdle } = useAnimatedPlaceholder(isArex && !input && !isBusy, textareaRef, defaultPlaceholder);
  const canUpload = agentData && !agentData.is_system;

  // Auto-scroll only when user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMsg, userScrolledUp]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(distFromBottom > 100);
  };

  const handleFileSelect = async (files) => {
    if (processingStarted.current) return;
    if (showUpgradeModal) return;
    const fileArray = Array.isArray(files) ? files : [files];
    processingStarted.current = true;
    setIsUploading(true);
    setIsProcessingDoc(true);
    try {
      const result = await uploadFiles(agentData.id, fileArray);
      setIsUploading(false);
      const jobs = result.files.map(f => ({
        jobId: f.job_id,
        filename: f.filename,
        fileSize: f.file_size,
      }));
      const id = Date.now();
      setProcessingMsgId(id);
      setMessages(prev => [...prev, { role: 'processing', id, jobs }]);
      fileArray.forEach(f => onAddFile?.(f));
    } catch (err) {
      setIsUploading(false);
      setIsProcessingDoc(false);
      processingStarted.current = false;
      if (err.message?.includes('Token limit')) {
        setShowUpgradeModal(true);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Upload failed: ${err.message}`, id: Date.now() }]);
      }
    }
  };

  const handleProcessingComplete = () => {
    setIsProcessingDoc(false);
    processingStarted.current = false;
    setMessages(prev => prev.map(m => m.role === 'processing' && !m.completed ? { ...m, completed: true } : m));
    onDocumentsUpdated?.();
  };

  const addAssistantMsg = (content, sources) => {
    setIsTyping(false);
    setStreamingMsg({ content: content.replace(/\u2014/g, '-'), sources, id: Date.now() });
  };

  const sendResumeWebhook = async (name, email) => {
    setIsTyping(true);
    try {
      const res = await fetch('https://n8n.aranixlabs.cloud/webhook/c6f0b2d8-c320-4ab7-9028-e24932938b54', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => null);
      const reply = (typeof data === 'string' ? data : data?.message || data?.reply || data?.response || data?.text)
        ?? 'Resume sent! Check your inbox.';
      addAssistantMsg(reply);
    } catch {
      addAssistantMsg('Something went wrong sending the resume. Please try again.');
    }
    setResumeFlow(null);
  };

  const handleSend = async (directInput, silent = false) => {
    const text = (typeof directInput === 'string' ? directInput : input).trim();
    if (!text) return;
    if (showUpgradeModal) return;
    setInput('');
    resetIdle();
    setUserScrolledUp(false);

    if (!silent) {
      const userMessage = { role: 'user', content: text, id: Date.now() };
      setMessages(prev => [...prev, userMessage]);
    }

    const resumeKeywords = ['resume', 'cv', 'send me your resume', 'share resume', 'share your resume', 'send resume', 'send your resume'];
    if (!resumeFlow && isArex && resumeKeywords.some(k => text.toLowerCase().includes(k))) {
      setResumeFlow({ step: 'askName' });
      setTimeout(() => addAssistantMsg('Sure! What is your name?'), 400);
      return;
    }

    if (resumeFlow?.step === 'askName') {
      setResumeFlow({ step: 'askEmail', name: text });
      setTimeout(() => addAssistantMsg('What is your email?'), 400);
      return;
    }
    if (resumeFlow?.step === 'askEmail') {
      setResumeFlow({ step: 'sending', name: resumeFlow.name });
      sendResumeWebhook(resumeFlow.name, text);
      return;
    }

    setIsTyping(true);
    onRequestBusy?.(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          message:            text,
          agent_id:           agentData?.id?.toString() ?? 'arex',
          session_id:         'session_1',
          agent_name:         agentData?.name ?? '',
          agent_description:  agentData?.description ?? '',
          agent_instructions: agentData?.instructions ?? '',
        }),
      });
      if (res.status === 402) {
        setIsTyping(false);
        onRequestBusy?.(false);
        setShowUpgradeModal(true);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let thinkingId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let event;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === 'meta') {
            setIsTyping(false);
            onRequestBusy?.(false);
            const { intent, thinking, search_thinking, search_queries } = event;
            if (intent === 'single' || intent === 'multi') {
              thinkingId = Date.now();
              setMessages(prev => [...prev, {
                role: 'thinking', id: thinkingId,
                query: thinking,
                searchThinking: search_thinking,
                sources: [],
                isSmallTalk: false,
              }]);
            }
            // smalltalk meta — no thinking steps, tokens arrive directly
          }

          if (event.type === 'token') {
            const token = event.token;
            if (!streamingIdRef.current) {
              const sid = Date.now();
              streamingIdRef.current = sid;
              // For smalltalk, don't show streaming bubble — wait for done then typewrite
              if (!thinkingId) {
                setStreamingMsg({ id: sid, content: token, sources: [], streaming: true, hidden: true });
              } else {
                setStreamingMsg({ id: sid, content: token, sources: [], streaming: true });
              }
            } else {
              setStreamingMsg(prev => prev ? { ...prev, content: prev.content + token } : prev);
            }
          }

          if (event.type === 'done') {
            const { sources, token_usage } = event;
            setStreamingMsg(prev => prev ? { ...prev, sources, streaming: false } : prev);
            if (thinkingId) {
              setMessages(prev => prev.map(m => m.id === thinkingId ? { ...m, sources } : m));
            }
            const inputTokens  = token_usage?.input_tokens ?? 0;
            const outputTokens = token_usage?.output_tokens ?? 0;
            if (inputTokens + outputTokens > 0) {
              setSessionInputTokens(prev => prev + inputTokens);
              setSessionOutputTokens(prev => prev + outputTokens);
              setSessionTokens(prev => prev + inputTokens + outputTokens);
              setAgentTotalTokens(prev => prev + inputTokens + outputTokens);
              onTokensUsed?.();
            }
            // Commit streaming bubble to messages after a short delay so final render settles
            setTimeout(() => {
              setStreamingMsg(current => {
                if (!current) return null;
                const role = thinkingId ? 'assistant' : 'smalltalk';
                setMessages(prev => [...prev, { role, content: current.content, sources: current.sources, id: current.id, skipAnimation: false }]);
                streamingIdRef.current = null;
                resetIdle();
                return null;
              });
            }, 120);
          }
        }
      }
    } catch {
      setIsTyping(false);
      onRequestBusy?.(false);
      addAssistantMsg('Could not reach the server. Please make sure the backend is running.');
    }
  };

  const handleStreamComplete = () => {
    if (!streamingMsg) return;
    setMessages(prev => [...prev, { role: 'assistant', content: streamingMsg.content, sources: streamingMsg.sources, id: streamingMsg.id }]);
    setStreamingMsg(null);
    streamingIdRef.current = null;
    resetIdle();
  };

  const suggestedPrompts = [
    'Tell me about your experience',
    'What projects have you worked on?',
    'Send me your resume',
    'What are your skills?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef} onScroll={handleScroll}>
        {userScrolledUp && (
          <button
            onClick={() => {
              setUserScrolledUp(false);
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="fixed bottom-36 right-8 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-opacity"
            style={{ background: 'rgba(30,30,30,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {messages.map((msg, msgIdx) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                {msg.role === 'user' ? (
                  <div className="rounded-2xl px-5 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[17px]">
                    {msg.content}
                  </div>
                ) : msg.role === 'thinking' ? (
                  <ThinkingSteps
                    query={msg.query}
                    searchThinking={msg.searchThinking}
                    agentName={agentName}
                    sources={msg.sources}
                    isSmallTalk={msg.isSmallTalk}
                    isHistorical={!!messages.slice(msgIdx + 1).some(m => m.role === 'assistant')}
                    collapseNow={!!streamingMsg}
                    onComplete={() => {}}
                  />
                ) : msg.role === 'processing' ? (
                  <ProcessingSteps
                    jobs={msg.jobs}
                    completed={!!msg.completed}
                    onComplete={handleProcessingComplete}
                  />
                ) : msg.role === 'smalltalk' ? (
                  <TypewriterMessage
                    key={msg.id}
                    content={msg.content}
                    sources={msg.sources}
                    skip={msg.skipAnimation}
                    onComplete={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, skipAnimation: true } : m))}
                  />
                ) : (
                  <div className="px-1">
                    <div className="text-[17px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.content}</ReactMarkdown>
                    </div>
                    <SourceBadges sources={msg.sources} />
                    {msgIdx === messages.length - 1 && !streamingMsg && (
                      <img src="/Archelon_logo.png" alt="" className="block w-7 h-7 object-contain opacity-50 mt-2" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start px-1">
              <img src="/Archelon_logo.png" alt="" className="w-7 h-7 object-contain opacity-50 animate-spin-slow" />
            </div>
          )}

          {streamingMsg && !streamingMsg.hidden && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-1">
                <div className="text-[17px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{streamingMsg.content}</ReactMarkdown>
                </div>
                {streamingMsg.sources?.length > 0 && <SourceBadges sources={streamingMsg.sources} />}
                <img src="/Archelon_logo.png" alt="" className={`block w-7 h-7 object-contain opacity-50 mt-2 ${streamingMsg.streaming ? 'animate-spin-slow' : ''}`} />
              </div>
            </div>
          )}

          {streamingMsg?.hidden && (
            <div className="flex justify-start px-1">
              <img src="/Archelon_logo.png" alt="" className="w-7 h-7 object-contain opacity-50 animate-spin-slow" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {messages.length === 1 && !streamingMsg && !processingMsgId && isArex && (
        <div className="px-6 pb-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 flex-wrap">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-[17px] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#212121] px-6 pb-6 pt-3">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gray-100 dark:bg-[#2a2a2a] border border-gray-300 dark:border-transparent rounded-3xl px-5 pt-3 pb-2 focus-within:ring-2 focus-within:ring-blue-400 dark:focus-within:ring-gray-600 focus-within:border-transparent transition-all">
            {isUploading && (
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                <img src="/Archelon_logo.png" alt="" className="w-4 h-4 object-contain opacity-50 animate-spin-slow" />
                Uploading files...
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              disabled={showUpgradeModal}
              onChange={(e) => {
                setInput(e.target.value);
                resetIdle();
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isBusy && input.trim()) handleSend();
                }
              }}
              placeholder={defaultPlaceholder}
              rows={1}
              className="w-full bg-transparent focus:outline-none resize-none text-[17px] leading-relaxed placeholder-gray-400 dark:placeholder-gray-500 py-1"
              style={{ minHeight: '28px', maxHeight: '200px' }}
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                {canUpload && (
                  <button
                    onClick={() => { if (showUpgradeModal) { setShowUpgradeModal(true); return; } setShowUploadModal(prev => !prev); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors text-2xl leading-none"
                    title="Add files to agent"
                  >
                    +
                  </button>
                )}
                {canUpload && showUploadModal && (
                  <FileUploadModal onClose={() => setShowUploadModal(false)} onFileSelect={handleFileSelect} />
                )}
                {agentData && <ModelSelector selected={selectedModel} onChange={setSelectedModel} />}
              </div>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isBusy}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-1">
            <div className="text-xs text-gray-400 dark:text-gray-500 text-center flex-1">
              Archelon can make mistakes. Consider checking important information.
            </div>
            {agentData && (
              <div className="relative group">
                <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 cursor-default">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#00C9B1' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span style={{ color: '#00C9B1' }}>{sessionTokens.toLocaleString()}</span> session
                  <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                  <span style={{ color: '#00C9B1' }}>{agentTotalTokens.toLocaleString()}</span> total
                </div>
                <div className="absolute bottom-6 right-0 hidden group-hover:block z-10">
                  <div className="bg-gray-900 dark:bg-[#1a1a1a] text-gray-100 text-xs rounded-xl shadow-2xl border border-gray-700 overflow-hidden" style={{ width: '240px' }}>
                    <div className="px-3 py-2.5 border-b border-gray-700">
                      <span className="font-medium">Session Token Usage</span>
                    </div>
                    <div className="px-3 py-2.5 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Input (Prompt + Instructions)</span>
                        <span className="text-gray-200">{sessionInputTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Output</span>
                        <span className="text-gray-200">{sessionOutputTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-gray-700">
                        <span className="text-gray-400">Total</span>
                        <span style={{ color: '#00C9B1' }} className="font-medium">{sessionTokens.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#00C9B115' }}>
              <svg className="w-7 h-7" style={{ color: '#00C9B1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">You've used all your tokens</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Upgrade your plan to keep chatting with Archelon and unlock more tokens.</p>
            <button
              className="w-full py-3 rounded-xl text-white text-sm font-medium mb-3"
              style={{ background: 'linear-gradient(135deg, #00C9B1, #1A73E8)' }}
            >
              Upgrade Plan
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatView;
