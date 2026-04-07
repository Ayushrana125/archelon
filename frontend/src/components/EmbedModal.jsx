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

function EmbedModal({ agentId, agentName, onClose, user, prefetchedStatus, onStatusChange }) {
  const [enabled, setEnabled] = useState(false);

  const savedNameRef = useRef('');
  const apiKeyRef = useRef(null);
  const domainsRef = useRef([]);

  const [savedName, setSavedName] = useState('');
  const [apiKey, setApiKey] = useState(null);
  const [keyJustGenerated, setKeyJustGenerated] = useState(false);
  const [domains, setDomains] = useState([]);
  const [domainInput, setDomainInput] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [maxInputChars, setMaxInputChars] = useState(2000);
  const [maxOutputTokens, setMaxOutputTokens] = useState(500);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);

  const hasChanges = originalSettings !== null && (
    savedName !== originalSettings.savedName ||
    theme !== originalSettings.theme ||
    logoUrl !== originalSettings.logoUrl ||
    maxInputChars !== originalSettings.maxInputChars ||
    maxOutputTokens !== originalSettings.maxOutputTokens ||
    JSON.stringify(domains) !== JSON.stringify(originalSettings.domains)
  );
  // Use prefetched data if available, else fetch
  useEffect(() => {
    if (prefetchedStatus) {
      const d = prefetchedStatus;
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
      setFetchDone(true);
      return;
    }
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
        setFetchDone(true);
      })
      .catch(() => { setFetchDone(true); });
  }, [agentId]);

  const handleToggle = () => {
    if (enabled) {
      setShowDisableConfirm(true);
    } else {
      setEnabled(true);
    }
  };

  const displayName = savedName || agentName || 'Assistant';

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
    onStatusChange?.(agentId, { enabled: false });
  };

  const settingsCardRef = React.useRef(null);

  useEffect(() => {
    if (!editMode) return;
    const handleClickOutside = (e) => {
      if (settingsCardRef.current && !settingsCardRef.current.contains(e.target)) {
        setEditMode(false);
        setOriginalSettings(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editMode]);

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
      onStatusChange?.(agentId, { enabled: true, widget_name: savedName || agentName, allowed_origins: domains, theme, max_input_chars: maxInputChars, max_output_tokens: maxOutputTokens });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    apiKey: "${apiKey && apiKey !== 'masked' ? apiKey : 'arch_live_YOUR_KEY_HERE'}"
  };
</script>
<script src="https://api.archelon.cloud/embed.js" async></script>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#141414] w-full h-full md:rounded-3xl md:w-[88vw] md:h-[90vh] overflow-hidden relative border-0 md:border border-gray-100 dark:border-gray-800 flex shadow-2xl">

        {/* Left - branding when disabled, widget preview when enabled */}
        <div
          className="hidden md:flex flex-col w-[34%] relative overflow-hidden flex-shrink-0"
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
                  Embed <span style={{ color: TEAL }}>{agentName}</span> as a chat widget on any website. Your visitors get instant answers - powered by your documents.
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
                  Enable the widget on the right to generate your API key and get the embed script.
                </p>
              </div>
            </div>
          ) : (
            /* Live widget preview in iframe */
            <div className="relative flex flex-col h-full" style={{ background: '#0a0a0a' }}>
              <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest" style={{ color: TEAL }}>Live Preview</p>
                  <p className="text-xs text-gray-600 mt-0.5">Actual widget - test before deploying</p>
                </div>
              </div>
              <div className="flex-1 mx-6 mb-6 rounded-2xl overflow-hidden border border-gray-800">
              {apiKey && apiKey !== 'masked' ? (
                  <iframe
                    key={`${agentId}-${apiKey}`}
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0a0a0a;font-family:sans-serif;padding:20px;}h2{color:#374151;font-size:14px;}p{color:#6b7280;font-size:12px;line-height:1.6;}</style></head><body><h2 style="color:#9ca3af;margin-bottom:8px;">Your website</h2><p>The widget appears in the bottom-right corner.</p><p>Click the button to test it.</p><script>window.ArchelonConfig={agentId:"${agentId}",apiKey:"${apiKey}"};</script><script src="https://api.archelon.cloud/embed.js" async></script></body></html>`}
                    className="w-full h-full border-0"
                    style={{ background: '#0a0a0a' }}
                    title="Widget Preview"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-8" style={{ background: '#0f0f0f' }}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full relative" style={{ background: '#16a34a20' }}>
                      <div className="w-3 h-3 rounded-full absolute animate-ping" style={{ background: '#22c55e', opacity: 0.4 }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <svg className="w-4 h-4" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm font-semibold text-white">{displayName} is live</p>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">Your widget is deployed and active.<br />Test it by visiting your website.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right - setup, scrollable */}
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

            {/* Enable toggle - always visible */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a]">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable embed</div>
                <div className="text-xs text-gray-400 mt-0.5">Allow this agent to be embedded on external websites</div>
              </div>
              <div className="flex items-center gap-3">
                {!fetchDone ? (
                  <div className="w-11 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : (
                  <>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                      {enabled ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={handleToggle}
                      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[#00C9B1]' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* All config - only when enabled, state persists via useState (not reset on toggle) */}
            {enabled && (
              <>
                {/* Edit mode header */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {editMode ? 'Edit settings below, then save.' : 'Click any field to edit settings.'}
                  </p>
                  {editMode && (
                    <button
                      onClick={() => { setEditMode(false); setOriginalSettings(null); }}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-1.5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {/* Agent ID + API Key - read only info */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Agent ID</p>
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-[220px]">{agentId}</p>
                    </div>
                    <CopyButton text={agentId} />
                  </div>
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">API Key</p>
                      {!apiKey ? (
                        <p className="text-xs text-gray-400">Not generated yet</p>
                      ) : (
                        <p className="text-xs font-mono text-gray-400">arch_live_••••••••••••••••</p>
                      )}
                    </div>
                    {!apiKey && (
                      <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                        style={{ background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        {loading ? 'Generating...' : 'Generate'}
                      </button>
                    )}
                  </div>
                </div>
                <div
                  ref={settingsCardRef}
                  className={`rounded-xl border overflow-hidden relative transition-all ${
                    editMode
                      ? 'border-[#00C9B1]/40 dark:border-[#00C9B1]/30 bg-gray-50/50 dark:bg-[#1a1a1a]'
                      : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => { if (!editMode) { setEditMode(true); setOriginalSettings({ savedName, theme, logoUrl, maxInputChars, maxOutputTokens, domains: [...domains] }); } }}
                >

                  {/* Widget name */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Widget name <span className="font-normal">(shown to visitors)</span></label>
                    <input
                      value={savedName}
                      onChange={e => setSavedName(e.target.value)}
                      placeholder={agentName || 'Assistant'}
                      maxLength={20}
                      readOnly={!editMode}
                      className={`w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400 ${!editMode ? 'cursor-default' : ''}`}
                    />
                  </div>

                  {/* Logo */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Widget logo</p>
                      <p className="text-xs text-gray-400">{logoUrl ? 'Custom logo set' : 'Using Archelon default'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {logoUrl && <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain border border-gray-200 dark:border-gray-700" />}
                      {editMode && (
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {logoUploading ? 'Uploading...' : logoUrl ? 'Change' : 'Upload'}
                          <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                        </label>
                      )}
                      {editMode && logoUrl && (
                        <button onClick={() => setLogoUrl('')} className="text-xs text-red-400 hover:text-red-500">Remove</button>
                      )}
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Theme</p>
                    <div className="flex gap-2">
                      {['light', 'dark'].map(t => (
                        <button
                          key={t}
                          onClick={() => editMode && setTheme(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all capitalize ${
                            theme === t
                              ? 'border-[#00C9B1] text-[#00C9B1] bg-[#00C9B1]/5'
                              : 'border-gray-200 dark:border-gray-700 text-gray-400'
                          } ${!editMode ? 'cursor-default opacity-70' : ''}`}
                        >{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* Allowed domains */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Allowed domains <span className="font-normal">(whitelist)</span></label>
                    {editMode && (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          value={domainInput}
                          onChange={e => setDomainInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                          placeholder="e.g. mywebsite.com"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40"
                        />
                        <button onClick={handleAddDomain} disabled={!domainInput.trim()} className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40" style={{ background: TEAL }}>Add</button>
                      </div>
                    )}
                    {domains.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {domains.map(d => (
                          <span key={d} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {d}
                            {editMode && (
                              <button onClick={() => handleRemoveDomain(d)} className="text-gray-400 hover:text-red-400 ml-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No domains - all origins allowed</p>
                    )}
                  </div>

                  {/* Response limits */}
                  <div className="px-5 py-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Max input chars</label>
                      <input type="number" min={100} max={4000} step={100} value={maxInputChars}
                        onChange={e => editMode && setMaxInputChars(Number(e.target.value))}
                        readOnly={!editMode}
                        className={`w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:outline-none ${editMode ? 'focus:ring-2 focus:ring-[#00C9B1]/40' : 'cursor-default opacity-70'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Max output tokens</label>
                      <input type="number" min={100} max={2000} step={100} value={maxOutputTokens}
                        onChange={e => editMode && setMaxOutputTokens(Number(e.target.value))}
                        readOnly={!editMode}
                        className={`w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:outline-none ${editMode ? 'focus:ring-2 focus:ring-[#00C9B1]/40' : 'cursor-default opacity-70'}`}
                      />
                    </div>
                  </div>

                </div>

                {/* Save Changes button */}
                {apiKey && editMode && (
                  <div className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={async () => { await handleSaveSettings(); setEditMode(false); setOriginalSettings(null); }}
                      disabled={loading || !hasChanges}
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
                      <span className="text-xs text-gray-400 font-mono">JS - place before &lt;/body&gt;</span>
                    </div>
                    <pre className="px-4 py-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">{scriptSnippet}</pre>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Place the container div where you want the widget, and the script just before <code className="bg-gray-100 dark:bg-[#2a2a2a] px-1 rounded">&lt;/body&gt;</code>.
                  </p>
                </div>

                {/* Placement guide */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Where to place it</label>
                  <p className="text-xs text-gray-400 mb-2">Paste the script just before the closing <code className="bg-gray-100 dark:bg-[#2a2a2a] px-1 rounded">&lt;/body&gt;</code> tag in your HTML:</p>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141414] overflow-hidden">
                    <pre className="px-4 py-4 text-xs font-mono leading-relaxed whitespace-pre overflow-x-auto">
                      <span className="text-gray-400">  {`<!-- your page content -->`}</span>{`\n`}
                      <span className="text-gray-400">  </span>
                      <span className="text-gray-400">{`<!-- Archelon widget ↓ -->`}</span>{`\n`}
                      <span style={{ background: `${TEAL}22`, color: TEAL }} className="rounded px-0.5">  {scriptSnippet.split('\n').map((l, i) => i === 0 ? l : `  ${l}`).join('\n')}</span>{`\n`}
                      <span className="text-gray-400">{`</body>`}</span>
                    </pre>
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
                        'Deploy your website - the chat widget will appear automatically.',
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

      {/* API Key reveal - blocking overlay inside modal */}
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
                <div className="text-xs text-gray-400 mt-0.5">Copy it now - this is the only time it will be shown</div>
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
