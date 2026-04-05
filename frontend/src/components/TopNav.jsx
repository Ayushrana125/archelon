import React, { useState, useEffect } from 'react';
import EmbedModal from './EmbedModal';
import { authHeaders } from '../services/auth_service';

const TEAL = '#00C9B1';

function BugReportModal({ onClose }) {
  const [text, setText]           = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setText(''); onClose(); }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute top-14 right-4 w-80 rounded-2xl p-5 shadow-2xl flex flex-col gap-3"
        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-100">Report a Bug</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
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
  );
}

function TopNav({ agentName, agentData, documents = [], collapsed, onDocsClick, onEditAgent, user, onDashboard, tokenBalance, onDeploy, embedStatuses, onEmbedStatusChange }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [showBug, setShowBug] = useState(false);

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

        {/* Right side buttons */}
        <div className="ml-auto flex items-center gap-2">
          {/* Tokens indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 cursor-default select-none">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#00C9B1' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-gray-500 dark:text-gray-400">Free Plan ·</span>
              <span className="text-gray-500 dark:text-gray-400">Tokens:</span>
              <span className="font-medium" style={{ color: '#00C9B1' }}>
                {tokenBalance ? Math.max(0, (tokenBalance.token_limit ?? 25000) - (tokenBalance.tokens_used ?? 0)).toLocaleString() : '...'}
              </span>
            </div>
          {user?.is_developer && !agentData && agentName !== 'Dashboard' && (
            <button
              onClick={onDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
              style={{ color: TEAL, borderColor: `${TEAL}40`, background: `${TEAL}10` }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Dashboard
            </button>
          )}
          {agentData && !agentData.is_system && agentName !== 'Settings' && (
            <button
              onClick={() => setShowEmbed(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
              style={{ color: TEAL, borderColor: `${TEAL}40`, background: `${TEAL}10` }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Embed
            </button>
          )}
          <button
            onClick={() => setShowBug(true)}
            title="Report a bug"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f97316' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
    {showEmbed && <EmbedModal agentId={agentData?.id} agentName={agentData?.name} user={user} prefetchedStatus={embedStatuses?.[agentData?.id]} onStatusChange={onEmbedStatusChange} onClose={() => setShowEmbed(false)} />}
    {showBug && <BugReportModal onClose={() => setShowBug(false)} />}
    </>
  );
}

export default TopNav;
