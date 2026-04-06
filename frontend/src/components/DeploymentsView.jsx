import React, { useState } from 'react';
import EmbedModal from './EmbedModal';

const TEAL = '#00C9B1';

function DeploymentsView({ savedAgents, focusAgentId, embedStatuses, onEmbedStatusChange, user }) {
  const [openAgentId, setOpenAgentId] = useState(focusAgentId || null);
  const deployableAgents = (savedAgents || []).filter(a => !a.is_system && embedStatuses?.[a.id]?.enabled === true);
  const openAgent = deployableAgents.find(a => a.id === openAgentId);

  return (
    <div className="h-[calc(100vh-57px)] overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Deployments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Embed your agents as chat widgets on any website. Click an agent to configure and deploy it.
          </p>
        </div>

        {deployableAgents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${TEAL}15` }}>
              <svg className="w-7 h-7" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No deployed agents yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Use the Embed button on an agent to deploy it as a widget.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deployableAgents.map(agent => {
              const status = embedStatuses?.[agent.id];
              const isLive = status?.enabled === true;
              return (
                <button
                  key={agent.id}
                  onClick={() => setOpenAgentId(agent.id)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border bg-white dark:bg-[#1e1e1e] hover:border-[#00C9B1]/40 dark:hover:border-[#00C9B1]/30 transition-all text-left group"
                  style={{ borderColor: isLive ? `${TEAL}40` : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                      <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{agent.name}</div>
                      {isLive && status?.widget_name && (
                        <div className="text-xs text-gray-400 mt-0.5">Widget: <span style={{ color: TEAL }}>{status.widget_name}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isLive ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                      {isLive ? 'Live' : 'Not deployed'}
                    </span>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {openAgent && (
        <EmbedModal
          agentId={openAgent.id}
          agentName={openAgent.name}
          user={user}
          prefetchedStatus={embedStatuses?.[openAgent.id]}
          onStatusChange={onEmbedStatusChange}
          onClose={() => setOpenAgentId(null)}
        />
      )}
    </div>
  );
}

export default DeploymentsView;
