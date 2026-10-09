(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.security = async function (root) {
    if (!STN.can('manage_backup')) {
      root.innerHTML = `<div class="stn-empty"><i class="fa-solid fa-lock"></i>${t('stn_sec_only_owner')}</div>`;
      return;
    }
    root.innerHTML = `
      <div class="stn-grid" style="grid-template-columns: 1fr 1fr">
        <div class="stn-card">
          <div class="stn-card-head"><h3><i class="fa-solid fa-shield-halved text-emerald me-1"></i>${t('stn_sec_encrypted_backup')}</h3></div>
          <p class="text-soft" style="font-size:.85rem">${t('stn_sec_backup_intro')}</p>
          <div class="stn-field"><label class="stn-label">${t('stn_sec_passphrase')}</label><input class="stn-input" type="password" id="stnBackupPass" placeholder="${t('stn_sec_choose_passphrase')}"></div>
          <button class="stn-btn stn-btn-primary w-100 mb-2" id="stnBackupExport"><i class="fa-solid fa-download"></i> ${t('stn_sec_export_backup')}</button>
          <hr style="border-color:var(--stn-border)">
          <div class="stn-field"><label class="stn-label">${t('stn_sec_restore_from_file')}</label><input class="stn-input" type="file" id="stnBackupFile" accept=".s21b,.json"></div>
          <div class="stn-field"><label class="stn-label">${t('stn_sec_passphrase')}</label><input class="stn-input" type="password" id="stnRestorePass"></div>
          <button class="stn-btn stn-btn-outline w-100" id="stnBackupRestore"><i class="fa-solid fa-upload"></i> ${t('stn_sec_restore_btn')}</button>
          <p class="text-soft mt-2 mb-0" style="font-size:.72rem">${t('stn_sec_restore_note')}</p>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3>${t('stn_sec_audit_log')}</h3></div>
          <div class="stn-table-wrap" style="max-height:420px;overflow-y:auto"><table class="stn-table" id="stnAuditTable">
            <thead><tr><th>${t('stn_sec_when')}</th><th>${t('stn_sec_who')}</th><th>${t('stn_sec_action')}</th></tr></thead>
            <tbody><tr><td colspan="3" class="text-center py-3"><div class="stn-spin" style="margin:0 auto"></div></td></tr></tbody>
          </table></div>
        </div>
      </div>
    `;
    document.getElementById('stnBackupExport').addEventListener('click', exportBackup);
    document.getElementById('stnBackupRestore').addEventListener('click', restoreBackup);
    loadAudit();
  };

  async function loadAudit() {
    const { log } = await STN.api.get('/audit-log');
    document.querySelector('#stnAuditTable tbody').innerHTML = log.length ? log.map((l) => `
      <tr><td class="text-soft">${STN.dt(l.created_at)}</td><td>${STN.esc(l.user_name || t('stn_sec_system'))}</td><td>${STN.esc(l.action)}${l.details ? ` — <span class="text-soft">${STN.esc(l.details)}</span>` : ''}</td></tr>`).join('') :
      `<tr><td colspan="3" class="text-soft text-center py-3">${t('stn_sec_no_activity')}</td></tr>`;
  }

  // ---- Web Crypto AES-GCM helpers ----
  async function deriveKey(passphrase, salt) {
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }
  function toBase64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function fromBase64(b64) { return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }

  async function exportBackup() {
    const pass = document.getElementById('stnBackupPass').value;
    if (!pass || pass.length < 6) return STN.toast(t('stn_sec_passphrase_min'), 'error');
    try {
      const data = await STN.api.get('/backup/export');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(pass, salt);
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      const envelope = { v: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(cipher) };
      const blob = new Blob([JSON.stringify(envelope)], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `stationery-backup-${new Date().toISOString().slice(0, 10)}.s21b`;
      a.click();
      STN.toast(t('stn_sec_backup_downloaded'));
    } catch (err) { STN.toast(err.message, 'error'); }
  }

  async function restoreBackup() {
    const file = document.getElementById('stnBackupFile').files[0];
    const pass = document.getElementById('stnRestorePass').value;
    if (!file || !pass) return STN.toast(t('stn_sec_choose_file_pass'), 'error');
    try {
      const envelope = JSON.parse(await file.text());
      const key = await deriveKey(pass, fromBase64(envelope.salt));
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data));
      const data = JSON.parse(new TextDecoder().decode(plain));
      const result = await STN.api.post('/backup/restore', data);
      STN.toast(t('stn_sec_restored_summary').replace('{c}', result.restoredCustomers).replace('{s}', result.restoredServices).replace('{i}', result.restoredInventory));
      loadAudit();
    } catch (err) {
      STN.toast(t('stn_sec_decrypt_failed'), 'error');
    }
  }
})();
