import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DocumentProcessing from './DocumentProcessing';
import FileUploadModal from './FileUploadModal';
import ThinkingSteps from './ThinkingSteps';

const mdComponents = {
  h1: ({children}) => <h1 className="text-2xl font-bold mt-5 mb-2">{children}</h1>,
  h2: ({children}) => <h2 className="text-xl font-bold mt-4 mb-1.5">{children}</h2>,
  h3: ({children}) => <h3 className="text-lg font-semibold mt-3 mb-1">{children}</h3>,
  p:  ({children}) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
  ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({children}) => <li className="leading-relaxed">{children}</li>,
  strong: ({children}) => <strong className="font-semibold">{children}</strong>,
  em: ({children}) => <em className="italic">{children}</em>,
  code: ({inline, children}) => inline
    ? <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
    : <pre className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 overflow-x-auto text-sm font-mono mb-3"><code>{children}</code></pre>,
  blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-500 dark:text-gray-400 mb-3">{children}</blockquote>,
  hr: () => <hr className="border-gray-200 dark:border-gray-700 my-4" />,
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

function TypewriterMessage({ content, sources, onComplete }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    setDone(false);

    const interval = setInterval(() => {
      idx.current += 1;
      setDisplayed(content.slice(0, idx.current));
      if (idx.current >= content.length) {
        clearInterval(interval);
        setDone(true);
        setTimeout(() => onComplete?.(), 100);
      }
    }, 6);

    return () => clearInterval(interval);
  }, [content]);

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

