import React, { useRef } from 'react';

function FileUploadModal({ onClose, onFileSelect }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    if (files.length) {
      onFileSelect(files);
      onClose();
    }
    e.target.value = '';
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1a1a] dark:bg-[#1a1a1a] rounded-xl overflow-hidden z-50 shadow-xl">
        <div className="px-4 pt-4 pb-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Add document</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-200">Choose file</div>
              <div className="text-xs text-gray-500">PDF, DOCX, TXT · up to 5 files</div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="px-4 pb-3">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

export default FileUploadModal;
