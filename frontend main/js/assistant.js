// ============================================================
// AssetFlow — AI Assistant ("Flo") — floating chat widget
// Depends on api.js being loaded first (uses `api()` and `currentUser()`).
// ============================================================
(function () {
  let convo = [];   // { role: 'user' | 'assistant', content: string }
  let isOpen = false;
  let sending = false;

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function init() {
    if (!localStorage.getItem('af_token')) return; // only show once logged in

    const fab = el(`
      <button class="af-chat-fab" id="afChatFab" aria-label="Open AI assistant" title="Ask Flo — AI assistant">
        <span class="af-chat-fab-icon">💬</span>
      </button>
    `);

    const panel = el(`
      <div class="af-chat-panel" id="afChatPanel" role="dialog" aria-label="Flo, AssetFlow AI assistant">
        <div class="af-chat-header">
          <div class="af-chat-avatar">F</div>
          <div class="af-chat-title">
            <div class="af-chat-name">Flo <span class="af-chat-ai-badge">AI</span></div>
            <div class="af-chat-sub">AssetFlow Assistant</div>
          </div>
          <button class="af-chat-close" id="afChatClose" aria-label="Close assistant">&times;</button>
        </div>
        <div class="af-chat-messages" id="afChatMessages"></div>
        <div class="af-chat-suggestions" id="afChatSuggestions">
          <button type="button" class="af-chip" data-q="What assets are currently allocated to me?">My assets</button>
          <button type="button" class="af-chip" data-q="Are there any overdue returns?">Overdue returns</button>
          <button type="button" class="af-chip" data-q="How many pending maintenance requests are there?">Maintenance</button>
          <button type="button" class="af-chip" data-q="What can you help me with?">Help</button>
        </div>
        <form class="af-chat-input-row" id="afChatForm">
          <input type="text" id="afChatInput" placeholder="Ask Flo anything about AssetFlow..." autocomplete="off">
          <button type="submit" class="af-chat-send" aria-label="Send message">&#10148;</button>
        </form>
      </div>
    `);

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    fab.addEventListener('click', () => toggle());
    panel.querySelector('#afChatClose').addEventListener('click', () => toggle(false));
    panel.querySelectorAll('.af-chip').forEach((chip) => {
      chip.addEventListener('click', () => send(chip.getAttribute('data-q')));
    });
    panel.querySelector('#afChatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('afChatInput');
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      send(val);
    });

    greet();
  }

  function toggle(force) {
    const panel = document.getElementById('afChatPanel');
    if (!panel) return;
    isOpen = typeof force === 'boolean' ? force : !isOpen;
    panel.classList.toggle('show', isOpen);
    if (isOpen) {
      const input = document.getElementById('afChatInput');
      if (input) input.focus();
    }
  }

  function greet() {
    const user = (typeof currentUser === 'function') ? currentUser() : null;
    const first = user && user.name ? user.name.split(' ')[0] : 'there';
    addMessage('assistant', `Hi ${first}! I'm Flo, your AssetFlow assistant. Ask me about your assets, allocations, bookings, or maintenance requests \u2014 or tap a suggestion below.`);
  }

  function addMessage(role, text) {
    const wrap = document.getElementById('afChatMessages');
    if (!wrap) return;
    const bubble = el(`<div class="af-msg af-msg-${role === 'user' ? 'user' : 'assistant'}"><div class="af-msg-bubble"></div></div>`);
    bubble.querySelector('.af-msg-bubble').textContent = text;
    wrap.appendChild(bubble);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function showTyping() {
    const wrap = document.getElementById('afChatMessages');
    if (!wrap) return;
    const t = el(`<div class="af-msg af-msg-assistant" id="afTyping"><div class="af-msg-bubble af-typing"><span></span><span></span><span></span></div></div>`);
    wrap.appendChild(t);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function hideTyping() {
    const t = document.getElementById('afTyping');
    if (t) t.remove();
  }

  async function send(text) {
    if (sending || !text) return;
    sending = true;
    addMessage('user', text);
    convo.push({ role: 'user', content: text });
    showTyping();
    try {
      const data = await api('/assistant/chat', 'POST', { message: text, history: convo.slice(-10) });
      hideTyping();
      const reply = data.reply || "Sorry, I couldn't come up with an answer for that.";
      addMessage('assistant', reply);
      convo.push({ role: 'assistant', content: reply });
    } catch (e) {
      hideTyping();
      addMessage('assistant', "I couldn't reach the assistant service just now \u2014 please try again in a moment.");
    } finally {
      sending = false;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
