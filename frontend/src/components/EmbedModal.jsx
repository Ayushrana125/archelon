import React, { useState } from 'react';

const TEAL = '#00C9B1';

const DUMMY_SCRIPT = `<script>
  window.ArchelonConfig = {
    agentId: "your-agent-id",
    theme: "dark",
    position: "bottom-right"
  };
</script>
<script
  src="https://cdn.archelon.ai/widget.js"
  async>
</script>`;

function EmbedModal({ agentName, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(DUMMY_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#141414] w-full h-full md:rounded-3xl md:w-[80vw] md:h-[85vh] overflow-hidden relative border-0 md:border border-gray-100 dark:border-gray-800 flex shadow-2xl">

        {/* Left — explanation */}
        <div className="hidden md:flex flex-col w-[42%] p-12 relative overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }}>
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

          <div className="relative flex-1 flex flex-col justify-between">
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
                Embed <span style={{ color: TEAL }}>{agentName}</span> as a chat widget on any website. Your visitors get instant answers — powered by your documents, managed entirely by Archelon's RAG infrastructure.
              </p>

              <div className="space-y-5">
                {[
                  { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Upload your documents once' },
                  { icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', text: 'Paste one script tag on your site' },
                  { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', text: 'Your visitors chat with your agent instantly' },
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

            {/* Coming soon notice */}
            <div className="mt-8 px-4 py-3 rounded-xl border" style={{ borderColor: `${TEAL}30`, background: `${TEAL}08` }}>
              <p className="text-xs leading-relaxed" style={{ color: `${TEAL}cc` }}>
                🚧 <span className="font-medium">Under development.</span> This feature is not yet live. The script below is a preview of what's coming. Stay tuned — we're building it.
              </p>
            </div>
          </div>
        </div>

        {/* Right — script */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#0d0d0d]">
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-12 max-w-xl mx-auto w-full">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Embed on your website</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Paste this script before the closing <code className="bg-gray-100 dark:bg-[#2a2a2a] px-1.5 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag on your website.
            </p>

            {/* Coming soon notice — always visible */}
            <div className="mb-6 px-4 py-3 rounded-xl border" style={{ borderColor: `${TEAL}40`, background: `${TEAL}10` }}>
              <p className="text-xs leading-relaxed font-medium" style={{ color: TEAL }}>
                🚧 Under development — this feature is not yet live. The script below is a preview of what's coming. Stay tuned, we're building it.
              </p>
            </div>

            {/* Script block */}
            <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] overflow-hidden mb-6">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400 font-mono">HTML</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: copied ? TEAL : undefined }}
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="px-4 py-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">{DUMMY_SCRIPT}</pre>
            </div>

            {/* How it works steps */}
            <div className="space-y-4">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">How it works</p>
              {[
                { step: '1', text: 'Copy the script above' },
                { step: '2', text: 'Paste it before </body> on any page of your website' },
                { step: '3', text: 'A chat widget appears — powered by your agent\'s documents' },
                { step: '4', text: 'Your visitors get instant, accurate answers 24/7' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${TEAL}20`, color: TEAL }}>
                    {s.step}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{s.text}</p>
                </div>
              ))}
            </div>

            {/* Mobile coming soon */}
            <div className="mt-8 px-4 py-3 rounded-xl border md:hidden" style={{ borderColor: `${TEAL}30`, background: `${TEAL}08` }}>
              <p className="text-xs leading-relaxed" style={{ color: `${TEAL}cc` }}>
                🚧 <span className="font-medium">Under development.</span> This feature is not yet live. Stay tuned.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmbedModal;
