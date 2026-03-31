import React, { useState } from 'react';
import { deleteAccount } from '../services/auth_service';

const CONFIRM_PHRASE = 'delete my account';

function SettingsView({ theme, setTheme, onLogout }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleConfirmDelete = async () => {
    if (confirmText !== CONFIRM_PHRASE) return;
    setDeleting(true);
    setError('');
    try {
      await deleteAccount();
      onLogout?.();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account preferences</p>
        </div>

        <div className="space-y-4">
          {/* Appearance */}
          <div className="bg-white dark:bg-[#2a2a2a] rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Appearance</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Theme</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {theme === 'light' ? 'Light mode' : 'Dark mode'}
                </div>
              </div>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-white dark:bg-[#2a2a2a] rounded-lg p-6 border border-red-200 dark:border-red-900/40">
            <h2 className="text-lg font-semibold mb-1 text-red-500">Delete Account</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Permanently delete your account and all associated agents, documents, and data. This cannot be undone.
            </p>

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete my account
              </button>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Are you absolutely sure?</p>
                  <p className="text-xs text-red-500 dark:text-red-500">
                    This will permanently delete your account, all your agents, all uploaded documents, and all associated data.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                    Type <span className="font-mono font-bold text-red-500">"{CONFIRM_PHRASE}"</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    onPaste={e => e.preventDefault()}
                    placeholder={CONFIRM_PHRASE}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 placeholder-gray-300 dark:placeholder-gray-600 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={confirmText !== CONFIRM_PHRASE || deleting}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting...' : 'Permanently delete account'}
                  </button>
                  <button
                    onClick={() => { setStep(1); setConfirmText(''); setError(''); }}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
