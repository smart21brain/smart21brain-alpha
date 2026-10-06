/* Smart21Brain AI page — English / Kiswahili. Shares the site-wide 's21-lang' choice. */
(function () {
  'use strict';
  var KEY = 's21-lang';
  var D = {
    en: {
      skip: 'Skip to message box', new_chat: 'New chat', search_chats: 'Search chats', home: 'Smart21Brain home', clear_all: 'Clear all chats',
      open_menu: 'Open menu', close_menu: 'Close menu', toggle_side: 'Toggle sidebar', dl_chat: 'Download this chat', dl_chat_t: 'Download chat (.md)',
      toggle_theme: 'Toggle light / dark', switch_lang: 'Switch language', hello_q: 'how can I help you today?',
      welcome_sub: 'Learn any subject, get coding help, write better and test yourself.',
      mode_auto: 'Auto', mode_learn: 'Learn', mode_code: 'Code', mode_write: 'Write', mode_quiz: 'Quiz me', mode_aria: 'Mode', auto_aria: 'Auto mode',
      placeholder: 'Message Smart21brain AI…', ph_learn: 'What would you like to learn?', ph_code: 'Paste code or describe what to build…', ph_write: 'What should we write?', ph_quiz: 'Which topic should I quiz you on?',
      mic: 'Speak your question', speak: 'Speak', send: 'Send', stop: 'Stop generating', fine: 'Smart21brain AI can make mistakes, so check important answers with your teacher.',
      preview: 'Preview', close_preview: 'Close preview', to_bottom: 'Scroll to latest',
      morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening',
      today: 'Today', yesterday: 'Yesterday', prev7: 'Previous 7 days', older: 'Older',
      no_match: 'No chats match your search.', empty_hist: 'Your conversations will appear here.', del_chat: 'Delete chat',
      copy: 'Copy', edit: 'Edit', good: 'Good answer', bad: 'Bad answer', read: 'Read aloud', regen: 'Regenerate', retry: 'Try again',
      edit_msg: 'Edit message', cancel: 'Cancel', save_send: 'Save & send', copied: 'Copied', thanks: 'Thanks for the feedback', no_mic: 'Microphone not available', nothing_dl: 'Nothing to download yet',
      confirm_clear: 'Delete all your chats on this device?', unavailable: 'The assistant is unavailable right now.', conn: 'Connection problem. Check your internet and try again.', no_answer: 'I could not generate an answer. Please try again.',
      c_code: 'Code', c_editor: 'Smart21Editor', c_sent: 'Sent', c_note: 'Live preview works for HTML, CSS, JavaScript and SVG. To run this code, open it in Smart21Editor.',
      card1_t: 'Explain a topic', card1_d: 'Teach me how fractions work, with examples', card1_p: 'Teach me how fractions work with simple examples.',
      card2_t: 'Help me code', card2_d: 'Write a Python program that guesses a number', card2_p: 'Write a simple Python number guessing game and explain how it works.',
      card3_t: 'Write something', card3_d: 'A short story about a brave robot', card3_p: 'Write a short, fun story for kids about a brave little robot.',
      card4_t: 'Quiz me', card4_d: 'Test my knowledge of the solar system', card4_p: 'Quiz me on the solar system.'
    },
    sw: {
      skip: 'Ruka hadi kisanduku cha ujumbe', new_chat: 'Mazungumzo mapya', search_chats: 'Tafuta mazungumzo', home: 'Nyumbani Smart21Brain', clear_all: 'Futa mazungumzo yote',
      open_menu: 'Fungua menyu', close_menu: 'Funga menyu', toggle_side: 'Badilisha upau wa pembeni', dl_chat: 'Pakua mazungumzo haya', dl_chat_t: 'Pakua mazungumzo (.md)',
      toggle_theme: 'Badilisha mwanga / giza', switch_lang: 'Badilisha lugha', hello_q: 'nikusaidie nini leo?',
      welcome_sub: 'Jifunze somo lolote, pata msaada wa kuandika msimbo, andika vizuri na jipime.',
      mode_auto: 'Otomatiki', mode_learn: 'Jifunze', mode_code: 'Msimbo', mode_write: 'Andika', mode_quiz: 'Nijaribu', mode_aria: 'Hali', auto_aria: 'Hali ya otomatiki',
      placeholder: 'Tuma ujumbe kwa Smart21brain AI…', ph_learn: 'Ungependa kujifunza nini?', ph_code: 'Bandika msimbo au eleza unachotaka kujenga…', ph_write: 'Tuandike nini?', ph_quiz: 'Nikujaribu kwa mada gani?',
      mic: 'Sema swali lako', speak: 'Sema', send: 'Tuma', stop: 'Simamisha', fine: 'Smart21brain AI inaweza kukosea, kwa hiyo hakiki majibu muhimu na mwalimu wako.',
      preview: 'Hakiki', close_preview: 'Funga hakiki', to_bottom: 'Nenda chini kabisa',
      morning: 'Habari za asubuhi', afternoon: 'Habari za mchana', evening: 'Habari za jioni',
      today: 'Leo', yesterday: 'Jana', prev7: 'Siku 7 zilizopita', older: 'Za zamani',
      no_match: 'Hakuna mazungumzo yanayolingana na utafutaji wako.', empty_hist: 'Mazungumzo yako yataonekana hapa.', del_chat: 'Futa mazungumzo',
      copy: 'Nakili', edit: 'Hariri', good: 'Jibu zuri', bad: 'Jibu baya', read: 'Soma kwa sauti', regen: 'Zalisha upya', retry: 'Jaribu tena',
      edit_msg: 'Hariri ujumbe', cancel: 'Ghairi', save_send: 'Hifadhi na tuma', copied: 'Imenakiliwa', thanks: 'Asante kwa maoni yako', no_mic: 'Kipaza sauti hakipatikani', nothing_dl: 'Hakuna cha kupakua bado',
      confirm_clear: 'Futa mazungumzo yako yote kwenye kifaa hiki?', unavailable: 'Msaidizi hapatikani kwa sasa.', conn: 'Tatizo la mtandao. Angalia intaneti yako kisha jaribu tena.', no_answer: 'Sikuweza kutoa jibu. Tafadhali jaribu tena.',
      c_code: 'Msimbo', c_editor: 'Smart21Editor', c_sent: 'Imetumwa', c_note: 'Hakiki ya moja kwa moja inafanya kazi kwa HTML, CSS, JavaScript na SVG. Ili kuendesha msimbo huu, ufungue katika Smart21Editor.',
      card1_t: 'Eleza mada', card1_d: 'Nifundishe jinsi sehemu (visehemu) zinavyofanya kazi, kwa mifano', card1_p: 'Nifundishe jinsi visehemu vinavyofanya kazi kwa mifano rahisi. Jibu kwa Kiswahili.',
      card2_t: 'Nisaidie kuandika msimbo', card2_d: 'Andika programu ya Python inayokisia namba', card2_p: 'Andika mchezo rahisi wa Python wa kukisia namba na ueleze jinsi unavyofanya kazi. Jibu kwa Kiswahili.',
      card3_t: 'Andika kitu', card3_d: 'Hadithi fupi kuhusu roboti jasiri', card3_p: 'Andika hadithi fupi na ya kufurahisha kwa watoto kuhusu roboti mdogo jasiri. Andika kwa Kiswahili.',
      card4_t: 'Nijaribu', card4_d: 'Pima maarifa yangu kuhusu mfumo wa jua', card4_p: 'Nijaribu kuhusu mfumo wa jua. Uliza kwa Kiswahili.'
    }
  };
  var cbs = [];
  function lang() { try { return localStorage.getItem(KEY) === 'sw' ? 'sw' : 'en'; } catch (e) { return 'en'; } }
  function t(k) { var d = D[lang()]; return d[k] !== undefined ? d[k] : (D.en[k] !== undefined ? D.en[k] : k); }
  function apply() {
    var l = lang(); document.documentElement.setAttribute('lang', l);
    [].forEach.call(document.querySelectorAll('[data-ai-t]'), function (el) { el.textContent = t(el.getAttribute('data-ai-t')); });
    [].forEach.call(document.querySelectorAll('[data-ai-t-ph]'), function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-ai-t-ph'))); });
    [].forEach.call(document.querySelectorAll('[data-ai-t-aria]'), function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-ai-t-aria'))); });
    [].forEach.call(document.querySelectorAll('[data-ai-t-title]'), function (el) { el.setAttribute('title', t(el.getAttribute('data-ai-t-title'))); });
    [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) { b.textContent = l === 'en' ? 'SW' : 'EN'; b.title = l === 'en' ? 'Kiswahili' : 'English'; });
    cbs.forEach(function (f) { try { f(l); } catch (e) {} });
  }
  function set(l) { try { localStorage.setItem(KEY, l); } catch (e) {} apply(); }
  window.S21AIL = { t: t, lang: lang, set: set, apply: apply, onChange: function (f) { cbs.push(f); }, extend: function (more) { Object.keys(more || {}).forEach(function (l) { if (D[l]) Object.assign(D[l], more[l]); }); } };
})();

/* Chat-feature strings (pin / rename / share / prompt library / my style / voice chat) */
window.S21AIL.extend({
  en: {
    pinned: 'Pinned', pin: 'Pin chat', unpin: 'Unpin chat', rename: 'Rename chat', rename_ph: 'Chat name', pinned_toast: 'Pinned', unpinned_toast: 'Unpinned',
    share: 'Share or copy this chat', shared: 'Chat copied to clipboard', share_empty: 'Nothing to share yet', share_title: 'Chat with Smart21brain AI',
    prompts: 'Prompt ideas', prompts_search: 'Search prompts', prompts_empty: 'No prompts match your search.', prompts_close: 'Close prompt ideas',
    style_btn: 'My style', style_title: 'How should I answer you?', style_desc: 'Tell Smart21brain AI how you like answers. This note is added to every question. It is saved only on this device.',
    style_ph: 'e.g. I am in Form 2. Explain with simple words and one example.', style_save: 'Save', style_clear: 'Clear', style_saved: 'Saved', style_cleared: 'Cleared', style_on: 'My style is on', style_try: 'Try one:', style_close: 'Close',
    voice: 'Voice chat', voice_start: 'Tap the circle and speak', voice_listening: 'Listening…', voice_thinking: 'Thinking…', voice_speaking: 'Speaking… talk or tap to interrupt',
    voice_close: 'End voice chat', voice_no: 'Voice chat is not supported in this browser. Try Chrome or Edge.', voice_hint: 'Speak naturally. I will answer out loud, and you can interrupt me any time.', voice_err: 'I could not hear you. Tap the circle to try again.'
  },
  sw: {
    pinned: 'Zilizobandikwa', pin: 'Bandika mazungumzo', unpin: 'Ondoa kubandika', rename: 'Badilisha jina', rename_ph: 'Jina la mazungumzo', pinned_toast: 'Imebandikwa', unpinned_toast: 'Imeondolewa',
    share: 'Shiriki au nakili mazungumzo haya', shared: 'Mazungumzo yamenakiliwa', share_empty: 'Hakuna cha kushiriki bado', share_title: 'Mazungumzo na Smart21brain AI',
    prompts: 'Mawazo ya maswali', prompts_search: 'Tafuta maswali', prompts_empty: 'Hakuna swali linalolingana.', prompts_close: 'Funga mawazo ya maswali',
    style_btn: 'Mtindo wangu', style_title: 'Nikujibu vipi?', style_desc: 'Mwambie Smart21brain AI unavyopenda majibu. Maelezo haya yanaongezwa kwa kila swali. Yanahifadhiwa kwenye kifaa hiki tu.',
    style_ph: 'mf. Niko Kidato cha Pili. Eleza kwa maneno rahisi na mfano mmoja.', style_save: 'Hifadhi', style_clear: 'Futa', style_saved: 'Imehifadhiwa', style_cleared: 'Imefutwa', style_on: 'Mtindo wangu umewashwa', style_try: 'Jaribu mojawapo:', style_close: 'Funga',
    voice: 'Mazungumzo ya sauti', voice_start: 'Gusa duara kisha zungumza', voice_listening: 'Nasikiliza…', voice_thinking: 'Nafikiri…', voice_speaking: 'Naongea… zungumza au gusa kunikatiza',
    voice_close: 'Maliza mazungumzo ya sauti', voice_no: 'Mazungumzo ya sauti hayatumiki kwenye kivinjari hiki. Jaribu Chrome au Edge.', voice_hint: 'Zungumza kawaida. Nitajibu kwa sauti, na unaweza kunikatiza wakati wowote.', voice_err: 'Sikukusikia. Gusa duara ujaribu tena.'
  }
});
