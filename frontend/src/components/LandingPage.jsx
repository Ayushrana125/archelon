import React, { useState } from 'react';

const WEBHOOK_URL = 'https://n8n.aranixlabs.cloud/webhook/c6f0b2d8-c320-4ab7-9028-e24932938b54';
const TEAL = '#00C9B1';
const BLUE = '#1A73E8';

function ResumeModal({ onClose }) {
  const [step, setStep] = useState('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep('sending');
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      setStep('done');
    } catch {
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {step === 'form' && (
          <>
            <h3 className="text-xl font-semibold mb-1 text-gray-900 dark:text-gray-100">Request Resume</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">We'll send it straight to your inbox.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your name</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40 dark:focus:ring-[#00C9B1]/30 placeholder-gray-400 dark:placeholder-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40 dark:focus:ring-[#00C9B1]/30 placeholder-gray-400 dark:placeholder-gray-600" />
              </div>
              <button type="submit" style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity">
                Send me the resume
              </button>
            </form>
          </>
        )}
        {step === 'sending' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <img src="/Archelon_logo.png" className="w-10 h-10 object-contain opacity-60 animate-spin-slow" alt="" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Sending...</p>
          </div>
        )}
        {step === 'done' && (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${TEAL}20` }}>
              <svg className="w-6 h-6" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Resume sent!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Check your inbox at {email}</p>
            <button onClick={onClose} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
              className="mt-2 px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity">Done</button>
          </div>
        )}
        {step === 'error' && (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <p className="font-medium text-red-500">Something went wrong.</p>
            <button onClick={() => setStep('form')} className="text-sm text-gray-500 dark:text-gray-400 underline">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

const FEATURES = [
  { title: 'Document Intelligence', desc: 'Upload PDFs, DOCX, and text files. Archelon processes and indexes them instantly for precise retrieval.', path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { title: 'Custom AI Agents', desc: 'Create purpose-built agents with custom instructions, each grounded in your own document knowledge base.', path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { title: 'Agentic RAG Pipeline', desc: 'Multi-step retrieval-augmented generation that reasons across documents before generating a response.', path: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { title: 'Secure & Isolated', desc: 'Each agent knowledge is fully isolated. Your documents never bleed into other agents or users.', path: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
];

const STEPS = [
  { num: '01', title: 'Create an Agent', desc: 'Name your agent and define its purpose with system instructions.' },
  { num: '02', title: 'Upload Documents', desc: 'Add your PDFs, reports, or knowledge base files to the agent.' },
  { num: '03', title: 'Processing Pipeline', desc: 'Archelon chunks, embeds, and indexes your documents automatically.' },
  { num: '04', title: 'Start Chatting', desc: 'Ask questions and get precise, document-grounded answers instantly.' },
];

const PIPELINE = [
  { label: 'Document Ingestion', sub: 'Parsing structure and metadata', done: true },
  { label: 'Text Extraction', sub: 'Extracting raw content from pages', done: true },
  { label: 'Semantic Chunking', sub: 'Splitting into meaningful segments', done: true },
  { label: 'Embedding Generation', sub: 'Converting chunks to vectors', done: true },
  { label: 'Index Storage', sub: 'Writing to vector database', done: false, active: true },
  { label: 'Knowledge Graph', sub: 'Building entity relationships', done: false },
  { label: 'Agent Ready', sub: 'Agent is ready to answer questions', done: false },
];

function LandingPage({ onLogin, theme, setTheme }) {
  const [showResume, setShowResume] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const dark = theme === 'dark';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-gray-100 transition-colors duration-300">

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/Archelon_logo.png" alt="Archelon" className="h-7 w-auto object-contain" />
              <span className="brand-name text-lg tracking-tight text-gray-900 dark:text-gray-100">Archelon</span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <a href="#features" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">How it works</a>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {/* Theme toggle */}
              <button onClick={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} title="Toggle theme"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                {dark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button onClick={onLogin} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                Log in
              </button>
              <button onClick={onLogin} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity">
                Create account
              </button>
            </div>

            <button className="md:hidden text-gray-500 dark:text-gray-400" onClick={() => setMobileMenu(p => !p)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>

          {mobileMenu && (
            <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0d0d0d] px-6 py-4 space-y-3 text-sm transition-colors duration-300">
              <a href="#features" onClick={() => setMobileMenu(false)} className="block text-gray-600 dark:text-gray-400">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenu(false)} className="block text-gray-600 dark:text-gray-400">How it works</a>
              <button onClick={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} className="block text-gray-600 dark:text-gray-400">{dark ? 'Light mode' : 'Dark mode'}</button>
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={onLogin} className="w-full py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">Log in</button>
                <button onClick={onLogin} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                  className="w-full py-2 text-sm font-medium text-white rounded-lg">Create account</button>
              </div>
            </div>
          )}
        </nav>

        {/* Hero */}
        <section className="relative pt-40 pb-24 px-6 text-center overflow-hidden">

          {/* Shell hex pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <svg width="100%" height="100%" style={{ opacity: 0.025 }}>
              <defs>
                <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
                  <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke={TEAL} strokeWidth="1" />
                  <polygon points="56,26 80,14 80,38 56,50 32,38 32,14" fill="none" stroke={TEAL} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hex)" />
            </svg>
          </div>

          {/* Radial glow behind headline */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div style={{
              position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
              width: '600px', height: '400px',
              background: `radial-gradient(ellipse at center, ${TEAL}12 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }} />
          </div>

          {/* Floating particles — varied size/speed for depth */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            {[
              { top: '18%', left: '8%',   r: 2,  dur: '22s', delay: '0s',   cls: 'particle',  op: 0.15 },
              { top: '35%', left: '4%',   r: 1,  dur: '30s', delay: '2s',   cls: 'particle2', op: 0.10 },
              { top: '55%', left: '12%',  r: 4,  dur: '14s', delay: '4s',   cls: 'particle',  op: 0.20 },
              { top: '20%', right: '7%',  r: 1.5,dur: '26s', delay: '1s',   cls: 'particle2', op: 0.12 },
              { top: '45%', right: '5%',  r: 3,  dur: '18s', delay: '3s',   cls: 'particle',  op: 0.18 },
              { top: '65%', right: '14%', r: 5,  dur: '35s', delay: '5s',   cls: 'particle2', op: 0.08 },
              { top: '28%', left: '22%',  r: 1,  dur: '20s', delay: '6s',   cls: 'particle',  op: 0.12 },
              { top: '70%', left: '30%',  r: 3.5,dur: '28s', delay: '2.5s', cls: 'particle2', op: 0.15 },
              { top: '12%', left: '45%',  r: 1.5,dur: '24s', delay: '7s',   cls: 'particle',  op: 0.10 },
              { top: '80%', right: '25%', r: 2,  dur: '32s', delay: '1.5s', cls: 'particle2', op: 0.12 },
            ].map((p, i) => (
              <div key={i} className={p.cls} style={{
                position: 'absolute', top: p.top, left: p.left, right: p.right,
                width: p.r * 2, height: p.r * 2, borderRadius: '50%',
                background: i % 3 === 0 ? TEAL : i % 3 === 1 ? BLUE : TEAL,
                opacity: p.op,
                '--dur': p.dur, '--delay': p.delay,
              }} />
            ))}
          </div>

          {/* Slowly rotating large shell outline */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="shell-spin" style={{
              position: 'absolute', top: '42%', left: '50%',
              width: 520, height: 520, opacity: 0.018,
            }}>
              <svg viewBox="0 0 100 100" width="520" height="520">
                <polygon points="50,3 93,25 93,75 50,97 7,75 7,25" fill="none" stroke={TEAL} strokeWidth="0.6" />
                <polygon points="50,12 85,30 85,70 50,88 15,70 15,30" fill="none" stroke={TEAL} strokeWidth="0.4" />
                <polygon points="50,22 77,36 77,64 50,78 23,64 23,36" fill="none" stroke={BLUE} strokeWidth="0.3" />
              </svg>
            </div>
          </div>


          {/* Depth lines */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <svg width="100%" height="100%" preserveAspectRatio="none" style={{ opacity: 0.04 }}>
              <path d="M-100,200 Q300,160 700,200 Q1100,240 1500,200" stroke={TEAL} strokeWidth="1.5" fill="none" />
              <path d="M-100,280 Q400,240 800,280 Q1200,320 1600,280" stroke={TEAL} strokeWidth="1" fill="none" />
              <path d="M-100,360 Q350,320 750,360 Q1150,400 1550,360" stroke={BLUE} strokeWidth="1" fill="none" />
              <path d="M-100,440 Q300,400 700,440 Q1100,480 1500,440" stroke={BLUE} strokeWidth="0.8" fill="none" />
            </svg>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-gray-900 dark:text-gray-100">
              Build AI agents that<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}>
                know your documents
              </span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Archelon lets you create intelligent agents grounded in your own knowledge base, powered by a multi-step agentic RAG pipeline.
            </p>
            {/* Button with ripple rings */}
            <div className="relative inline-block">
              <div className="ripple-ring absolute inset-0 rounded-xl pointer-events-none" style={{ border: `1.5px solid ${TEAL}`, opacity: 0 }} />
              <div className="ripple-ring-2 absolute inset-0 rounded-xl pointer-events-none" style={{ border: `1.5px solid ${TEAL}`, opacity: 0 }} />
              <button onClick={onLogin} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                className="relative px-7 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm shadow-lg">
                Get started
              </button>
            </div>
          </div>

          {/* Wave divider */}
          <div className="relative mt-20 max-w-2xl mx-auto">
            <div className="bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl text-left transition-colors duration-300">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">quarterly_report.pdf</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Processing document...</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: TEAL }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: TEAL }} />
                  Live
                </div>
              </div>

              <div className="relative">
                <div className="absolute top-3 bottom-3 w-0.5" style={{ left: '14px', background: `linear-gradient(to bottom, ${TEAL} 57%, #e5e7eb 57%)` }} />
                <div className="space-y-0">
                  {PIPELINE.map((step, i) => (
                    <div key={i} className="relative flex items-center gap-4 py-2 pl-1" style={{ zIndex: 1 }}>
                      <div className="relative z-10 w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                        style={step.done
                          ? { background: TEAL }
                          : step.active
                          ? { background: 'transparent', border: `2px solid ${TEAL}` }
                          : { background: 'transparent', border: '2px solid #d1d5db' }
                        }>
                        {step.done && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {step.active && <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: TEAL }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${step.done || step.active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}`}
                          style={step.active ? { color: TEAL } : {}}>
                          {step.label}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-600">{step.sub}</div>
                      </div>
                      {step.done && <span className="text-xs font-medium flex-shrink-0" style={{ color: TEAL }}>Done</span>}
                      {step.active && <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">In progress</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shell-arc wave divider */}
        <div className="relative overflow-hidden leading-none" style={{ height: 60, marginTop: -1 }} aria-hidden>
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path d="M0,55 C150,55 200,5 600,5 C1000,5 1050,55 1200,55 L1200,60 L0,60 Z"
              fill="currentColor" className="text-gray-50 dark:text-[#111111]" />
            <path d="M0,58 C180,58 250,18 600,18 C950,18 1020,58 1200,58 L1200,60 L0,60 Z"
              fill="currentColor" className="text-gray-50 dark:text-[#111111]" style={{ opacity: 0.5 }} />
          </svg>
        </div>

        {/* Features */}
        <section id="features" className="relative py-24 px-6 bg-gray-50 dark:bg-[#111111] transition-colors duration-300 overflow-hidden">
          {/* Depth gradient */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
            background: `linear-gradient(to bottom, ${TEAL}06 0%, transparent 40%)`,
          }} />
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gray-900 dark:text-gray-100">Everything you need</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">A complete platform for building document-aware AI agents without writing a single line of code.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((f, i) => (
                <div key={f.title} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all hover:shadow-md dark:hover:shadow-none">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: i % 2 === 0 ? `${TEAL}15` : `${BLUE}15` }}>
                    <svg className="w-5 h-5" style={{ color: i % 2 === 0 ? TEAL : BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.path} />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">{f.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="relative py-24 px-6 bg-white dark:bg-[#0d0d0d] transition-colors duration-300 overflow-hidden">
          {/* Depth gradient */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
            background: `linear-gradient(to bottom, ${BLUE}05 0%, transparent 40%)`,
          }} />
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gray-900 dark:text-gray-100">How it works</h2>
              <p className="text-gray-500 dark:text-gray-400">From documents to intelligent answers in four steps.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex gap-5 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414] hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                  <div className="text-2xl font-bold select-none flex-shrink-0 w-10" style={{ color: i % 2 === 0 ? `${TEAL}40` : `${BLUE}40` }}>{s.num}</div>
                  <div>
                    <h3 className="font-semibold mb-1.5 text-gray-900 dark:text-gray-100">{s.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 px-6 bg-gray-50 dark:bg-[#111111] transition-colors duration-300 overflow-hidden">
          {/* Shell hex pattern — blue tint */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <svg width="100%" height="100%" style={{ opacity: 0.02 }}>
              <defs>
                <pattern id="hex2" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
                  <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke={BLUE} strokeWidth="1" />
                  <polygon points="56,26 80,14 80,38 56,50 32,38 32,14" fill="none" stroke={BLUE} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hex2)" />
            </svg>
          </div>
          <div className="max-w-2xl mx-auto text-center">
            <img src="/Archelon_logo.png" className="w-12 h-12 object-contain mx-auto mb-6 opacity-80" alt="" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gray-900 dark:text-gray-100">Ready to get started?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Create your first agent in minutes. No setup required.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={onLogin} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                className="px-6 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm shadow-lg shadow-teal-500/20">
                Create account
              </button>
              <button onClick={onLogin} className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-[#1a1a1a] transition-colors">
                Log in
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 py-8 px-6 bg-white dark:bg-[#0d0d0d] transition-colors duration-300">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-600">
            <div className="flex items-center gap-2">
              <img src="/Archelon_logo.png" className="h-5 w-auto object-contain opacity-50" alt="" />
              <span>Archelon — Agentic RAG Platform</span>
            </div>
            <div>© {new Date().getFullYear()} Archelon. All rights reserved.</div>
          </div>
        </footer>

        {showResume && <ResumeModal onClose={() => setShowResume(false)} />}
    </div>
  );
}

export default LandingPage;
