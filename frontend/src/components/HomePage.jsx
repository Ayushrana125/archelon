import React from 'react';

const TEAL = '#00C9B1';
const BLUE = '#1A73E8';

function HomePage({ onNewAgent, savedAgents, onSelectAgent }) {
  const hasAgents = savedAgents?.length > 0;

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-57px)] px-6">
      <div className="text-center max-w-lg">
        <img src="/Archelon_logo.png" alt="Archelon" className="w-12 h-12 object-contain mx-auto mb-6 opacity-80" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Welcome to Archelon
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
          Create an AI agent grounded in your documents, or chat with one of your existing agents.
        </p>

        <button
          onClick={onNewAgent}
          style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
          className="px-6 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
        >
          Create new agent
        </button>

        {hasAgents && (
          <div className="mt-12 text-left">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Chat with your agents</p>
            <div className="space-y-2">
              {savedAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent(agent)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}20` }}>
                    <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</div>
                    {agent.description && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{agent.description}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
