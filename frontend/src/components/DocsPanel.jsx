import React, { useState, useEffect } from 'react';

function DocsPanel({ files, onDelete, onClose }) {
  const [confirmIdx, setConfirmIdx] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleDelete = (idx) => {
    if (confirmIdx === idx) {
      onDelete(idx);
      setConfirmIdx(null);
    } else {
      setConfirmIdx(idx);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={handleClose} />

      {/* Panel */}
      <div
        className="fixed top-[57px] right-0 bottom-0 w-72 bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col shadow-xl"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="font-semibold text-sm">Documents</div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {files.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">No documents added yet.</p>
          )}
          {files.map((file, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2a2a] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm truncate flex-1">{file.name}</span>
                <button
                  onClick={() => handleDelete(idx)}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {/* Confirm row */}
              {confirmIdx === idx && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-1">Remove this file?</span>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setConfirmIdx(null)}
                    className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default DocsPanel;
