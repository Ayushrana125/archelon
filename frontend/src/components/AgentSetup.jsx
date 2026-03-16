import React from 'react';

function AgentSetup({ agentName, setAgentName, systemInstructions, setSystemInstructions, onContinue }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Create Your AI Agent</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Give your agent a name and personality
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Agent Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="e.g., Research Assistant, Code Helper"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] focus:outline-none focus:border-gray-900 dark:focus:border-gray-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            System Instructions <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={systemInstructions}
            onChange={(e) => setSystemInstructions(e.target.value)}
            placeholder="Guide how your agent should behave...&#10;&#10;Example:&#10;- Be professional and concise&#10;- Focus on technical accuracy&#10;- Provide code examples when relevant"
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] focus:outline-none focus:border-gray-900 dark:focus:border-gray-400 resize-none transition-colors"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            System instructions guide how your agent should behave and respond to queries.
          </p>
        </div>

        <button
          onClick={onContinue}
          disabled={!agentName.trim()}
          className="w-full px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to Upload Documents
        </button>
      </div>
    </div>
  );
}

export default AgentSetup;