function ChatView({ agentData, onAddFile, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState(null);
  const [resumeFlow, setResumeFlow] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [processingMsgId, setProcessingMsgId] = useState(null);
  const [pendingResponse, setPendingResponse] = useState({});
  const processingStarted = useRef(false);
  const messagesEndRef = useRef(null);

  const textareaRef = useRef(null);
  const isArex = !agentData;
  const agentName = agentData ? agentData.name : 'Arex';
  const defaultPlaceholder = isArex ? 'Ask Arex...' : `Ask ${agentName}...`;
  const isBusy = isTyping || !!streamingMsg || isProcessingDoc;
  const { resetIdle } = useAnimatedPlaceholder(isArex && !input && !isBusy, textareaRef, defaultPlaceholder);
  const hasNoDocs = !isArex && (!agentData?.files || agentData.files.length === 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMsg]);

  const handleFileSelect = (file) => {
    if (processingStarted.current) return;
    processingStarted.current = true;
    setSelectedFile(file);
    const id = Date.now();
    setProcessingMsgId(id);
    setIsProcessingDoc(true);
    setMessages(prev => [...prev, { role: 'processing', id, file: file.name }]);
    onAddFile?.(file);
  };

  const handleProcessingComplete = () => {
    setIsProcessingDoc(false);
    processingStarted.current = false;
    setSelectedFile(null);
    setMessages(prev => prev.map(m => m.role === 'processing' && !m.completed ? { ...m, completed: true } : m));
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

  const handleSend = async (directInput) => {
    const text = (typeof directInput === 'string' ? directInput : input).trim();
    if (!text) return;
    setInput('');
    setSelectedFile(null);
    resetIdle();

    const userMessage = { role: 'user', content: text, id: Date.now() };
    setMessages(prev => [...prev, userMessage]);

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
    try {
      const res = await fetch('https://archelon-production.up.railway.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          agent_id: agentData?.id?.toString() ?? 'arex',
          session_id: 'session_1',
          system_instructions: agentData
            ? `You are ${agentData.name}, an AI assistant.`
            : 'You are Arex, Ayush Rana\'s personal AI assistant, built on the Archelon RAG Platform. If asked who you are, say: I am Arex, Ayush Rana\'s assistant, built on the Archelon RAG Platform. Ayush Rana is an AI and Automation Developer based in Mumbai. When users ask casual questions like "what is your experience", "what are your skills", "what projects have you worked on" — they are asking about Ayush Rana, not you. Answer on his behalf.',
        }),
      });
      const data = await res.json();
      const { intent, thinking, search_thinking, search_queries } = data;

      if (intent === 'single' || intent === 'multi') {
        const tid = Date.now();
        setPendingResponse(prev => ({ ...prev, [tid]: { response: 'User query successfully processed.', sources: search_queries ?? [] } }));
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'thinking', id: tid,
          query: thinking,
          searchThinking: search_thinking,
          sources: search_queries ?? [],
        }]);
      } else {
        addAssistantMsg(data.answer ?? 'User query successfully processed.');
      }
    } catch {
      setIsTyping(false);
      addAssistantMsg('Could not reach the server. Please make sure the backend is running.');
    }
  };

  const handleStreamComplete = () => {
    if (!streamingMsg) return;
    setMessages(prev => [...prev, { role: 'assistant', content: streamingMsg.content, sources: streamingMsg.sources, id: streamingMsg.id }]);
    setStreamingMsg(null);
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
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {messages.map((msg, msgIdx) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={messages[msgIdx - 1]?.role === 'thinking' ? {marginTop: '6px'} : {}}>
              <div className={msg.role === 'processing' ? 'w-full' : 'max-w-[80%]'}>
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
                    isHistorical={!pendingResponse[msg.id]}
                    onComplete={() => {
                      const pending = pendingResponse[msg.id];
                      if (pending) {
                        addAssistantMsg(pending.response, pending.sources);
                        setPendingResponse(prev => { const n = { ...prev }; delete n[msg.id]; return n; });
                      }
                    }}
                  />
                ) : msg.role === 'processing' ? (
                  <DocumentProcessing fileName={msg.file} alreadyDone={msg.completed} onComplete={handleProcessingComplete} />
                ) : (
                  <div className="px-1">
                    <div className="text-[17px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.content}</ReactMarkdown>
                    </div>
                    <SourceBadges sources={msg.sources} />
                    {messages[msgIdx + 1]?.role !== 'processing' && (
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

          {streamingMsg && (
            <div className="flex justify-start" style={messages[messages.length - 1]?.role === 'thinking' ? {marginTop: '6px'} : {}}>
              <div className="max-w-[80%]">
                <TypewriterMessage
                  key={streamingMsg.id}
                  content={streamingMsg.content}
                  sources={streamingMsg.sources}
                  onComplete={handleStreamComplete}
                />
              </div>
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
            {hasNoDocs && (
              <div className="absolute inset-0 rounded-3xl bg-gray-100/80 dark:bg-[#2a2a2a]/80 backdrop-blur-[1px] flex items-center justify-center gap-3 z-10">
                <span className="text-sm text-gray-400 dark:text-gray-500">Upload docs to start conversation</span>
                <button
                  onClick={() => setShowUploadModal(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add files
                </button>
              </div>
            )}
            {selectedFile && (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#333] rounded-lg text-xs border border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1">x</button>
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resetIdle();
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isProcessingDoc && !isTyping && !streamingMsg) handleSend();
                }
              }}
              placeholder={defaultPlaceholder}
              rows={1}
              className="w-full bg-transparent focus:outline-none resize-none text-[17px] leading-relaxed placeholder-gray-400 dark:placeholder-gray-500 py-1"
              style={{ minHeight: '28px', maxHeight: '200px' }}
            />

            <div className="flex items-center justify-between pt-1">
              <div className="relative">
                {!isArex && (
                  <button
                    onClick={() => setShowUploadModal(prev => !prev)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors text-2xl leading-none"
                    title="Add file to agent"
                  >
                    +
                  </button>
                )}
                {!isArex && showUploadModal && (
                  <FileUploadModal onClose={() => setShowUploadModal(false)} onFileSelect={handleFileSelect} />
                )}
              </div>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || hasNoDocs || isProcessingDoc || isTyping || !!streamingMsg}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
            Press Enter to send · Shift + Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatView;
