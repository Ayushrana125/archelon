import React, { useState, useRef, useEffect } from 'react';
import { authHeaders } from '../services/auth_service';

const TEAL = '#00C9B1';

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 text-xs font-medium transition-colors px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
      style={{ color: copied ? TEAL : '#9ca3af' }}
    >
      {copied ? (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
      ) : (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>{label}</>
      )}
    </button>
  );
}

function EmbedModal({ agentId, agentName, onClose, user }) {
  const [enabled, setEnabled] = useState(false);

  // Persistent state — survives toggle off/on
  const savedNameRef = useRef('');
  const apiKeyRef = useRef(null); // null = not generated, string = generated
  const domainsRef = useRef([]);

  const [savedName, setSavedName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [shortName, setShortName] = useState('');
  const [apiKey, setApiKey] = useState(null); // null = not generated
  const [keyJustGenerated, setKeyJustGenerated] = useState(false);
  const [domains, setDomains] = useState([]);
  const [domainInput, setDomainInput] = useState('');
  const [showSteps, setShowSteps] = useState(false);

  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [maxInputChars, setMaxInputChars] = useState(2000);
  const [maxOutputTokens, setMaxOutputTokens] = useState(500);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/embed/${agentId}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    })
      .then(r => r.json())
      .then(d => {
        if (d.enabled) {
          setEnabled(true);
          setSavedName(d.widget_name || '');
          setDomains(d.allowed_origins || []);
          setApiKey('masked');
          setTheme(d.theme || 'light');
          setLogoUrl(d.logo_url || '');
          setMaxInputChars(d.max_input_chars || 2000);
          setMaxOutputTokens(d.max_output_tokens || 500);
        }
      })
      .catch(() => {});
  }, [agentId]);

  const handleToggle = () => {
    if (enabled) {
      setShowDisableConfirm(true);
    } else {
      setEnabled(true);
    }
  };

  const handleConfirmDisable = async () => {
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/embed/${agentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
    } catch {}
    setEnabled(false);
    setApiKey(null);
    setKeyJustGenerated(false);
    setShowDisableConfirm(false);
    setLoading(false);
  };

  const displayName = savedName || agentName || 'Assistant';

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/embed/${agentId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ widget_name: savedName || agentName, allowed_origins: domains, theme, max_input_chars: maxInputChars, max_output_tokens: maxOutputTokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate key');
      setApiKey(data.raw_key);
      setKeyJustGenerated(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/embed/${agentId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          widget_name:       savedName || agentName,
          allowed_origins:   domains,
          theme,
          max_input_chars:   maxInputChars,
          max_output_tokens: maxOutputTokens,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/embed/${agentId}/logo`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setLogoUrl(data.logo_url);
    } catch (err) {
      alert(err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleAddDomain = () => {
    const d = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!d || domains.includes(d)) return;
    const next = [...domains, d];
    setDomains(next);
    domainsRef.current = next;
    setDomainInput('');
  };

  const handleRemoveDomain = (d) => {
    const next = domains.filter(x => x !== d);
    setDomains(next);
    domainsRef.current = next;
  };

  const htmlSnippet = `<!-- Place this anywhere in your <body> where you want the widget -->
<div id="archelon-widget"></div>`;

  const scriptSnippet = `<!-- Place this before </body> -->
<script>
  window.ArchelonConfig = {
    agentId: "${agentId}",
    apiKey: "${apiKey && apiKey !== 'masked' ? apiKey : 'arch_live_YOUR_KEY_HERE'}",
    name: "${displayName}"
  };
</script>
<script src="https://api.archelon.cloud/embed.js" async></script>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#141414] w-full h-full md:rounded-3xl md:w-[88vw] md:h-[90vh] overflow-hidden relative border-0 md:border border-gray-100 dark:border-gray-800 flex shadow-2xl">

        {/* Left — branding when disabled, widget preview when enabled */}
        <div
          className="hidden md:flex flex-col w-[38%] relative overflow-hidden flex-shrink-0"
          style={{ background: enabled ? '#0f0f0f' : 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }}
        >
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
              <defs>
                <pattern id="hex-embed" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
                  <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke={TEAL} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hex-embed)" />
            </svg>
          </div>
          <div className="absolute pointer-events-none" style={{
            top: '20%', left: '50%', transform: 'translateX(-50%)',
            width: 400, height: 300,
            background: `radial-gradient(ellipse, ${TEAL}15 0%, transparent 70%)`,
            filter: 'blur(50px)',
          }} />

          {!enabled ? (
            /* Branding panel */
            <div className="relative flex flex-col justify-between h-full p-12">
              <div>
                <div className="flex items-center gap-2.5 mb-10">
                  <img src="/Archelon_logo.png" alt="Archelon" className="h-7 w-auto object-contain" />
                  <span className="brand-name text-lg tracking-tight text-white">Archelon</span>
                </div>
                <h2 className="text-3xl font-bold text-white leading-tight mb-4">
                  Your agent,<br />
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}>
                    on your website
                  </span>
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                  Embed <span style={{ color: TEAL }}>{agentName}</span> as a chat widget on any website. Your visitors get instant answers — powered by your documents.
                </p>
                <div className="space-y-5">
                  {[
                    { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Upload your documents once' },
                    { icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', text: 'Paste one script tag on your site' },
                    { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', text: 'Visitors chat with your agent instantly' },
                    { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Archelon handles all the RAG infrastructure' },
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
              <div className="px-4 py-3 rounded-xl border" style={{ borderColor: `${TEAL}30`, background: `${TEAL}08` }}>
                <p className="text-xs leading-relaxed" style={{ color: `${TEAL}cc` }}>
                  🚧 <span className="font-medium">Frontend preview.</span> API key generation and live widget are coming in the next release.
                </p>
              </div>
            </div>
          ) : (
            /* Widget preview panel */
            <div className="relative flex flex-col h-full" style={{ background: '#0a0a0a' }}>
              <div className="px-6 pt-6 pb-3">
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: TEAL }}>Widget Preview</p>
                <p className="text-xs text-gray-600 mt-0.5">Live preview — updates as you configure</p>
              </div>

              {/* Mock browser chrome */}
              <div className="flex-1 mx-6 mb-6 rounded-2xl overflow-hidden border border-gray-800 flex flex-col">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800" style={{ background: '#111' }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                  </div>
                  <div className="flex-1 mx-2 px-2.5 py-0.5 rounded text-[10px] text-gray-600 font-mono truncate" style={{ background: '#1a1a1a' }}>
                    {domains[0] ? `https://${domains[0]}` : 'https://yourwebsite.com'}
                  </div>
                </div>

                {/* Page + widget */}
                <div className="flex-1 relative overflow-hidden" style={{ background: '#f8fafc' }}>
                  {/* Fake page skeleton */}
                  <div className="p-5 space-y-2.5">
                    <div className="h-5 rounded-lg bg-gray-200 w-1/2" />
                    <div className="h-3 rounded bg-gray-100 w-full" />
                    <div className="h-3 rounded bg-gray-100 w-5/6" />
                    <div className="h-3 rounded bg-gray-100 w-4/6" />
                    <div className="h-7 rounded-lg bg-gray-200 w-1/3 mt-3" />
                    <div className="h-3 rounded bg-gray-100 w-full mt-3" />
                    <div className="h-3 rounded bg-gray-100 w-3/4" />
                    <div className="h-3 rounded bg-gray-100 w-5/6" />
                  </div>

                  {/* Floating chat widget — bottom right */}
                  <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">

                    {/* Chat window */}
                    <div className="w-60 rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>

                      {/* Header */}
                      <div className="px-4 py-3 flex items-center gap-2.5" style={{ background: `linear-gradient(135deg, #0d0d0d, #1a1a1a)` }}>
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${TEAL}25` }}>
                            <img src={logoUrl || '/Archelon_logo.png'} alt="" className="w-5 h-5 object-contain" />
                          </div>
                          <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-gray-900" style={{ background: '#22c55e' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                          <div className="text-[10px] text-gray-400">Typically replies instantly</div>
                        </div>
                        <button className="text-gray-500 hover:text-gray-300">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      {/* Messages */}
                      <div className="px-3 py-3 space-y-2" style={{ background: '#f9fafb', minHeight: '130px' }}>
                        {/* Agent greeting */}
                        <div className="flex gap-2 items-end">
                          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: `${TEAL}20` }}>
                            <img src="/Archelon_logo.png" alt="" className="w-full h-full object-contain p-0.5" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="px-2.5 py-1.5 rounded-2xl rounded-bl-sm text-[10px] text-gray-800 max-w-[85%] leading-relaxed" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                              Hi {user?.first_name || 'there'}! 👋 I'm {displayName}. How can I help you today?
                            </div>
                            <span className="text-[9px] text-gray-400 ml-1">Just now</span>
                          </div>
                        </div>

                        {/* User message */}
                        <div className="flex justify-end">
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="px-2.5 py-1.5 rounded-2xl rounded-br-sm text-[10px] text-white max-w-[85%] leading-relaxed" style={{ background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}>
                              What can you help me with?
                            </div>
                            <span className="text-[9px] text-gray-400 mr-1">Just now</span>
                          </div>
                        </div>

                        {/* Agent reply */}
                        <div className="flex gap-2 items-end">
                          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: `${TEAL}20` }}>
                            <img src="/Archelon_logo.png" alt="" className="w-full h-full object-contain p-0.5" />
                          </div>
                          <div className="px-2.5 py-1.5 rounded-2xl rounded-bl-sm text-[10px] text-gray-800 max-w-[85%] leading-relaxed" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                            I can answer questions based on the documents I've been trained on!
                          </div>
                        </div>
                      </div>

                      {/* Disclaimer */}
                      <div className="px-3 pt-1.5" style={{ background: '#f9fafb' }}>
                        <p className="text-[9px] text-gray-400 text-center">{displayName} can make mistakes. Verify important info.</p>
                      </div>

                      {/* Input */}
                      <div className="px-3 py-2.5" style={{ background: '#fff', borderTop: '1px solid #f3f4f6' }}>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ background: '#f3f4f6' }}>
                          <span className="text-[10px] text-gray-400 flex-1">Ask {displayName}...</span>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}>
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" /></svg>
                          </div>
                        </div>
                        <p className="text-center text-[9px] text-gray-400 mt-1.5">
                          Powered by <span style={{ color: TEAL }} className="font-medium">Archelon</span>
                        </p>
                      </div>
                    </div>

                    {/* Launcher FAB */}
                    <div className="w-11 h-11 rounded-full shadow-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — setup, scrollable */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#0d0d0d]">
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex-1 px-8 md:px-12 py-12 max-w-2xl mx-auto w-full space-y-7">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Embed on your website</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable the widget, configure it, then copy the script to deploy.</p>
            </div>

            {/* Enable toggle — always visible */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a]">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable embed</div>
                <div className="text-xs text-gray-400 mt-0.5">Allow this agent to be embedded on external websites</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                  {enabled ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={handleToggle}
                  className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[#00C9B1]' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* All config — only when enabled, state persists via useState (not reset on toggle) */}
            {enabled && (
              <>
                {/* Widget name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Widget name <span className="text-gray-400 font-normal text-xs">(shown to visitors)</span>
                  </label>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={shortName}
                        onChange={e => setShortName(e.target.value)}
                        placeholder="e.g. Arex, Mark, Cody..."
                        maxLength={20}
                        className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40"
                      />
                      <button onClick={() => { setSavedName(shortName.trim()); setEditingName(false); }} disabled={!shortName.trim()} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40" style={{ background: TEAL }}>Save</button>
                      <button onClick={() => setEditingName(false)} className="px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-sm text-gray-700 dark:text-gray-300">
                        {savedName || <span className="text-gray-400">Not set — defaults to agent name</span>}
                      </div>
                      <button onClick={() => { setShortName(savedName); setEditingName(true); }} className="px-4 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                        {savedName ? 'Edit' : 'Set name'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Agent ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Agent ID</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                      {agentId}
                    </div>
                    <CopyButton text={agentId} />
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">API Key</label>
                  {!apiKey ? (
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {loading ? 'Generating...' : 'Generate API Key'}
                    </button>
                  ) : (
                    <div className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-xs font-mono text-gray-400 select-none">
                      arch_live_••••••••••••••••••••••••••••••••
                    </div>
                  )}
                </div>

                {/* Allowed domains */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Allowed domains <span className="text-gray-400 font-normal text-xs">(whitelist — only these sites can use your key)</span>
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={domainInput}
                      onChange={e => setDomainInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                      placeholder="e.g. mywebsite.com"
                      className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40"
                    />
                    <button
                      onClick={handleAddDomain}
                      disabled={!domainInput.trim()}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                      style={{ background: TEAL }}
                    >Add</button>
                  </div>
                  {domains.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {domains.map(d => (
                        <span key={d} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {d}
                          <button onClick={() => handleRemoveDomain(d)} className="text-gray-400 hover:text-red-400 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {domains.length === 0 && (
                    <p className="text-xs text-gray-400">No domains added — all origins allowed (not recommended for production).</p>
                  )}
                </div>

                {/* Widget logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Widget logo <span className="text-gray-400 font-normal text-xs">(shown in chat header — PNG, JPG, SVG, max 500KB)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {logoUrl && (
                      <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a]" />
                    )}
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm cursor-pointer border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {logoUploading ? 'Uploading...' : logoUrl ? 'Change logo' : 'Upload logo'}
                      <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                    {logoUrl && (
                      <button onClick={() => setLogoUrl('')} className="text-xs text-red-400 hover:text-red-500 transition-colors">Remove</button>
                    )}
                  </div>
                  {!logoUrl && <p className="text-xs text-gray-400 mt-1.5">Not set — defaults to Archelon logo</p>}
                </div>

                {/* Theme toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Widget theme</label>
                  <div className="flex gap-3">
                    {['light', 'dark'].map(t => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-all capitalize ${
                          theme === t
                            ? 'border-[#00C9B1] text-[#00C9B1] bg-[#00C9B1]/5'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {t === 'light' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input/Output limits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Response limits</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max input characters</label>
                      <input
                        type="number"
                        min={100} max={4000} step={100}
                        value={maxInputChars}
                        onChange={e => setMaxInputChars(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">How long a visitor's message can be</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max output tokens</label>
                      <input
                        type="number"
                        min={100} max={2000} step={100}
                        value={maxOutputTokens}
                        onChange={e => setMaxOutputTokens(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">How long the agent's response can be</p>
                    </div>
                  </div>
                </div>

                {/* Save Changes button */}
                {apiKey && (
                  <div className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleSaveSettings}
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}
                    >
                      {loading ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}
                    </button>
                    <p className="text-xs text-gray-400">Updates widget name, domains, theme and limits</p>
                  </div>
                )}

                {/* Script snippet */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Embed script</label>
                    <CopyButton text={scriptSnippet} label="Copy script" />
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141414] overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-400 font-mono">JS — place before &lt;/body&gt;</span>
                    </div>
                    <pre className="px-4 py-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">{scriptSnippet}</pre>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Place the container div where you want the widget, and the script just before <code className="bg-gray-100 dark:bg-[#2a2a2a] px-1 rounded">&lt;/body&gt;</code>.
                  </p>
                </div>

                {/* Full HTML page */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full HTML page</label>
                      <p className="text-xs text-gray-400 mt-0.5">A complete ready-to-use HTML file with the widget already embedded</p>
                    </div>
                    <CopyButton text={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${displayName} — Powered by Archelon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; }
  </style>
</head>
<body>

  <!-- Your page content goes here -->

  <!-- Archelon Chat Widget -->
  <script>
    window.ArchelonConfig = {
      agentId: "${agentId}",
      apiKey: "${apiKey ? apiKey : 'arch_live_YOUR_KEY_HERE'}",
      name: "${displayName}",
      position: "bottom-right",
      theme: "light"
    };
  </script>
  <script src="https://api.archelon.cloud/embed.js" async></script>

</body>
</html>`} label="Copy full HTML" />
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141414] overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-400 font-mono">HTML — complete page</span>
                    </div>
                    <pre className="px-4 py-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">{`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${displayName} — Powered by Archelon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; }
  </style>
</head>
<body>

  <!-- Your page content goes here -->

  <!-- Archelon Chat Widget -->
  <script>
    window.ArchelonConfig = {
      agentId: "${agentId}",
      apiKey: "${apiKey ? apiKey : 'arch_live_YOUR_KEY_HERE'}",
      name: "${displayName}",
      position: "bottom-right",
      theme: "light"
    };
  </script>
  <script src="https://api.archelon.cloud/embed.js" async></script>

</body>
</html>`}</pre>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => setShowSteps(p => !p)}
                    className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                    style={{ color: TEAL }}
                  >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showSteps ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showSteps ? 'Hide steps' : 'How to deploy'}
                  </button>
                  {showSteps && (
                    <div className="mt-4 space-y-3">
                      {[
                        'Add the HTML container div where you want the widget to appear on your page.',
                        'Paste the script tag before the closing </body> tag.',
                        'Replace arch_live_YOUR_KEY_HERE with your generated API key.',
                        'Deploy your website — the chat widget will appear automatically.',
                        'Visitors get instant answers powered by your agent\'s documents.',
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5" style={{ background: `${TEAL}20`, color: TEAL }}>
                            {i + 1}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{step}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Disable confirmation modal */}
      {showDisableConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-900/30">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">Disable embed?</div>
                <div className="text-xs text-gray-400 mt-0.5">This will take the widget offline</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Disabling will <span className="font-medium text-gray-900 dark:text-gray-100">revoke your current API key</span> and take the widget offline immediately. Any website using this key will stop working.
              <br /><br />
              You can re-enable anytime and generate a fresh API key.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDisable}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Disable & Revoke Key
              </button>
              <button
                onClick={() => setShowDisableConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key reveal — blocking overlay inside modal */}
      {keyJustGenerated && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}20` }}>
                <svg className="w-5 h-5" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">Your API Key</div>
                <div className="text-xs text-gray-400 mt-0.5">Copy it now — this is the only time it will be shown</div>
              </div>
            </div>

            <div className="p-3 rounded-xl mb-3 font-mono text-sm break-all select-all" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
              {apiKey}
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5 mb-5">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Store this key securely. It cannot be recovered once you dismiss this box. If lost, you will need to generate a new key.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiKey);
                  setKeyJustGenerated(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy & Close
              </button>
              <button
                onClick={() => setKeyJustGenerated(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                I've saved it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmbedModal;
