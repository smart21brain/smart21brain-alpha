/* Staff — who can sign in to this shop, their role, active/inactive, password reset. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;
  const ROLES = () => [['owner', SP.t('Owner', 'Mmiliki')], ['manager', SP.t('Manager', 'Meneja')], ['cashier', SP.t('Cashier', 'Karani wa Fedha')]];

  SP.modules.users = async (el) => {
    el.innerHTML = `${SP.pageHead(SP.t('Staff', 'Wafanyakazi'), SP.t('Who can sign in to this shop, and what they can do', 'Nani anaweza kuingia dukani hapa, na anaweza kufanya nini'), `<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-user-plus"></i> ${SP.t('Add Staff', 'Ongeza Mfanyakazi')}</button>`)}<div id="userList">${SP.skeleton(5)}</div>`;
    const list = el.querySelector('#userList');
    async function load() {
      const { users } = await SP.api.get('/users');
      list.innerHTML = SP.table([
        { label: SP.t('Name', 'Jina'), render: (u) => `<span class="sp-person"><span class="sp-avatar">${esc(SP.initials(u.name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(u.name)}</span><div class="sb">${esc(u.email)}</div></span></span>` },
        { label: SP.t('Role', 'Jukumu'), render: (u) => SP.chip(u.role === 'owner' ? 'ok' : u.role === 'manager' ? 'info' : '', SP.cap(u.role)) },
        { label: SP.t('Status', 'Hali'), render: (u) => SP.chip(u.active ? 'active' : 'inactive') },
        { label: SP.t('Last sign-in', 'Kuingia Mwisho'), render: (u) => u.last_login ? SP.dateTime(u.last_login) : SP.t('Never', 'Kamwe') },
        { label: '', cls: 'end', render: (u) => `<button class="sp-btn ghost sm" data-act="menu" data-id="${u.id}"><i class="fa-solid fa-ellipsis"></i></button>` },
      ], users, { empty: SP.empty('fa-users', SP.t('No staff yet', 'Hakuna wafanyakazi bado'), '') });
      list._rows = users;
    }
    SP.delegate(el, {
      new: () => SP.formModal({ title: SP.t('Add staff member', 'Ongeza Mfanyakazi'), submit: SP.t('Add staff', 'Ongeza Mfanyakazi'),
        body: `${SP.f.input('name', SP.t('Full name', 'Jina kamili'), { required: true })}${SP.f.input('email', SP.t('Email', 'Barua pepe'), { type: 'email', required: true, hint: SP.t('If they already have a Smart21 account, it will be linked — no password needed.', 'Ikiwa tayari ana akaunti ya Smart21, itaunganishwa — hakuna nenosiri linalohitajika.') })}${SP.f.select('role', SP.t('Role', 'Jukumu'), ROLES(), { required: true, value: 'cashier', noBlank: true })}${SP.f.input('password', SP.t('Temporary password', 'Nenosiri la Muda'), { type: 'text', placeholder: SP.t('Only needed for a brand-new account', 'Linahitajika tu kwa akaunti mpya kabisa'), hint: SP.t('Leave blank if this person already has an account', 'Acha wazi ikiwa mtu huyu tayari ana akaunti') })}`,
        onSubmit: async (data) => { await SP.api.post('/users', data); SP.closeModal(); SP.toast(SP.t('Staff member added.', 'Mfanyakazi ameongezwa.')); load(); } }),
      menu: (b) => {
        const u = list._rows.find((x) => String(x.user_id) === b.dataset.id); if (!u) return;
        SP.popMenu(b, [
          { label: SP.t('Change role', 'Badilisha Jukumu'), icon: 'fa-user-gear', fn: () => SP.formModal({ title: SP.t(`Change role — ${u.name}`, `Badilisha Jukumu — ${u.name}`), submit: SP.t('Save', 'Hifadhi'), body: SP.f.select('role', SP.t('Role', 'Jukumu'), ROLES(), { required: true, value: u.role, noBlank: true }), onSubmit: async (d) => { await SP.api.put(`/users/${u.id}`, d); SP.closeModal(); SP.toast(SP.t('Role updated.', 'Jukumu limesasishwa.')); load(); } }) },
          { label: u.active ? SP.t('Deactivate', 'Zima') : SP.t('Activate', 'Washa'), icon: u.active ? 'fa-user-slash' : 'fa-user-check', fn: async () => { const ok = await SP.confirm({ title: u.active ? SP.t(`Deactivate ${u.name}?`, `Zima ${u.name}?`) : SP.t(`Activate ${u.name}?`, `Washa ${u.name}?`), danger: u.active }); if (!ok) return; await SP.api.put(`/users/${u.id}`, { active: !u.active }); SP.toast(SP.t('Updated.', 'Imesasishwa.')); load(); } },
          { label: SP.t('Reset password', 'Weka Upya Nenosiri'), icon: 'fa-key', fn: () => SP.formModal({ title: SP.t(`Reset password — ${u.name}`, `Weka Upya Nenosiri — ${u.name}`), submit: SP.t('Reset', 'Weka Upya'), body: SP.f.input('new_password', SP.t('New password', 'Nenosiri Jipya'), { type: 'text', required: true, hint: SP.t('Share this with them directly.', 'Washirikishe hili moja kwa moja.') }), onSubmit: async (d) => { await SP.api.put(`/users/${u.id}`, d); SP.closeModal(); SP.toast(SP.t('Password reset.', 'Nenosiri limewekwa upya.')); } }) },
        ]);
      },
    });
    await load();
  };
})();
