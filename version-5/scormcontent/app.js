/* Course player. All markup inserted via innerHTML is authored/static (lessons.js);
   no learner-provided text is ever written into the DOM as HTML. */
(function () {
  'use strict';
  var L = window.LESSONS, N = L.length, ic = window.H.ic;
  var PATHS = {
    /* Lesson ids are positions in LESSONS (lessons.js) and are what gets saved, so they never change.
       The order of an array is the order a learner sees: for employees the Knowledge check (9)
       comes before Resources & Enablement (8). */
    emp: {
      ids: [0, 1, 2, 3, 4, 5, 6, 9, 8, 10], label: 'Employee', time: 'About 30 minutes', done: 'You are finished when you have completed every lesson and submitted the acknowledgement at the end of this path.',
      /* Numbered lessons ("Lesson N of M"): Introduction & Purpose through the Knowledge check. A grouped lesson is
         listed by its first id. Resources & Enablement and the Acknowledgement are not lessons and are not numbered. */
      counted: [0, 1, 4, 5, 6, 9],
      /* Mockup v4: Who / Where / Why are three topics of ONE lesson. Each topic keeps its own page, lesson id,
         saved progress and #/n address; only the way they are shown (sidebar, header, numbering) is grouped. */
      groups: [{ ids: [1, 2, 3], title: 'Time Tracking: Who, Where, and Why?', icons: ['users', 'laptop', 'scale'] }]
    },
    lead: { ids: [0, 4, 7, 8, 10], counted: [0, 4, 7], label: 'People Leader', time: 'About 12 minutes', done: 'You are finished when you have completed every lesson and submitted the acknowledgement at the end of this path.' }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var stage = $('#stage');
  var state = window.SCORM.readState();
  var cur = -1, io = null, endIo = null, endScroll = null, part = 0, ccWant = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pathMeta() { return PATHS[state.role] || null; }
  function pathIds() { var meta = pathMeta(); return meta ? meta.ids : []; }
  function onPath(i) { return pathIds().indexOf(i) > -1; }
  function pathComplete() { var ids = pathIds(); return ids.length > 0 && ids.every(isDone); }
  function lTitle(i) { var l = L[i]; return state.role === 'lead' && l.titleLead ? l.titleLead : l.title; }
  /* Grouped lessons (see PATHS.emp.groups). A lesson is a "unit" in the sidebar and in "Lesson N of M":
     an ungrouped lesson is one unit, a group is one unit. */
  function groupOf(i) {
    var meta = pathMeta(), gs = (meta && meta.groups) || [];
    for (var k = 0; k < gs.length; k++) { if (gs[k].ids.indexOf(i) > -1) return gs[k]; }
    return null;
  }
  function units() { return pathIds().filter(function (i) { var g = groupOf(i); return !g || g.ids[0] === i; }); }
  /* Only the lessons listed in PATHS[role].counted are numbered. lessonNo() is 0 for the others. */
  function countedUnits() {
    var meta = pathMeta(), list = (meta && meta.counted) || [];
    return units().filter(function (i) { return list.indexOf(i) > -1; });
  }
  function lessonNo(i) { var g = groupOf(i); return countedUnits().indexOf(g ? g.ids[0] : i) + 1; }
  function goalsOf(g) {
    var out = [];
    g.ids.forEach(function (id) { lessonGoals(id).forEach(function (t) { if (out.indexOf(t) === -1) out.push(t); }); });
    return out;
  }
  /* A group is open in the sidebar once the learner has reached it, and stays open after that. */
  var seenGroups = {};
  function groupReached(g) {
    if (g.ids.indexOf(cur) > -1 || g.ids.indexOf(state.location) > -1 || seenGroups[g.ids[0]]) return true;
    var ids = pathIds();
    return ids.slice(ids.indexOf(g.ids[0])).some(isDone);
  }
  /* The acknowledgement (both paths) stays locked until every other lesson on the learner's path has been
     reviewed (see reviewed() below: at least 80% of the lesson seen, every tab opened, Knowledge check answered).
     Because the rule is applied to each lesson, skipping one lesson cannot be made up by finishing the others. */
  function ackBlocked() {
    return pathIds().some(function (i) { return !L[i].completeOnAck && !isDone(i); });
  }
  function groupMins(g) { return g.ids.reduce(function (s, i) { return s + L[i].mins; }, 0); }
  function groupDone(g) { return g.ids.every(isDone); }
  function groupOpen(g) {
    if (g.ids.indexOf(cur) > -1) return cur;
    for (var k = 0; k < g.ids.length; k++) { if (!isDone(g.ids[k])) return g.ids[k]; }
    return g.ids[0];
  }
  /* Progress of a group, 0-100: finished topics count in full, the topic being read counts its slice. */
  function groupPart(g) {
    var sum = 0;
    g.ids.forEach(function (i) { sum += isDone(i) ? 100 : sliceNow(i); });
    return Math.round(sum / g.ids.length);
  }
  function holdsGate(i) { return !!(L[i] && (L[i].completeOnQuiz || L[i].completeOnAck)); }
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
    if (L[i].completeOnAck && ackBlocked()) return 0;
    return part >= 25 ? part : 25;
  }
  function lessonLinkHTML(o) {
    var st = o.done ? ' is-done' : (o.slice ? ' is-part' : '');
    var sr = o.done ? ' (completed)' : (o.slice ? ' (' + o.slice + '% through)' : '');
    var tickStyle = o.slice ? ' style="--part:' + o.slice + '%"' : '';
    return '<button type="button" class="' + o.cls + st + (o.current ? ' is-current' : '') + '" data-go="' + o.go + '"' + (o.ids ? ' data-ids="' + o.ids + '"' : '') + (o.expanded != null ? ' aria-expanded="' + o.expanded + '"' : '') + (o.page ? ' aria-current="page"' : '') + '>' + o.lead +
      '<span class="lt">' + o.title + '</span><span class="tick" aria-hidden="true"' + tickStyle + '>' + (o.done ? ic('check') : '') + '</span><span class="sr">' + sr + '</span></button>';
  }
  function drawSidebar() {
    var ids = pathIds();
    var list = $('#lessons');
    list.classList.toggle('is-compact', ids.length > 0 && ids.length < 6);
    list.innerHTML = ids.length ? units().map(function (i) {
      var g = groupOf(i);
      if (!g) {
        var slice = sliceNow(i);
        return lessonLinkHTML({ cls: 'lesson-link', go: i, done: isDone(i), slice: slice, current: i === cur, page: i === cur, title: lTitle(i), lead: '<span class="lines" aria-hidden="true">' + ic('doc-lines') + '</span>' });
      }
      /* A grouped lesson: the lesson row, then its topics (each with its icon and its own tick). */
      var inGroup = g.ids.indexOf(cur) > -1, gp = groupPart(g), all = groupDone(g), open = groupReached(g);
      var parent = lessonLinkHTML({ cls: 'lesson-link is-parent', go: groupOpen(g), ids: g.ids.join(','), expanded: open, done: all, slice: all ? 0 : (inGroup || g.ids.some(isDone) ? gp : 0), current: inGroup, page: false, title: g.title, lead: '<span class="lines" aria-hidden="true">' + ic('doc-lines') + '</span>' });
      var subs = g.ids.map(function (id, k) {
        return lessonLinkHTML({ cls: 'sub-link', go: id, done: isDone(id), slice: sliceNow(id), current: id === cur, page: id === cur, title: L[id].title, lead: '<span class="si" aria-hidden="true">' + ic(g.icons[k]) + '</span>' });
      }).join('');
      return parent + '<div class="sub-list' + (open ? '' : ' is-collapsed') + '" data-ids="' + g.ids.join(',') + '">' + subs + '</div>';
    }).join('') : '<p class="side-empty">Choose a path on the introduction page.</p>';
    $('#plabel').textContent = pct() + '% COMPLETE';
    $('#pbar').style.width = pct() + '%';
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
    var g = groupOf(cur);
    paintTick(g ? $('.sub-link.is-current') : $('.lesson-link.is-current'), next);
    if (g) paintTick($('.lesson-link.is-parent.is-current'), groupPart(g));
  }
  function paintTick(btn, p) {
    if (!btn) return;
    btn.classList.add('is-part');
    var tick = $('.tick', btn);
    if (tick) tick.style.setProperty('--part', p + '%');
    var sr = $('.sr', btn);
    if (sr) sr.textContent = ' (' + p + '% through)';
  }
  function paintPart() {
    if (cur < 0 || isDone(cur) || holdsGate(cur)) return;
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
    if (!onPath(i) || isDone(i)) return;
    if (L[i].completeOnAck && ackBlocked()) return;
    roleList(state.role).push(i);
    save(); drawSidebar();
  }
  /* Submitting the acknowledgement completes the acknowledgement lesson only.
     Every other lesson is completed by the learner reviewing that lesson. */

  /* ---- what "reviewing a lesson" means ----
     A lesson (other than the Knowledge check and the Acknowledgement) counts as reviewed when the learner has
       1. seen at least REVIEW_DEPTH of the page (scrolled that far down), and
       2. opened every tab, pillar and stage in it (content that stays hidden until it is clicked).
     The Knowledge check counts when every question has been answered (see W.quiz).
     What was seen is remembered for the session, so a learner can come back to a lesson and finish it.
     The threshold is never shown to the learner. */
  var REVIEW_DEPTH = 0.8, reviewMem = {}, reviewTimer = null;
  function memOf(i) { return reviewMem[i] || (reviewMem[i] = { depth: 0, tabs: {} }); }
  function reviewItems() { return $$('[data-tabs] .tab, [data-pillars] .pillar, [data-pipe] .pipe button', stage); }
  function noteDepth() {
    var m = memOf(cur), doc = document.documentElement;
    if (!(doc.scrollHeight > 0)) return;
    var d = (window.scrollY + window.innerHeight) / doc.scrollHeight;
    if (d > m.depth) m.depth = d;
  }
  /* A page that fits on the screen cannot be scrolled, so having it open is having seen all of it. */
  function noteShortPage() {
    var doc = document.documentElement;
    if (doc.scrollHeight - window.innerHeight <= 24) memOf(cur).depth = 1;
  }
  /* Remember every item that is open right now (a tab list opens with its first tab showing). */
  function scanItems() {
    if (cur < 0) return;
    var m = memOf(cur);
    reviewItems().forEach(function (b, n) { if (b.getAttribute('aria-selected') === 'true') m.tabs[n] = true; });
  }
  function checkReviewed() {
    if (cur < 0 || !onPath(cur) || holdsGate(cur) || isDone(cur)) return;
    scanItems();
    var m = memOf(cur), items = reviewItems();
    if (m.depth < REVIEW_DEPTH) return;
    for (var n = 0; n < items.length; n++) { if (!m.tabs[n]) return; }
    markDone(cur);
  }
  /* Nothing counts until the page has settled: while images and videos are still loading the page is shorter
     than it will be, and the same scroll position would look further down than it is. */
  var reviewReady = false;
  function onReviewScroll() { if (!reviewReady || cur < 0 || holdsGate(cur) || isDone(cur)) return; noteDepth(); checkReviewed(); }
  function settleReview() { if (!reviewReady || cur < 0 || holdsGate(cur) || isDone(cur)) return; noteShortPage(); noteDepth(); checkReviewed(); }
  /* Opening a tab, pillar or stage changes aria-selected. */
  if (window.MutationObserver) {
    new MutationObserver(function () { checkReviewed(); }).observe(stage, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
  }
  /* ------------------------------------------------------------ views */
  function pathDone(role) {
    var ids = PATHS[role].ids;
    var list = roleList(role);
    return ids.length > 0 && ids.every(function (n) { return list.indexOf(n) > -1; });
  }
  function pathNote(meta) {
    if (!meta) return '';
    return '<div class="note"><p class="note-h">' + meta.label + ' Path</p><p class="dur">' + meta.time + '. ' + meta.done + '</p><ol class="path-list">' + units().map(function (i) {
      var g = groupOf(i);
      if (!g) return '<li>' + lTitle(i) + '</li>';
      return '<li>' + g.title + '<ul class="path-sub">' + g.ids.map(function (id) { return '<li>' + L[id].title + '</li>'; }).join('') + '</ul></li>';
    }).join('') + '</ol></div>';
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
      '<div class="c-copy">' +
      '<p class="wel">Welcome to US time tracking training!</p>' +
      '<p class="gap">This training is designed to increase awareness and understanding of time tracking responsibilities for US non-exempt employees and their leaders. The course addresses the critical business need to ensure accurate timecard submissions and approvals to comply with legal requirements under the Fair Labor Standards Act (FLSA) and Cisco&rsquo;s policies.</p>' +
      '<p>Employee learners will gain knowledge about their non-exempt status and learn how to correctly submit and modify timecards in the Workday system. People Leaders will understand their role in reviewing, validating, and approving timecards.</p>' +
      '<p>By completing this course, employees and leaders will be equipped to perform their respective time tracking duties accurately and timely, supporting Cisco&rsquo;s commitment to legal compliance, operational efficiency, and employee well-being.</p>' +
      '<p class="dur">Choose your path:</p>' +
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
  function heroKicker(i) {
    var n = lessonNo(i);
    if (n) return 'Lesson ' + n + ' of ' + countedUnits().length;
    return L[i].kicker || 'Section';
  }
  /* Header of a topic inside a grouped lesson: the lesson name stays constant and a trail shows the topics. */
  function trailHTML(g) {
    return '<div class="trail" role="group" aria-label="Topics in this lesson">' + g.ids.map(function (id, k) {
      var here = id === cur, done = isDone(id);
      var cls = here ? 'cur' : (done ? 'done' : 'next');
      var sr = here ? ' (you are here)' : (done ? ' (completed)' : '');
      return '<div class="tnode ' + cls + '"' + (here ? ' aria-current="step"' : '') + '><span class="dot" aria-hidden="true">' + (done && !here ? ic('check') : ic(g.icons[k])) + '</span><span>' + L[id].title + '<span class="sr">' + sr + '</span></span></div>' +
        (k < g.ids.length - 1 ? '<i class="tline' + (done ? ' on' : '') + '" aria-hidden="true"></i>' : '');
    }).join('') + '</div>';
  }
  function topicHTML(i, g) {
    return '<div class="topic"><span class="ti" aria-hidden="true">' + ic(g.icons[g.ids.indexOf(i)]) + '</span><h2>' + L[i].title + '</h2></div>';
  }
  function heroHTML(i) {
    var l = L[i];
    var n = lessonNo(i);
    var g = groupOf(i);
    /* Only numbered lessons carry the large ghost number. */
    var ghost = n ? '<div class="ghost" aria-hidden="true">' + pad2(n) + '</div>' : '';
    if (g) {
      /* Same banner as every other lesson (same padding, title size and "By the end of this lesson" panel),
         with the topic trail where the other banners show the minutes pill. */
      return '<header class="lhero is-bar"><img class="bg" src="assets/' + l.hero + '" alt="">' + ghost + '<div class="lhero-in">' +
        '<span class="kicker">' + ic('layers') + ' ' + heroKicker(i) + '<span class="kmins">' + groupMins(g) + ' min</span></span><h1>' + g.title + '</h1>' + trailHTML(g) +
        '<div class="goals-h">By the end of this lesson</div><ul class="goals">' + goalsOf(g).map(function (t) { return '<li>' + ic('check-circle') + '<span>' + t + '</span></li>'; }).join('') + '</ul></div></header>';
    }
    return '<header class="lhero"><img class="bg" src="assets/' + l.hero + '" alt="">' + ghost + '<div class="lhero-in">' +
      '<span class="kicker">' + ic('layers') + ' ' + heroKicker(i) + '</span><h1>' + lTitle(i) + '</h1><div class="meta"><span class="pill">' + ic('clock') + ' ' + lessonMins(i) + ' min</span></div>' +
      '<div class="goals-h">By the end of this lesson</div><ul class="goals">' + lessonGoals(i).map(function (g) { return '<li>' + ic('check-circle') + '<span>' + g + '</span></li>'; }).join('') + '</ul></div></header>';
  }
  /* "Previous" bar at the top of a lesson: same markup and styling as the "Next" bar at the end. */
  function backHTML(i) {
    var ids = pathIds();
    var pos = ids.indexOf(i);
    if (pos < 1) return '';
    var g = groupOf(i), sameGroup = g && g.ids.indexOf(ids[pos - 1]) > -1;
    return '<button type="button" class="nextbar prevbar" data-go="' + ids[pos - 1] + '">' + ic('arrow-up') + '<span>' + (sameGroup ? 'Previous topic' : 'Previous lesson') + ' &mdash; ' + lTitle(ids[pos - 1]) + '</span></button>';
  }
  function footHTML(i) {
    var ids = pathIds();
    var pos = ids.indexOf(i);
    if (pos > -1 && pos < ids.length - 1) {
      var g = groupOf(i), sameGroup = g && g.ids.indexOf(ids[pos + 1]) > -1;
      return '<button type="button" class="nextbar" data-go="' + ids[pos + 1] + '">' + ic('arrow-down') + '<span>' + (sameGroup ? 'Next topic' : 'Next lesson') + ' &mdash; ' + lTitle(ids[pos + 1]) + '</span></button>';
    }
    var wait = holdsGate(i) && !isDone(i);
    return '<div class="endbar" id="endbar"' + (wait ? ' hidden' : '') + '>' + ic('check-circle') + '<span>' + endText() + '</span>' +
      '<button type="button" class="endbar-exit" data-exit' + (pathComplete() ? '' : ' hidden') + '>' + ic('log-out') + 'Exit course</button></div>';
  }
  /* The acknowledgement completes only itself, so the closing note must not
     tell a learner to exit while other lessons on the path are still open. */
  function endText() {
    return pathComplete()
      ? 'You have reached the end. You can exit the course now.'
      : 'Acknowledgement submitted. Go back and finish the remaining lessons to complete the course.';
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
    if (!bar || bar.hidden || cur < 0 || isDone(cur) || holdsGate(cur)) return;
    var top = bar.getBoundingClientRect().top;
    if (top < window.innerHeight - 8) bar.style.marginTop = Math.ceil(window.innerHeight - top + 16) + 'px';
    var startY = window.scrollY;
    function finish() {
      if (window.scrollY <= startY + 8) return;
      if (cur < 0 || isDone(cur) || holdsGate(cur)) { stopEndWatch(); return; }
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
    var msg = $('span', bar);
    if (msg) msg.textContent = endText();
    var exitBtn = $('.endbar-exit', bar);
    if (exitBtn) exitBtn.hidden = !pathComplete();
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
      var grp = groupOf(i);
      if (grp) seenGroups[grp.ids[0]] = true;
      stage.innerHTML = backHTML(i) + heroHTML(i) + '<div class="lbody">' + (grp ? topicHTML(i, grp) : '') + L[i].html(state.role) + '<div id="end" aria-hidden="true" style="height:1px"></div></div>' + footHTML(i);
      keepWords(stage);
      initWidgets(i);
      scanItems();
      observe();
      spyTabs();
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
    if (i >= 0 && !holdsGate(i)) paintPart();
    $('#shell').classList.toggle('is-cover', i < 0);
    if (mobile()) { $('#side').classList.remove('is-open'); $('#menu').setAttribute('aria-expanded', 'false'); }
    document.title = (i < 0 ? '' : lTitle(i) + ' | ' + (groupOf(i) ? groupOf(i).title + ' | ' : '')) + 'Time Tracking Compliance';
    watchEnd();
    /* Let images and videos settle, then see whether the page needs scrolling at all. */
    reviewTimer = setTimeout(function () { reviewReady = true; settleReview(); }, 900);
  }
  /* Section tabs: mark the tab of the section currently being read.
     Every tab uses the same Cisco Cyan (set in styles.css). */
  var spyOff = null;
  function spyTabs() {
    var nav = $('.jump');
    if (!nav) return;
    var tabs = $$('a[href^="#l"]', nav).map(function (a) {
      var s = document.getElementById(a.getAttribute('href').slice(1));
      return { a: a, s: s };
    }).filter(function (t) { return t.s; });
    if (!tabs.length) return;
    var ticking = false, last = -2;
    function update() {
      ticking = false;
      var line = nav.getBoundingClientRect().bottom + 12, k = -1;
      tabs.forEach(function (t, n) { if (t.s.getBoundingClientRect().top <= line) k = n; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) k = tabs.length - 1;
      if (k === last) return;
      last = k;
      tabs.forEach(function (t, n) {
        t.a.classList.toggle('on', n === k);
        if (n === k) t.a.setAttribute('aria-current', 'true'); else t.a.removeAttribute('aria-current');
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    spyOff = function () { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
    update();
  }
  function cleanup() {
    if (spyOff) { spyOff(); spyOff = null; }
    if (io) io.disconnect();
    io = null;
    clearTimeout(reviewTimer);
    reviewReady = false;
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
    $$('[data-ack]').forEach(function (el) { W.ack(el, i); });
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

  /* Captions for the videos. The cues ship inside videos.js, so they do not
     depend on fetching a .vtt file (browsers block that when the course is opened
     from disk), and the player draws them itself, so they also show in full screen.
     The CC button and the player's own CC menu drive the same text track, and one
     choice applies to every video. */
  function bindCaptions(el, video, id) {
    var btn = $('.cc-btn', el);
    var key = String(id).replace(/\.mp4$/, '');
    var cues = (window.VIDEOS && window.VIDEOS[key] && window.VIDEOS[key].captions) || [];
    if (!btn || !cues.length || !video.addTextTrack || !window.VTTCue) return;
    var track = video.addTextTrack('captions', 'English', 'en');
    cues.forEach(function (c) { track.addCue(new VTTCue(c[0], c[1], c[2])); });
    function paintBtn() {
      btn.setAttribute('aria-pressed', ccWant ? 'true' : 'false');
      btn.setAttribute('aria-label', ccWant ? 'Turn captions off' : 'Turn captions on');
      var word = $('.cc-word', btn);
      if (word) word.textContent = ccWant ? 'On' : 'Off';
      btn.classList.toggle('is-on', ccWant);
    }
    function apply() {
      var mode = ccWant ? 'showing' : 'hidden';
      if (track.mode !== mode) track.mode = mode;
      paintBtn();
    }
    function spread() {
      $$('[data-video] video').forEach(function (v) { if (v.__applyCc) v.__applyCc(); });
    }
    video.__applyCc = apply;
    btn.addEventListener('click', function () { ccWant = !ccWant; spread(); });
    /* A choice made in the player's own CC menu counts as the learner's choice. */
    video.textTracks.addEventListener('change', function () {
      var shown = track.mode === 'showing';
      if (shown !== ccWant) { ccWant = shown; spread(); }
    });
    apply();
  }

  W.video = function (el) {
    var v = $('video', el), chaps = $$('.chap', el);
    bindCaptions(el, v, el.dataset.video);
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
        var cue = $('.cue-label', t);
        if (cue) {
          var replay = !on && t.classList.contains('is-watched');
          t.classList.toggle('is-replay', replay);
          cue.textContent = on ? 'Playing below' : (replay ? 'Watch again' : 'Watch next');
        }
      });
      $$('.tabpanel', el).forEach(function (p) {
        var on = p.dataset.p === b.dataset.t;
        if (!on) $$('video', p).forEach(function (v) { v.pause(); });
        p.hidden = !on;
        if (on) $$('video', p).forEach(function (v) {
          if (v.getAttribute('preload') === 'none') { v.preload = 'metadata'; v.load(); }
        });
      });
      if (el.classList.contains('walks')) {
        el.setAttribute('data-tone', b.getAttribute('data-tone') || 'sky');
        $$('.walk-note', el).forEach(function (n) {
          var on = n.dataset.note === b.dataset.t;
          n.hidden = !on;
          if (on) $$('.rv', n).forEach(function (e) { e.classList.add('in'); });
        });
      } else noteSeen($$('.tab', el), b);
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
      if (!moved) { ver.hidden = true; return; }
      ver.hidden = false;
      var msg;
      var lead = state.role === 'lead';
      if (h < 4) msg = 'Under 4 hours: no required break has been earned yet.';
      else if (h < 5) msg = lead ? 'A full 4-hour block means a 10-minute paid rest break is due. A meal break starts at 5 hours.' : 'You have worked a full 4-hour block, so a 10-minute paid rest break is due. A meal break starts at 5 hours.';
      else if (h <= 10) msg = lead ? 'Past 5 hours: a 30-minute unpaid meal break, and the employee must be completely relieved of duty. Rest breaks (10 min, paid) are due in every 4-hour block and are not entered on the timecard.' : 'Past 5 hours: a 30-minute unpaid meal break, with you completely relieved of duty. Rest breaks (10 min, paid) are due in every 4-hour block and are not entered on your timecard.';
      else msg = lead ? 'Past 10 hours: a second 30-minute meal break is also due. If a break is involuntarily missed, the employee reports it (rest: the form to you; meal: consecutive hours on the timecard).' : 'Past 10 hours: a second 30-minute meal break is also due. If any break is involuntarily missed, report it (rest: follow the steps in the Help Zone article below; meal: record the hours worked on your timecard).';
      setIcon(ver, 'info', msg);
    }
    var moved = false;
    r.addEventListener('input', function () { moved = true; draw(); });
    draw();
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
      if (!moved) { ver.hidden = true; return; }
      ver.hidden = false;
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
    var moved = false;
    r.addEventListener('input', function () { moved = true; draw(); });
    draw();
  };

  W.ack = function (el, lessonIdx) {
    var box = $('[data-ack-box]', el);
    var btn = $('[data-ack-submit]', el);
    if (!box || !btn) return;
    el.addEventListener('submit', function (e) { e.preventDefault(); });
    function submitted() {
      box.checked = true;
      box.disabled = true;
      btn.disabled = true;
      btn.textContent = 'Acknowledgement submitted';
    }
    if (isDone(lessonIdx)) { submitted(); return; }
    /* Both paths: the acknowledgement stays locked until every lesson has been reviewed.
       The message deliberately gives no percentage and no list of lessons. */
    if (ackBlocked()) {
      var note = document.createElement('p');
      note.className = 'ack-lock';
      note.setAttribute('role', 'status');
      note.innerHTML = ic('lock') + '<span>Please go through the entire course to enable the acknowledgement.</span>';
      el.appendChild(note);
      box.disabled = true;
      btn.disabled = true;
      return;
    }
    box.addEventListener('change', function () { btn.disabled = !box.checked; });
    btn.addEventListener('click', function () {
      if (!box.checked || ackBlocked()) return;
      submitted();
      markDone(lessonIdx);
      revealEnd();
    });
  };

  /* --- coached quiz ---
     A quiz of one question (Quick Check) and the shorter in-lesson checks keep the coached flow: answer, get feedback,
     try again until correct. The Knowledge check ("open" mode) has no such gate: the learner can move back and forth
     across all seven questions and move on even after a wrong answer. Results unlock once every question has been
     answered at least once. */
  W.quiz = function (el, lessonIdx) {
    var key = el.dataset.quiz, label = el.dataset.label, src = window.QUIZ[key], total = src.length;
    var open = !!L[lessonIdx].completeOnQuiz && total > 1;
    var order, qi, st;
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function start() { qi = 0; st = src.map(function () { return { tries: 0, ok: false, dead: [], fb: null }; }); order = src.map(function (q) { return q.fixed ? q.opts.slice() : shuffle(q.opts); }); draw(); }
    function pending() { var out = []; st.forEach(function (s, k) { if (!s.tries) out.push(k + 1); }); return out; }
    function dots() {
      if (open) {
        return '<div class="q-dots is-nav" role="group" aria-label="Go to a question">' + src.map(function (_, k) {
          var s = st[k];
          var status = s.ok ? (s.tries > 1 ? 'retry' : 'ok') : (s.tries ? 'miss' : '');
          var words = s.ok ? (s.tries > 1 ? 'answered correctly after another try' : 'answered correctly') : (s.tries ? 'answered, not yet correct' : 'not answered yet');
          return '<button type="button" class="q-dot ' + (k === qi ? 'on ' : '') + status + '" data-q="' + k + '" aria-label="Question ' + (k + 1) + ' of ' + total + ', ' + words + '"' + (k === qi ? ' aria-current="step"' : '') + '>' + (k + 1) + '</button>';
        }).join('') + '</div>';
      }
      return '<div class="q-dots" aria-hidden="true">' + src.map(function (_, k) { return '<i class="' + (k === qi ? 'on' : (st[k].ok ? (st[k].tries > 1 ? 'retry' : 'ok') : '')) + '"></i>'; }).join('') + '</div>';
    }
    function draw(focus) {
      if (L[lessonIdx].completeOnQuiz) applyPart(quizSlice(qi, total));
      var q = src[qi], opts = order[qi], s = st[qi], chosen = -1;
      var ctl = open
        ? '<div class="q-ctl is-open"><button type="button" class="btn q-nav" data-prev' + (qi === 0 ? ' disabled' : '') + '>' + ic('arrow-left') + ' Previous</button><button type="button" class="btn" data-check disabled>Check answer</button><button type="button" class="btn q-nav q-next" data-next></button></div><p class="q-hint" data-hint aria-live="polite"></p>'
        : '<div class="q-ctl"><button type="button" class="btn" data-check disabled>Check answer</button></div>';
      el.innerHTML = window.H.how('pointer', 'Click', 'an answer, then press “Check answer”.', true) + '<div class="q-top"><span class="kicker">' + ic('target') + ' ' + label + (total > 1 ? ' ' + (qi + 1) + ' of ' + total : '') + '</span>' + (total > 1 ? dots() : '') + '</div>' +
        (q.title ? '<div class="kicker" style="color:#fff;opacity:.7;margin-bottom:8px">' + q.title + '</div>' : '') +
        (q.scn ? '<p class="q-scn"></p>' : '') + '<div class="q-prompt"></div><div class="opts" role="radiogroup"></div><div data-fb></div>' + ctl;
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
      function showFb(ok, why) {
        fb.innerHTML = '<div class="fb ' + (ok ? 'good' : 'bad') + '">' + ic(ok ? 'check-circle' : 'x-circle') + '<div><b>' + (ok ? 'Correct' : 'Not quite') + '</b><p></p></div></div>';
        $('p', fb).textContent = why;
        keepWords(fb);
      }
      var nextB = $('[data-next]', el), prevB = $('[data-prev]', el), hint = $('[data-hint]', el);
      function paintOpen() {
        var left = pending(), last = qi === total - 1;
        nextB.innerHTML = (last ? 'See my results ' : 'Next question ') + ic('arrow-right');
        nextB.disabled = last && left.length > 0;
        /* Check answer is the bright button while a question is open; once it is answered correctly, Next takes over. */
        nextB.classList.toggle('q-go', s.ok);
        nextB.classList.toggle('q-nav', !s.ok);
        hint.textContent = last && left.length
          ? 'Answer every question to see your results. Still to answer: ' + left.join(', ') + '. Use the numbers above to go back to any question.'
          : (total - left.length) + ' of ' + total + ' answered. Use Previous, Next or the numbers above to move between questions.';
      }
      if (open) {
        /* Coming back to a question: show the answer the learner already gave. */
        if (s.ok) {
          $$('.opt', box).forEach(function (x) { x.disabled = true; if (opts[+x.dataset.k].ok) { x.classList.add('right'); x.setAttribute('aria-checked', 'true'); } });
          locked = true; check.style.display = 'none';
        }
        if (s.fb) showFb(s.fb.ok, s.fb.why);
        prevB.addEventListener('click', function () { if (qi > 0) { qi--; draw(true); } });
        nextB.addEventListener('click', function () { if (qi < total - 1) { qi++; draw(true); } else if (!pending().length) { results(); } });
        paintOpen();
      }
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
        showFb(o.ok, o.why);
        b.classList.remove('sel');
        if (open) {
          s.fb = { ok: o.ok, why: o.why };
          if (o.ok) {
            s.ok = true; locked = true; b.classList.add('right'); $$('.opt', box).forEach(function (x) { x.disabled = true; });
            check.style.display = 'none';
          } else {
            /* A wrong answer does not block anything: the option is ruled out, the others stay open, and the learner may move on. */
            s.dead.push(chosen); b.classList.add('wrong'); b.disabled = true; b.setAttribute('aria-checked', 'false'); b.setAttribute('aria-label', 'Ruled out: ' + o.t);
            chosen = -1; check.disabled = true;
          }
          $('.q-dots', el).outerHTML = dots();
          paintOpen();
          return;
        }
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
      if (focus) { var pr = $('.q-prompt', el); pr.tabIndex = -1; pr.focus({ preventScroll: true }); }
    }
    function results() {
      var first = st.filter(function (s) { return s.ok && s.tries === 1; }).length, right = st.filter(function (s) { return s.ok; }).length, p = Math.round(first / total * 100);
      var head = p >= 85 ? 'Outstanding' : p >= 55 ? 'Solid, with a few to revisit' : 'Worth another look';
      var line = p >= 85 ? 'You applied the policy correctly almost every time.' : p >= 55 ? 'You got there on every question. The ones marked below needed a second try, so they are the ones to revisit.' : 'You reached the right answer on every question, with coaching. Review the marked ones, then try again for a clean run.';
      if (right < total) line = right + ' of ' + total + ' questions answered correctly. Use “Review my answers” to look again at the ones marked below, or try again for a clean run.';
      el.innerHTML = '<div class="score"><div class="ring" style="--p:' + p + '"><div><b>' + first + '/' + total + '</b><small>first try</small></div></div><h3></h3><p></p><div class="q-review">' +
        src.map(function (q, k) { var s = st[k]; return '<div>' + (s.ok ? ic(s.tries === 1 ? 'check-circle' : 'repeat', s.tries === 1 ? 'ok' : 'rt') : ic('x-circle', 'bad')) + '<span></span></div>'; }).join('') + '</div><div class="q-ctl" style="justify-content:center">' +
        (open ? '<button type="button" class="btn" data-review>' + ic('arrow-left') + ' Review my answers</button>' : '') +
        '<button type="button" class="btn ghost on-dark" data-again>' + ic('repeat') + ' Try again</button></div></div>';
      $('h3', el).textContent = head; $('.score p', el).textContent = line;
      keepWords(el);
      $$('.q-review div', el).forEach(function (d, k) { var q = src[k]; d.lastChild.textContent = (q.title || q.q) + (!st[k].ok ? ' · not answered correctly' : st[k].tries === 1 ? ' · first try' : ' · needed ' + st[k].tries + ' tries'); });
      $('[data-again]', el).addEventListener('click', start);
      var rev = $('[data-review]', el);
      if (rev) rev.addEventListener('click', function () { qi = 0; draw(true); });
      if (L[lessonIdx].completeOnQuiz) { markDone(lessonIdx); revealEnd(); }
    }
    if (open) {
      el.addEventListener('click', function (e) {
        var d = e.target.closest('[data-q]');
        if (d && el.contains(d)) { qi = +d.dataset.q; draw(true); }
      });
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
  /* Exit course: progress is saved and the SCORM session ended by SCORM.exit(). If the browser leaves the window
     open (it may only close windows a script opened), a full-screen message replaces the course so nothing more
     can be done in a session that has already been ended. */
  function exitCourse() {
    window.SCORM.exit();
    setTimeout(function () {
      if (document.getElementById('exited')) return;
      var box = document.createElement('div');
      box.id = 'exited';
      box.className = 'exited';
      box.setAttribute('role', 'alertdialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'exited-h');
      box.innerHTML = '<div class="exited-card" tabindex="-1"><h2 id="exited-h">You have exited the course</h2><p>Your progress has been saved. You can now close this window.</p></div>';
      document.body.appendChild(box);
      $('.exited-card', box).focus();
    }, 400);
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
  function openJobAid() {
    var w = 560, h = 720;
    var left = Math.max(0, Math.round((screen.availWidth - w) / 2));
    var top = Math.max(0, Math.round((screen.availHeight - h) / 2));
    var features = 'popup=yes,width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes';
    var pop = window.open('job-aid.html', 'jobAid', features);
    if (pop) { pop.focus(); return; }
    var a = document.createElement('a');
    a.href = 'assets/US_Timecard_Actions_and_Deadlines.pdf';
    a.setAttribute('download', 'US_Timecard_Actions_and_Deadlines.pdf');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-job-aid]')) { e.preventDefault(); openJobAid(); return; }
    if (e.target.closest('[data-zoom-close]')) { closeZoom(); return; }
    var zoomBtn = e.target.closest('[data-full]');
    if (zoomBtn) { openZoom(zoomBtn); return; }
    if (e.target.closest('[data-exit]')) { exitCourse(); return; }
    var g = e.target.closest('[data-go]');
    if (g) {
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
  window.addEventListener('scroll', function () { syncNav(); paintPart(); onReviewScroll(); }, { passive: true });
  window.addEventListener('resize', function () { paintPart(); settleReview(); });
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
