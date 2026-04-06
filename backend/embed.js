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
      width: 360px; height: 540px; border-radius: 20px;
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
      background: linear-gradient(135deg, #0d0d0d, #1a1a1a); flex-shrink: 0;
      display: none;
    }
    #archelon-header.visible { display: flex; }
    #archelon-avatar {
      width: 36px; height: 36px; border-radius: 50%; position: relative; flex-shrink: 0;
      background: rgba(0,201,177,0.2); display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    #archelon-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    #archelon-header-info { flex: 1; min-width: 0; }
    #archelon-header-name { font-size: 13px; font-weight: 600; color: #fff; }
    #archelon-header-sub { font-size: 11px; color: #9ca3af; margin-top: 1px; }
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
      background: linear-gradient(135deg, ${TEAL}, ${BLUE});
      color: #fff; border-radius: 18px 18px 4px 18px;
    }
    .arch-bubble b { font-weight: 600; }
    .arch-bot-avatar {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      background: rgba(0,201,177,0.15); display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .arch-bot-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    /* Message actions */
    .arch-msg-actions {
      display: flex; align-items: center; gap: 6px; margin-top: 6px; margin-left: 30px;
    }
    .arch-action-btn {
      background: none; border: none; cursor: pointer; padding: 4px 6px;
      border-radius: 6px; font-size: 11px; color: #9ca3af;
      display: flex; align-items: center; gap: 3px;
      transition: background 0.15s, color 0.15s;
    }
    .arch-action-btn:hover { background: #f3f4f6; color: #374151; }
    .arch-action-btn.active { color: ${TEAL}; }
    #archelon-widget-root.dark .arch-action-btn:hover { background: #2a2a2a; color: #e5e7eb; }

    /* Thinking steps */
    .arch-thinking-wrap {
      display: flex; flex-direction: column; gap: 6px;
      padding: 10px 13px; background: #fff;
      border: 1px solid #e5e7eb; border-radius: 18px 18px 18px 4px;
      max-width: 78%;
    }
    .arch-thinking-step {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #6b7280;
      transition: color 0.3s;
    }
    .arch-thinking-step.active { color: ${TEAL}; }
    .arch-thinking-step.done { color: #9ca3af; }
    .arch-step-icon {
      width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border: 1.5px solid #e5e7eb; background: #fff;
      transition: all 0.3s;
    }
    .arch-thinking-step.active .arch-step-icon {
      border-color: ${TEAL}; background: ${TEAL}15;
    }
    .arch-thinking-step.active .arch-step-icon::after {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: ${TEAL}; animation: arch-pulse 1s ease-in-out infinite;
    }
    .arch-thinking-step.done .arch-step-icon {
      border-color: #d1d5db; background: #f9fafb;
    }
    .arch-thinking-step.done .arch-step-icon::after {
      content: '✓'; font-size: 9px; color: #9ca3af; font-weight: 700;
    }
    @keyframes arch-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }

    #archelon-disclaimer {
      padding: 5px 16px; font-size: 10px; color: #9ca3af;
      text-align: center; background: #f9fafb; flex-shrink: 0;
    }
    #archelon-input-area {
      padding: 12px 14px; background: #fff; border-top: 1px solid #f3f4f6;
      display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
    }
    #archelon-input {
      flex: 1; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 11px 14px; font-size: 13px; resize: none; outline: none;
      max-height: 120px; min-height: 52px; line-height: 1.5;
      font-family: inherit; color: #111827; background: #f9fafb;
      transition: border-color 0.15s;
    }
    #archelon-input:focus { border-color: ${TEAL}; background: #fff; }
    #archelon-input::placeholder { color: #9ca3af; }
    #archelon-send {
      width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer;
      background: linear-gradient(135deg, ${TEAL}, ${BLUE});
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
      color: ${TEAL}; text-decoration: none; font-weight: 600;
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
    }
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
    #archelon-widget-root.dark .arch-thinking-step.active { color: ${TEAL}; }
    #archelon-widget-root.dark .arch-step-icon { background: #1a1a1a; border-color: #444; }
    #archelon-widget-root.dark #archelon-disclaimer { background: #141414; color: #6b7280; }
    #archelon-widget-root.dark #archelon-input-area { background: #1a1a1a; border-color: #2a2a2a; }
    #archelon-widget-root.dark #archelon-input { background: #2a2a2a; border-color: #333; color: #e5e7eb; }
    #archelon-widget-root.dark #archelon-input:focus { border-color: ${TEAL}; background: #2a2a2a; }
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
          <div id="archelon-header-sub">Typically replies instantly</div>
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
          <span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;"></span>
          Online
        </div>
        <div id="archelon-prechat-greeting">How can I help you today?</div>
      </div>
      <div id="archelon-messages" style="display:none;"></div>
      <div id="archelon-disclaimer" style="display:none;">Can make mistakes. Verify important information.</div>
      <div id="archelon-input-area">
        <textarea id="archelon-input" placeholder="Ask a question..." rows="1"></textarea>
        <button id="archelon-send" aria-label="Send">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
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
  let fabClickCount = 0;
  let easterEggTooltip = null;

  const EASTER_EGGS = [
    { at: 5,  msg: "Hmm... I see what you\'re doing 🤔" },
    { at: 8,  msg: "Still going? Bold move." },
    { at: 12, msg: "You cannot do this all day long..." },
    { at: 16, msg: "Okay I\'m impressed. But seriously, ask me something." },
    { at: 20, msg: "Fine. I\'ll be here. 🙏" },
  ];

  function showFabTooltip(msg) {
    if (easterEggTooltip) easterEggTooltip.remove();
    const tip = document.createElement('div');
    tip.style.cssText = `
      position: fixed; z-index: 100000;
      background: #111827; color: #fff;
      font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 7px 12px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      white-space: nowrap; pointer-events: none;
      opacity: 0; transition: opacity 0.2s;
    `;
    tip.textContent = msg;
    document.body.appendChild(tip);
    easterEggTooltip = tip;

    // Position above the FAB
    const rect = fab.getBoundingClientRect();
    tip.style.left = (rect.right - tip.offsetWidth) + 'px';
    tip.style.top  = (rect.top - tip.offsetHeight - 10) + 'px';
    // Recalc after paint since offsetWidth is 0 before render
    requestAnimationFrame(() => {
      tip.style.left = (rect.right - tip.offsetWidth) + 'px';
      tip.style.top  = (rect.top - tip.offsetHeight - 10) + 'px';
      tip.style.opacity = '1';
    });

    setTimeout(() => {
      tip.style.opacity = '0';
      setTimeout(() => { if (tip.parentNode) tip.remove(); if (easterEggTooltip === tip) easterEggTooltip = null; }, 300);
    }, 2500);
  }

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

  // ── Thinking steps ────────────────────────────────────────────────────────
  const STEPS_RAG = [
    'Let me look into that...',
    'Searching in Knowledge Base...',
    'Almost there...',
  ];

  function showThinking(ragMode) {
    const el = document.createElement('div');
    el.className = 'arch-msg bot';
    el.id = 'arch-thinking';
    const steps = ragMode ? STEPS_RAG : ['Let me look into that...'];
    const stepsHtml = steps.map((label, i) => `
      <div class="arch-thinking-step ${i === 0 ? 'active' : ''}" id="arch-step-${i}">
        <div class="arch-step-icon"></div>
        <span>${label}</span>
      </div>
    `).join('');
    el.innerHTML = `
      <div class="arch-bot-avatar"><img src="${LOGO}" alt="" /></div>
      <div class="arch-thinking-wrap">${stepsHtml}</div>
    `;
    msgs.appendChild(el);
    scrollToBottom();
    if (ragMode) {
      // Step timings: step 1 active at 0ms, step 2 at 800ms, step 3 at 1600ms
      // Step 3 stays pulsing until minShowTime is reached
      const STEP_INTERVAL = 800;
      let current = 0;
      const interval = setInterval(() => {
        const prev = el.querySelector(`#arch-step-${current}`);
        const next = el.querySelector(`#arch-step-${current + 1}`);
        if (!next) { clearInterval(interval); return; }
        if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
        current++;
        next.classList.add('active');
      }, STEP_INTERVAL);
      el._interval = interval;
      // minShowTime = time until step 3 has been active for at least 400ms
      el._minShowTime = Date.now() + (STEP_INTERVAL * (steps.length - 1)) + 400;
    }
    return el;
  }

  // ── Fetch agent name from backend ─────────────────────────────────────────
  fetch(`${API_BASE}/api/public/info`, {
    headers: { 'X-Archelon-Key': API_KEY },
  })
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d) {
        if (d.name) {
          NAME = d.name;
          headerName.textContent = NAME;
          input.placeholder = `Ask ${NAME}...`;
          disclaimer.textContent = `${NAME} can make mistakes. Verify important information.`;
          fab.setAttribute('aria-label', `Chat with ${NAME}`);
        } else {
          headerName.textContent = NAME;
        }
        if (d.logo_url) {
          LOGO = d.logo_url;
        }
        // Set FAB logo
        fabLogo.innerHTML = `<img src="${LOGO}" alt="" />`;
        fabText.textContent = `Ask ${NAME}`;
        fab.setAttribute('aria-label', `Ask ${NAME}`);
        // Always set header avatar to resolved logo
        const avatarImg = document.getElementById('archelon-avatar-img');
        if (avatarImg) {
          avatarImg.src = LOGO;
          avatarImg.onload = () => { avatarImg.style.opacity = '1'; };
          avatarImg.onerror = () => { avatarImg.style.opacity = '1'; };
        }
        // Populate pre-chat screen
        prechatName.textContent = NAME;
        prechatLogoImg.src = LOGO;
        prechatLogoImg.onload = () => { prechatLogoImg.style.opacity = '1'; };
        prechatLogoImg.onerror = () => { prechatLogoImg.style.opacity = '1'; };
        setRandomGreeting();
        if (d.theme === 'dark') {
          THEME = 'dark';
          root.classList.add('dark');
        }
      } else {
        fabLogo.innerHTML = `<img src="${LOGO}" alt="" />`;
        fabText.textContent = `Ask ${NAME}`;
        const avatarImg = document.getElementById('archelon-avatar-img');
        if (avatarImg) { avatarImg.src = LOGO; avatarImg.style.opacity = '1'; }
        headerName.textContent = NAME;
        prechatName.textContent = NAME;
        prechatLogoImg.src = LOGO;
        prechatLogoImg.style.opacity = '1';
        setRandomGreeting();
      }
      fab.classList.add('ready');
    })
    .catch(() => {
      fabLogo.innerHTML = `<img src="${LOGO}" alt="" />`;
      fabText.textContent = `Ask ${NAME}`;
      const avatarImg = document.getElementById('archelon-avatar-img');
      if (avatarImg) { avatarImg.src = LOGO; avatarImg.style.opacity = '1'; }
      headerName.textContent = NAME;
      prechatName.textContent = NAME;
      prechatLogoImg.src = LOGO;
      prechatLogoImg.style.opacity = '1';
      setRandomGreeting();
      fab.classList.add('ready');
    });

  // ── Markdown parser ────────────────────────────────────────────────────────
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
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0;"><span style="color:#9ca3af;flex-shrink:0;min-width:14px;">·</span><span>$1</span></div>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // ── Message helpers ───────────────────────────────────────────────────────
  function addBotMessage(text) {
    const wrap = document.createElement('div');
    wrap.className = 'arch-msg bot';
    const rawText = text;
    wrap.innerHTML = `
      <div class="arch-bot-avatar"><img src="${LOGO}" alt="" /></div>
      <div style="display:flex;flex-direction:column;max-width:78%;">
        <div class="arch-bubble" style="max-width:100%;"></div>
        <div class="arch-msg-actions">
          <button class="arch-action-btn arch-thumb-up" title="Good response">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
          </button>
          <button class="arch-action-btn arch-thumb-down" title="Bad response">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg>
          </button>
          <button class="arch-action-btn arch-copy" title="Copy">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          </button>
        </div>
      </div>
    `;
    const bubble = wrap.querySelector('.arch-bubble');
    msgs.appendChild(wrap);
    scrollToBottom();

    // Typewriter — reveal word by word, apply markdown only at the end
    const words = text.split(' ');
    let i = 0;
    const tick = setInterval(() => {
      i++;
      const partial = words.slice(0, i).join(' ');
      if (i >= words.length) {
        bubble.innerHTML = parseMarkdown(partial);
        clearInterval(tick);
      } else {
        bubble.textContent = partial;
      }
      scrollToBottom();
    }, 30);

    wrap.querySelector('.arch-thumb-up').addEventListener('click', function() {
      this.classList.toggle('active');
      wrap.querySelector('.arch-thumb-down').classList.remove('active');
    });
    wrap.querySelector('.arch-thumb-down').addEventListener('click', function() {
      this.classList.toggle('active');
      wrap.querySelector('.arch-thumb-up').classList.remove('active');
    });
    wrap.querySelector('.arch-copy').addEventListener('click', function() {
      navigator.clipboard.writeText(rawText);
      this.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
      setTimeout(() => {
        this.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
      }, 1500);
    });
  }

  function addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'arch-msg user';
    msg.innerHTML = `<div class="arch-bubble">${parseMarkdown(text)}</div>`;
    msgs.appendChild(msg);
    scrollToBottom();
  }

  function scrollToBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  function setInputEnabled(enabled) {
    input.disabled = !enabled;
    sendBtn.classList.toggle('active', enabled && input.value.trim().length > 0);
  }

  // ── Smart window positioning ─────────────────────────────────────────────
  function positionWindow() {
    const GAP = 10;
    const WIN_W = 360;
    const WIN_H = 540;
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
    } else {
      fabClickCount++;
      const egg = EASTER_EGGS.find(e => e.at === fabClickCount);
      if (egg) showFabTooltip(egg.msg);
    }
    win.classList.toggle('open', isOpen);
    fabLogo.style.display = isOpen ? 'none' : 'flex';
    fab.style.paddingLeft = isOpen ? '20px' : '8px';
    fabText.textContent = isOpen ? 'Close' : `Ask ${NAME}`;
    if (isOpen) setTimeout(() => input.focus(), 300);
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    // First message — transition from pre-chat to chat view
    if (!chatStarted) {
      chatStarted = true;
      prechat.style.display = 'none';
      header.classList.add('visible');
      msgs.style.display = 'flex';
      disclaimer.style.display = 'block';
    }

    isLoading = true;
    input.value = '';
    input.style.height = 'auto';
    setInputEnabled(false);
    addUserMessage(text);

    // Show "Let me look into that..." immediately for every query
    let thinkingEl = showThinking(false);
    thinkingEl._showTime = Date.now();
    let streamBubble = null;
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
        addBotMessage("You're sending messages too fast. Give it a moment.");
        isLoading = false; setInputEnabled(true); input.focus(); return;
      }
      if (res.status === 402) {
        addBotMessage("This agent has reached its usage limit for now. Try again later.");
        isLoading = false; setInputEnabled(true); input.focus(); return;
      }
      if (!res.ok) {
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
              // Upgrade to full 3-step thinking for RAG
              if (thinkingEl) { clearInterval(thinkingEl._interval); thinkingEl.remove(); }
              thinkingEl = showThinking(true);
              thinkingEl._showTime = Date.now();
            }
            // smalltalk: keep single step as-is
          }

          if (event.type === 'token') {
            const token = event.token;
            if (!streamBubble) {
              // Remove thinking and show stream bubble on first token
              const showBubble = () => {
                if (thinkingEl) { clearInterval(thinkingEl._interval); thinkingEl.remove(); thinkingEl = null; }
                streamBubble = document.createElement('div');
                streamBubble.className = 'arch-msg bot';
                streamBubble.innerHTML = `
                  <div class="arch-bot-avatar"><img src="${LOGO}" alt="" /></div>
                  <div style="display:flex;flex-direction:column;max-width:78%;">
                    <div class="arch-bubble arch-stream-bubble" style="max-width:100%;"></div>
                  </div>
                `;
                msgs.appendChild(streamBubble);
                streamBubbleContent += token;
                streamBubble.querySelector('.arch-stream-bubble').textContent = streamBubbleContent;
                scrollToBottom();
              };
              // Wait until all steps have shown before revealing answer
              const now = Date.now();
              const waitUntil = thinkingEl ? (thinkingEl._minShowTime || thinkingEl._showTime || now) : now;
              const delay = Math.max(0, waitUntil - now);
              if (delay > 0) {
                setTimeout(showBubble, delay);
              } else {
                showBubble();
              }
            } else {
              streamBubbleContent += token;
              if (streamBubble) {
                streamBubble.querySelector('.arch-stream-bubble').textContent = streamBubbleContent;
                scrollToBottom();
              }
            }
          }

          if (event.type === 'done') {
            // Swap plain-text stream bubble for fully parsed markdown + action buttons in place
            if (streamBubble) {
              const bubble = streamBubble.querySelector('.arch-stream-bubble');
              if (bubble) bubble.innerHTML = parseMarkdown(streamBubbleContent);
              // Add action buttons
              const actionsDiv = document.createElement('div');
              actionsDiv.className = 'arch-msg-actions';
              const rawText = streamBubbleContent;
              actionsDiv.innerHTML = `
                <button class="arch-action-btn arch-thumb-up" title="Good response">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
                </button>
                <button class="arch-action-btn arch-thumb-down" title="Bad response">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg>
                </button>
                <button class="arch-action-btn arch-copy" title="Copy">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              `;
              streamBubble.querySelector('div[style]').appendChild(actionsDiv);
              actionsDiv.querySelector('.arch-thumb-up').addEventListener('click', function() {
                this.classList.toggle('active');
                actionsDiv.querySelector('.arch-thumb-down').classList.remove('active');
              });
              actionsDiv.querySelector('.arch-thumb-down').addEventListener('click', function() {
                this.classList.toggle('active');
                actionsDiv.querySelector('.arch-thumb-up').classList.remove('active');
              });
              actionsDiv.querySelector('.arch-copy').addEventListener('click', function() {
                navigator.clipboard.writeText(rawText);
                this.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
                setTimeout(() => {
                  this.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
                }, 1500);
              });
              streamBubble = null;
              streamBubbleContent = '';
            }
          }
        }
      }
    } catch {
      if (thinkingEl) { clearInterval(thinkingEl._interval); thinkingEl.remove(); }
      if (streamBubble) streamBubble.remove();
      addBotMessage("Couldn't reach the server. Try again in a moment.");
    }

    isLoading = false;
    setInputEnabled(true);
    input.focus();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  newChatBtn.addEventListener('click', () => {
    msgs.innerHTML = '';
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
