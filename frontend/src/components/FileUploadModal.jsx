import React, { useRef } from 'react';

function FileUploadModal({ onClose, onFileSelect }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
      onClose();
    }
    e.target.value = '';
  };

  return (
    <div className="absolute bottom-full left-0 mb-3 w-72 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="font-medium text-sm">Add file to agent</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          One file at a time — PDF, TXT, or Word
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#333] hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-[#444] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium">Choose from computer</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">.pdf, .txt, .docx</div>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <button
        onClick={onClose}
        className="w-full px-4 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-t border-gray-200 dark:border-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export default FileUploadModal;
