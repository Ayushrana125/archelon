(function () {
  'use strict';

  const config = window.ArchelonConfig || {};
  const AGENT_ID = config.agentId;
  const API_KEY  = config.apiKey;
  const NAME     = config.name || 'Assistant';
  const API_BASE = 'https://api.archelon.cloud';
  const TEAL     = '#00C9B1';
  const BLUE     = '#1A73E8';

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
      width: 360px; height: 520px; border-radius: 20px;
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
    }
    #archelon-avatar img { width: 22px; height: 22px; object-fit: contain; }
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
      font-size: 13px; line-height: 1.5; word-break: break-word;
    }
    .arch-msg.bot .arch-bubble {
      background: #fff; color: #111827; border-radius: 18px 18px 18px 4px;
      border: 1px solid #e5e7eb;
    }
    .arch-msg.user .arch-bubble {
      background: linear-gradient(135deg, ${TEAL}, ${BLUE});
      color: #fff; border-radius: 18px 18px 4px 18px;
    }
    .arch-bot-avatar {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      background: rgba(0,201,177,0.15); display: flex; align-items: center; justify-content: center;
    }
    .arch-bot-avatar img { width: 14px; height: 14px; object-fit: contain; }
    .arch-thinking { display: flex; gap: 4px; align-items: center; padding: 10px 13px; }
    .arch-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #9ca3af;
      animation: arch-bounce 1.2s ease-in-out infinite;
    }
    .arch-dot:nth-child(2) { animation-delay: 0.2s; }
    .arch-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes arch-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
    .arch-thinking-text {
      font-size: 11px; color: #9ca3af; margin-left: 4px;
      animation: arch-fade 1.5s ease-in-out infinite;
    }
    @keyframes arch-fade {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    #archelon-disclaimer {
      padding: 6px 16px; font-size: 10px; color: #9ca3af;
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
      padding: 6px 14px 10px; text-align: center; font-size: 10px;
      color: #9ca3af; background: #fff; flex-shrink: 0;
    }
    #archelon-footer a { color: ${TEAL}; text-decoration: none; font-weight: 500; }
    #archelon-footer a:hover { text-decoration: underline; }
    @media (max-width: 480px) {
      #archelon-window { width: calc(100vw - 24px); right: 12px; bottom: 80px; height: 70vh; }
      #archelon-fab { bottom: 16px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'archelon-widget-root';
  root.innerHTML = `
    <div id="archelon-window">
      <div id="archelon-header">
        <div id="archelon-avatar">
          <img src="https://api.archelon.cloud/Archelon_logo.png" alt="${NAME}" onerror="this.style.display='none'" />
          <div id="archelon-online"></div>
        </div>
        <div id="archelon-header-info">
          <div id="archelon-header-name">${NAME}</div>
          <div id="archelon-header-sub">Typically replies instantly</div>
        </div>
        <button id="archelon-close" aria-label="Close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div id="archelon-messages"></div>
      <div id="archelon-disclaimer">${NAME} can make mistakes. Verify important information.</div>
      <div id="archelon-input-area">
        <textarea id="archelon-input" placeholder="Ask ${NAME}..." rows="1"></textarea>
        <button id="archelon-send" aria-label="Send">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <div id="archelon-footer">Powered by <a href="https://archelon.cloud" target="_blank">Archelon</a></div>
    </div>
    <button id="archelon-fab" aria-label="Chat with ${NAME}">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
    </button>
  `;
  document.body.appendChild(root);

  // ── State ─────────────────────────────────────────────────────────────────
  const win      = document.getElementById('archelon-window');
  const fab      = document.getElementById('archelon-fab');
  const msgs     = document.getElementById('archelon-messages');
  const input    = document.getElementById('archelon-input');
  const sendBtn  = document.getElementById('archelon-send');
  const closeBtn = document.getElementById('archelon-close');

  let isOpen    = false;
  let isLoading = false;
  let greeted   = false;

  const THINKING_STEPS = [
    'Reading your question...',
    'Searching documents...',
    'Putting together an answer...',
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen && !greeted) {
      greeted = true;
      addBotMessage(`Hi there! 👋 I'm ${NAME}. How can I help you today?`);
    }
    if (isOpen) setTimeout(() => input.focus(), 300);
  }

  function addBotMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'arch-msg bot';
    msg.innerHTML = `
      <div class="arch-bot-avatar">
        <img src="https://api.archelon.cloud/Archelon_logo.png" alt="" onerror="this.style.display='none'" />
      </div>
      <div class="arch-bubble">${escapeHtml(text)}</div>
    `;
    msgs.appendChild(msg);
    scrollToBottom();
    return msg;
  }

  function addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'arch-msg user';
    msg.innerHTML = `<div class="arch-bubble">${escapeHtml(text)}</div>`;
    msgs.appendChild(msg);
    scrollToBottom();
  }

  function showThinking() {
    const el = document.createElement('div');
    el.className = 'arch-msg bot';
    el.id = 'arch-thinking';
    let stepIdx = 0;
    el.innerHTML = `
      <div class="arch-bot-avatar">
        <img src="https://api.archelon.cloud/Archelon_logo.png" alt="" onerror="this.style.display='none'" />
      </div>
      <div class="arch-bubble arch-thinking">
        <div class="arch-dot"></div>
        <div class="arch-dot"></div>
        <div class="arch-dot"></div>
        <span class="arch-thinking-text">${THINKING_STEPS[0]}</span>
      </div>
    `;
    msgs.appendChild(el);
    scrollToBottom();
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % THINKING_STEPS.length;
      const t = el.querySelector('.arch-thinking-text');
      if (t) t.textContent = THINKING_STEPS[stepIdx];
    }, 1400);
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

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  function setInputEnabled(enabled) {
    input.disabled = !enabled;
    sendBtn.classList.toggle('active', enabled && input.value.trim().length > 0);
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

    const thinking = showThinking();

    try {
      const res = await fetch(`${API_BASE}/api/public/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Archelon-Key': API_KEY,
        },
        body: JSON.stringify({ message: text, agent_id: AGENT_ID, name: NAME }),
      });

      removeThinking();

      if (res.status === 429) {
        addBotMessage('You\'re sending messages too quickly. Please slow down.');
      } else if (res.status === 402) {
        addBotMessage('This agent has reached its usage limit. Please try again later.');
      } else if (!res.ok) {
        addBotMessage('Something went wrong. Please try again.');
      } else {
        const data = await res.json();
        addBotMessage(data.answer || 'I couldn\'t find an answer. Please try rephrasing.');
      }
    } catch {
      removeThinking();
      addBotMessage('Could not connect. Please check your internet connection.');
    }

    isLoading = false;
    setInputEnabled(true);
    input.focus();
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  sendBtn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    sendBtn.classList.toggle('active', input.value.trim().length > 0 && !isLoading);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !root.contains(e.target)) toggleChat();
  });

})();
