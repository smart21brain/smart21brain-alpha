/* Smart21Brain — Admin analytics
   Builds real charts and stats from the same /api endpoints the rest of
   the admin dashboard already uses — no invented numbers. Everything
   here is derived from actual created_at timestamps on users and
   content records. Degrades gracefully (plain numbers, no charts) if
   Chart.js failed to load from the CDN. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const growthCanvas = document.getElementById('chart-growth');
    if (!growthCanvas) return; // not on the admin page

    const CONTENT_TYPES = [
      { key: 'games', url: '/api/games', field: 'games', label: 'Games', color: '#0B6E4F' },
      { key: 'quizzes', url: '/api/quizzes', field: 'quizzes', label: 'Quizzes', color: '#4DABF7' },
      { key: 'posts', url: '/api/blog', field: 'posts', label: 'Blog posts', color: '#EF476F' },
      { key: 'materials', url: '/api/materials', field: 'materials', label: 'Materials', color: '#FFD166' },
      { key: 'videos', url: '/api/videos', field: 'videos', label: 'Videos', color: '#7B61FF' },
      { key: 'books', url: '/api/books', field: 'books', label: 'Books', color: '#06A77D' },
    ];
    const ROLE_META = [
      { key: 'user', label: 'Students', color: '#0B6E4F' },
      { key: 'teacher', label: 'Teachers', color: '#EF476F' },
      { key: 'parent', label: 'Parents', color: '#FFD166' },
      { key: 'admin', label: 'Admins', color: '#1E2A24' },
    ];

    const cssVar = (name, fallback) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const setTwo = (idA, idB, value) => { setText(idA, value); setText(idB, value); };

    function daysAgo(n) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - n);
      return d;
    }
    function endOfDay(d) {
      const e = new Date(d);
      e.setHours(23, 59, 59, 999);
      return e.getTime();
    }
    // Cumulative count of `timestamps` (sorted ascending, ms) at or before each boundary in `boundaries` (ms, ascending)
    function cumulativeCounts(timestamps, boundaries) {
      const sorted = timestamps.slice().sort((a, b) => a - b);
      let i = 0;
      return boundaries.map((b) => {
        while (i < sorted.length && sorted[i] <= b) i++;
        return i;
      });
    }

    async function fetchJSON(url, field) {
      try {
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        return data[field] || [];
      } catch {
        return [];
      }
    }

    function downloadCsv(rows, filename) {
      if (window.S21AdminDownloadCsv) return window.S21AdminDownloadCsv(rows, filename);
      const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }

    async function run() {
      const [users, ...contentLists] = await Promise.all([
        fetchJSON('/api/users', 'users'),
        ...CONTENT_TYPES.map((t) => fetchJSON(t.url, t.field)),
      ]);
      const contentByType = {};
      CONTENT_TYPES.forEach((t, i) => { contentByType[t.key] = contentLists[i]; });
      const allContent = CONTENT_TYPES.flatMap((t) => contentByType[t.key].map((item) => ({ ...item, __type: t.key })));

      const totalContent = allContent.length;
      const weekAgo = Date.now() - 7 * 86400000;
      const contentThisWeek = allContent.filter((c) => c.created_at && new Date(c.created_at + 'Z').getTime() >= weekAgo).length;
      const usersThisWeek = users.filter((u) => u.created_at && new Date(u.created_at + 'Z').getTime() >= weekAgo).length;

      let busiest = { label: '—', count: -1 };
      CONTENT_TYPES.forEach((t) => {
        const n = contentByType[t.key].length;
        if (n > busiest.count) busiest = { label: t.label, count: n };
      });
      const busiestLabel = busiest.count > 0 ? `${busiest.label} (${busiest.count})` : 'No content yet';

      // Overview + Analytics stat cards (mirrored)
      setTwo('stat-total-content', 'an-stat-total-content', totalContent.toLocaleString());
      setTwo('stat-new-week', 'an-stat-content-week', contentThisWeek.toLocaleString());
      setText('an-stat-users-week', usersThisWeek.toLocaleString());
      setTwo('stat-busiest-type', 'an-stat-busiest', busiestLabel);

      // ---- Content breakdown table ----
      const tbody = document.getElementById('an-content-table');
      if (tbody) {
        tbody.innerHTML = CONTENT_TYPES.map((t) => {
          const n = contentByType[t.key].length;
          const pct = totalContent ? Math.round((n / totalContent) * 100) : 0;
          return `<tr>
            <td>${t.label}</td>
            <td>${n.toLocaleString()}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div style="flex:1;height:8px;border-radius:99px;background:var(--s21-bg);overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:${t.color};border-radius:99px"></div>
                </div>
                <span class="text-soft" style="font-size:.78rem;min-width:2.5em">${pct}%</span>
              </div>
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="3" class="text-soft" style="font-size:.85rem">No content yet.</td></tr>';
      }

      document.getElementById('admin-export-content-btn')?.addEventListener('click', () => {
        const rows = [['Type', 'Title', 'Subject', 'Created']];
        allContent.forEach((c) => {
          const typeLabel = CONTENT_TYPES.find((t) => t.key === c.__type)?.label || c.__type;
          rows.push([typeLabel, c.title || '', c.subject || '', c.created_at ? new Date(c.created_at + 'Z').toLocaleDateString() : '']);
        });
        downloadCsv(rows, 'smart21brain-content.csv');
      }, { once: true });

      // If Chart.js didn't load (e.g. CDN blocked), stop here — numbers and table above still work.
      if (typeof Chart === 'undefined') {
        [growthCanvas, document.getElementById('chart-content-mix'), document.getElementById('chart-user-roles')].forEach((c) => {
          if (c) c.replaceWith(Object.assign(document.createElement('p'), {
            className: 'text-soft', style: 'font-size:.85rem', textContent: 'Charts unavailable (couldn\'t load Chart.js).',
          }));
        });
        return;
      }

      Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
      Chart.defaults.color = cssVar('--s21-text-soft', '#5B6470');

      // ---- Growth chart: cumulative users vs cumulative content, last 30 days ----
      const days = Array.from({ length: 30 }, (_, i) => daysAgo(29 - i));
      const boundaries = days.map(endOfDay);
      const labels = days.map((d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      const userTimestamps = users.map((u) => u.created_at && new Date(u.created_at + 'Z').getTime()).filter(Boolean);
      const contentTimestamps = allContent.map((c) => c.created_at && new Date(c.created_at + 'Z').getTime()).filter(Boolean);
      const userSeries = cumulativeCounts(userTimestamps, boundaries);
      const contentSeries = cumulativeCounts(contentTimestamps, boundaries);

      new Chart(growthCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Users', data: userSeries, borderColor: cssVar('--s21-primary', '#0B6E4F'), backgroundColor: 'transparent', tension: .3, pointRadius: 0, borderWidth: 2.5 },
            { label: 'Content items', data: contentSeries, borderColor: cssVar('--s21-accent', '#EF476F'), backgroundColor: 'transparent', tension: .3, pointRadius: 0, borderWidth: 2.5 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
            y: { beginAtZero: true, grid: { color: cssVar('--s21-border', '#E7E9EC') }, ticks: { precision: 0 } },
          },
        },
      });

      // ---- Content mix doughnut ----
      new Chart(document.getElementById('chart-content-mix'), {
        type: 'doughnut',
        data: {
          labels: CONTENT_TYPES.map((t) => t.label),
          datasets: [{ data: CONTENT_TYPES.map((t) => contentByType[t.key].length), backgroundColor: CONTENT_TYPES.map((t) => t.color), borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, usePointStyle: true } } },
        },
      });

      // ---- Users by role doughnut ----
      const roleCounts = { user: 0, teacher: 0, parent: 0, admin: 0 };
      users.forEach((u) => { if (u.role in roleCounts) roleCounts[u.role]++; });
      new Chart(document.getElementById('chart-user-roles'), {
        type: 'doughnut',
        data: {
          labels: ROLE_META.map((r) => r.label),
          datasets: [{ data: ROLE_META.map((r) => roleCounts[r.key]), backgroundColor: ROLE_META.map((r) => r.color), borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, usePointStyle: true } } },
        },
      });
    }

    run();
  });
})();
