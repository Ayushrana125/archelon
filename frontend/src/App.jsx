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
import DeploymentsView from './components/DeploymentsView';
import { fetchAgents } from './services/agent_service';
import { fetchDocuments, invalidateDocuments, getCachedDocuments } from './services/document_service';
import { authHeaders } from './services/auth_service';

function App({ externalTheme, externalSetTheme, onLogout, user }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('arex');
  const [theme, setTheme] = useState(externalTheme || 'dark');
  const [agentData, setAgentData] = useState(null);
  const [savedAgents, setSavedAgents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [agentDocuments, setAgentDocuments] = useState([]);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [pendingAgent, setPendingAgent] = useState(null);
  const [deployFocusId, setDeployFocusId] = useState(null);
  const [embedStatuses, setEmbedStatuses] = useState({});

  const refreshTokenBalance = () => {
    if (!user) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/chat/balance`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    })
      .then(r => r.json())
      .then(d => setTokenBalance(d))
      .catch(() => {});
  };

  // Prefetch everything on login in parallel
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/chat/balance`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      }).then(r => r.json()).catch(() => null),
      fetchAgents(true).catch(() => []),
    ]).then(([balance, agents]) => {
      if (balance) setTokenBalance(balance);
      const list = agents || [];
      setSavedAgents(list);
      // Fetch embed status for all non-system agents in parallel
      const deployable = list.filter(a => !a.is_system);
      Promise.all(
        deployable.map(a =>
          fetch(`${import.meta.env.VITE_API_URL}/api/embed/${a.id}`, {
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
          }).then(r => r.json()).then(d => [a.id, d]).catch(() => [a.id, null])
        )
      ).then(results => {
        const map = {};
        results.forEach(([id, d]) => { if (d) map[id] = d; });
        setEmbedStatuses(map);
      });
    });
  }, [user?.id]);

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
    if (chatBusy) {
      setPendingAgent(agent);
      return;
    }
    setChatBusy(false);
    setAgentData(agent);
    setActiveAgentId(agent.id);
    setAgentDocuments(getCachedDocuments(agent.id) || []);
    setMode('arex');
    setShowDocsPanel(false);

    // Auto-send "Hi" only if this agent has no chat history yet
    setChatHistories(prev => {
      if (prev[agent.id]) return prev; // already has history, skip
      return { ...prev, [agent.id]: [] }; // empty array triggers greeting in ChatView
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
        {pendingAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#1A73E815' }}>
                <svg className="w-7 h-7" style={{ color: '#1A73E8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Response in progress</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Switching agents now will cancel the current response. Are you sure?</p>
              <button
                onClick={() => { setChatBusy(false); handleSelectAgent(pendingAgent); setPendingAgent(null); }}
                className="w-full py-3 rounded-xl text-white text-sm font-medium mb-3"
                style={{ background: 'linear-gradient(135deg, #1A73E8, #0f5bbf)' }}
              >
                Switch anyway
              </button>
              <button
                onClick={() => setPendingAgent(null)}
                className="w-full py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Keep waiting
              </button>
            </div>
          </div>
        )}
        <TopNav
          agentName={mode === 'settings' ? '' : mode === 'dashboard' ? 'Dashboard' : mode === 'deployments' ? 'Deployments' : agentData ? agentData.name : 'Home'}
          agentData={mode === 'settings' || mode === 'dashboard' || mode === 'deployments' ? null : agentData}
          documents={mode === 'settings' || mode === 'dashboard' || mode === 'deployments' ? [] : agentDocuments}
          collapsed={sidebarCollapsed}
          onDocsClick={() => setShowDocsPanel(p => !p)}
          onEditAgent={() => setMode('edit')}
          onDeploy={() => { setDeployFocusId(agentData?.id ?? null); setMode('deployments'); }}
          user={user}
          onDashboard={() => setMode('dashboard')}
          tokenBalance={tokenBalance}
          embedStatuses={embedStatuses}
          onEmbedStatusChange={(agentId, status) => setEmbedStatuses(prev => ({ ...prev, [agentId]: status }))}
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
            {mode === 'arex' && agentData && <ChatView key={agentData?.id ?? 'arex'} agentData={agentData} onAddFile={handleAddFileToAgent} messages={currentMessages} setMessages={setCurrentMessages} isGreetingLoading={isGreetingLoading} onTokensUsed={refreshTokenBalance} onRequestBusy={setChatBusy} onDocumentsUpdated={() => { invalidateDocuments(agentData.id); fetchDocuments(agentData.id, true).then(docs => setAgentDocuments(docs)).catch(() => {}); }} />}
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
            {mode === 'deployments' && <DeploymentsView savedAgents={savedAgents} focusAgentId={deployFocusId} />}
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
    </div>
  );
}

export default App;
