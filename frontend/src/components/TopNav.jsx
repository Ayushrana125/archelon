import React, { useState, useEffect } from 'react';
import EmbedModal from './EmbedModal';

const TEAL = '#00C9B1';

function TopNav({ agentName, agentData, documents = [], collapsed, onDocsClick, onEditAgent, user, onDashboard }) {
  const [showEmbed, setShowEmbed] = useState(false);

  // Auto-open embed modal once per session for non-system agents
  useEffect(() => {
    if (!agentData?.id || agentData?.is_system) return;
    const seen = sessionStorage.getItem('embed_intro_seen');
    if (!seen) {
      setShowEmbed(true);
      sessionStorage.setItem('embed_intro_seen', 'true');
    }
  }, [agentData?.id]);

  return (
    <>
    <nav className="bg-white dark:bg-[#212121] flex items-center h-[57px] fixed top-0 right-0 z-10 border-b border-gray-200 dark:border-gray-700" style={{ left: collapsed ? '56px' : '256px', transition: 'left 0.3s' }}>
      <div className="flex items-center gap-3 px-5 flex-1">
        <div className="agent-name text-xl tracking-tight text-gray-800 dark:text-gray-100">{agentName}</div>
        {agentData && documents.length > 0 && agentName !== 'Settings' && (
          <button
            onClick={onDocsClick}
            className="docs-pill cursor-pointer hover:opacity-70 transition-opacity"
          >
            {documents.length} doc{documents.length !== 1 ? 's' : ''}
          </button>
        )}
        {agentData && (!agentData.is_system || agentData.user_id === user?.id) && agentName !== 'Settings' && (
          <button
            onClick={onEditAgent}
            title="Edit agent"
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* Dashboard button — developer only, home page only */}
        {user?.is_developer && !agentData && agentName !== 'Dashboard' && (
          <button
            onClick={onDashboard}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
            style={{ color: TEAL, borderColor: `${TEAL}40`, background: `${TEAL}10` }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Dashboard
          </button>
        )}

        {/* Embed button — only for non-system agents */}
        {agentData && !agentData.is_system && agentName !== 'Settings' && (
          <button
            onClick={() => setShowEmbed(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
            style={{ color: TEAL, borderColor: `${TEAL}40`, background: `${TEAL}10` }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Embed
          </button>
        )}
      </div>
    </nav>
    {showEmbed && <EmbedModal agentName={agentData?.name} onClose={() => setShowEmbed(false)} />}
    </>
  );
}

export default TopNav;
