import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import CreateAgentView from './components/CreateAgentView';
import SettingsView from './components/SettingsView';
import AgentsLibrary from './components/AgentsLibrary';
import EditAgentView from './components/EditAgentView';
import DocsPanel from './components/DocsPanel';
import HomePage from './components/HomePage';
import DashboardView from './components/DashboardView';
import { fetchAgents } from './services/agent_service';
import { fetchDocuments, invalidateDocuments, getCachedDocuments } from './services/document_service';
import { authHeaders } from './services/auth_service';

const TEAL = '#00C9B1';

function BugReportButton() {
  const [open, setOpen]           = useState(false);
  const [text, setText]           = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setText('');
      setOpen(false);
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Report a bug"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-all hover:scale-105"
        style={{ background: '#1a1a1a', border: `1px solid ${TEAL}40`, color: TEAL }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        Report Bug
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-5" onClick={() => setOpen(false)}>
          <div
            className="w-80 rounded-2xl p-5 shadow-2xl flex flex-col gap-3"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-100">Report a Bug</span>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <svg className="w-8 h-8" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-300">Bug reported successfully!</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500">Describe what happened and what you expected.</p>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="e.g. Clicking upload shows an error..."
                  rows={4}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || loading}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: TEAL, color: '#000' }}
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function App({ externalTheme, externalSetTheme, onLogout, user }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('arex');
  const [theme, setTheme] = useState(externalTheme || 'dark');
  const [agentData, setAgentData] = useState(null);
  const [savedAgents, setSavedAgents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [agentDocuments, setAgentDocuments] = useState([]);

  useEffect(() => {
    fetchAgents(true)
      .then(agents => setSavedAgents(agents))
      .catch(() => setSavedAgents([]));
  }, []);

  useEffect(() => {
    if (!agentData?.id) { setAgentDocuments([]); return; }
    const cached = getCachedDocuments(agentData.id);
    if (cached) setAgentDocuments(cached);
    fetchDocuments(agentData.id)
      .then(docs => setAgentDocuments(docs))
      .catch(() => {});
  }, [agentData?.id]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDocsPanel, setShowDocsPanel] = useState(false);
  const [chatHistories, setChatHistories] = useState({
    arex: [{ role: 'assistant', content: "Hi, I'm Arex. Ask me about my experience, projects, or request my resume.", id: 0 }]
  });

  const currentChatKey = activeAgentId ?? 'arex';
  const currentMessages = chatHistories[currentChatKey] ?? [{ role: 'assistant', content: `Hi, I'm ${agentData?.name ?? 'Arex'}. How can I help you?`, id: 0 }];
  const isGreetingLoading = activeAgentId && chatHistories[activeAgentId]?.length === 0;

  const setCurrentMessages = (updater) => {
    setChatHistories(prev => ({
      ...prev,
      [currentChatKey]: typeof updater === 'function' ? updater(prev[currentChatKey] ?? []) : updater
    }));
  };

  useEffect(() => {
    const name = agentData ? agentData.name : null;
    document.title = name ? `${name} - Archelon` : 'Archelon - Agentic RAG Platform';
  }, [agentData]);

  const handleSaveAgent = async (agent) => {
    try {
      const agents = await fetchAgents(true);
      setSavedAgents(agents);
    } catch {
      setSavedAgents(prev => {
        if (prev.find(a => a.id === agent.id)) return prev;
        return [...prev, agent];
      });
    }
    setActiveAgentId(agent.id);
  };

  const handleSelectAgent = async (agent) => {
    setAgentData(agent);
    setActiveAgentId(agent.id);
    setAgentDocuments(getCachedDocuments(agent.id) || []);
    setMode('arex');
    setShowDocsPanel(false);

    // Auto-send "Hi" only if this agent has no chat history yet
    setChatHistories(prev => {
      if (prev[agent.id]) return prev; // already has history, skip
      // Kick off the greeting fetch in the background
      fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          message:            'Hi',
          agent_id:           agent.id,
          session_id:         'session_1',
          agent_name:         agent.name ?? '',
          agent_description:  agent.description ?? '',
          agent_instructions: agent.instructions ?? '',
        }),
      })
        .then(r => r.json())
        .then(data => {
          const reply = data.answer ?? `Hi! I'm ${agent.name}. How can I help you?`;
          setChatHistories(h => ({
            ...h,
            [agent.id]: [{ role: 'assistant', content: reply, id: Date.now() }],
          }));
        })
        .catch(() => {
          setChatHistories(h => ({
            ...h,
            [agent.id]: [{ role: 'assistant', content: `Hi! I'm ${agent.name}. How can I help you?`, id: Date.now() }],
          }));
        });
      // Return a loading placeholder immediately
      return { ...prev, [agent.id]: [] };
    });
  };

  const handleSelectArex = () => {
    setAgentData(null);
    setActiveAgentId(null);
    setMode('arex');
    setShowDocsPanel(false);
  };

  const handleAddFileToAgent = (file) => {
    if (!activeAgentId) return;
    setSavedAgents(prev => prev.map(a =>
      a.id === activeAgentId
        ? { ...a, files: [...(a.files || []), { name: file.name, size: file.size }] }
        : a
    ));
    setAgentData(prev => prev ? { ...prev, files: [...(prev.files || []), { name: file.name, size: file.size }] } : prev);
  };

  const handleDeleteFile = (idx) => {
    setSavedAgents(prev => prev.map(a =>
      a.id === activeAgentId
        ? { ...a, files: a.files.filter((_, i) => i !== idx) }
        : a
    ));
    setAgentData(prev => prev ? { ...prev, files: prev.files.filter((_, i) => i !== idx) } : prev);
  };

  return (
    <div className={theme}>
      <div className="min-h-screen bg-white dark:bg-[#212121] text-gray-900 dark:text-gray-100">
        <TopNav
          agentName={mode === 'settings' ? '' : mode === 'dashboard' ? 'Dashboard' : agentData ? agentData.name : 'Home'}
          agentData={agentData}
          documents={agentDocuments}
          collapsed={sidebarCollapsed}
          onDocsClick={() => setShowDocsPanel(p => !p)}
          onEditAgent={() => setMode('edit')}
          user={user}
          onDashboard={() => setMode('dashboard')}
        />
        <div className="flex">
          <div className={`${sidebarCollapsed ? 'w-14' : 'w-64'} flex-shrink-0 transition-all duration-300`} />
          <Sidebar
            mode={mode}
            setMode={setMode}
            savedAgents={savedAgents}
            activeAgentId={activeAgentId}
            onSelectAgent={handleSelectAgent}
            onSelectArex={handleSelectArex}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onLogout={onLogout}
            user={user}
            onHome={() => { setAgentData(null); setActiveAgentId(null); setMode('arex'); }}
          />
          <main className="flex-1 pt-[57px]">
            {mode === 'arex' && !agentData && <HomePage onNewAgent={() => setMode('create')} savedAgents={savedAgents} onSelectAgent={handleSelectAgent} />}
            {mode === 'arex' && agentData && <ChatView key={agentData?.id ?? 'arex'} agentData={agentData} onAddFile={handleAddFileToAgent} messages={currentMessages} setMessages={setCurrentMessages} isGreetingLoading={isGreetingLoading} onDocumentsUpdated={() => { invalidateDocuments(agentData.id); fetchDocuments(agentData.id, true).then(docs => setAgentDocuments(docs)).catch(() => {}); }} />}
            {mode === 'create' && <CreateAgentView setMode={setMode} setAgentData={setAgentData} onSave={handleSaveAgent} />}
            {mode === 'edit' && <EditAgentView
              agentData={agentData}
              onSave={(updated) => {
                setSavedAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
                setAgentData(updated);
                setMode('arex');
              }}
              onCancel={() => setMode('arex')}
              onDelete={(id) => {
                setSavedAgents(prev => prev.filter(a => a.id !== id));
                setAgentData(null);
                setActiveAgentId(null);
                setAgentDocuments([]);
                setMode('arex');
              }}
              onDocumentDeleted={() => {
                fetchDocuments(agentData.id, true)
                  .then(docs => setAgentDocuments(docs))
                  .catch(() => {});
              }}
            />}
            {mode === 'library' && <AgentsLibrary agents={savedAgents} setAgentData={setAgentData} setMode={setMode} />}
            {mode === 'settings' && <SettingsView theme={theme} setTheme={setTheme} onLogout={onLogout} />}
            {mode === 'dashboard' && <DashboardView />}
          </main>
          {showDocsPanel && agentData && (
            <DocsPanel
              agentData={agentData}
              documents={agentDocuments}
              onClose={() => setShowDocsPanel(false)}
            />
          )}
        </div>
      </div>
      <BugReportButton />
    </div>
  );
}

export default App;
