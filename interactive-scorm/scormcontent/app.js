/* Course player. All markup inserted via innerHTML is authored/static (lessons.js);
   no learner-provided text is ever written into the DOM as HTML. */
(function () {
  'use strict';
  var L = window.LESSONS, N = L.length, ic = window.H.ic;
  var PATHS = {
    emp: { ids: [0, 1, 2, 3, 4, 5, 6, 8, 9], label: 'Employee', time: 'About 30 minutes', done: 'You are finished when you have completed these 9 lessons.' },
    lead: { ids: [0, 4, 7, 8], label: 'People Leader', time: 'About 15 minutes', done: 'You are finished when you have completed these 4 lessons.' }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var stage = $('#stage'), toastEl = $('#toast');
  var state = window.SCORM.readState();
  var cur = -1, io = null, endIo = null, endScroll = null, searchIdx = null, part = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pathMeta() { return PATHS[state.role] || null; }
  function pathIds() { var meta = pathMeta(); return meta ? meta.ids : []; }
  function onPath(i) { return pathIds().indexOf(i) > -1; }
  function pathComplete() { var ids = pathIds(); return ids.length > 0 && ids.every(isDone); }
  function lTitle(i) { return L[i].title; }
  function lessonMins(i) { var l = L[i]; return state.role === 'lead' && l.minsLead ? l.minsLead : l.mins; }
  function lessonGoals(i) { var l = L[i]; return state.role === 'lead' && l.goalsLead ? l.goalsLead : l.goals; }
  function roleList(role) {
    if (!state.byRole) state.byRole = { emp: [], lead: [] };
    if (!Array.isArray(state.byRole[role])) state.byRole[role] = [];
    return state.byRole[role];
  }
  function isDone(i) {
    if (state.role !== 'emp' && state.role !== 'lead') return false;
    return roleList(state.role).indexOf(i) > -1;
  }
  function pct() {
    var ids = pathIds();
    if (!ids.length) return 0;
    var done = ids.filter(isDone).length;
    return Math.round(done / ids.length * 100);
  }
  function mobile() { return window.matchMedia('(max-width: 1000px)').matches; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ------------------------------------------------------------ sidebar */
  function sliceNow(i) {
    if (isDone(i) || i !== cur) return 0;
    return part >= 25 ? part : 25;
  }
  function drawSidebar() {
    var ids = pathIds();
    var list = $('#lessons');
    list.classList.toggle('is-compact', ids.length > 0 && ids.length < 6);
    list.innerHTML = ids.length ? ids.map(function (i) {
      var slice = sliceNow(i);
      var st = isDone(i) ? ' is-done' : (slice ? ' is-part' : '');
      var sr = isDone(i) ? ' (completed)' : (slice ? ' (' + slice + '% through)' : '');
      var tickStyle = slice ? ' style="--part:' + slice + '%"' : '';
      return '<button type="button" class="lesson-link' + st + (i === cur ? ' is-current' : '') + '" data-go="' + i + '"' + (i === cur ? ' aria-current="page"' : '') + '><span class="lines" aria-hidden="true">' + ic('doc-lines') + '</span><span class="lt">' + lTitle(i) + '</span><span class="tick" aria-hidden="true"' + tickStyle + '>' + (isDone(i) ? ic('check') : '') + '</span><span class="sr">' + sr + '</span></button>';
    }).join('') : '<p class="side-empty">Choose a path on the introduction page.</p>';
    $('#plabel').textContent = pct() + '% COMPLETE';
    $('#pbar').style.width = pct() + '%';
    applySearch();
  }
  function buildSearchIdx() {
    if (searchIdx) return;
    searchIdx = L.map(function (l) {
      var doc = new DOMParser().parseFromString('<body>' + l.html('emp') + l.html('lead') + '</body>', 'text/html');
      return (l.title + ' ' + doc.body.textContent).toLowerCase();
    });
  }
  function applySearch() {
    var q = $('#search').value.trim().toLowerCase();
    if (q) buildSearchIdx();
    $('#lessons').classList.toggle('is-filtering', !!q);
    $$('.lesson-link').forEach(function (b) {
      var i = +b.dataset.go;
      b.style.display = !q || (searchIdx[i] && searchIdx[i].indexOf(q) > -1) ? '' : 'none';
    });
  }
  function scrollSlice() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (max <= 24) return 25;
    var ratio = window.scrollY / max;
    if (ratio >= 2 / 3) return 75;
    if (ratio >= 1 / 3) return 50;
    return 25;
  }
  function quizSlice(idx, total) {
    if (idx >= Math.ceil(total * 4 / 7)) return 75;
    if (idx >= Math.ceil(total * 2 / 7)) return 50;
    return 25;
  }
  function applyPart(next) {
    if (cur < 0 || isDone(cur)) return;
    part = next;
    var btn = $('.lesson-link.is-current');
    if (!btn) return;
    btn.classList.add('is-part');
    var tick = $('.tick', btn);
    if (tick) tick.style.setProperty('--part', next + '%');
    var sr = $('.sr', btn);
    if (sr) sr.textContent = ' (' + next + '% through)';
  }
  function paintPart() {
    if (cur < 0 || isDone(cur) || L[cur].completeOnQuiz) return;
    var next = scrollSlice();
    if (next !== part) applyPart(next);
  }

  /* ------------------------------------------------------------ persistence */
  function save() {
    if (cur >= 0) state.location = cur;
    window.SCORM.writeState(state, pathIds());
  }
  function markDone(i) {
    if (state.role !== 'emp' && state.role !== 'lead') return;
    if (isDone(i)) return;
    roleList(state.role).push(i);
    save(); drawSidebar();
    var ids = pathIds();
    var pos = ids.indexOf(i) + 1;
    toast(pathComplete() ? 'Course complete. Well done!' : 'Lesson ' + pos + ' complete');
  }
  var toastT;
  function toast(msg) {
    toastEl.innerHTML = ic('check-circle') + ' <span></span>';
    $('span', toastEl).textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2800);
  }

  /* ------------------------------------------------------------ views */
  function pathDone(role) {
    var ids = PATHS[role].ids;
    var list = roleList(role);
    return ids.length > 0 && ids.every(function (n) { return list.indexOf(n) > -1; });
  }
  function pathNote(meta) {
    if (!meta) return '';
    return '<div class="note"><p class="note-h">' + meta.label + ' path</p><p class="dur">' + meta.time + '. ' + meta.done + '</p><ol class="path-list">' + meta.ids.map(function (i) { return '<li>' + lTitle(i) + '</li>'; }).join('') + '</ol></div>';
  }
  function pathCard(role, icon, title, blurb) {
    var done = pathDone(role);
    return '<button type="button" class="path-card' + (done ? ' is-complete' : '') + '" data-role="' + role + '" aria-pressed="' + (state.role === role ? 'true' : 'false') + '">' +
      '<span class="path-ico" aria-hidden="true">' + ic(icon) + '</span><span class="path-copy"><b>' + title + '</b><small>' + blurb + '</small></span>' +
      (done ? '<span class="path-done">' + ic('check') + 'Completed</span>' : '') + '</button>';
  }
  function coverHTML() {
    var meta = pathMeta();
    var complete = pathComplete();
    var started = meta && meta.ids.some(isDone);
    var label = complete ? 'Restart course' : (started ? 'Resume course' : 'Start course');
    return '<section class="cover2"><header class="c-hero"><img src="assets/cover-photo.jpg" alt=""><h1>Time Tracking Compliance for<br>US Non-Exempt Employees<br>and Leaders</h1><svg class="c-wave" viewBox="0 0 1024 92" preserveAspectRatio="none" aria-hidden="true"><path fill="#f4f7fb" d="M0 31C90 58 170 78 248 76C400 72 560 46 760 28C900 16 970 12 1024 10V92H0Z"/></svg></header>' +
      '<div class="c-copy"><p class="wel">Welcome to US time tracking training!</p>' +
      '<p class="gap">This training is designed to increase awareness and understanding of time tracking responsibilities for US non-exempt employees and their leaders. The course addresses the critical business need to ensure accurate timecard submissions and approvals to comply with legal requirements under the Fair Labor Standards Act (FLSA) and Cisco&rsquo;s policies.</p>' +
      '<p>Employee learners will gain knowledge about their non-exempt status and learn how to correctly submit and modify timecards in the Workday system. Leadership learners will understand their role in reviewing, validating, and approving timecards.</p>' +
      '<p>By completing this course, employees and leaders will be equipped to perform their respective time tracking duties accurately and timely, supporting Cisco&rsquo;s commitment to legal compliance, operational efficiency, and employee well-being.</p>' +
      '<p class="dur">Choose your path</p>' +
      '<div class="path-row" role="group" aria-label="Choose your path">' +
      pathCard('emp', 'user', 'Employee', 'Track and submit your own time') +
      pathCard('lead', 'users', 'People Leader', 'Review and approve your team&rsquo;s time') + '</div>' +
      '<div id="path-detail">' + pathNote(meta) + '</div>' +
      '<button type="button" class="c-start" id="path-start" data-act="start"' + (meta ? '' : ' disabled') + '>' + label + '</button></div></section>';
  }
  function paintPathChoice() {
    var meta = pathMeta();
    var complete = pathComplete();
    var started = meta && meta.ids.some(isDone);
    var label = complete ? 'Restart course' : (started ? 'Resume course' : 'Start course');
    $$('.path-card').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-role') === state.role ? 'true' : 'false');
    });
    var slot = $('#path-detail');
    if (slot) slot.innerHTML = pathNote(meta);
    var start = $('#path-start');
    if (start) {
      start.textContent = label;
      start.disabled = !meta;
    }
    drawSidebar();
  }
  function heroHTML(i) {
    var l = L[i];
    var ids = pathIds();
    var n = ids.indexOf(i) + 1;
    var total = ids.length || N;
    return '<header class="lhero"><img class="bg" src="assets/' + l.hero + '" alt=""><div class="ghost" aria-hidden="true">' + pad2(n) + '</div><div class="lhero-in">' +
      '<span class="kicker">' + ic('layers') + ' Lesson ' + n + ' of ' + total + '</span><h1>' + l.title + '</h1><div class="meta"><span class="pill">' + ic('clock') + ' ' + lessonMins(i) + ' min</span></div>' +
      '<div class="goals-h">By the end of this lesson</div><ul class="goals">' + lessonGoals(i).map(function (g) { return '<li>' + ic('check-circle') + '<span>' + g + '</span></li>'; }).join('') + '</ul></div></header>';
  }
  function footHTML(i) {
    var ids = pathIds();
    var pos = ids.indexOf(i);
    if (pos > -1 && pos < ids.length - 1) {
      return '<button type="button" class="nextbar" data-go="' + ids[pos + 1] + '">' + ic('arrow-down') + '<span>Next lesson &mdash; ' + lTitle(ids[pos + 1]) + '</span></button>';
    }
    var wait = L[i] && L[i].completeOnQuiz && !isDone(i);
    return '<div class="endbar" id="endbar"' + (wait ? ' hidden' : '') + '>' + ic('check-circle') + '<span>You have reached the end. You can exit the course now.</span></div>';
  }
  function stopEndWatch() {
    if (endIo) { endIo.disconnect(); endIo = null; }
    if (endScroll) { window.removeEventListener('scroll', endScroll); endScroll = null; }
  }
  function endSeen(bar) {
    var r = bar.getBoundingClientRect();
    if (r.height < 8) return false;
    var vis = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return vis / r.height >= 0.6;
  }
  /* The last lesson that is not a quiz completes only after the learner scrolls
     far enough to see the closing note. Opening the lesson is not enough. */
  function watchEnd() {
    stopEndWatch();
    var bar = $('#endbar');
    if (!bar || bar.hidden || cur < 0 || isDone(cur) || L[cur].completeOnQuiz) return;
    var top = bar.getBoundingClientRect().top;
    if (top < window.innerHeight - 8) bar.style.marginTop = Math.ceil(window.innerHeight - top + 16) + 'px';
    var startY = window.scrollY;
    function finish() {
      if (window.scrollY <= startY + 8) return;
      if (cur < 0 || isDone(cur) || L[cur].completeOnQuiz) { stopEndWatch(); return; }
      if (!bar.isConnected || bar.hidden || !endSeen(bar)) return;
      stopEndWatch();
      markDone(cur);
    }
    endScroll = finish;
    window.addEventListener('scroll', finish, { passive: true });
    if ('IntersectionObserver' in window) {
      endIo = new IntersectionObserver(finish, { threshold: [0.6, 1] });
      endIo.observe(bar);
    }
  }
  function revealEnd() {
    var bar = $('#endbar');
    if (!bar || !bar.hidden) return;
    bar.hidden = false;
    bar.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }

  function show(i, noScroll) {
    if (i >= 0 && !onPath(i)) i = -1;
    cleanup();
    cur = i;
    part = (i >= 0 && !isDone(i)) ? 25 : 0;
    if (i < 0) { stage.innerHTML = coverHTML(); }
    else {
      stage.innerHTML = heroHTML(i) + '<div class="lbody">' + L[i].html(state.role) + '<div id="end" aria-hidden="true" style="height:1px"></div></div>' + footHTML(i);
      keepWords(stage);
      initWidgets(i);
      observe();
    }
    if (location.hash !== (i < 0 ? '#/cover' : '#/' + (i + 1))) { history.replaceState(null, '', i < 0 ? '#/cover' : '#/' + (i + 1)); }
    if (!noScroll) {
      var root = document.documentElement, prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      root.style.scrollBehavior = prev;
    }
    if (!reduce && !noScroll) {
      stage.classList.remove('is-entering');
      void stage.offsetWidth;
      stage.classList.add('is-entering');
    }
    if (i >= 0) save();
    drawSidebar();
    if (i >= 0 && !L[i].completeOnQuiz) paintPart();
    $('#shell').classList.toggle('is-cover', i < 0);
    if (mobile()) { $('#side').classList.remove('is-open'); $('#menu').setAttribute('aria-expanded', 'false'); }
    document.title = (i < 0 ? '' : L[i].title + ' | ') + 'Time Tracking Compliance';
    watchEnd();
  }
  function cleanup() {
    if (io) io.disconnect();
    io = null;
    stopEndWatch();
    closeZoom(true);
    $$('video').forEach(function (v) { v.pause(); });
  }
  function observe() {
    var rv = $$('.rv');
    if (!('IntersectionObserver' in window) || reduce) { rv.forEach(function (e) { e.classList.add('in'); }); return; }
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (e) { io.observe(e); });
  }

  /* ------------------------------------------------------------ widgets */
  var W = {};
  function initWidgets(i) {
    $$('[data-widget]').forEach(function (el) { var f = W[el.dataset.widget]; if (f) f(el); });
    $$('[data-video]').forEach(W.video);
    $$('[data-tabs]').forEach(W.tabs);
    $$('[data-pillars]').forEach(function (el) { W.pillars(el, L[i].data.pillars); });
    $$('[data-pipe]').forEach(function (el) { W.pipe(el, L[i].data.status); });
    $$('[data-explorer]').forEach(W.explorer);
    $$('[data-quiz]').forEach(function (el) { W.quiz(el, i); });
  }
  function setIcon(el, name, html) { el.innerHTML = ic(name) + '<span>' + html + '</span>'; keepWords(el); }
  /* Keep compound words such as "auto-populated" on one line so card text
     flows across the card instead of splitting at the hyphen. */
  function keepWords(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf('-') === -1) continue;
      node.nodeValue = node.nodeValue.replace(/([A-Za-z0-9])-([A-Za-z0-9])/g, '$1\u2011$2');
    }
  }
  function paintRange(r) {
    var min = parseFloat(r.min), max = parseFloat(r.max), v = parseFloat(r.value);
    var pct = (max > min) ? ((v - min) / (max - min)) * 100 : 0;
    r.style.setProperty('--fill', pct + '%');
  }

  /* Browsers turn an English caption track on by themselves, and they remember that
     choice for this site. Keep every narrated video's captions off until the learner
     picks a caption track from the player controls. */
  function captionsStartOff(video) {
    var tracks = video.textTracks;
    var applying = false;
    var learnerChose = false;
    var fromControls = false;

    function showing() {
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].mode === 'showing') return true;
      }
      return false;
    }
    function forceOff() {
      if (learnerChose || !showing()) return;
      applying = true;
      for (var i = 0; i < tracks.length; i++) tracks[i].mode = 'disabled';
      applying = false;
    }

    video.addEventListener('pointerdown', function () {
      fromControls = true;
      setTimeout(function () { fromControls = false; }, 800);
    });
    tracks.addEventListener('addtrack', forceOff);
    tracks.addEventListener('change', function () {
      if (applying) return;
      if (fromControls) { learnerChose = true; return; }
      forceOff();
    });
    video.addEventListener('loadedmetadata', forceOff);
    video.addEventListener('play', function () {
      fromControls = false;
      forceOff();
    });
    setTimeout(forceOff, 0);
    setTimeout(forceOff, 400);
  }

  W.video = function (el) {
    var v = $('video', el), chaps = $$('.chap', el);
    captionsStartOff(v);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-seek]'); if (!b) return;
      v.currentTime = parseFloat(b.dataset.seek); v.play();
    });
    v.addEventListener('play', function () { $$('video').forEach(function (o) { if (o !== v) o.pause(); }); });
    v.addEventListener('timeupdate', function () {
      var t = v.currentTime, on = -1;
      chaps.forEach(function (c, k) { if (t >= parseFloat(c.dataset.seek) - 0.05) on = k; });
      chaps.forEach(function (c, k) { c.classList.toggle('on', k === on); });
    });
  };

  /* Open button is depressed. Buttons the learner has already opened are marked viewed. */
  function noteSeen(list, current) {
    list.forEach(function (b) {
      var on = b === current;
      b.classList.toggle('is-open', on);
      b.classList.toggle('is-seen', !on && b.dataset.seen === '1');
    });
    if (current) current.dataset.seen = '1';
  }

  W.tabs = function (el) {
    function pick(b) {
      if (!b || b.getAttribute('aria-selected') === 'true') return;
      $$('.tab', el).forEach(function (t) {
        var on = t === b;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      $$('.tabpanel', el).forEach(function (p) {
        var on = p.dataset.p === b.dataset.t;
        if (!on) $$('video', p).forEach(function (v) { v.pause(); });
        p.hidden = !on;
        if (on) $$('video', p).forEach(function (v) {
          if (v.getAttribute('preload') === 'none') { v.preload = 'metadata'; v.load(); }
        });
      });
      if (el.classList.contains('walks')) el.setAttribute('data-tone', b.getAttribute('data-tone') || 'sky');
      else noteSeen($$('.tab', el), b);
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b || !el.contains(b)) return;
      pick(b);
    });
    el.addEventListener('keydown', function (e) {
      var b = e.target.closest('.tab'); if (!b || !el.contains(b)) return;
      var tabs = $$('.tab', el), i = tabs.indexOf(b), to = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = tabs.length - 1;
      else return;
      e.preventDefault();
      pick(tabs[to]);
      tabs[to].focus();
    });
    if (el.classList.contains('walks')) {
      $$('.tabpanel', el).forEach(function (p) {
        var v = $('video', p);
        if (!v) return;
        v.addEventListener('play', function () {
          var tab = $('.tab[data-t="' + p.dataset.p + '"]', el);
          if (tab) tab.classList.add('is-watched');
        });
      });
    } else {
      var first = $('.tab[aria-selected="true"]', el) || $('.tab', el);
      if (first) noteSeen($$('.tab', el), first);
    }
  };

  W.pillars = function (el, texts) {
    var det = $('[data-pillar-detail]');
    function pick(k) {
      var buttons = $$('.pillar', el), current = buttons[k];
      buttons.forEach(function (p, n) {
        var on = n === k;
        p.setAttribute('aria-selected', on ? 'true' : 'false');
        var sm = $('small', p);
        if (sm) sm.textContent = on ? 'Showing now' : (p.dataset.seen === '1' ? 'Viewed' : 'Click to read');
      });
      noteSeen(buttons, current);
      var h = $$('.pillar h3', el)[k].textContent;
      det.innerHTML = '<h3 style="margin:0 0 8px"></h3><p style="margin:0;max-width:none"></p>';
      $('h3', det).textContent = h; $('p', det).textContent = texts[k];
      keepWords(det);
    }
    el.addEventListener('click', function (e) { var b = e.target.closest('.pillar'); if (b) pick(+b.dataset.i); });
  };

  W.pipe = function (el, items) {
    var det = $('[data-pipe-detail]');
    function pick(k) {
      var buttons = $$('.pipe button', el);
      buttons.forEach(function (p, n) { p.setAttribute('aria-selected', n === k ? 'true' : 'false'); });
      noteSeen(buttons, buttons[k]);
      det.innerHTML = '<h3 style="margin:0 0 8px"></h3><p style="margin:0;max-width:none"></p>';
      $('h3', det).textContent = items[k].t; $('p', det).innerHTML = items[k].h;
      keepWords(det);
    }
    el.addEventListener('click', function (e) { var b = e.target.closest('.pipe button'); if (b) pick(+b.dataset.i); });
  };

  W.explorer = function (el) {
    var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], evs = el.getAttribute('data-events') === 'lead' ? window.EVENTS_LEAD : window.EVENTS, box = $('[data-days]', el), det = $('[data-ev-detail]', el);
    box.innerHTML = days.map(function (d, k) {
      var mine = evs.map(function (e, n) { return e.day === k ? '<button type="button" class="ev-btn ' + e.who + '" data-e="' + n + '" aria-pressed="false">' + e.label + '</button>' : ''; }).join('');
      return '<div class="dcol' + (mine ? '' : ' dim') + '"><span class="dn">' + d + '</span>' + mine + '</div>';
    }).join('');
    function pick(n) {
      var buttons = $$('.ev-btn', el), current = null;
      buttons.forEach(function (b) {
        var on = +b.dataset.e === n;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) current = b;
      });
      noteSeen(buttons, current);
      var e = evs[n], tag = e.who === 'lead' ? 'Leader' : e.who === 'warn' ? 'Caution' : 'Employee';
      det.innerHTML = '<span class="role-tag ' + (e.who === 'lead' ? 'lead' : e.who === 'warn' ? 'warn' : 'emp') + '">' + tag + '</span><b></b><span></span>';
      $('b', det).textContent = e.when; det.lastChild.textContent = e.h;
      keepWords(det);
    }
    box.addEventListener('click', function (ev) { var b = ev.target.closest('.ev-btn'); if (b) pick(+b.dataset.e); });
    det.innerHTML = '<span style="opacity:.8">Click a moment in the week above.</span>';
  };

  /* --- break clock --- */
  W.breakclock = function (el) {
    var r = $('input', el), val = $('[data-val]', el), bar = $('[data-bar]', el), axis = $('[data-axis]', el), ver = $('[data-verdict]', el);
    r.value = r.min;
    var SPAN = 14, rd = function (k) { return $('[data-r="' + k + '"]', el); };
    axis.innerHTML = [0, 2, 4, 6, 8, 10, 12, 14].map(function (h) { return '<span style="left:' + (h / SPAN * 100) + '%">' + h + ' h</span>'; }).join('');
    function fmt(h) { return (h % 1 ? h.toFixed(1) : h) + ' h'; }
    function draw() {
      paintRange(r);
      var h = parseFloat(r.value), marks = [];
      [4, 8].forEach(function (p) { if (h >= p) marks.push({ at: p, t: 'rest', len: 1 / 6 }); });
      if (h >= 5) marks.push({ at: 5, t: 'meal', len: .5 });
      if (h > 10) marks.push({ at: 10, t: 'meal', len: .5 });
      marks.sort(function (a, b) { return a.at - b.at; });
      var segs = [], c = 0;
      marks.forEach(function (m) { if (m.at > c) segs.push({ t: 'reg', len: m.at - c }); segs.push(m); c = m.at; });
      if (h > c) segs.push({ t: 'reg', len: h - c });
      bar.innerHTML = segs.map(function (s) { var lbl = s.t === 'meal' ? '30' : (s.t === 'rest' ? '' : (s.len >= 1.2 ? fmt(s.len) : '')); return '<div class="sg ' + s.t + '" style="width:' + (s.len / SPAN * 100) + '%" title="' + (s.t === 'meal' ? 'Meal break, 30 min unpaid' : s.t === 'rest' ? 'Rest break, 10 min paid' : 'Working') + '">' + lbl + '</div>'; }).join('');
      val.textContent = fmt(h);
      var rest = marks.filter(function (m) { return m.t === 'rest'; }).length, meals = marks.filter(function (m) { return m.t === 'meal'; }).length;
      var a = rd('rest'), b1 = rd('meal1'), b2 = rd('meal2');
      a.className = rest ? 'on' : 'off'; $('[data-rv]', a).textContent = rest ? rest + ' × 10 min' : 'Not yet';
      b1.className = meals >= 1 ? 'on warn' : 'off'; $('[data-rv]', b1).textContent = meals >= 1 ? '30 min' : 'Not yet';
      b2.className = meals >= 2 ? 'on warn' : 'off'; $('[data-rv]', b2).textContent = meals >= 2 ? '30 min' : 'Not yet';
      var msg;
      var lead = state.role === 'lead';
      if (h < 4) msg = 'Under 4 hours: no required break has been earned yet.';
      else if (h < 5) msg = lead ? 'A full 4-hour block means a 10-minute paid rest break is due. A meal break starts at 5 hours.' : 'You have worked a full 4-hour block, so a 10-minute paid rest break is due. A meal break starts at 5 hours.';
      else if (h <= 10) msg = lead ? 'Past 5 hours: a 30-minute unpaid meal break, and the employee must be completely relieved of duty. Rest breaks (10 min, paid) are due in every 4-hour block and are not entered on the timecard.' : 'Past 5 hours: a 30-minute unpaid meal break, with you completely relieved of duty. Rest breaks (10 min, paid) are due in every 4-hour block and are not entered on your timecard.';
      else msg = lead ? 'Past 10 hours: a second 30-minute meal break is also due. If a break is involuntarily missed, the employee reports it (rest: the form to you; meal: consecutive hours on the timecard).' : 'Past 10 hours: a second 30-minute meal break is also due. If any break is involuntarily missed, report it (rest: form to your leader; meal: record the hours worked on your timecard).';
      setIcon(ver, 'info', msg);
    }
    r.addEventListener('input', draw); draw();
  };

  /* --- overtime calculator --- */
  W.otcalc = function (el) {
    var r = $('input', el), val = $('[data-val]', el), bar = $('[data-bar]', el), axis = $('[data-axis]', el), ver = $('[data-verdict]', el), SPAN = 14;
    r.value = r.min;
    var rd = function (k) { return $('[data-r="' + k + '"]', el); };
    axis.innerHTML = [0, 2, 4, 6, 8, 10, 12, 14].map(function (h) { return '<span style="left:' + (h / SPAN * 100) + '%">' + h + ' h</span>'; }).join('');
    function f(h) { return (Math.round(h * 10) / 10) + ' h'; }
    function draw() {
      paintRange(r);
      var h = parseFloat(r.value), reg = Math.min(h, 8), ot = Math.max(0, Math.min(h, 12) - 8), dt = Math.max(0, h - 12), eq = reg + ot * 1.5 + dt * 2;
      var bits = [['reg', reg], ['ot', ot], ['dt', dt]].filter(function (s) { return s[1] > 0; });
      bar.innerHTML = bits.map(function (s) { return '<div class="sg ' + s[0] + '" style="width:' + (s[1] / SPAN * 100) + '%">' + (s[1] >= 1 ? f(s[1]) : '') + '</div>'; }).join('');
      val.textContent = f(h);
      [['reg', reg], ['ot', ot], ['dt', dt]].forEach(function (p) { var e = rd(p[0]); e.className = p[1] > 0 ? (p[0] === 'reg' ? 'on' : 'on warn') : 'off'; $('[data-rv]', e).textContent = f(p[1]); });
      var e2 = rd('eq'); e2.className = 'on good'; $('[data-rv]', e2).textContent = f(eq) + ' of pay';
      var kind = h <= 8 ? 'good' : (dt > 0 ? 'bad' : 'warn');
      ver.className = 'verdict ' + kind;
      var lead = state.role === 'lead';
      var msg = h <= 8
        ? (lead ? 'All of these hours are at the regular rate. Overtime still needs your approval before an employee starts, and every hour must be recorded.' : 'All of these hours are at your regular rate. Remember: any overtime needs your manager’s approval first, and every hour must still be recorded.')
        : (dt > 0
          ? (lead ? 'Hours beyond 12 in a day are paid at double time. You approve overtime before it starts, and every hour is recorded in Workday.' : 'Hours beyond 12 in a day are paid at double time. Overtime must have been pre-approved, and every hour recorded in Workday.')
          : (lead ? 'Hours beyond 8 in a day are paid at 1.5 times the regular rate. Approve overtime before the employee starts, and make sure every hour is recorded in Workday.' : 'Hours beyond 8 in a day are paid at 1.5 times your regular rate. Get your manager’s pre-approval before you start, and record every hour in Workday.'));
      setIcon(ver, kind === 'good' ? 'check-circle' : 'alert', msg);
    }
    r.addEventListener('input', draw); draw();
  };

  /* --- daily total checker --- */
  W.dayfit = function (el) {
    var s = { w: 6, t: 4 }, STD = 8, ver = $('[data-verdict]', el), fix = $('[data-fix]', el);
    function draw() {
      var tot = s.w + s.t;
      $('[data-o="w"]', el).textContent = s.w; $('[data-o="t"]', el).textContent = s.t;
      $('[data-total]', el).textContent = tot + ' h total · standard ' + STD + ' h';
      $('[data-cw]', el).textContent = s.w + ' h worked'; $('[data-ct]', el).textContent = s.t + ' h time off';
      $('[data-ct]', el).style.display = s.t ? '' : 'none'; $('[data-cw]', el).style.display = s.w ? '' : 'none';
      fix.style.display = 'none';
      if (tot > STD && s.t > 0) {
        ver.className = 'verdict bad'; fix.style.display = '';
        setIcon(ver, 'alert', 'Workday alert: ' + tot + ' hours is more than your standard ' + STD + '-hour day. Hours worked is a fact, so reduce the time off to ' + Math.max(0, STD - s.w) + ' h.');
      } else if (tot > STD) {
        ver.className = 'verdict warn';
        setIcon(ver, 'info', s.w + ' hours worked is above 8 in a day. That is overtime: it needs your manager’s pre-approval and must be recorded.');
      } else if (tot < STD) {
        ver.className = 'verdict warn';
        setIcon(ver, 'info', 'Below the standard ' + STD + ' hours. If you were scheduled to work, make sure every scheduled hour is recorded as either worked or time off.');
      } else {
        ver.className = 'verdict good';
        setIcon(ver, 'check-circle', 'Matches your standard day. Nothing for Workday to flag.');
      }
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (b) {
        var k = b.dataset.d; if (k === 'w+') s.w = Math.min(12, s.w + 1); if (k === 'w-') s.w = Math.max(0, s.w - 1);
        if (k === 't+') s.t = Math.min(8, s.t + 1); if (k === 't-') s.t = Math.max(0, s.t - 1); draw(); return;
      }
      if (e.target.closest('[data-fix]')) { s.t = Math.max(0, STD - s.w); draw(); }
    });
    draw();
  };

  /* --- coached quiz --- */
  W.quiz = function (el, lessonIdx) {
    var key = el.dataset.quiz, label = el.dataset.label, src = window.QUIZ[key], total = src.length;
    var order, qi, st;
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function start() { qi = 0; st = src.map(function () { return { tries: 0, ok: false, dead: [] }; }); order = src.map(function (q) { return q.fixed ? q.opts.slice() : shuffle(q.opts); }); draw(); }
    function dots() { return '<div class="q-dots" aria-hidden="true">' + src.map(function (_, k) { return '<i class="' + (k === qi ? 'on' : (st[k].ok ? (st[k].tries > 1 ? 'retry' : 'ok') : '')) + '"></i>'; }).join('') + '</div>'; }
    function draw() {
      if (L[lessonIdx].completeOnQuiz) applyPart(quizSlice(qi, total));
      var q = src[qi], opts = order[qi], s = st[qi], chosen = -1;
      el.innerHTML = window.H.how('pointer', 'Click', 'an answer, then press “Check answer”.', true) + '<div class="q-top"><span class="kicker">' + ic('target') + ' ' + label + (total > 1 ? ' ' + (qi + 1) + ' of ' + total : '') + '</span>' + (total > 1 ? dots() : '') + '</div>' +
        (q.title ? '<div class="kicker" style="color:#fff;opacity:.7;margin-bottom:8px">' + q.title + '</div>' : '') +
        (q.scn ? '<p class="q-scn"></p>' : '') + '<div class="q-prompt"></div><div class="opts" role="radiogroup"></div><div data-fb></div><div class="q-ctl"><button type="button" class="btn" data-check disabled>Check answer</button></div>';
      if (q.scn) $('.q-scn', el).textContent = q.scn;
      $('.q-prompt', el).textContent = q.q;
      var box = $('.opts', el);
      opts.forEach(function (o, k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.dataset.k = k;
        b.innerHTML = '<span class="k">' + String.fromCharCode(65 + k) + '</span><span></span>'; b.lastChild.textContent = o.t;
        if (s.dead.indexOf(k) > -1) { b.disabled = true; b.classList.add('wrong'); b.setAttribute('aria-label', 'Ruled out: ' + o.t); }
        box.appendChild(b);
      });
      keepWords(el);
      var check = $('[data-check]', el), fb = $('[data-fb]', el), locked = false;
      box.addEventListener('click', function (e) {
        var b = e.target.closest('.opt'); if (!b || b.disabled || locked) return;
        chosen = +b.dataset.k;
        $$('.opt', box).forEach(function (x) { x.classList.toggle('sel', x === b); x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        check.disabled = false;
      });
      check.addEventListener('click', function () {
        if (check.dataset.mode === 'next') { if (qi < total - 1) { qi++; draw(); } else { results(); } return; }
        if (check.dataset.mode === 'retry') { draw(); return; }
        if (chosen < 0) return;
        s.tries++; var o = opts[chosen], b = $('.opt[data-k="' + chosen + '"]', box);
        fb.innerHTML = '<div class="fb ' + (o.ok ? 'good' : 'bad') + '">' + ic(o.ok ? 'check-circle' : 'x-circle') + '<div><b>' + (o.ok ? 'Correct' : 'Not quite') + '</b><p></p></div></div>';
        $('p', fb).textContent = o.why;
        keepWords(fb);
        b.classList.remove('sel');
        if (o.ok) {
          s.ok = true; locked = true; b.classList.add('right'); $$('.opt', box).forEach(function (x) { x.disabled = true; });
          if (total === 1) { check.style.display = 'none'; }
          else { check.textContent = qi < total - 1 ? 'Next question' : 'See my results'; check.dataset.mode = 'next'; check.disabled = false; }
          if (total > 1) { $('.q-dots', el).outerHTML = dots(); }
        } else {
          s.dead.push(chosen); b.classList.add('wrong'); $$('.opt', box).forEach(function (x) { x.disabled = true; });
          check.textContent = 'Try again'; check.dataset.mode = 'retry'; check.disabled = false; locked = true;
        }
      });
    }
    function results() {
      var first = st.filter(function (s) { return s.ok && s.tries === 1; }).length, p = Math.round(first / total * 100);
      var head = p >= 85 ? 'Outstanding' : p >= 55 ? 'Solid, with a few to revisit' : 'Worth another look';
      var line = p >= 85 ? 'You applied the policy correctly almost every time.' : p >= 55 ? 'You got there on every question. The ones marked below needed a second try, so they are the ones to revisit.' : 'You reached the right answer on every question, with coaching. Review the marked ones, then try again for a clean run.';
      el.innerHTML = '<div class="score"><div class="ring" style="--p:' + p + '"><div><b>' + first + '/' + total + '</b><small>first try</small></div></div><h3></h3><p></p><div class="q-review">' +
        src.map(function (q, k) { var s = st[k]; return '<div>' + ic(s.tries === 1 ? 'check-circle' : 'repeat', s.tries === 1 ? 'ok' : 'rt') + '<span></span></div>'; }).join('') + '</div><div class="q-ctl" style="justify-content:center"><button type="button" class="btn ghost on-dark" data-again>' + ic('repeat') + ' Try again</button></div></div>';
      $('h3', el).textContent = head; $('.score p', el).textContent = line;
      keepWords(el);
      $$('.q-review div', el).forEach(function (d, k) { var q = src[k]; d.lastChild.textContent = (q.title || q.q) + (st[k].tries === 1 ? ' · first try' : ' · needed ' + st[k].tries + ' tries'); });
      $('[data-again]', el).addEventListener('click', start);
      if (L[lessonIdx].completeOnQuiz) { markDone(lessonIdx); revealEnd(); }
    }
    start();
  };

  /* ------------------------------------------------------------ full-size screenshots */
  var zoomReturn = null;
  function openZoom(btn) {
    var box = $('#lightbox'), img = $('#lightbox-img');
    if (!box || !img) return;
    var src = btn.getAttribute('data-full');
    var title = btn.getAttribute('data-full-title') || '';
    if (!src) return;
    img.src = src;
    img.alt = title;
    $('#lightbox-cap').textContent = title;
    zoomReturn = btn;
    box.hidden = false;
    document.body.classList.add('lightbox-open');
    if ($('#shell')) $('#shell').inert = true;
    $$('video').forEach(function (v) { v.pause(); });
    $('.lightbox-x', box).focus();
  }
  function closeZoom(silent) {
    var box = $('#lightbox');
    if (!box || box.hidden) return;
    box.hidden = true;
    $('#lightbox-img').removeAttribute('src');
    $('#lightbox-img').alt = '';
    $('#lightbox-cap').textContent = '';
    document.body.classList.remove('lightbox-open');
    if ($('#shell')) $('#shell').inert = false;
    if (!silent && zoomReturn && zoomReturn.isConnected) zoomReturn.focus();
    zoomReturn = null;
  }

  /* ------------------------------------------------------------ global events */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-zoom-close]')) { closeZoom(); return; }
    var zoomBtn = e.target.closest('[data-full]');
    if (zoomBtn) { openZoom(zoomBtn); return; }
    var g = e.target.closest('[data-go]');
    if (g) {
      if (g.classList.contains('nextbar') && cur >= 0 && !L[cur].completeOnQuiz) markDone(cur);
      show(+g.dataset.go);
      return;
    }
    var roleBtn = e.target.closest('[data-role]');
    if (roleBtn) {
      var nextRole = roleBtn.getAttribute('data-role');
      if (nextRole === 'emp' || nextRole === 'lead') {
        state.role = nextRole;
        save();
        if (cur < 0 && $('#path-detail')) paintPathChoice();
        else show(-1);
      }
      return;
    }
    if (e.target.closest('[data-act="start"]')) {
      var ids = pathIds();
      if (!ids.length) return;
      if (pathComplete()) {
        state.byRole[state.role] = roleList(state.role).filter(function (n) { return ids.indexOf(n) === -1; });
        save();
        show(ids[0]);
        return;
      }
      var dest = ids[0];
      for (var k = 0; k < ids.length; k++) { if (!isDone(ids[k])) { dest = ids[k]; break; } }
      show(dest);
      return;
    }
    var an = e.target.closest('a[href^="#l"]');
    if (an) { e.preventDefault(); var t = document.getElementById(an.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  });
  $('#search').addEventListener('input', applySearch);
  $('#searchbtn').addEventListener('click', function () {
    var box = $('#searchbox'), o = box.classList.toggle('open'); this.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (o) { $('#search').focus(); } else { $('#search').value = ''; applySearch(); }
  });
  $('#menu').addEventListener('click', function () {
    var o;
    if (mobile()) { o = $('#side').classList.toggle('is-open'); }
    else { o = $('#shell').classList.toggle('nav-off') === false; }
    this.setAttribute('aria-expanded', o ? 'true' : 'false');
  });
  function syncNav() {
    var list = $('#lessons');
    if (!list || mobile()) return;
    var maxPage = document.documentElement.scrollHeight - window.innerHeight;
    var maxList = list.scrollHeight - list.clientHeight;
    if (maxPage > 0 && maxList > 0) list.scrollTop = (window.scrollY / maxPage) * maxList;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeZoom();
  });
  window.addEventListener('scroll', function () { syncNav(); paintPart(); }, { passive: true });
  window.addEventListener('resize', paintPart);
  window.addEventListener('hashchange', function () {
    var m = /^#\/(\d+)$/.exec(location.hash);
    if (m) { var n = +m[1] - 1; if (n >= 0 && n < N && n !== cur) show(n); }
    else if (location.hash === '#/cover' && cur !== -1) show(-1);
  });

  /* ------------------------------------------------------------ boot */
  var m = /^#\/(\d+)$/.exec(location.hash), first = -1;
  if (m && +m[1] >= 1 && +m[1] <= N) first = +m[1] - 1;
  if (mobile()) { $('#menu').setAttribute('aria-expanded', 'false'); }
  drawSidebar();
  show(first, true);
})();
