/**
 * Chat interface module for AR Repair
 * Replaces the form-based setup with a conversational agent UI
 */

const categoryNames = {
  printer: 'printer',
  router: 'router / modem',
  laptop: 'laptop / computer',
  phone: 'phone / tablet',
  appliance: 'home appliance'
};

export function initChat(onProblemIdentified) {
  let conversationState = 'greeting'; // greeting -> asking_device -> asking_problem -> identified
  let detectedCategory = null;

  // DOM references
  const body = document.getElementById('chat-body');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send');

  function scrollToBottom() {
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  function createAgentAvatar() {
    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-agent-avatar';
    // Build SVG via DOM API (no innerHTML)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1v-1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2zm-2 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm4 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z');
    path.setAttribute('fill', 'white');
    svg.appendChild(path);
    avatar.appendChild(svg);
    return avatar;
  }

  function addMessage(type, text) {
    // Remove any existing loading indicator
    if (type !== 'loading') {
      removeLoading();
    }

    if (type === 'agent') {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-msg-agent';
      const row = document.createElement('div');
      row.className = 'chat-msg-agent-row';
      row.appendChild(createAgentAvatar());
      const textEl = document.createElement('div');
      textEl.className = 'chat-msg-agent-text';
      textEl.textContent = text;
      row.appendChild(textEl);
      wrapper.appendChild(row);
      body.appendChild(wrapper);
    } else if (type === 'user') {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-msg-user';
      const spacer = document.createElement('div');
      spacer.className = 'chat-msg-user-spacer';
      const bubble = document.createElement('div');
      bubble.className = 'chat-msg-user-bubble';
      bubble.textContent = text;
      wrapper.appendChild(spacer);
      wrapper.appendChild(bubble);
      body.appendChild(wrapper);
    } else if (type === 'system') {
      const el = document.createElement('div');
      el.className = 'chat-msg-system';
      el.textContent = text;
      body.appendChild(el);
    } else if (type === 'loading') {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-loading';
      wrapper.id = 'chat-loading-indicator';
      wrapper.appendChild(createAgentAvatar());
      const textEl = document.createElement('span');
      textEl.className = 'chat-loading-text';
      textEl.textContent = text;
      wrapper.appendChild(textEl);
      const dots = document.createElement('div');
      dots.className = 'chat-loading-dots';
      for (let i = 0; i < 3; i++) {
        dots.appendChild(document.createElement('span'));
      }
      wrapper.appendChild(dots);
      body.appendChild(wrapper);
    }

    scrollToBottom();
  }

  function removeLoading() {
    const loader = document.getElementById('chat-loading-indicator');
    if (loader) loader.remove();
  }

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    processUserMessage(text);
  }

  function identifyCategory(text) {
    if (/printer|print|ink|paper.?jam|toner/.test(text)) return 'printer';
    if (/router|modem|wifi|wi-fi|internet|network/.test(text)) return 'router';
    if (/laptop|computer|pc|desktop|hard.?drive|ssd/.test(text)) return 'laptop';
    if (/phone|iphone|android|screen|tablet|ipad|mobile/.test(text)) return 'phone';
    if (/appliance|keurig|coffee|washer|dryer|fridge|microwave|dishwasher|oven|toaster/.test(text)) return 'appliance';
    return null;
  }

  function processUserMessage(text) {
    const lower = text.toLowerCase();

    addMessage('loading', 'Looking it up');

    setTimeout(() => {
      removeLoading();

      if (conversationState === 'greeting') {
        let category = identifyCategory(lower);
        if (category) {
          detectedCategory = category;
          conversationState = 'asking_problem';
          addMessage('agent', `Got it — a ${categoryNames[category]}. What seems to be the problem with it?`);
        } else {
          conversationState = 'asking_device';
          addMessage('agent', 'What type of device are you trying to fix? For example: a printer, router, laptop, phone, or appliance.');
        }
      } else if (conversationState === 'asking_device') {
        let category = identifyCategory(lower);
        if (category) {
          detectedCategory = category;
          conversationState = 'asking_problem';
          addMessage('agent', `A ${categoryNames[category]} — got it. Can you describe what’s going wrong?`);
        } else {
          addMessage('agent', 'I didn’t quite catch that. Could you tell me what device you’re working with? (printer, router, laptop, phone, appliance)');
        }
      } else if (conversationState === 'asking_problem') {
        conversationState = 'identified';
        addMessage('agent', 'I think I can help with that. Let me set up the AR guide for you — point your camera at the device.');
        setTimeout(() => {
          onProblemIdentified(detectedCategory, '', text);
        }, 1500);
      }
    }, 800 + Math.random() * 600);
  }

  // Start with greeting
  setTimeout(() => {
    addMessage('system', 'Agent joined');
    setTimeout(() => {
      addMessage('agent', 'Hey! I’m your repair assistant. Tell me what device you’re having trouble with and I’ll walk you through fixing it step by step with AR guidance.');
    }, 500);
  }, 300);

  // Bind events
  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Focus input on load
  setTimeout(() => input.focus(), 1000);
}
