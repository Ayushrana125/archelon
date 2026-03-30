import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

function Sidebar({ mode, setMode, savedAgents, activeAgentId, onSelectAgent, onSelectArex, collapsed, setCollapsed, onLogout, user, onHome }) {
  const displayName = user ? `${user.first_name} ${user.last_name}` : 'Account';
  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() : '?';
  const displayEmail = user?.email ?? '';
  const isArexActive = mode === 'arex' && !activeAgentId;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className={`${collapsed ? 'w-14' : 'w-64'} transition-all duration-300 h-screen bg-gray-50 dark:bg-[#171717] border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 fixed top-0 left-0 z-20`}>

      {/* Logo + collapse button */}
      <div className={`flex items-center h-[57px] flex-shrink-0 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 cursor-pointer" onClick={onHome}>
            <motion.img layoutId="archelon-logo" src="/Archelon_logo.png" alt="Archelon" className="h-7 w-auto object-contain flex-shrink-0" />
            <div className="brand-name text-xl tracking-tight">Archelon</div>
          </div>
        )}
        {collapsed && (
          <div className="group/logo relative flex items-center justify-center">
            <motion.img layoutId="archelon-logo" src="/Archelon_logo.png" alt="Archelon" className="h-7 w-auto object-contain flex-shrink-0" />
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="absolute inset-0 flex items-center justify-center rounded-md bg-gray-50 dark:bg-[#171717] opacity-0 group-hover/logo:opacity-100 transition-opacity"
            >
              <svg className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
                <line x1="9" y1="3" x2="9" y2="21" strokeWidth="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 9l3 3-3 3" />
              </svg>
            </button>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-all flex-shrink-0"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
              <line x1="9" y1="3" x2="9" y2="21" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9l-3 3 3 3" />
            </svg>
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-4 py-2">

        {/* New Agent */}
        <button
          onClick={() => setMode('create')}
          title="New Agent"
          className={`w-full flex items-center gap-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors text-sm ${collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'}`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {!collapsed && <span>New Agent</span>}
        </button>

        {/* Agents list — collapsed: single expand icon; expanded: full list */}
        {savedAgents.length > 0 && (
          <div>
            {!collapsed && (
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                Your Agents
              </h3>
            )}
            {collapsed ? (
              <button
                onClick={() => setCollapsed(false)}
                title="Show agents"
                className="w-full flex items-center justify-center py-2.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            ) : (
              <div className="space-y-1">
                {/* System agents first */}
                {savedAgents.filter(a => a.is_system).map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => onSelectAgent(agent)}
                    title={agent.name}
                    className={`w-full flex items-center gap-2 rounded-lg transition-colors px-3 py-2.5 text-left ${
                      activeAgentId === agent.id
                        ? 'bg-[#2a2a2a] text-gray-100'
                        : 'hover:bg-[#222222] dark:hover:bg-[#222222]'
                    }`}
                  >
                    <div className="text-[15px] font-medium truncate flex-1">{agent.name}</div>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: '#00C9B115', color: '#00C9B1' }}>System</span>
                  </button>
                ))}
                {/* Divider between system and user agents */}
                {savedAgents.some(a => a.is_system) && savedAgents.some(a => !a.is_system) && (
                  <div className="my-1" />
                )}
                {/* User agents */}
                {savedAgents.filter(a => !a.is_system).map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => onSelectAgent(agent)}
                    title={agent.name}
                    className={`w-full flex items-center gap-2 rounded-lg transition-colors px-3 py-2.5 text-left ${
                      activeAgentId === agent.id
                        ? 'bg-[#2a2a2a] text-gray-100'
                        : 'hover:bg-[#222222] dark:hover:bg-[#222222]'
                    }`}
                  >
                    <div className="text-[15px] font-medium truncate flex-1">{agent.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User profile at bottom */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-700 relative" ref={menuRef}>
        {showProfileMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
            <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-gray-600">
              <div className="font-medium text-sm">{displayName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{displayEmail}</div>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setMode('settings'); setShowProfileMenu(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"
              >
                Settings
              </button>
              <button
                onClick={() => { onLogout(); setShowProfileMenu(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#333] transition-colors text-red-500">
                Log out
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowProfileMenu(p => !p)}
          title="Ayush Rana"
          className={`w-full flex items-center gap-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors py-2 ${collapsed ? 'justify-center px-0' : 'px-2'}`}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #00C9B1, #1A73E8)' }}>
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 text-left">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayEmail}</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
