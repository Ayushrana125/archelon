import React, { useState } from 'react';

const TEAL = '#00C9B1';

const STEPS = [
  'Copy the embed script below.',
  'Paste it before the closing </body> tag on your website.',
  'A chat widget appears — powered by your agent\'s documents.',
  'Visitors get instant answers. You stay in control.',
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]" style={{ color: copied ? TEAL : undefined }}>
      {copied ? (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
      ) : (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
      )}
    </button>
  );
}

function AgentDeployCard({ agent, focusId }) {
  const isTarget = agent.id === focusId;
  const [enabled, setEnabled] = useState(false);
  const [shortName, setShortName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savedName, setSavedName] = useState('');
  const [showSteps, setShowSteps] = useState(false);

  const dummyApiKey = 'arch_live_••••••••••••••••••••••••••••••••';
  const displayName = savedName || agent.name;

  const script = `<script>
  window.ArchelonConfig = {
    agentId: "${agent.id}",
    apiKey: "arch_live_YOUR_KEY_HERE",
    name: "${displayName}"
  };
</script>
<script src="https://api.archelon.aranixlabs.cloud/embed.js" async></script>`;

  return (
    <div className={`rounded-2xl border bg-white dark:bg-[#1e1e1e] overflow-hidden transition-all ${isTarget ? 'border-[#00C9B1]/40 shadow-lg' : 'border-gray-200 dark:border-gray-700'}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
            <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{agent.name}</div>
            {savedName && <div className="text-xs text-gray-400 mt-0.5">Widget name: <span style={{ color: TEAL }}>{savedName}</span></div>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            {enabled ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={() => setEnabled(p => !p)}
            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#00C9B1]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Body — only when enabled */}
      {enabled && (
        <div className="px-5 py-5 space-y-5">

          {/* Widget short name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Widget name <span className="text-gray-400 font-normal">(shown to visitors)</span>
            </label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  placeholder="e.g. Arex, Mark, Cody..."
                  maxLength={20}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40"
                />
                <button
                  onClick={() => { setSavedName(shortName.trim()); setEditingName(false); }}
                  disabled={!shortName.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: TEAL }}
                >Save</button>
                <button onClick={() => setEditingName(false)} className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2a2a] text-sm text-gray-700 dark:text-gray-300">
                  {savedName || <span className="text-gray-400">Not set — defaults to agent name</span>}
                </div>
                <button
                  onClick={() => { setShortName(savedName); setEditingName(true); }}
                  className="px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  {savedName ? 'Edit' : 'Set name'}
                </button>
              </div>
            )}
          </div>

          {/* Agent ID */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Agent ID</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2a2a] text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                {agent.id}
              </div>
              <CopyButton text={agent.id} />
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">API Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2a2a] text-xs font-mono text-gray-500 dark:text-gray-500 truncate select-none">
                {dummyApiKey}
              </div>
            </div>
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-1.5 flex items-center gap-1.5">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              API key is shown only once when generated. Store it in a safe place — it cannot be recovered.
            </p>
          </div>

          {/* Embed script */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Embed script</label>
              <CopyButton text={script} />
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141414] overflow-hidden">
              <pre className="px-4 py-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">{script}</pre>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Paste before the closing <code className="bg-gray-100 dark:bg-[#2a2a2a] px-1 rounded">&lt;/body&gt;</code> tag on your website.
            </p>
          </div>

          {/* Steps toggle */}
          <button
            onClick={() => setShowSteps(p => !p)}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: TEAL }}
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showSteps ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showSteps ? 'Hide steps' : 'How to deploy'}
          </button>

          {showSteps && (
            <div className="space-y-3 pt-1 pb-1">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5" style={{ background: `${TEAL}20`, color: TEAL }}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{step}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
                <p className="text-xs text-gray-400">
                  Need more help?{' '}
                  <a href="#" className="underline decoration-dotted" style={{ color: TEAL }}>Read the full documentation →</a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeploymentsView({ savedAgents, focusAgentId }) {
  const deployableAgents = (savedAgents || []).filter(a => !a.is_system);

  return (
    <div className="h-[calc(100vh-57px)] overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Deployments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Embed your agents as chat widgets on any website. Enable an agent, set a widget name, and copy the script.
          </p>
        </div>

        {deployableAgents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${TEAL}15` }}>
              <svg className="w-7 h-7" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No agents to deploy yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create an agent first, then come back here to embed it.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deployableAgents.map(agent => (
              <AgentDeployCard key={agent.id} agent={agent} focusId={focusAgentId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeploymentsView;
