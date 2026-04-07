import React, { useState } from 'react';
import { signup, login } from '../services/auth_service';

const WEBHOOK_URL = 'https://n8n.aranixlabs.cloud/webhook/c6f0b2d8-c320-4ab7-9028-e24932938b54';
const TEAL = '#00C9B1';
const BLUE = '#1A73E8';

function AuthModal({ defaultTab = 'signup', onClose, onLogin }) {
  const [tab, setTab] = useState(defaultTab);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    // await signup({ firstName, lastName, username, email, password, companyName, website }); - wire when backend auth is ready
    onLogin();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    // await login(email, password); - wire when backend auth is ready
    onLogin();
  };

  const InputField = ({ label, icon, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
        <input {...props} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40 placeholder-gray-400 dark:placeholder-gray-600" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#141414] w-full h-full overflow-hidden relative border-0 flex">

        {/* Left panel - branding */}
        <div className="hidden md:flex flex-col justify-between w-[40%] p-12 relative overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
              <defs>
                <pattern id="hex-auth" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
                  <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke={TEAL} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hex-auth)" />
            </svg>
          </div>
          <div className="absolute pointer-events-none" style={{
            top: '20%', left: '50%', transform: 'translateX(-50%)',
            width: 400, height: 300,
            background: `radial-gradient(ellipse, ${TEAL}18 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }} />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-12">
              <img src="/Archelon_logo.png" alt="Archelon" className="h-8 w-auto object-contain" />
              <span className="brand-name text-xl tracking-tight text-white">Archelon</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-4">
              Build AI agents that<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}>
                know your documents
              </span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Create intelligent agents grounded in your own knowledge base, powered by a multi-step agentic RAG pipeline.
            </p>
          </div>
          <div className="relative space-y-4">
            {[
              { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Upload any document - PDF, DOCX, TXT' },
              { icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'Create purpose-built AI agents' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Agentic RAG pipeline for precise answers' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}20` }}>
                  <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <span className="text-sm text-gray-400">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - form */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col justify-center min-h-full px-8 md:px-16 py-12 max-w-2xl mx-auto w-full">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl mb-8 self-start">
              {['signup', 'login'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                    tab === t
                      ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  {t === 'signup' ? 'Create account' : 'Log in'}
                </button>
              ))}
            </div>

            {tab === 'signup' && (
              <>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Get started</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Create your Archelon account.</p>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="First name" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                    <InputField label="Last name" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                  </div>
                  <InputField label="Username" icon="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                    required value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" />
                  <InputField label="Email" icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                  <InputField label="Password" icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Company name" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc. (optional)" />
                    <InputField label="Website" icon="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
                      value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com (optional)" />
                  </div>
                  <button type="submit" style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity mt-2">
                    Create account
                  </button>
                </form>
                <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-6">
                  Already have an account?{' '}
                  <button onClick={() => setTab('login')} className="underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors">Log in</button>
                </p>
              </>
            )}

            {tab === 'login' && (
              <>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Welcome back</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Log in to your Archelon account.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                  <InputField label="Email" icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                  <InputField label="Password" icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
                  <button type="submit" style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity mt-2">
                    Log in
                  </button>
                </form>
                <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-6">
                  Don't have an account?{' '}
                  <button onClick={() => setTab('signup')} className="underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors">Create one</button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  { title: 'Document Intelligence', desc: 'Upload PDFs, DOCX, and TXT files. Archelon parses, chunks, and embeds them using a parent-child strategy for precise retrieval.', path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { title: 'Custom AI Agents', desc: 'Create purpose-built agents with custom names, descriptions, and system instructions - each grounded in its own isolated knowledge base.', path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { title: 'Agentic RAG Pipeline', desc: 'Multi-step pipeline: intent classification → query analysis → parallel vector search → gap detection reranking → grounded synthesis.', path: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { title: 'Thinking Steps', desc: 'Transparent reasoning - users see what the agent is thinking, what it searched, and which documents it found before answering.', path: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { title: 'Embed on Any Website', desc: 'Generate an API key, whitelist your domain, and paste one script tag. Your agent becomes a floating chat widget on any website.', path: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { title: 'Token Usage Tracking', desc: 'Every query and document upload is metered. See session tokens, agent totals, and remaining quota - all in real time.', path: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { title: 'Model Selection', desc: 'Choose from Mistral Large, Mistral Small, or Codestral per agent. Archelon models coming soon for full infrastructure independence.', path: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { title: 'Secure & Isolated', desc: 'Each agent knowledge base is fully isolated. JWT auth, token quotas, domain whitelisting, and rate limiting protect every endpoint.', path: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
];

const STEPS = [
  { num: '01', title: 'Create an Agent', desc: 'Name your agent, write system instructions, and define its purpose. Takes under a minute.' },
  { num: '02', title: 'Upload Documents', desc: 'Add PDFs, DOCX, or TXT files. Archelon parses, chunks, embeds, and indexes them automatically.' },
  { num: '03', title: 'Chat with Your Agent', desc: 'Ask questions and get precise, document-grounded answers. The agent shows its thinking steps transparently.' },
  { num: '04', title: 'Embed on Your Website', desc: 'Enable the embed widget, generate an API key, whitelist your domain, and paste one script tag.' },
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

function LandingPage({ onLogin, onSignup, onLoginPage, theme, setTheme }) {
  const [showResume, setShowResume] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const dark = theme === 'dark';

  const openSignup = () => onSignup?.();
  const openLogin = () => onLoginPage?.();

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
              <a href="#use-cases" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Use cases</a>
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
              <button onClick={openLogin} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                Log in
              </button>
              <button onClick={openSignup} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
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
                <button onClick={openLogin} className="w-full py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">Log in</button>
                <button onClick={openSignup} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
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

          {/* Floating particles - varied size/speed for depth */}
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
            <h1 className="landing-heading text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-gray-900 dark:text-gray-100">
              Built to carry<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}>
                your knowledge.
              </span>
            </h1>
            <p className="landing-body text-xl text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Archelon was the largest sea turtle that ever lived - up to 4.6 metres long, built to carry enormous weight across vast oceans. Archelon does the same for your documents.
            </p>
            {/* Button with ripple rings */}
            <div className="relative inline-block">
              <div className="ripple-ring absolute inset-0 rounded-xl pointer-events-none" style={{ border: `1.5px solid ${TEAL}`, opacity: 0 }} />
              <div className="ripple-ring-2 absolute inset-0 rounded-xl pointer-events-none" style={{ border: `1.5px solid ${TEAL}`, opacity: 0 }} />
              <button onClick={openSignup} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                className="relative px-7 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm shadow-lg">
                Get started
              </button>
            </div>
          </div>

          {/* Hero screenshot */}
          <div className="relative mt-16 max-w-5xl mx-auto px-4">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl">
              <img src="/dashboard.png" alt="Archelon Dashboard" className="w-full h-auto object-cover" />
              <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to top, #0d0d0d, transparent)' }} />
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 pointer-events-none" style={{ background: `radial-gradient(ellipse, ${TEAL}20 0%, transparent 70%)`, filter: 'blur(20px)' }} />
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

        {/* Features - alternating asymmetric rows */}
        <section id="features" className="relative py-32 px-6 bg-gray-50 dark:bg-[#111111] transition-colors duration-300 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: `linear-gradient(to bottom, ${TEAL}06 0%, transparent 40%)` }} />
          <div className="max-w-6xl mx-auto">

            {/* Section label */}
            <div className="mb-24">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: TEAL }}>What Archelon does</p>
              <h2 className="landing-heading text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 max-w-2xl leading-tight">
                Everything your documents<br />deserve to be
              </h2>
            </div>

            {/* Row 1 - text left, visual right */}
            <div className="grid md:grid-cols-[2fr_3fr] gap-16 items-center mb-28">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: TEAL }}>01</p>
                <h3 className="landing-heading text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">Documents that actually answer questions</h3>
                <p className="landing-body text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-6">Upload PDFs, DOCX, or TXT files. Archelon processes them automatically - breaking content into meaningful pieces, understanding structure, and making every section instantly searchable. Your documents become a knowledge base your agent can reason over.</p>
                <div className="space-y-2">
                  {['PDF, DOCX, TXT support', 'Instant indexing after upload', 'Searches meaning, not just keywords'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TEAL }} />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl">
                <img src="/document-processing.png" alt="Document Processing" className="w-full h-auto object-contain" />
              </div>
            </div>

            {/* Row 2 - visual left, text right */}
            <div className="grid md:grid-cols-[3fr_2fr] gap-16 items-center mb-28">
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl order-2 md:order-1">
                <img src="/chat-view.png" alt="Agent Chat" className="w-full h-auto object-contain" />
              </div>
              <div className="order-1 md:order-2">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: BLUE }}>02</p>
                <h3 className="landing-heading text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">Agents that think before they answer</h3>
                <p className="landing-body text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-6">Your agent doesn't just search - it understands what you're asking, finds the most relevant parts of your documents, and builds a precise answer grounded in your content. Users see the reasoning before the answer appears.</p>
                <div className="space-y-2">
                  {['Understands what you\'re really asking', 'Finds the most relevant sections', 'Shows reasoning before answering'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: BLUE }} />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3 - text left, visual right */}
            <div className="grid md:grid-cols-[2fr_3fr] gap-16 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: TEAL }}>03</p>
                <h3 className="landing-heading text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">Deploy anywhere with one script tag</h3>
                <p className="landing-body text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-6">Generate an API key, whitelist your domain, and paste one script tag. Your agent becomes a floating chat widget on any website - with token metering, rate limiting, and domain-level security built in.</p>
                <div className="space-y-2">
                  {['API key + domain whitelist', 'Token usage metering', 'One script tag deployment'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TEAL }} />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl">
                <img src="/embed-widget.png" alt="Embed Widget" className="w-full h-auto object-contain" />
              </div>
            </div>

          </div>
        </section>

        {/* How it works - vertical timeline */}
        <section id="how-it-works" className="relative py-32 px-6 bg-white dark:bg-[#0d0d0d] transition-colors duration-300 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: `linear-gradient(to bottom, ${BLUE}04 0%, transparent 50%)` }} />
          <div className="max-w-4xl mx-auto">
            <div className="mb-20">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: BLUE }}>The process</p>
              <h2 className="landing-heading text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
                From documents<br />to deployed - in minutes
              </h2>
            </div>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-800 hidden md:block" />

              <div className="space-y-0">
                {[
                  { num: '01', title: 'Create an agent', body: 'Name your agent, write system instructions, define its purpose. Each agent is isolated - its knowledge never bleeds into others.', color: TEAL },
                  { num: '02', title: 'Upload your documents', body: 'Add PDFs, DOCX, or TXT files. Archelon processes them automatically and makes every section searchable. You see the progress in real time.', color: BLUE },
                  { num: '03', title: 'Chat with your agent', body: 'Ask questions in plain language. Your agent understands what you mean, finds the right answers from your documents, and explains its reasoning before responding.', color: TEAL },
                  { num: '04', title: 'Embed on your website', body: 'Enable the widget, generate an API key, whitelist your domain, paste one script tag. Your agent is live as a floating chat widget on any website.', color: BLUE },
                ].map((step, i) => (
                  <div key={i} className="relative flex gap-10 md:gap-16 pb-16 last:pb-0">
                    {/* Step number circle */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}99)` }}>
                        {step.num}
                      </div>
                    </div>
                    {/* Content */}
                    <div className="pt-2 pb-2">
                      <h3 className="landing-heading text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{step.title}</h3>
                      <p className="landing-body text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Use cases - large statement layout */}
        <section id="use-cases" className="relative py-32 px-6 bg-gray-50 dark:bg-[#111111] transition-colors duration-300 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="mb-20">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: TEAL }}>Use cases</p>
              <h2 className="landing-heading text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-tight max-w-2xl">
                Any team with documents<br />has a use case
              </h2>
            </div>

            {/* Large list - each use case is a full-width row */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { num: '01', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', title: 'Customer Support', industry: 'SaaS · E-commerce · Fintech', body: 'Upload product docs, FAQs, and policies. Your agent answers support questions grounded in your documentation, reducing repetitive ticket load.', tags: ['FAQ automation', 'Policy lookup', 'Ticket deflection'] },
                { num: '02', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', title: 'Internal Knowledge Base', industry: 'Enterprise · Startups · Agencies', body: 'Upload SOPs, onboarding guides, and internal wikis. Teams get answers from your documents without digging through folders or pinging colleagues.', tags: ['Onboarding', 'SOP lookup', 'HR policies'] },
                { num: '03', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', title: 'Product Documentation', industry: 'Developer Tools · APIs · Platforms', body: 'Turn technical docs, API references, and changelogs into a conversational agent. Users find answers faster directly from your documentation.', tags: ['API docs', 'Changelogs', 'Integration guides'] },
                { num: '04', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', title: 'Legal & Compliance', industry: 'Law Firms · Finance · Healthcare', body: 'Upload contracts, compliance guidelines, and regulatory documents. Get answers grounded in the source - always verify critical information independently.', tags: ['Contract review', 'Compliance Q&A', 'Policy search'] },
                { num: '05', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', title: 'Education & Training', industry: 'EdTech · Corporates · Universities', body: 'Upload course material, training manuals, and study guides. Learners ask questions and get answers drawn from the content they are studying.', tags: ['Course Q&A', 'Training manuals', 'Study guides'] },
                { num: '06', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', title: 'Healthcare & Research', industry: 'Clinics · Research Labs · Pharma', body: 'Upload research papers, clinical guidelines, and protocols. Query complex documents conversationally - always verify with qualified professionals.', tags: ['Research papers', 'Clinical protocols', 'Drug references'] },
              ].map((uc, i) => (
                <div key={i} className="py-10 grid md:grid-cols-[100px_1fr_1fr] gap-6 md:gap-10 items-start">
                  <div className="flex items-start">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: i % 2 === 0 ? `${TEAL}15` : `${BLUE}15` }}>
                      <svg className="w-5 h-5" style={{ color: i % 2 === 0 ? TEAL : BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={uc.icon} />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="landing-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{uc.title}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mb-3">{uc.industry}</p>
                    <p className="landing-body text-base text-gray-500 dark:text-gray-400 leading-relaxed">{uc.body}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end md:pt-1">
                    {uc.tags.map(tag => (
                      <span key={tag} className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 px-6 bg-white dark:bg-[#0d0d0d] transition-colors duration-300 overflow-hidden">
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
            <h2 className="landing-heading text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gray-900 dark:text-gray-100">Ready to get started?</h2>
            <p className="landing-body text-lg text-gray-500 dark:text-gray-400 mb-8">Create your first agent in minutes. No setup required.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={openSignup} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                className="px-6 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm shadow-lg shadow-teal-500/20">
                Create account
              </button>
              <button onClick={openLogin} className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-[#1a1a1a] transition-colors">
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
              <span>Archelon - Agentic RAG Platform</span>
            </div>
            <div>© {new Date().getFullYear()} Archelon. All rights reserved.</div>
          </div>
        </footer>

        {showResume && <ResumeModal onClose={() => setShowResume(false)} />}
    </div>
  );
}

export default LandingPage;
