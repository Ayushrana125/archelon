import React, { useState, useEffect } from 'react';
import { fetchDocuments } from '../services/document_service';

function TopNav({ agentName, agentData, collapsed, onDocsClick, onEditAgent }) {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!agentData?.id) { setDocuments([]); return; }
    fetchDocuments(agentData.id)
      .then(docs => setDocuments(docs))
      .catch(() => setDocuments([]));
  }, [agentData?.id]);

  return (
    <nav className="bg-white dark:bg-[#212121] flex items-center h-[57px] fixed top-0 right-0 z-10 border-b border-gray-200 dark:border-gray-700" style={{ left: collapsed ? '56px' : '256px', transition: 'left 0.3s' }}>
      {agentName && (
        <div className="flex items-center gap-3 px-5">
          <div className="agent-name text-xl tracking-tight text-gray-800 dark:text-gray-100">{agentName}</div>
          {documents.length > 0 && (
            <button
              onClick={onDocsClick}
              className="docs-pill cursor-pointer hover:opacity-70 transition-opacity"
            >
              {documents.length} doc{documents.length !== 1 ? 's' : ''}
            </button>
          )}
          {agentData && (
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
        </div>
      )}
    </nav>
  );
}

export default TopNav;
