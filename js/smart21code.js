/* ==========================================================================
   Smart21Code — controller
   Renders a W3Schools-style "learn to code" panel inside courses.html:
   language tabs -> topic sidebar -> lesson (explain / syntax / Try it editor).
   HTML/CSS/JS run live in a sandboxed iframe. Python/SQL show a pre-computed
   "expected output" since they can't execute inside the browser.
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.SMART21CODE_DATA;
  if (!DATA) return;

  var state = {
    lang: 'html',
    topicId: DATA.topics.html[0].id,
    query: ''
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function currentTopics() { return DATA.topics[state.lang] || []; }
  function findTopic(lang, id) {
    return (DATA.topics[lang] || []).find(function (t) { return t.id === id; });
  }

  /* ---------------------------------------------------------- rendering */

  function renderLangTabs() {
    var wrap = $('#s21code-lang-tabs');
    if (!wrap) return;
    wrap.innerHTML = DATA.languages.map(function (l) {
      var active = l.id === state.lang ? ' active' : '';
      return '' +
        '<button type="button" class="s21code-lang-tab' + active + '" data-lang="' + l.id + '" style="--lang-color:' + l.color + '">' +
          '<i class="fa-brands ' + (l.id === 'javascript' ? 'fa-js' : '') + '" ' + (l.id !== 'javascript' ? 'style="display:none"' : '') + '></i>' +
          '<i class="fa-solid ' + l.icon + '" ' + (l.id === 'javascript' ? 'style="display:none"' : '') + '></i>' +
          '<span>' + l.name + '</span>' +
        '</button>';
    }).join('');
  }

  function renderSidebar() {
    var wrap = $('#s21code-sidebar-list');
    if (!wrap) return;
    var topics = currentTopics();
    var q = state.query.trim().toLowerCase();
    if (q) {
      topics = topics.filter(function (t) {
        return t.title.toLowerCase().indexOf(q) > -1;
      });
    }
    if (!topics.length) {
      wrap.innerHTML = '<p class="text-soft small px-2 py-3 mb-0">No topics match "' + esc(state.query) + '".</p>';
      return;
    }
    wrap.innerHTML = topics.map(function (t, i) {
      var active = t.id === state.topicId ? ' active' : '';
      return '' +
        '<button type="button" class="s21code-topic-link' + active + '" data-topic="' + t.id + '">' +
          '<span class="s21code-topic-num">' + (i + 1) + '</span>' +
          '<span class="s21code-topic-title">' + esc(t.title) + '</span>' +
          '<span class="s21code-topic-level lvl-' + t.level.toLowerCase() + '">' + t.level + '</span>' +
        '</button>';
    }).join('');
  }

  function langMeta(id) { return DATA.languages.find(function (l) { return l.id === id; }); }

  function renderLesson() {
    var topic = findTopic(state.lang, state.topicId);
    var host = $('#s21code-lesson');
    if (!host) return;
    if (!topic) {
      host.innerHTML = '<p class="text-soft">Pick a topic from the list to get started.</p>';
      return;
    }
    var lang = langMeta(state.lang);
    var isRunnable = (state.lang === 'html' || state.lang === 'css' || state.lang === 'javascript');
    var topics = currentTopics();
    var idx = topics.findIndex(function (t) { return t.id === topic.id; });
    var prevTopic = idx > 0 ? topics[idx - 1] : null;
    var nextTopic = idx > -1 && idx < topics.length - 1 ? topics[idx + 1] : null;

    host.innerHTML = '' +
      '<p class="s21code-crumb text-soft small mb-2">' +
        '<i class="fa-solid fa-book-open"></i> ' + lang.name + ' Tutorial' +
        ' &nbsp;›&nbsp; Topic ' + (idx + 1) + ' of ' + topics.length +
      '</p>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap mb-2">' +
        '<span class="badge-pill" style="background:color-mix(in srgb, ' + lang.color + ' 16%, transparent);color:' + lang.color + '">' +
          '<i class="fa-solid ' + lang.icon + '"></i> ' + lang.name +
        '</span>' +
        '<span class="s21code-topic-level lvl-' + topic.level.toLowerCase() + '">' + topic.level + '</span>' +
      '</div>' +
      '<h3 class="h4 mb-3">' + esc(topic.title) + '</h3>' +
      '<p class="text-soft mb-3">' + topic.explain + '</p>' +
      '<div class="s21code-syntax-box mb-4">' +
        '<span class="s21code-syntax-label">Syntax</span>' +
        '<code>' + topic.syntax + '</code>' +
      '</div>' +
      '<div class="s21code-tryit">' +
        '<div class="s21code-tryit-head">' +
          '<span><i class="fa-solid fa-flask"></i> Try it Yourself</span>' +
          '<div class="d-flex gap-2">' +
            '<button type="button" class="btn-s21 btn-s21-outline btn-sm-s21" id="s21code-reset"><i class="fa-solid fa-rotate-left"></i> Reset</button>' +
            '<button type="button" class="btn-s21 btn-s21-primary btn-sm-s21" id="s21code-run"><i class="fa-solid fa-play"></i> Run</button>' +
          '</div>' +
        '</div>' +
        '<div class="s21code-tryit-body">' +
          '<textarea id="s21code-editor" spellcheck="false" autocapitalize="off" autocomplete="off">' + esc(topic.code) + '</textarea>' +
          (isRunnable ?
            '<iframe id="s21code-frame" title="Live preview" sandbox="allow-scripts"></iframe>' :
            '<pre id="s21code-output" class="s21code-output" aria-label="Program output"></pre>') +
        '</div>' +
      '</div>' +
      '<div class="s21code-pager">' +
        (prevTopic ?
          '<button type="button" class="s21code-pager-btn prev" data-topic="' + prevTopic.id + '"><i class="fa-solid fa-chevron-left"></i> ' + esc(prevTopic.title) + '</button>' :
          '<span></span>') +
        (nextTopic ?
          '<button type="button" class="s21code-pager-btn next" data-topic="' + nextTopic.id + '">' + esc(nextTopic.title) + ' <i class="fa-solid fa-chevron-right"></i></button>' :
          '<span></span>') +
      '</div>';

    // Auto-run once so learners see a result immediately
    runCurrent(topic);

    $('#s21code-run').addEventListener('click', function () { runCurrent(topic); });
    $('#s21code-reset').addEventListener('click', function () {
      $('#s21code-editor').value = topic.code;
      runCurrent(topic);
    });
    host.querySelectorAll('.s21code-pager-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { selectTopic(btn.getAttribute('data-topic')); });
    });
  }

  function buildPreviewDoc(lang, code) {
    if (lang === 'html') return code;
    if (lang === 'css') {
      return '<!DOCTYPE html><html><head><style>' + code + '</style></head>' +
        '<body style="font-family:Nunito,sans-serif;padding:12px"><h1>Heading</h1><p class="highlight quote box">Sample text to preview your CSS.</p>' +
        '<div class="box card tile row gallery"><div class="tile">A</div><div class="tile">B</div></div>' +
        '<button class="btn">Sample button</button></body></html>';
    }
    // javascript
    return '<!DOCTYPE html><html><head></head><body style="font-family:Nunito,sans-serif;padding:12px">' + code + '</body></html>';
  }

  function runCurrent(topic) {
    var editor = $('#s21code-editor');
    var code = editor ? editor.value : topic.code;

    if (state.lang === 'html' || state.lang === 'css' || state.lang === 'javascript') {
      var frame = $('#s21code-frame');
      if (!frame) return;
      var doc = buildPreviewDoc(state.lang, code);
      frame.srcdoc = doc;
      return;
    }

    // Python / SQL: simulated output. If the learner hasn't changed the
    // starter code, show the pre-computed sample output; otherwise let them
    // know this reference runs canned examples rather than a live interpreter.
    var out = $('#s21code-output');
    if (!out) return;
    if (code.trim() === topic.code.trim()) {
      out.textContent = topic.output || '(no output)';
    } else {
      out.textContent = '▶ Sample output shown below is for the original example.\n' +
        '  Smart21Code previews ' + langMeta(state.lang).name + ' with canned results —\n' +
        '  edit freely to explore the syntax, then try it for real in our\n' +
        '  coding course lessons with a live interpreter.\n\n' + (topic.output || '');
    }
  }

  /* ------------------------------------------------------------- events */

  function selectLang(langId) {
    state.lang = langId;
    var topics = currentTopics();
    state.topicId = topics.length ? topics[0].id : null;
    state.query = '';
    var searchInput = $('#s21code-search');
    if (searchInput) searchInput.value = '';
    renderLangTabs();
    renderSidebar();
    renderLesson();
  }

  function selectTopic(topicId) {
    state.topicId = topicId;
    renderSidebar();
    renderLesson();
    var lesson = $('#s21code-lesson');
    if (lesson && window.innerWidth < 992) {
      lesson.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function wireEvents() {
    var tabsWrap = $('#s21code-lang-tabs');
    if (tabsWrap) {
      tabsWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-lang]');
        if (btn) selectLang(btn.getAttribute('data-lang'));
      });
    }
    var sideWrap = $('#s21code-sidebar-list');
    if (sideWrap) {
      sideWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-topic]');
        if (btn) selectTopic(btn.getAttribute('data-topic'));
      });
    }
    var search = $('#s21code-search');
    if (search) {
      search.addEventListener('input', function (e) {
        state.query = e.target.value;
        renderSidebar();
      });
    }
    var expandBtn = $('#s21code-toggle');
    var section = $('#smart21code');
    if (expandBtn && section) {
      expandBtn.addEventListener('click', function () {
        var collapsed = section.classList.toggle('s21code-collapsed');
        expandBtn.innerHTML = collapsed ?
          '<i class="fa-solid fa-chevron-down"></i> Show Smart21Code' :
          '<i class="fa-solid fa-chevron-up"></i> Hide Smart21Code';
        if (!collapsed) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function init() {
    if (!$('#s21code-lang-tabs')) return;
    renderLangTabs();
    renderSidebar();
    renderLesson();
    wireEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
