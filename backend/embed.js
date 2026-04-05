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
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, ${TEAL}, ${BLUE});
      border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,201,177,0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #archelon-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,201,177,0.5); }
    #archelon-fab svg { width: 24px; height: 24px; color: white; }
    #archelon-window {
      position: fixed; bottom: 92px; right: 24px; z-index: 99998;
      width: 360px; height: 540px; border-radius: 20px;
      background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #e5e7eb;
      transform: scale(0.95) translateY(10px); opacity: 0;
      transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease;
      pointer-events: none;
    }
    #archelon-window.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    #archelon-header {
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, #0d0d0d, #1a1a1a); flex-shrink: 0;
    }
    #archelon-avatar {
      width: 36px; height: 36px; border-radius: 50%; position: relative; flex-shrink: 0;
      background: rgba(0,201,177,0.2); display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    #archelon-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    #archelon-online {
      position: absolute; bottom: 1px; right: 1px;
      width: 9px; height: 9px; border-radius: 50%;
      background: #22c55e; border: 2px solid #0d0d0d;
    }
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
      padding: 9px 12px; font-size: 13px; resize: none; outline: none;
      max-height: 100px; min-height: 38px; line-height: 1.4;
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
      padding: 5px 14px 9px; text-align: center; font-size: 10px;
      color: #9ca3af; background: #fff; flex-shrink: 0;
    }
    #archelon-footer a { color: ${TEAL}; text-decoration: none; font-weight: 500; }
    #archelon-footer a:hover { text-decoration: underline; }
    @media (max-width: 480px) {
      #archelon-window { width: calc(100vw - 24px); right: 12px; bottom: 80px; height: 70vh; }
      #archelon-fab { bottom: 16px; right: 16px; }
    }
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
    #archelon-widget-root.dark #archelon-footer { background: #1a1a1a; }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'archelon-widget-root';
  root.innerHTML = `
    <div id="archelon-window">
      <div id="archelon-header">
        <div id="archelon-avatar">
          <img src="${API_BASE}/Archelon_logo.png" alt="" onerror="this.style.display='none'" />
          <div id="archelon-online"></div>
        </div>
        <div id="archelon-header-info">
          <div id="archelon-header-name">...</div>
          <div id="archelon-header-sub">Typically replies instantly</div>
        </div>
        <button id="archelon-close" aria-label="Close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div id="archelon-messages"></div>
      <div id="archelon-disclaimer">Can make mistakes. Verify important information.</div>
      <div id="archelon-input-area">
        <textarea id="archelon-input" placeholder="Ask a question..." rows="1"></textarea>
        <button id="archelon-send" aria-label="Send">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <div id="archelon-footer">Powered by <a href="https://archelon.cloud" target="_blank">Archelon</a></div>
    </div>
    <button id="archelon-fab" aria-label="Open chat">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
    </button>
  `;
  document.body.appendChild(root);

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const win        = document.getElementById('archelon-window');
  const fab        = document.getElementById('archelon-fab');
  const msgs       = document.getElementById('archelon-messages');
  const input      = document.getElementById('archelon-input');
  const sendBtn    = document.getElementById('archelon-send');
  const closeBtn   = document.getElementById('archelon-close');
  const headerName = document.getElementById('archelon-header-name');
  const disclaimer = document.getElementById('archelon-disclaimer');

  let isOpen    = false;
  let isLoading = false;
  let greeted   = false;

  // ── Thinking steps ────────────────────────────────────────────────────────
  const STEPS = [
    { label: 'Reading your message...' },
    { label: 'Scanning through documents...' },
    { label: 'Pulling the best answer...' },
    { label: 'Almost ready...' },
  ];

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
          const avatarImg = document.querySelector('#archelon-avatar img');
          if (avatarImg) avatarImg.src = LOGO;
          // Replace FAB icon with custom logo
          fab.innerHTML = `<img src="${d.logo_url}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'" />`;
        }
        if (d.theme === 'dark') {
          THEME = 'dark';
          root.classList.add('dark');
        }
      } else {
        headerName.textContent = NAME;
      }
    })
    .catch(() => { headerName.textContent = NAME; });

  // ── Markdown parser — bold only ───────────────────────────────────────────
  function parseMarkdown(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
  }

  // ── Message helpers ───────────────────────────────────────────────────────
  function addBotMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'arch-msg bot';
    msg.innerHTML = `
      <div class="arch-bot-avatar">
        <img src="${API_BASE}/Archelon_logo.png" alt="" onerror="this.style.display='none'" />
      </div>
      <div class="arch-bubble">${parseMarkdown(text)}</div>
    `;
    // Update avatar with dynamic logo after creation
    const img = msg.querySelector('img');
    if (img) img.src = LOGO;
    msgs.appendChild(msg);
    scrollToBottom();
  }

  function addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'arch-msg user';
    msg.innerHTML = `<div class="arch-bubble">${parseMarkdown(text)}</div>`;
    msgs.appendChild(msg);
    scrollToBottom();
  }

  function showDots() {
    const el = document.createElement('div');
    el.className = 'arch-msg bot';
    el.id = 'arch-thinking';
    el.innerHTML = `
      <div class="arch-bot-avatar">
        <img src="${API_BASE}/Archelon_logo.png" alt="" onerror="this.style.display='none'" />
      </div>
      <div class="arch-bubble" style="padding:10px 16px;">
        <span class="arch-dots">
          <span></span><span></span><span></span>
        </span>
      </div>
    `;
    const img = el.querySelector('img');
    if (img) img.src = LOGO;
    msgs.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showThinking() {
    const el = document.createElement('div');
    el.className = 'arch-msg bot';
    el.id = 'arch-thinking';

    const stepsHtml = STEPS.map((s, i) => `
      <div class="arch-thinking-step ${i === 0 ? 'active' : ''}" id="arch-step-${i}">
        <div class="arch-step-icon"></div>
        <span>${s.label}</span>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="arch-bot-avatar">
        <img src="${API_BASE}/Archelon_logo.png" alt="" onerror="this.style.display='none'" />
      </div>
      <div class="arch-thinking-wrap">${stepsHtml}</div>
    `;
    msgs.appendChild(el);
    scrollToBottom();

    let current = 0;
    const interval = setInterval(() => {
      const prev = el.querySelector(`#arch-step-${current}`);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
      current++;
      if (current < STEPS.length) {
        const next = el.querySelector(`#arch-step-${current}`);
        if (next) next.classList.add('active');
      } else {
        clearInterval(interval);
      }
    }, 1200);

    el._interval = interval;
    return el;
  }

  function removeThinking() {
    const el = document.getElementById('arch-thinking');
    if (el) { clearInterval(el._interval); el.remove(); }
  }

  function scrollToBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  function setInputEnabled(enabled) {
    input.disabled = !enabled;
    sendBtn.classList.toggle('active', enabled && input.value.trim().length > 0);
  }

  // ── Toggle chat ───────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen && !greeted) {
      greeted = true;
      addBotMessage(`Hi there! 👋 I'm ${NAME}. How can I help you today?`);
    }
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
    addUserMessage(text);
    showThinking();

    try {
      const res = await fetch(`${API_BASE}/api/public/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Archelon-Key': API_KEY,
        },
        body: JSON.stringify({ message: text, agent_id: AGENT_ID }),
      });

      removeThinking();

      if (res.status === 429) {
        addBotMessage("You're sending messages too quickly. Please slow down.");
      } else if (res.status === 402) {
        addBotMessage('This agent has reached its usage limit. Please try again later.');
      } else if (!res.ok) {
        addBotMessage('Something went wrong. Please try again.');
      } else {
        const data = await res.json();
        addBotMessage(data.answer || "I couldn't find an answer. Please try rephrasing.");
      }
    } catch {
      removeThinking();
      addBotMessage('Could not connect. Please check your internet connection.');
    }

    isLoading = false;
    setInputEnabled(true);
    input.focus();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
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

})();
