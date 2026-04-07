(function () {
  'use strict';

  const config   = window.ArchelonConfig || {};
  const AGENT_ID = config.agentId;
  const API_KEY  = config.apiKey;
  const API_BASE = 'https://api.archelon.cloud';
  const TEAL     = '#00C9B1';
  const BLUE     = '#1A73E8';

  // NAME and LOGO come from backend via API key
  let NAME    = 'Assistant';
  let LOGO    = `${API_BASE}/Archelon_logo.png`;
  let THEME   = 'light'; // default light

  if (!AGENT_ID || !API_KEY) {
    console.warn('[Archelon] Missing agentId or apiKey in ArchelonConfig.');
    return;
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #archelon-widget-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #archelon-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      height: 52px; padding: 0 20px 0 8px;
      border-radius: 999px;
      background: #ffffff;
      border: 1.5px solid #e5e7eb;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 6px rgba(0,0,0,0.08);
      display: flex; align-items: center; gap: 10px;
      transition: transform 0.2s, box-shadow 0.2s, opacity 0.3s;
      opacity: 0; pointer-events: none; white-space: nowrap;
    }
    #archelon-fab.ready { opacity: 1; pointer-events: all; }
    #archelon-fab:hover {
      transform: scale(1.04);
      box-shadow: 0 6px 28px rgba(0,0,0,0.16), 0 2px 10px rgba(0,0,0,0.1);
      border-color: #d1d5db;
    }
    #archelon-fab-logo {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      overflow: hidden; display: flex; align-items: center; justify-content: center;
    }
    #archelon-fab-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    #archelon-fab-text {
      font-size: 13px; font-weight: 500; color: #111827;
      letter-spacing: 0.01em;
    }
    #archelon-window {
      position: fixed; z-index: 99998;
      width: 400px; height: 600px; border-radius: 20px;
      background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #e5e7eb;
      transform: scale(0.95); opacity: 0;
      transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease;
      pointer-events: none;
    }
    #archelon-window.open { transform: scale(1); opacity: 1; pointer-events: all; }
    #archelon-header {
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      background: #111827; flex-shrink: 0;
      display: none;
    }
    #archelon-header.visible { display: flex; }
    #archelon-avatar {
      width: 36px; height: 36px; border-radius: 50%; position: relative; flex-shrink: 0;
      background: #f3f4f6; display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    #archelon-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    #archelon-header-info { flex: 1; min-width: 0; }
    #archelon-header-name { font-size: 13px; font-weight: 600; color: #fff; }
    #archelon-header-sub { font-size: 10px; color: #22c55e; margin-top: 1px; font-weight: 500;
      display: flex; align-items: center; gap: 4px; }
    #archelon-header-sub::before { content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: #22c55e; display: inline-block; flex-shrink: 0;
      animation: arch-pulse 1.5s ease-in-out infinite; }
    #archelon-close {
      background: none; border: none; cursor: pointer; color: #6b7280;
      padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
    }
    #archelon-close:hover { color: #d1d5db; }
    #archelon-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column;
      gap: 12px; background: #f9fafb;
    }
    #archelon-messages::-webkit-scrollbar { width: 4px; }
    #archelon-messages::-webkit-scrollbar-track { background: transparent; }
    #archelon-messages::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    .arch-msg { display: flex; gap: 8px; align-items: flex-end; }
    .arch-msg.user { flex-direction: row-reverse; }
    .arch-bubble {
      max-width: 78%; padding: 10px 13px; border-radius: 18px;
      font-size: 13px; line-height: 1.6; word-break: break-word;
    }
    .arch-msg.bot .arch-bubble {
      background: #fff; color: #111827; border-radius: 18px 18px 18px 4px;
      border: 1px solid #e5e7eb;
    }
    .arch-msg.user .arch-bubble {
      background: #111827;
      color: #fff; border-radius: 18px 18px 4px 18px;
    }
    .arch-bubble a { color: #111827; text-decoration: underline; text-underline-offset: 2px; }
    .arch-bubble a:hover { color: #374151; }
    #archelon-widget-root.dark .arch-bubble a { color: #e5e7eb; }
    .arch-bot-avatar {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      background: #f3f4f6; display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .arch-bot-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    /* Message actions */
    .arch-msg-actions {
      display: flex; align-items: center; gap: 8px; margin-top: 8px;
    }
    .arch-action-btn {
      background: none; border: 1px solid #e5e7eb; cursor: pointer; padding: 4px 7px;
      border-radius: 8px; font-size: 12px; color: #6b7280;
      display: flex; align-items: center; gap: 4px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .arch-action-btn:hover { background: #f3f4f6; color: #374151; }
    .arch-action-btn.thumb-up.active { color: #16a34a; border-color: #16a34a; background: #f0fdf4; }
    .arch-action-btn.thumb-down.active { color: #dc2626; border-color: #dc2626; background: #fef2f2; }
    .arch-action-btn.locked { pointer-events: none; }
    .arch-action-btn.copy.copied { color: #16a34a; border-color: #16a34a; background: #f0fdf4; }
    #archelon-widget-root.dark .arch-action-btn { border-color: #333; color: #9ca3af; }
    #archelon-widget-root.dark .arch-action-btn:hover { background: #2a2a2a; color: #e5e7eb; }
    /* Scroll to bottom button */
    #arch-scroll-down {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb;
      background: rgba(255,255,255,0.8); backdrop-filter: blur(4px);
      cursor: pointer; display: none; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10;
    }
    #arch-scroll-down.visible { display: flex; }
    #arch-scroll-down svg { width: 14px; height: 14px; color: #374151; }
    #archelon-widget-root.dark #arch-scroll-down { background: rgba(30,30,30,0.8); border-color: #444; }
    #archelon-widget-root.dark #arch-scroll-down svg { color: #e5e7eb; }

    /* Timestamps */
    .arch-chat-started {
      text-align: center; font-size: 11px; color: #9ca3af;
      padding: 4px 12px; margin: 4px auto;
      background: #f3f4f6; border-radius: 999px;
      width: fit-content; align-self: center;
    }
    #archelon-widget-root.dark .arch-chat-started { background: #2a2a2a; color: #6b7280; }
    .arch-msg-time {
      font-size: 10px; color: #9ca3af; margin-top: 3px;
    }
    .arch-msg.user .arch-msg-time { text-align: right; }
    .arch-msg.bot .arch-msg-time { text-align: left; padding-left: 30px; }
    #archelon-widget-root.dark .arch-msg-time { color: #6b7280; }

    /* Thinking step rows (in messages area) ────────────────────────── */
    .arch-step-row {
      display: flex; align-items: center; gap: 8px;
      opacity: 0; transform: translateY(6px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      padding: 1px 0;
    }
    .arch-step-row.show { opacity: 1; transform: translateY(0); }
    .arch-step-label {
      font-size: 12px; color: #9ca3af;
    }
    .arch-step-row.active .arch-step-label {
      font-weight: 500;
      background: linear-gradient(90deg, #6b7280 0%, #111827 40%, #6b7280 80%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: arch-shimmer 1.8s linear infinite;
    }
    #archelon-widget-root.dark .arch-step-row.active .arch-step-label {
      background: linear-gradient(90deg, #9ca3af 0%, #f3f4f6 40%, #9ca3af 80%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: arch-shimmer 1.8s linear infinite;
    }
    @keyframes arch-shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
    .arch-step-row.done .arch-step-label { color: #d1d5db; }
    #archelon-widget-root.dark .arch-step-row.done .arch-step-label { color: #4b5563; }
    .arch-step-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
      background: #d1d5db; transition: background 0.3s;
    }
    .arch-step-row.active .arch-step-dot { background: #22c55e; animation: arch-pulse 1s ease-in-out infinite; }
    .arch-step-row.done .arch-step-dot { background: #22c55e; animation: none; }
    @keyframes arch-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .arch-step-dots {
      display: inline-flex; gap: 2px; margin-left: 2px;
    }
    .arch-step-dots span {
      width: 3px; height: 3px; border-radius: 50%; background: currentColor;
      animation: arch-dot-fade 1.2s ease-in-out infinite; display: inline-block;
    }
    .arch-step-dots span:nth-child(2) { animation-delay: 0.2s; }
    .arch-step-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes arch-dot-fade { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
    /* Send button ring spinner when loading */
    #archelon-send.loading {
      background: transparent !important;
      border: 2.5px solid #e5e7eb;
      border-top-color: #111827;
      animation: arch-spin 0.7s linear infinite;
      opacity: 1 !important; cursor: default;
    }
    #archelon-send.loading svg { display: none; }
    #archelon-widget-root.dark #archelon-send.loading { border-color: #333; border-top-color: #e5e7eb; }
    @keyframes arch-spin { to { transform: rotate(360deg); } }

    #archelon-disclaimer {
      padding: 5px 16px; font-size: 10px; color: #9ca3af;
      text-align: center; background: #f9fafb; flex-shrink: 0;
    }
    #archelon-input-area {
      padding: 10px 14px 12px; background: #fff; border-top: 1px solid #f3f4f6;
      flex-shrink: 0;
    }
    #arch-input-row {
      position: relative;
    }
    #archelon-input {
      flex: 1; border: 1px solid #e5e7eb; border-radius: 14px;
      padding: 13px 48px 13px 16px; font-size: 14px; resize: none; outline: none;
      max-height: 140px; min-height: 62px; line-height: 1.6;
      font-family: inherit; color: #111827; background: #f9fafb;
      transition: border-color 0.15s; width: 100%;
    }
    #archelon-input:focus { border-color: #111827; background: #fff; }
    #archelon-input::placeholder { color: #9ca3af; }
    #archelon-send {
      position: absolute; right: 10px; bottom: 10px;
      width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer;
      background: #111827;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity 0.15s; opacity: 0.4;
    }
    #archelon-send.active { opacity: 1; }
    #archelon-send svg { width: 16px; height: 16px; color: white; }
    #archelon-footer {
      padding: 7px 14px 10px; text-align: center; font-size: 11px;
      color: #6b7280; background: #fff; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; gap: 5px;
    }
    #archelon-footer a {
      color: #111827; text-decoration: none; font-weight: 600;
      display: flex; align-items: center; gap: 4px;
    }
    #archelon-footer a:hover { text-decoration: underline; }
    #archelon-footer-logo { width: 14px; height: 14px; object-fit: contain; }
    #archelon-widget-root.dark #archelon-footer { background: #1a1a1a; color: #6b7280; }
    @media (max-width: 480px) {
      #archelon-window {
        width: 100% !important; height: 100dvh !important;
        top: 0 !important; left: 0 !important;
        border-radius: 0; border: none;
      }
      #archelon-fab { bottom: 16px; right: 16px; }
    }
    /* Pre-chat screen */
    #archelon-prechat {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 32px 24px 24px; background: #fff;
      position: relative;
    }
    #archelon-prechat-actions {
      position: absolute; top: 12px; right: 12px;
      display: flex; align-items: center; gap: 2px;
    }
    #archelon-prechat-logo {
      width: 72px; height: 72px; border-radius: 50%; overflow: hidden;
      margin-bottom: 14px; flex-shrink: 0; position: relative;
    }
    #archelon-prechat-logo img { width: 100%; height: 100%; object-fit: cover; }
    #archelon-prechat-name {
      font-size: 16px; font-weight: 700; color: #111827;
      margin-bottom: 4px; text-align: center;
    }
    #archelon-prechat-status {
      font-size: 11px; color: #22c55e; font-weight: 500;
      margin-bottom: 16px; display: flex; align-items: center; gap: 4px;
    }
    #archelon-prechat-greeting {
      font-size: 13px; color: #6b7280; text-align: center; line-height: 1.5;
      margin-bottom: 16px;
    }
    #archelon-prechat-chips {
      display: flex; flex-direction: column; gap: 8px; width: 100%; padding: 0 4px;
    }
    .arch-chip {
      width: 100%; text-align: left; background: #fff; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 10px 14px; font-size: 12px; color: #374151;
      cursor: pointer; transition: background 0.15s, border-color 0.15s;
      font-family: inherit; line-height: 1.4;
    }
    .arch-chip:hover { background: #f9fafb; border-color: #d1d5db; }
    #archelon-widget-root.dark .arch-chip { background: #2a2a2a; border-color: #333; color: #e5e7eb; }
    #archelon-widget-root.dark .arch-chip:hover { background: #333; border-color: #444; }
    #archelon-widget-root.dark #archelon-prechat { background: #1a1a1a; }
    #archelon-widget-root.dark #archelon-prechat-name { color: #f3f4f6; }
    #archelon-widget-root.dark #archelon-prechat-greeting { color: #9ca3af; }
    .arch-dots { display: inline-flex; align-items: center; gap: 4px; }
    .arch-dots span {
      width: 6px; height: 6px; border-radius: 50%; background: #9ca3af;
      animation: arch-dot-bounce 0.8s ease-in-out infinite;
    }
    .arch-dots span:nth-child(2) { animation-delay: 0.15s; }
    .arch-dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes arch-dot-bounce {
      0%, 100% { transform: translateY(0); opacity: 0.5; }
      50% { transform: translateY(-4px); opacity: 1; }
    }
    /* Dark theme */
    #archelon-widget-root.dark #archelon-window { background: #1a1a1a; border-color: #2a2a2a; }
    #archelon-widget-root.dark #archelon-messages { background: #141414; }
    #archelon-widget-root.dark .arch-msg.bot .arch-bubble { background: #2a2a2a; color: #e5e7eb; border-color: #333; }
    #archelon-widget-root.dark .arch-thinking-wrap { background: #2a2a2a; border-color: #333; }
    #archelon-widget-root.dark .arch-thinking-step { color: #9ca3af; }
    #archelon-widget-root.dark .arch-thinking-step.active { color: #e5e7eb; }
    #archelon-widget-root.dark .arch-step-icon { background: #1a1a1a; border-color: #444; }
    #archelon-widget-root.dark #archelon-disclaimer { background: #141414; color: #6b7280; }
    #archelon-widget-root.dark #archelon-input-area { background: #1a1a1a; border-color: #2a2a2a; }
    #archelon-widget-root.dark #archelon-input { background: #2a2a2a; border-color: #333; color: #e5e7eb; }
    #archelon-widget-root.dark #archelon-input:focus { border-color: ${TEAL}; background: #2a2a2a; }
    #archelon-widget-root.dark .arch-ol-num { color: #e5e7eb !important; }
    #archelon-widget-root.dark #archelon-footer a { color: #e5e7eb; }
    #archelon-widget-root.dark pre { background: #2a2a2a !important; }
    #archelon-widget-root.dark code { background: #2a2a2a !important; color: #e5e7eb; }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'archelon-widget-root';
  root.innerHTML = `
    <div id="archelon-window">
      <div id="archelon-header">
        <div id="archelon-avatar">
          <img id="archelon-avatar-img" src="" alt="" style="opacity:0;transition:opacity 0.2s;" />
        </div>
        <div id="archelon-header-info">
          <div id="archelon-header-name">...</div>
          <div id="archelon-header-sub">Online</div>
        </div>
        <button id="archelon-header-close" aria-label="Close" style="background:none;border:none;cursor:pointer;color:#6b7280;padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <button id="archelon-new-chat" aria-label="New conversation" title="New conversation" style="background:none;border:none;cursor:pointer;color:#6b7280;padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
      </div>
      <div id="archelon-prechat">
        <div id="archelon-prechat-actions">
          <button id="archelon-theme-toggle" aria-label="Toggle theme" style="background:none;border:none;cursor:pointer;color:#9ca3af;padding:5px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
            <svg id="archelon-theme-icon-moon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            <svg id="archelon-theme-icon-sun" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15" style="display:none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
          </button>
          <button id="archelon-close" aria-label="Close" style="background:none;border:none;cursor:pointer;color:#9ca3af;padding:5px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div id="archelon-prechat-logo">
          <img id="archelon-prechat-logo-img" src="" alt="" style="opacity:0;transition:opacity 0.2s;" />
        </div>
        <div id="archelon-prechat-name">...</div>
        <div id="archelon-prechat-status">
          <span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;animation:arch-pulse 1.5s ease-in-out infinite;"></span>
          Online
        </div>
        <div id="archelon-prechat-greeting">How can I help you today?</div>
        <div id="archelon-prechat-chips"></div>
      </div>
      <div id="archelon-messages" style="display:none;position:relative;">
        <button id="arch-scroll-down" aria-label="Scroll to bottom">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>
      <div id="archelon-disclaimer" style="display:none;">Can make mistakes. Verify important information.</div>
      <div id="archelon-input-area">
        <div id="arch-input-row">
          <textarea id="archelon-input" placeholder="Ask a question..." rows="1"></textarea>
          <button id="archelon-send" aria-label="Send">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>
      <div id="archelon-footer">Powered by <a href="https://archelon.cloud" target="_blank"><img id="archelon-footer-logo" src="${API_BASE}/Archelon_logo.png" alt="" />Archelon</a></div>
    </div>
    <button id="archelon-fab" aria-label="Open chat">
      <div id="archelon-fab-logo"></div>
      <span id="archelon-fab-text">Ask ...</span>
    </button>
  `;
  document.body.appendChild(root);

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const win        = document.getElementById('archelon-window');
  const fab        = document.getElementById('archelon-fab');
  const fabLogo    = document.getElementById('archelon-fab-logo');
  const fabText    = document.getElementById('archelon-fab-text');
  const msgs       = document.getElementById('archelon-messages');
  const input      = document.getElementById('archelon-input');
  const sendBtn    = document.getElementById('archelon-send');
  const closeBtn       = document.getElementById('archelon-close');
  const headerCloseBtn = document.getElementById('archelon-header-close');
  const newChatBtn     = document.getElementById('archelon-new-chat');
  const header     = document.getElementById('archelon-header');
  const headerName = document.getElementById('archelon-header-name');
  const disclaimer = document.getElementById('archelon-disclaimer');
  const prechat        = document.getElementById('archelon-prechat');
  const prechatName    = document.getElementById('archelon-prechat-name');
  const prechatLogoImg = document.getElementById('archelon-prechat-logo-img');
  const prechatGreeting = document.getElementById('archelon-prechat-greeting');
  const themeToggle    = document.getElementById('archelon-theme-toggle');
  const themeIconMoon  = document.getElementById('archelon-theme-icon-moon');
  const themeIconSun   = document.getElementById('archelon-theme-icon-sun');

  themeToggle.addEventListener('click', () => {
    THEME = THEME === 'light' ? 'dark' : 'light';
    root.classList.toggle('dark', THEME === 'dark');
    themeIconMoon.style.display = THEME === 'dark' ? 'none' : 'block';
    themeIconSun.style.display  = THEME === 'dark' ? 'block' : 'none';
  });

  let isOpen    = false;
  let isLoading = false;
  let greeted   = false;
  let chatStarted = false;

  // ── Rotating greetings ────────────────────────────────────────────────────
  const GREETINGS = [
    'How can I help you today?',
    'What can I help you with?',
    'Got a question? Ask away.',
    'What\'s on your mind?',
    'Ask me anything.',
  ];
  function setRandomGreeting() {
    prechatGreeting.textContent = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }

  // ── Thinking steps overlay above input ─────────────────────────────────
  const STEPS_SMALLTALK = ['Analyzing your request'];
  const STEPS_RAG = [
    'Analyzing your request',
    'Identifying key details',
    'Finding relevant information',
    'Reviewing gathered information',
  ];

  let stepsInterval = null;
  let stepRows = [];

  function addStepRow(label, active) {
    const row = document.createElement('div');
    row.className = 'arch-step-row';
    row.innerHTML = `
      <span class="arch-step-dot"></span>
      <span class="arch-step-label">${label}${active ? '<span class="arch-step-dots"><span></span><span></span><span></span></span>' : ''}</span>
    `;
    if (active) row.classList.add('active');
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => row.classList.add('show'), 30);
    return row;
  }

  function showSteps(ragMode) {
    clearSteps();
    sendBtn.classList.add('loading');
    const firstRow = addStepRow(STEPS_RAG[0], true);
    stepRows.push(firstRow);
    if (!ragMode) return;
    let current = 0;
    stepsInterval = setInterval(() => {
      if (current < STEPS_RAG.length - 1) {
        stepRows[current].classList.remove('active');
        stepRows[current].classList.add('done');
        stepRows[current].querySelector('.arch-step-dots')?.remove();
        current++;
        const row = addStepRow(STEPS_RAG[current], true);
        stepRows.push(row);
      }
      // last step stays active forever until clearSteps() is called
    }, 1500);
  }

  function clearSteps() {
    if (stepsInterval) { clearInterval(stepsInterval); stepsInterval = null; }
    stepRows.forEach(r => r.remove());
    stepRows = [];
    sendBtn.classList.remove('loading');
  }

  // ── Fetch info + sample questions in parallel ────────────────────────────
  const prechatChips = document.getElementById('archelon-prechat-chips');

  function applyInfo(d) {
    if (d && d.name) {
      NAME = d.name;
      headerName.textContent = NAME;
      input.placeholder = `Ask ${NAME}...`;
      disclaimer.textContent = `${NAME} can make mistakes. Verify important information.`;
    } else {
      headerName.textContent = NAME;
    }
    if (d && d.logo_url) LOGO = d.logo_url;
    fabLogo.innerHTML = `<img src="${LOGO}" alt="" />`;
    fabText.textContent = `Ask ${NAME}`;
    const avatarImg = document.getElementById('archelon-avatar-img');
    if (avatarImg) { avatarImg.src = LOGO; avatarImg.onload = () => { avatarImg.style.opacity = '1'; }; avatarImg.onerror = () => { avatarImg.style.opacity = '1'; }; }
    prechatName.textContent = NAME;
    prechatLogoImg.src = LOGO;
    prechatLogoImg.onload = () => { prechatLogoImg.style.opacity = '1'; fab.classList.add('ready'); };
    prechatLogoImg.onerror = () => { prechatLogoImg.style.opacity = '1'; fab.classList.add('ready'); };
    setRandomGreeting();
    if (d && d.theme === 'dark') { THEME = 'dark'; root.classList.add('dark'); themeIconMoon.style.display = 'none'; themeIconSun.style.display = 'block'; }
  }

  function renderChips(questions) {
    prechatChips.innerHTML = '';
    questions.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'arch-chip';
      btn.textContent = q;
      btn.addEventListener('click', () => {
        input.value = q;
        sendMessage();
      });
      prechatChips.appendChild(btn);
    });
  }

  async function fetchSampleQuestions() {
    try {
      const res = await fetch(`${API_BASE}/api/public/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Archelon-Key': API_KEY },
        body: JSON.stringify({
          message: 'Generate 3 short sample questions users mostly ask from these documents. Max 8 words each. Give only in "","","" format, nothing else.',
          agent_id: AGENT_ID,
        }),
      });
      if (!res.ok) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === 'token') full += ev.token;
          } catch {}
        }
      }
      // Parse "q1","q2","q3" format
      const matches = full.match(/"([^"]+)"/g);
      if (matches && matches.length >= 3) {
        renderChips(matches.slice(0, 3).map(m => m.replace(/"/g, '')));
      }
    } catch {}
  }

  // Fire both in parallel — FAB shows when info is ready, chips appear when questions are ready
  fetch(`${API_BASE}/api/public/info`, { headers: { 'X-Archelon-Key': API_KEY } })
    .then(r => r.ok ? r.json() : null)
    .then(d => { applyInfo(d); })
    .catch(() => { applyInfo(null); fab.classList.add('ready'); });

  fetchSampleQuestions();

  // ── Timestamp helpers ─────────────────────────────────────────────────────
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatChatStarted(date) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const short = tz.split('/').pop().replace(/_/g, ' ');
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      + ' · ' + short;
  }

  function addTimestamp(text) {
    const el = document.createElement('div');
    el.className = 'arch-chat-started';
    el.textContent = text;
    msgs.appendChild(el);
  }

  function addMessageTime(container, date) {
    const wrap = document.createElement('div');
    wrap.className = 'arch-msg-time';
    const timeStr = formatTime(date);
    wrap.textContent = 'Just now';
    container.appendChild(wrap);
    setTimeout(() => { wrap.textContent = timeStr; }, 30000);
  }

  function parseMarkdown(text) {
    // Escape HTML first
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Code blocks (```...```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:#f3f4f6;border-radius:8px;padding:10px 12px;font-size:12px;overflow-x:auto;margin:6px 0;"><code>$1</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;border-radius:4px;padding:1px 5px;font-size:12px;">$1</code>');
    // Headers
    html = html.replace(/^### (.+)$/gm, '<div style="font-size:13px;font-weight:700;margin:8px 0 3px;">$1</div>');
    html = html.replace(/^## (.+)$/gm,  '<div style="font-size:14px;font-weight:700;margin:8px 0 3px;">$1</div>');
    html = html.replace(/^# (.+)$/gm,   '<div style="font-size:15px;font-weight:700;margin:8px 0 4px;">$1</div>');
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><em>$1</em></b>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    // Only match italic if surrounded by spaces or start/end — avoids false matches
    html = html.replace(/(^|\s)\*([^\s*][^*]*)\*($|\s)/gm, '$1<em>$2</em>$3');
    // Unordered lists
    html = html.replace(/^[\-\*] (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0;"><span style="color:#9ca3af;flex-shrink:0;">•</span><span>$1</span></div>');
    // Ordered lists — preserve actual number
    html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0;"><span style="color:#111827;flex-shrink:0;min-width:14px;" class="arch-ol-num">$1.</span><span>$2</span></div>');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // ── Message helpers ───────────────────────────────────────────────────────
  function buildActionButtons(wrap, rawText) {
    const actionsDiv = wrap.querySelector('.arch-msg-actions');
    const thumbUp   = actionsDiv.querySelector('.arch-thumb-up');
    const thumbDown = actionsDiv.querySelector('.arch-thumb-down');
    const copyBtn   = actionsDiv.querySelector('.arch-copy');
    thumbUp.addEventListener('click', function() {
      if (this.classList.contains('locked')) return;
      this.classList.add('active', 'locked');
      thumbDown.classList.add('locked');
    });
    thumbDown.addEventListener('click', function() {
      if (this.classList.contains('locked')) return;
      this.classList.add('active', 'locked');
      thumbUp.classList.add('locked');
    });
    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(rawText);
      this.classList.add('copied');
      this.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
      setTimeout(() => {
        this.classList.remove('copied');
        this.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
      }, 1500);
    });
  }

  const ACTION_BUTTONS_HTML = `
    <div class="arch-msg-actions">
      <button class="arch-action-btn arch-thumb-up thumb-up" title="Good response">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
      </button>
      <button class="arch-action-btn arch-thumb-down thumb-down" title="Bad response">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg>
      </button>
      <button class="arch-action-btn arch-copy copy" title="Copy">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
      </button>
    </div>
  `;

  function addBotMessage(text) {
    const now = new Date();
    const wrap = document.createElement('div');
    wrap.className = 'arch-msg bot';
    const rawText = text;
    wrap.innerHTML = `
      <div class="arch-bot-avatar"><img src="${LOGO}" alt="" /></div>
      <div style="display:flex;flex-direction:column;max-width:78%;">
        <div class="arch-bubble" style="max-width:100%;"></div>
        <div class="arch-msg-time">Just now</div>
        ${ACTION_BUTTONS_HTML}
      </div>
    `;
    const bubble = wrap.querySelector('.arch-bubble');
    const timeEl = wrap.querySelector('.arch-msg-time');
    const timeStr = formatTime(now);
    setTimeout(() => { if (timeEl) timeEl.textContent = timeStr; }, 30000);
    msgs.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    buildActionButtons(wrap, rawText);
    const words = text.split(' ');
    let i = 0;
    const tick = setInterval(() => {
      i++;
      const partial = words.slice(0, i).join(' ');
      if (i >= words.length) { bubble.innerHTML = parseMarkdown(partial); clearInterval(tick); }
      else { bubble.textContent = partial; }
    }, 30);
  }

  function addUserMessage(text, date) {
    const now = date || new Date();
    const msg = document.createElement('div');
    msg.className = 'arch-msg user';
    msg.innerHTML = `<div style="display:flex;flex-direction:column;align-items:flex-end;">
      <div class="arch-bubble">${parseMarkdown(text)}</div>
      <div class="arch-msg-time">Just now</div>
    </div>`;
    const timeEl = msg.querySelector('.arch-msg-time');
    const timeStr = formatTime(now);
    setTimeout(() => { timeEl.textContent = timeStr; }, 30000);
    msgs.appendChild(msg);
    msg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  function scrollToTop() {
    msgs.scrollTop = 0;
  }

  const scrollDownBtn = document.getElementById('arch-scroll-down');
  msgs.addEventListener('scroll', () => {
    const distFromBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight;
    scrollDownBtn.classList.toggle('visible', distFromBottom > 80);
  });
  scrollDownBtn.addEventListener('click', () => {
    msgs.scrollTop = msgs.scrollHeight;
    scrollDownBtn.classList.remove('visible');
  });

  function setInputEnabled(enabled) {
    input.disabled = !enabled;
    sendBtn.classList.toggle('active', enabled && input.value.trim().length > 0);
  }

  // ── Smart window positioning ─────────────────────────────────────────────
  function positionWindow() {
    const GAP = 10;
    const WIN_W = 400;
    const WIN_H = 600;
    const fab_rect = fab.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: align with FAB right edge, clamp so window doesn't go off screen
    let left = fab_rect.right - WIN_W;
    if (left < 8) left = 8;
    if (left + WIN_W > vw - 8) left = vw - WIN_W - 8;

    // Vertical: prefer opening above FAB, fall back to below if not enough space
    const spaceAbove = fab_rect.top;
    const spaceBelow = vh - fab_rect.bottom;

    let top;
    if (spaceAbove >= WIN_H + GAP) {
      // Enough room above — open above FAB
      top = fab_rect.top - WIN_H - GAP;
    } else if (spaceBelow >= WIN_H + GAP) {
      // Not enough above — open below FAB
      top = fab_rect.bottom + GAP;
    } else {
      // Neither fits perfectly — pick whichever side has more space, clamp to viewport
      if (spaceAbove >= spaceBelow) {
        top = Math.max(8, fab_rect.top - WIN_H - GAP);
      } else {
        top = fab_rect.bottom + GAP;
        if (top + WIN_H > vh - 8) top = vh - WIN_H - 8;
      }
    }

    win.style.left = left + 'px';
    win.style.top  = top  + 'px';
  }

  // ── Toggle chat ───────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      positionWindow();
      if (!chatStarted) setRandomGreeting();
    }
    win.classList.toggle('open', isOpen);
    fab.style.opacity = isOpen ? '0' : '1';
    fab.style.pointerEvents = isOpen ? 'none' : 'all';
    fabText.textContent = `Ask ${NAME}`;
    if (isOpen) setTimeout(() => input.focus(), 300);
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    input.value = '';
    input.style.height = 'auto';
    setInputEnabled(false);
    const now = new Date();
    if (!chatStarted) addTimestamp(formatChatStarted(now));
    chatStarted = true;
    prechat.style.display = 'none';
    header.classList.add('visible');
    msgs.style.display = 'flex';
    disclaimer.style.display = 'block';
    addUserMessage(text, now);

    // Show steps immediately above input
    showSteps(false);
    let streamBubbleContent = '';

    try {
      const res = await fetch(`${API_BASE}/api/public/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Archelon-Key': API_KEY,
        },
        body: JSON.stringify({ message: text, agent_id: AGENT_ID }),
      });

      if (res.status === 429) {
        clearSteps();
        addBotMessage("You're sending messages too fast. Give it a moment.");
        isLoading = false; setInputEnabled(true); input.focus(); return;
      }
      if (res.status === 402) {
        clearSteps();
        addBotMessage('Our assistant is temporarily unavailable. Please try again later.');
        isLoading = false; setInputEnabled(true); input.focus(); return;
      }
      if (!res.ok) {
        clearSteps();
        addBotMessage('Something went wrong. Try again in a moment.');
        isLoading = false; setInputEnabled(true); input.focus(); return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let event;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === 'meta') {
            if (event.intent !== 'smalltalk') {
              showSteps(true);
            }
          }

          if (event.type === 'token') {
            streamBubbleContent += event.token;
          }

          if (event.type === 'done') {
            clearSteps();
            if (streamBubbleContent) {
              const doneNow = new Date();
              const wrap = document.createElement('div');
              wrap.className = 'arch-msg bot';
              const rawText = streamBubbleContent;
              wrap.innerHTML = `
                <div class="arch-bot-avatar"><img src="${LOGO}" alt="" /></div>
                <div style="display:flex;flex-direction:column;max-width:78%;">
                  <div class="arch-bubble" style="max-width:100%;">${parseMarkdown(rawText)}</div>
                  <div class="arch-msg-time">Just now</div>
                  ${ACTION_BUTTONS_HTML}
                </div>
              `;
              const timeEl = wrap.querySelector('.arch-msg-time');
              const timeStr = formatTime(doneNow);
              setTimeout(() => { if (timeEl) timeEl.textContent = timeStr; }, 30000);
              msgs.appendChild(wrap);
              wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
              buildActionButtons(wrap, rawText);
              streamBubbleContent = '';
            }
          }
        }
      }
    } catch {
      clearSteps();
      addBotMessage("Couldn't reach the server. Try again in a moment.");
    }

    isLoading = false;
    setInputEnabled(true);
    input.focus();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  newChatBtn.addEventListener('click', () => {
    msgs.innerHTML = '';
    clearSteps();
    chatStarted = false;
    header.classList.remove('visible');
    prechat.style.display = 'flex';
    msgs.style.display = 'none';
    disclaimer.style.display = 'none';
    setRandomGreeting();
  });

  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  headerCloseBtn.addEventListener('click', toggleChat);
  sendBtn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    sendBtn.classList.toggle('active', input.value.trim().length > 0 && !isLoading);
  });

  document.addEventListener('click', (e) => {
    if (isOpen && !root.contains(e.target)) toggleChat();
  });

  window.addEventListener('resize', () => {
    if (isOpen) positionWindow();
  });

})();
