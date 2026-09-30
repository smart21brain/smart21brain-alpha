(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  let log = [];
  let pendingMode = 'general';
  let pendingContext = {};

  function QUICK() {
    return [
      { mode: 'business', label: t('stn_ai_business_advice'), icon: 'fa-chart-line', prompt: t('stn_ai_prompt_business') },
      { mode: 'sales_summary', label: t('stn_ai_sales_summary'), icon: 'fa-file-invoice-dollar', prompt: t('stn_ai_prompt_sales') },
      { mode: 'photo', label: t('stn_ai_passport_photo_help'), icon: 'fa-camera-retro', prompt: t('stn_ai_prompt_photo') },
    ];
  }

  window.STN_MODULES.chopaai = async function (root) {
    const QUICK_LIST = QUICK();
    root.innerHTML = `
      <div class="stn-grid" style="grid-template-columns: 1fr 240px">
        <div class="stn-card">
          <div class="stn-card-head"><h3><i class="fa-solid fa-robot text-emerald me-1"></i>Smart21brain AI</h3></div>
          <div class="stn-chat-log" id="stnChatLog"></div>
          <div class="d-flex gap-2 mt-3">
            <input class="stn-input" id="stnChatInput" placeholder="${t('stn_ai_input_placeholder')}">
            <button class="stn-btn stn-btn-primary" id="stnChatSend"><i class="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3>${t('stn_ai_quick_ask')}</h3></div>
          ${QUICK_LIST.map((q) => `<button class="stn-btn stn-btn-outline w-100 mb-2 text-start" data-quick='${q.mode}'><i class="fa-solid ${q.icon} me-2"></i>${q.label}</button>`).join('')}
        </div>
      </div>
    `;
    renderLog();
    document.getElementById('stnChatSend').addEventListener('click', sendFromInput);
    document.getElementById('stnChatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendFromInput(); });
    document.querySelectorAll('[data-quick]').forEach((btn) => btn.addEventListener('click', () => {
      const q = QUICK_LIST.find((x) => x.mode === btn.dataset.quick);
      send(q.prompt, q.mode, {});
    }));

    if (pendingContext.prefillPrompt) {
      send(pendingContext.prefillPrompt, pendingMode, pendingContext);
      pendingContext = {};
    }
  };

  window.STN_chopaPrefill = function (mode, machineId, prompt) {
    pendingMode = mode;
    pendingContext = { machine_id: machineId, prefillPrompt: prompt };
  };

  function renderLog() {
    const box = document.getElementById('stnChatLog');
    if (!box) return;
    box.innerHTML = log.length ? log.map((m) => `<div class="stn-chat-msg ${m.role}">${STN.esc(m.text)}</div>`).join('') :
      `<div class="stn-empty"><i class="fa-solid fa-robot"></i>${t('stn_ai_empty_hint')}</div>`;
    box.scrollTop = box.scrollHeight;
  }

  function sendFromInput() {
    const input = document.getElementById('stnChatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    send(text, 'general', {});
  }

  async function send(text, mode, context) {
    log.push({ role: 'user', text });
    renderLog();
    log.push({ role: 'bot', text: '…' });
    renderLog();
    try {
      const { answer } = await STN.api.post('/chopaai', { prompt: text, mode, ...context });
      log[log.length - 1] = { role: 'bot', text: answer };
    } catch (err) {
      log[log.length - 1] = { role: 'bot', text: `${t('stn_ai_error_prefix')} ${err.message}` };
    }
    renderLog();
  }
})();
