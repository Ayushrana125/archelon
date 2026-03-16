import React from 'react';

function SettingsView({ theme, setTheme }) {
  return (
    <div className="min-h-[calc(100vh-73px)] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Customize your Arex experience</p>
        </div>

        <div className="space-y-4">
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
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#2a2a2a] rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">About</h2>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>Arex v1.0.0 - Preview</p>
              <p>Preview environment - Backend integration coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
