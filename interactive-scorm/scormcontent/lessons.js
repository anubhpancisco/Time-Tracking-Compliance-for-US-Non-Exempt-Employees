/* Lesson content. Text is taken from the original Rise course; presentation is authored per lesson.
   Each fact lives in exactly one place: either in a video, in an interactive, or in a short line of text.
   All strings here are static, authored markup (no user input is ever inserted). */
(function () {
  'use strict';
  function ic(n, c) { return '<svg class="i' + (c ? ' ' + c : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function enc(f) {
    var q = '';
    var i = String(f).indexOf('?');
    if (i >= 0) { q = f.slice(i); f = f.slice(0, i); }
    return 'assets/' + encodeURIComponent(f) + q;
  }
  function a(url, label) { return '<a class="text-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>'; }
  /* "How to use this" instruction chip shown above every interactive element.
     kind: pointer (click / select), sliders (slide), play (watch) */
  function how(kind, verb, text, dark) {
    return '<div class="how' + (dark ? ' on-dark' : '') + '"><span class="hw ' + kind + '">' + ic(kind) + '</span><span><b>' + verb + '</b> ' + text + '</span></div>';
  }
  function sec(id, n, label, title, inner) {
    return '<section class="sec rv" id="' + id + '"><div class="sec-label">' + (n ? '<span class="n">' + n + '</span>' : '') + label + '</div>' + (title ? '<h2>' + title + '</h2>' : '') + inner + '</section>';
  }
  function jump(items) { return '<nav class="jump" aria-label="In this lesson">' + items.map(function (x) { return '<a href="#' + x[0] + '">' + x[1] + '</a>'; }).join('') + '</nav>'; }
  function video(id, title) {
    var v = (window.VIDEOS || {})[id];
    if (!v) return '';
    var chapters = (v.chapters || []).map(function (c) { return '<button type="button" class="chap" data-seek="' + c.start + '">' + c.label + '</button>'; }).join('');
    var tr = (v.transcript || []).map(function (t) { return '<p>' + t + '</p>'; }).join('');
    var rev = (id === 'lead-rates' || id === 'lead-playbook') ? '?v=5' : '';
    return '<div class="band rv"><div class="vid-title">' + ic('play') + ' ' + title + '<span class="hint">Press play. Turn on captions from the player controls if you want them.</span></div><div class="vid" data-video="' + id + '"><video controls preload="metadata" playsinline poster="media/' + id + '-poster.jpg' + rev + '"><source src="media/' + id + '.mp4' + rev + '" type="video/mp4"><track kind="captions" srclang="en" label="English" src="media/' + id + '.vtt' + rev + '"></video>' +
      '<div class="bar"><span class="lbl">Click to jump to</span>' + chapters + '</div></div>' +
      '<details class="transcript"><summary>' + ic('file') + '<span><b>Video Transcript</b></span></summary><div class="tr-body">' + tr + '</div></details></div>';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function walk(file, title) {
    return '<div class="band rv"><div class="vid-title">' + ic('play') + ' ' + esc(title) + '<span class="hint">Workday walkthrough</span></div><div class="vid" data-video="' + file + '"><video controls preload="metadata" playsinline aria-label="' + esc(title) + '"><source src="media/' + file + '" type="video/mp4"></video></div></div>';
  }
  /* Two or more walkthroughs share one player. "Video 01: …" becomes a numbered card plus the question. */
  function walks(id, items) {
    var tones = ['sky', 'green', 'orange'];
    var tabsHtml = items.map(function (t, i) {
      var on = i === 0;
      var m = /^Video\s+(\d+)\s*:\s*(.+)$/.exec(t.title);
      var num = m ? m[1] : ((i < 9 ? '0' : '') + (i + 1));
      var name = m ? m[2] : t.title;
      var tone = tones[i] || 'sky';
      return '<button type="button" class="tab tone-' + tone + '" role="tab" id="' + id + '-tab-' + i + '" data-t="' + i + '" data-tone="' + tone + '" aria-selected="' + on + '" aria-controls="' + id + '-panel-' + i + '" tabindex="' + (on ? '0' : '-1') + '"><span class="walk-num" aria-hidden="true">' + esc(num) + '</span><span class="tab-copy"><span class="tab-name">' + esc(name) + '</span><span class="tab-cue"><span class="cue-label">' + (on ? 'Playing below' : 'Watch next') + '</span>' + ic('chevron-down') + '</span></span><span class="watched">Viewed</span></button>';
    }).join('');
    var panels = items.map(function (t, i) {
      var on = i === 0;
      return '<div class="tabpanel" role="tabpanel" id="' + id + '-panel-' + i + '" data-p="' + i + '" aria-labelledby="' + id + '-tab-' + i + '"' + (on ? '' : ' hidden') + '>' +
        '<div class="vid" data-video="' + t.file + '"><video controls ' + (on ? 'preload="metadata"' : 'preload="none"') + ' playsinline aria-label="' + esc(t.title) + '"><source src="media/' + t.file + '" type="video/mp4"></video></div></div>';
    }).join('');
    return '<div class="band walks rv" data-tabs="' + id + '" data-tone="sky">' + how('pointer', 'Click', 'the tabs to view both Workday walkthrough videos.') +
      '<div class="tablist" role="tablist" aria-label="Workday walkthroughs">' + tabsHtml + '</div><div class="walk-stage">' + panels + '</div></div>';
  }
  function frame(file, title, zoom) {
    var src = enc(file);
    var safe = esc(title);
    var img = '<img src="' + src + '" alt="' + (zoom ? '' : safe) + '" loading="lazy">';
    if (zoom) {
      img = '<button type="button" class="zoom" data-full="' + src + '" data-full-title="' + safe + '" aria-label="View full size: ' + safe + '">' + img +
        '<span class="zoom-hint" aria-hidden="true">' + ic('maximize') + '</span></button>';
    }
    return '<figure class="frame rv" style="margin-left:0;margin-right:0"><div class="chrome"><i></i><i></i><i></i><span>' + safe + '</span></div>' + img + '</figure>';
  }
  function tabs(id, items) {
    return how('pointer', 'Click', 'a tab to switch between the alerts.') + '<div class="tabs rv" data-tabs="' + id + '"><div class="tablist" role="tablist">' + items.map(function (t, i) { return '<button type="button" class="tab" role="tab" data-t="' + i + '" aria-selected="' + (i === 0) + '"><span class="dot"></span>' + t.label + '</button>'; }).join('') + '</div>' +
      items.map(function (t, i) { return '<div class="tabpanel" role="tabpanel" data-p="' + i + '"' + (i ? ' hidden' : '') + '>' + t.html + '</div>'; }).join('') + '</div>';
  }
  function tool(icon, title, tag, widget, inner) {
    return '<div class="band rv"><div class="tool" data-widget="' + widget + '"><div class="tool-head">' + ic(icon) + '<b>' + title + '</b><small>' + tag + '</small></div><div class="tool-body">' + inner + '</div></div></div>';
  }
  function quiz(id, label) {
    return '<div class="band rv"><div class="quiz" data-quiz="' + id + '" data-label="' + esc(label) + '"></div></div>';
  }
  function linkItem(url, title, sub, downloadName) {
    var attrs = downloadName
      ? ' download="' + esc(downloadName) + '"'
      : ' target="_blank" rel="noopener noreferrer"';
    return '<li><a href="' + url + '"' + attrs + '>' + ic(downloadName ? 'file' : 'external') + '<span><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></a></li>';
  }
  function links(items) { return '<ul class="link-list rv">' + items.map(function (x) { return linkItem(x[0], x[1], x[2], x[3]); }).join('') + '</ul>'; }
  function callout(kind, icon, html) { return '<div class="callout ' + kind + ' rv">' + ic(icon) + '<div>' + html + '</div></div>'; }
  function facts(error, policy, action) {
    return '<div class="alert-facts rv"><div><b>The error</b><p>' + error + '</p></div><div><b>Policy</b><p>' + policy + '</p></div><div><b>Action required</b><p>' + action + '</p></div></div>';
  }
  function shot(file, title) {
    return '<p class="alert-look">What the Workday alert looks like</p>' + frame(file, title, true);
  }
  function role(r) { return r === 'lead' ? '<span class="role-tag lead">Leader</span>' : '<span class="role-tag emp">Employee</span>'; }
  function grad(t) { return '<span class="em">' + t + '</span>'; }

  var URL_TT = 'https://cisco.service-now.com/employee_compensation?id=time_tracking';
  var URL_CAL = 'https://wwwin.cisco.com/c/cec/employee/pto-payroll/us/tools.html';
  var URL_WD = 'https://wd5.myworkday.com/cisco/d/home.htmld';
  var URL_KB = 'https://cisco.service-now.com/helpzone?id=kb_article&sysparm_article=KB0064800';
  var URL_HOL = 'https://cisco.service-now.com/helpzone?id=kb_article&sysparm_article=KB0064809';
  var URL_POL = 'https://cisco.service-now.com/policyhub?sysparm_article=KB0071985&id=kb_article_view';
  var URL_ONCALL = 'https://cisco.service-now.com/helpzone?id=kb_article&sysparm_article=KB0066738';
  var URL_GSP = 'https://cisco.service-now.com/employee_compensation?id=global_time_premium_pay';
  var URL_ADD = 'https://3p.cisco.com/c/dam/r/team-development/employee-rewards/documents/compensation_us_on_call_addendum_en.pdf';
  var URL_RESTFORM = 'https://cisco.sharepoint.com/sites/Compensation/PublishedLibrary/Forms/AllItems.aspx?id=/sites/Compensation/PublishedLibrary/Involuntary%20missed%20rest%20break%20form%20final.pdf&parent=/sites/Compensation/PublishedLibrary';
  var URL_DELEGATE = 'https://cisco.service-now.com/helpzone?id=kb_article&sysparm_article=KB0066683';
  var URL_HELP = 'https://cisco.service-now.com/helpzone';

  window.H = { ic: ic, how: how };

  window.LESSONS = [
    /* ------------------------------------------------------------------ 1 */
    {
      title: 'What is time tracking & why do it?', short: 'What & why', mins: 2, minsLead: 3, roles: ['emp', 'lead'], hero: 'stock-image-3.jpg',
      goals: ['Define time tracking in one sentence', 'Know why Cisco requires it'],
      goalsLead: ['Understand your review role and what your team records', 'Know what this 15-minute path covers'],
      html: function (role) {
        var lead = role === 'lead';
        return sec('l1-watch', '', 'Start here', lead ? 'Your review. ' + grad('Their pay.') : 'Your time. ' + grad('Paid right.'),
          video(lead ? 'lead-welcome' : 'welcome', lead ? 'Watch: your review, their pay' : 'Watch: your time, paid right') +
          '<h3>Go deeper</h3>' + links([[URL_TT, 'How time tracking works', 'Read more about the process'], [URL_CAL, 'US Payroll Calendar', 'Official pay dates and deadlines']]));
      }
    },
    /* ------------------------------------------------------------------ 2 */
    {
      title: 'Who needs to track time/hours worked?', short: 'Who tracks time', mins: 3, roles: ['emp', 'lead'], hero: 'stock-image-1.jpg',
      goals: ['Know who must track time and why', 'Find your exempt or non-exempt status in Workday'],
      html: function () {
        return sec('l2-who', '', 'Watch', 'Who tracks time, and how to check your status', video('who', 'Watch: who tracks time')) +
          sec('l2-check', '', 'See it in Workday', 'Where your status lives',
            frame('how-to-check-if-you-are-non-exempt.png', 'Workday: Job › Position › FLSA Exemption Status') +
            quiz('l2', 'Quick check'));
      }
    },
    /* ------------------------------------------------------------------ 3 */
    {
      title: 'Where do I track time?', short: 'Where to track', mins: 1, roles: ['emp'], hero: 'stock-image-3.jpg',
      goals: ['Name the one system for recording hours'],
      html: function () {
        return sec('l3-wd', '', 'The system of record', 'One place: ' + grad('Workday'),
          video('workday', 'Watch: why only Workday') +
          '<p style="margin-top:22px"><a class="btn" href="' + URL_WD + '" target="_blank" rel="noopener noreferrer">' + ic('external') + ' Open Workday</a></p>');
      }
    },
    /* ------------------------------------------------------------------ 4 */
    {
      title: 'Why is time tracking crucial & mandatory?', short: 'Why it matters', mins: 2, roles: ['emp', 'lead'], hero: 'stock-image-2.jpg',
      goals: ['Name the three reasons time tracking is mandatory'],
      html: function () {
        return sec('l4-why', '', 'Three pillars', 'Why it is crucial',
          how('pointer', 'Click', 'each pillar to read what it means for you.') +
          '<div class="pillars rv" data-pillars><button type="button" class="pillar" data-i="0" aria-selected="false"><span class="ico">' + ic('scale') + '</span><h3>Legal Compliance</h3><small>Click to read</small></button>' +
          '<button type="button" class="pillar" data-i="1" aria-selected="false"><span class="ico sky">' + ic('dollar') + '</span><h3>Overtime Pay</h3><small>Click to read</small></button>' +
          '<button type="button" class="pillar" data-i="2" aria-selected="false"><span class="ico warn">' + ic('heart') + '</span><h3>Work Life Balance</h3><small>Click to read</small></button></div>' +
          '<div class="pillar-detail rv" data-pillar-detail aria-live="polite"></div>');
      },
      data: { pillars: ['Ensures Cisco meets labor laws and compensates employees fairly.', 'Accurate time tracking ensures employees receive appropriate overtime compensation.', 'Cisco supports employees in prioritizing their health and well-being through reasonable work schedules and regular breaks. Meeting this commitment requires that employees and leaders have regular conversations about work schedules and expectations.'] }
    },
    /* ------------------------------------------------------------------ 5 */
    {
      title: 'High-level policy overview', short: 'Policy overview', mins: 9, minsLead: 7, roles: ['emp', 'lead'], hero: 'stock-image-5.jpg',
      goals: ['Edit your timecard and record time off and on-call', 'Know when meal and rest breaks are due', 'Apply the 8-hour, 40-hour and 12-hour pay rules'],
      goalsLead: ['See how employees keep a timecard, including time off and on-call', 'Know the meal and rest breaks your team must take', 'Apply the 8-hour, 40-hour and 12-hour pay rules'],
      html: function (role) {
        var lead = role === 'lead';
        return jump([['l5-a', 'Timecard'], ['l5-b', 'Breaks'], ['l5-c', 'Overtime'], ['l5-d', 'On-call'], ['l5-q', 'Quick check']]) +
          sec('l5-a', 'A', 'Timecard', lead ? 'The employee timecard, week to week' : 'Your timecard, week to week',
            video(lead ? 'lead-timecard' : 'timecard', lead ? 'Watch: how an employee timecard works' : 'Watch: how your timecard works') +
            callout('info tint', 'info', '<p><strong>Time off and hours worked.</strong> If an employee books time off after the timecard was auto-populated, they must delete the conflicting “Hours Worked” entries to prevent overlap and overpayment. Combined daily recorded time cannot exceed the scheduled daily hours. The standard is 8.</p>') +
            walks('l5-card', [
              { file: 'how-view-timecard.mp4', title: lead ? 'Video 01: How does an employee view a timecard?' : 'Video 01: How do I view my timecard?' },
              { file: 'how-update-timecard.mp4', title: lead ? 'Video 02: How does an employee update a timecard?' : 'Video 02: How do I update my timecard?' }
            ]) +
            links([[URL_KB, 'How to enter time in Workday - US and Canada', 'Step-by-step instructions']])) +
          sec('l5-b', 'B', 'Meal and rest breaks', lead ? 'Breaks your team must take' : 'Breaks are part of the job',
            video(lead ? 'lead-breaks' : 'breaks', lead ? 'Watch: breaks your team must take' : 'Watch: breaks that count') +
            '<p class="after-media">' + (lead
              ? 'Unpaid meal breaks are determined by the applicable work location state. At this time, employees must receive 30 minutes or more once they have worked 5 hours or more, and a second 30-minute meal break after more than 10 hours.'
              : 'Unpaid meal breaks are determined by the applicable work location state. At this time, 30 minutes or more must be provided once you have worked 5 hours or more, and a second 30-minute meal break is due after more than 10 hours.') + '</p>' +
            callout('info tint', 'info', '<p>During a meal period the employee must be completely relieved of duty and allowed to leave the premises. Otherwise that time is hours worked. A rest break cannot be skipped, banked, or saved for future use.</p>') +
            tool('coffee', 'Break clock', 'Try it', 'breakclock',
              how('sliders', 'Slide', lead ? 'the handle to see which breaks are due after an employee works that many hours.' : 'the handle left or right to change the hours worked in a day.') +
              '<div class="range-row"><label for="bc-r">' + (lead ? 'Hours an employee worked today' : 'Hours worked today') + '</label><input id="bc-r" type="range" min="0" max="12" step="0.5" value="0"><span class="val" data-val>0 h</span></div>' +
              '<div class="dbar" data-bar></div><div class="axis" data-axis></div>' +
              '<div class="bar-key"><span><i class="k-work"></i>Working</span><span><i class="k-rest"></i>Rest, paid</span><span><i class="k-meal"></i>Meal, unpaid</span></div>' +
              '<div class="readout"><div data-r="rest"><small>Rest breaks (paid)</small><b data-rv></b></div><div data-r="meal1"><small>Meal break #1 (unpaid)</small><b data-rv></b></div><div data-r="meal2"><small>Meal break #2 (unpaid)</small><b data-rv></b></div></div>' +
              '<div class="verdict good" data-verdict></div>') +
            callout('info tint', 'info', lead
              ? '<p><strong>Logging a meal break:</strong> the employee chooses “Meal” as the reason when they enter their “Out” time.</p>'
              : '<p><strong>Logging a meal break:</strong> choose “Meal” as the reason when you enter your “Out” time.</p>') +
            walk('how-missed-meal.mp4', lead ? 'How does an employee report an involuntarily missed meal break?' : 'How do I report an involuntarily missed meal break?') +
            links([[URL_RESTFORM, 'Notice of Involuntarily Missed Rest Break form', lead ? 'Employees give this form to you when a rest break was missed' : 'Give it to your leader if a rest break was missed']])) +
          sec('l5-c', 'C', 'Overtime', 'What counts, and what it pays',
            video(lead ? 'lead-rates' : 'rates', lead ? 'Watch: 8, 40, and your approval' : 'Watch: 8, 40 and beyond') +
            tool('dollar', 'Overtime calculator', 'Try it', 'otcalc',
              how('sliders', 'Slide', lead ? 'the handle to change the hours an employee worked in a single day.' : 'the handle to change the hours you worked in a single day.') +
              '<div class="range-row"><label for="ot-r">' + (lead ? 'Hours an employee worked in a day' : 'Hours worked in a day') + '</label><input id="ot-r" type="range" min="0" max="14" step="0.5" value="0"><span class="val" data-val>0 h</span></div>' +
              '<div class="dbar" data-bar></div><div class="axis" data-axis></div>' +
              '<div class="bar-key"><span><i class="k-work"></i>Regular, 1&times;</span><span><i class="k-ot"></i>Overtime, 1.5&times;</span><span><i class="k-dt"></i>Double time, 2&times;</span></div>' +
              '<div class="readout"><div data-r="reg"><small>Regular · 1×</small><b data-rv></b></div><div data-r="ot"><small>Overtime · 1.5×</small><b data-rv></b></div><div data-r="dt"><small>Double time · 2×</small><b data-rv></b></div><div data-r="eq"><small>Paid like</small><b data-rv></b></div></div>' +
              '<div class="verdict good" data-verdict></div>') +
            callout('warn', 'alert', lead
              ? '<p><strong>No time to ask first?</strong> If unusual or unforeseen circumstances stop an employee getting your approval, they report the overtime in Workday immediately and email you as soon as possible.</p>'
              : '<p><strong>No time to ask first?</strong> If unusual or unforeseen circumstances stop you getting pre-approval, report the overtime in Workday immediately and email your leader as soon as possible. Unexpected overtime is a prompt to talk it through with your leader.</p>') +
            walk('how-record-overtime.mp4', lead ? 'How does an employee record overtime?' : 'How do I record overtime?') +
            links([[URL_POL, 'Time Tracking Policy for US Non-Exempt Employees', 'Additional overtime scenarios'], [URL_HOL, 'Cisco-observed US holidays', 'Hours worked on these days are overtime']])) +
          sec('l5-d', 'D', 'On-call', lead ? 'On-call your team records' : 'On-call, recorded in Workday',
            walks('l5-oncall', [
              { file: 'how-oncall-eligible.mp4', title: lead ? 'Video 01: How does an employee identify if they are on-call eligible?' : 'Video 01: How do I identify if I am on-call eligible?' },
              { file: 'how-record-oncall.mp4', title: lead ? 'Video 02: How does an employee record on-call?' : 'Video 02: How do I record on-call?' }
            ]) +
            links([[URL_GSP, 'Cisco’s Global Supplemental Pay', 'Policy and country-specific addendum'], [URL_ONCALL, 'How to enter on-call and standby time in Workday – Global', lead ? 'Manager section: eligibility, plus how employees record on-call' : 'Step-by-step guide']])) +
          sec('l5-q', 'E', 'Quick check', 'Check what you have learned',
            quiz(lead ? 'l5lead' : 'l5', 'Policy check'));
      }
    },
    /* ------------------------------------------------------------------ 6 */
    {
      title: 'Responsibilities & submission deadlines', short: 'Responsibilities & deadlines', mins: 5, roles: ['emp', 'lead'], hero: 'stock-image-4.jpg',
      goals: ['List your five weekly responsibilities', 'Understand the three timecard statuses', 'Know the payroll-week deadlines and who owns each'],
      html: function () {
        return jump([['l6-a', 'Responsibilities'], ['l6-b', 'Statuses'], ['l6-c', 'Deadlines']]) +
          sec('l6-a', 'A', 'Your responsibilities', 'Five habits that keep you paid correctly',
            '<div class="habits rv">' +
            '<div><span class="ico">' + ic('clock') + '</span><b>Report all hours on the day you work them</b></div>' +
            '<div><span class="ico sky">' + ic('coffee') + '</span><b>Take all earned rest and meal breaks</b></div>' +
            '<div><span class="ico warn">' + ic('check-circle') + '</span><b>Get manager pre-approval before overtime</b></div>' +
            '<div><span class="ico dark">' + ic('plane') + '</span><b>Record every absence in Workday</b></div>' +
            '<div><span class="ico good">' + ic('calendar') + '</span><b>Submit your timecard by the deadline</b></div></div>') +
          sec('l6-b', 'B', 'Timecard statuses', 'Three stages, every time',
            how('pointer', 'Click', 'each stage to see what it means.') +
            '<div class="rv" data-pipe><div class="pipe" role="tablist"><button type="button" role="tab" data-i="0" aria-selected="false"><small>Stage 1</small>Not submitted</button><button type="button" role="tab" data-i="1" aria-selected="false"><small>Stage 2</small>Submitted</button><button type="button" role="tab" data-i="2" aria-selected="false"><small>Stage 3</small>Approved</button></div><div class="pipe-detail" data-pipe-detail aria-live="polite"></div></div>' +
            walk('how-timecard-status.mp4', 'How do I know the status of my timecard?')) +
          sec('l6-c', 'C', 'Deadlines', 'The week before payday',
            video('payroll', 'Watch: one payroll week') +
            '<div class="band rv"><div class="explorer" data-explorer><h3>Explore the week</h3>' + how('pointer', 'Click', 'any colored moment in the week to see what happens and who owns it.') + '<div class="days" data-days></div><div class="ev-detail" data-ev-detail aria-live="polite"></div><div class="legend"><span><i class="lg-emp"></i>Employee</span><span><i class="lg-lead"></i>Leader</span><span><i class="lg-caut"></i>Caution</span></div></div></div>' +
            walk('how-submit-timecard.mp4', 'How do I submit my timecard?') +
            links([[URL_CAL, 'US Payroll Calendar', 'Submission, approval and payroll deadlines']]));
      },
      data: {
        status: [
          { t: 'Not submitted', h: 'Your hours are entered, but you must select <b>Submit</b> on the timecard screen to move on.' },
          { t: 'Submitted', h: 'You have submitted. The timecard stays here until it is approved.' },
          { t: 'Approved', h: 'The final state. <b>Regular hours only:</b> approved automatically, straight after submission. <b>Overtime or on-call hours:</b> routed to your People Leader to review and approve.' }
        ]
      }
    },
    /* ------------------------------------------------------------------ 7 */
    {
      title: 'Preventing errors & oversight: Alerts & notifications', short: 'Alerts & notifications', mins: 4, roles: ['emp'], hero: 'stock-image-3.jpg',
      goals: ['Recognize the four Workday alerts', 'Fix an over-8-hour day correctly'],
      html: function () {
        return jump([['l7-remind', 'Reminders'], ['l7-overlap', 'Overlap'], ['l7-daily', 'Daily hours'], ['l7-oncall', 'On-call'], ['l7-missing', 'Missing time']]) +
          sec('l7-intro', '', 'Stay ahead of mistakes', 'Alerts are your safety net',
            video('alerts', 'Watch: fix it before payday') +
            '<p class="after-media">Workday sends an alert when a timecard discrepancy could delay pay. Read what each one means, then look at the alert itself.</p>') +
          sec('l7-remind', 'A', 'Automated reminders', 'A nudge before submission',
            '<p>Employees receive an automated email every other Thursday morning, ahead of that evening’s automatic submission. The reminder is there so you can review the timecard and confirm every recorded hour before the system submits it.</p>') +
          sec('l7-overlap', 'B', 'Time off and hours worked', 'Overlap on the same day',
            facts(
              'Requesting time off in arrears, after the timecard has already been pre-populated for the week, often leaves both time off and hours worked on the same day.',
              'Company policy does not support overlapping records.',
              'Reconcile the entries by adjusting time off or correcting hours worked. Submit time off requests in advance whenever you can.'
            ) + shot('alert-overlap.jpg', 'Workday alert: overlapping records')) +
          sec('l7-daily', 'C', 'Exceeding daily scheduled hours', 'The day adds up to more than it should',
            facts(
              'Time off and hours worked on the same day add up to more than the standard daily schedule: 8 hours for full-time employees, and less for part-time.',
              'Total daily recorded time must align with the standard daily schedule.',
              'Adjust the entries so the total does not exceed the standard day. If you have 4 hours of time off and work 6 hours, reduce the time off to 2 hours so the day totals 8.'
            ) + shot('alert-exceeding-daily-hours.jpg', 'Workday alert: exceeding daily scheduled hours')) +
          sec('l7-oncall', 'D', 'On-call eligible employees only', 'On-call double entry',
            facts(
              'Both “On Call Hours Worked” and “On Call Standby” are recorded for the same week.',
              'The US On-Call Addendum does not permit both of these entries in the same week.',
              'Review the entries and correct the timecard so only the appropriate on-call status is recorded.'
            ) + shot('alert-oncall-double-entry.jpg?v=2', 'Workday alert: on-call double entry')) +
          sec('l7-missing', 'E', 'Part-time employees and interns only', 'Missing time entries',
            facts(
              'Hours worked for the current pay period were not recorded.',
              'Accurate and prompt time recording is mandatory for payroll processing.',
              'Log into Workday and submit the hours as soon as the reminder arrives, so payment is not delayed.'
            ) + shot('alert-missing-time.jpg', 'Workday alert: missing time entries'));
      }
    },
    /* ------------------------------------------------------------------ 8 */
    {
      title: 'People Leaders', short: 'People Leaders', mins: 4, roles: ['lead'], hero: 'stock-image-2.jpg',
      goals: ['Own the leader responsibilities', 'Review, approve and delegate in Workday', 'Handle discrepancies through conversation, not Send Back'],
      html: function () {
        return jump([['l8-watch', 'Watch'], ['l8-week', 'The week'], ['l8-status', 'Status'], ['l8-delegate', 'Delegate'], ['l8-approve', 'Approve'], ['l8-game', 'Quick check']]) +
          sec('l8-watch', '', 'For people leaders', 'Your review keeps pay accurate',
            video('lead-playbook', 'Watch: the leader playbook') +
            '<div class="stack">' +
            callout('warn', 'alert', '<p><strong>Friday reminder.</strong> Automated reminders to approve your team’s timecards are sent on Fridays of the week before payday. Review them before automatic processing on Sunday.</p>') +
            callout('info tint', 'info', '<p><strong>Overlap alerts.</strong> Workday alerts you when hours worked overlap time off, and when on-call standby overlaps on-call hours worked. Resolve those discrepancies promptly.</p>') +
            '</div>') +
          sec('l8-week', '', 'The payroll week', 'What your team does, and what you do',
            video('lead-payroll', 'Watch: one payroll week') +
            '<div class="band rv"><div class="explorer" data-explorer data-events="lead"><h3>Explore the week</h3>' + how('pointer', 'Click', 'any colored moment in the week to see what happens and who owns it.') + '<div class="days" data-days></div><div class="ev-detail" data-ev-detail aria-live="polite"></div><div class="legend"><span><i class="lg-emp"></i>Employee</span><span><i class="lg-lead"></i>Leader</span><span><i class="lg-caut"></i>Caution</span></div></div></div>') +
          sec('l8-status', 'A', 'Check status', 'Is this team member non-exempt?',
            '<ol class="do-steps"><li><span>1</span><div><b>Search</b><p>Search for the team member in Workday.</p></div></li><li><span>2</span><div><b>Open Position</b><p>Open the team member’s profile and select the <b>Position</b> tab.</p></div></li><li><span>3</span><div><b>Read the status</b><p>Read <b>FLSA Exemption Status</b>.</p></div></li></ol>' +
            links([[URL_ONCALL, 'How to enter on-call and standby time in Workday - Global', 'Manager section: check on-call eligibility']])) +
          sec('l8-delegate', 'B', 'Cover your absence', 'Assign a delegate',
            '<div class="do-shots">' +
            frame('manage-delegation-01.png', 'Workday: open My Tasks and Manage Delegations', true) + frame('manage-delegation-02.png', 'Workday: manage delegations', true) +
            '</div>' + links([[URL_DELEGATE, 'How to add delegate in Workday', 'Step-by-step guide']])) +
          sec('l8-approve', 'C', 'Before the Sunday deadline', 'Review and approve timecards',
            walks('l8-approve', [
              { file: 'how-approve-timecard.mp4', title: 'Video 01: How do leaders approve a timecard?' },
              { file: 'how-bulk-approve.mp4', title: 'Video 02: How do leaders bulk approve time in Workday?' }
            ]) +
            links([[URL_KB, 'How to enter time in Workday - US and Canada', 'See the Manager content']])) +
          sec('l8-game', '', 'Quick check', 'Check what you have learned',
            quiz('l8', 'Quick check'));
      }
    },
    /* ------------------------------------------------------------------ 9 */
    {
      title: 'Resources', short: 'Resources', mins: 1, roles: ['emp', 'lead'], hero: 'stock-image-5.jpg',
      goals: ['Know where to find tools, policies and help'],
      html: function (role) {
        var lead = role === 'lead';
        return sec('l9-hub', '', 'Resources Hub', 'Official guidance, tools and policy documents',
          '<div class="res-grid"><div class="card rv"><h3><span class="ico good" style="margin:0;width:44px;height:44px;font-size:22px">' + ic('file') + '</span>Job aid</h3>' +
          '<div class="sheet-wrap"><p>Timecard actions and deadlines for the bi-weekly cycle.</p>' +
          '<table class="sheet"><thead><tr><th>Task</th><th>When</th><th>Action</th></tr></thead><tbody>' +
          '<tr><td>Daily timecard review</td><td><span class="when">Daily</span></td><td>Check pre-populated time for the day in Workday and update it if needed.</td></tr>' +
          '<tr><td>Advance time off booking</td><td><span class="when">In advance</span></td><td>Submit planned time off in the Absence Calendar to prevent overlaps.</td></tr>' +
          '<tr><td>Thursday auto-submission</td><td><span class="when">Thursday 8:00 PM PT</span></td><td>Automated submission occurs. Avoid a manual submit from 8:00 to 9:00 PM PT.</td></tr>' +
          '<tr><td>Timecards available</td><td><span class="when">Thursday 9:00 PM PT</span></td><td>Timecards with overtime or on-call become available for leader review.</td></tr>' +
          '<tr><td>Sunday re-submission</td><td><span class="when">Sunday 2:30 PM PT</span></td><td>Final deadline for employees to edit Friday or weekend hours.</td></tr>' +
          '<tr><td>Final leader approval</td><td><span class="when">Sunday 6:30 PM PT</span></td><td>Final deadline for leader review and approval before auto-processing.</td></tr>' +
          '</tbody></table></div><p class="sheet-actions"><button type="button" class="btn" data-job-aid>' + ic('file') + ' Download job aid (PDF)</button></p></div><div class="card rv"><h3><span class="ico" style="margin:0;width:44px;height:44px;font-size:22px">' + ic('laptop') + '</span>Core Time Tracking Tools</h3>' +
          links([[URL_WD, 'Workday', 'The official system of record for all time tracking and payroll.'], [URL_KB, 'How to enter time in Workday - US and Canada', 'Step-by-step instructions for editing, deleting, and adding time blocks.'], [URL_TT, 'Time Tracking Snow portal', 'Guidance page regarding Time Tracking with different resources.']]) +
          '</div><div class="card rv"><h3><span class="ico sky" style="margin:0;width:44px;height:44px;font-size:22px">' + ic('file') + '</span>Policies and Addenda</h3>' +
          links([[URL_POL, 'Time Tracking Policy for US Non-Exempt Employees', 'Comprehensive policy details.'], [URL_GSP, 'Global Supplemental Pay Site', 'Information regarding policy and country-specific addenda.'], [URL_ADD, 'US On-Call Addendum', 'Specific rules for on-call eligibility and reporting.']]) +
          '</div><div class="card rv"><h3><span class="ico warn" style="margin:0;width:44px;height:44px;font-size:22px">' + ic('users') + '</span>Support &amp; Enablement</h3>' +
          links([[URL_CAL, 'US Payroll Calendar & Deadlines', 'Official payroll cutoff and payment dates.'], [URL_HOL, 'Cisco Observed Holidays & Days for Me - USA, Canada, and LATAM', 'Official list of observed US holidays.'], [URL_RESTFORM, 'Notice of Involuntarily Missed Rest Break Form', lead ? 'Employees use this form to report a missed rest break to you.' : 'Use this form to report missed rest breaks to your leader.'], [URL_ONCALL, 'How to enter on-call and standby time in Workday – Global', lead ? 'Manager section for eligibility, and how employees record on-call hours.' : 'Use this article for more information on how to record on-call hours.'], [URL_DELEGATE, 'How to add delegate in Workday', 'Process for assigning an approval delegate.'], [URL_HELP, 'People Support (Help Zone)', 'Open a case if you have questions or status change inquiries.']]) +
          '</div></div>');
      }
    },
    /* ------------------------------------------------------------------ 10 */
    {
      title: 'Knowledge check', short: 'Knowledge check', mins: 5, roles: ['emp', 'lead'], hero: 'stock-image-3.jpg', completeOnQuiz: true,
      goals: ['Apply the policy to seven real timecard situations'],
      html: function () {
        return sec('l10-q', '', 'Scenarios', 'Seven situations. What would you do?',
          quiz('final', 'Scenario'));
      }
    }
  ];

  /* ---------------------------------------------------------------- data */
  function O(t, ok, why) { return { t: t, ok: !!ok, why: why }; }
  window.QUIZ = {
    l2: [
      { q: 'Your Workday profile shows “FLSA Exemption Status: No (Eligible for Overtime)”. What does that mean?', opts: [
        O('You are non-exempt, so you track all of your hours worked.', 1, 'Correct. “No (Eligible for Overtime)” means non-exempt.'),
        O('You are exempt, so you do not need to track your time.', 0, '“Yes (Not Eligible for Overtime)” is the exempt status. This is the opposite.'),
        O('Your overtime requests have been declined.', 0, 'The field describes your status under the FLSA, not any request.')] }
    ],
    l8: [
      { q: 'You spot an error on a team member’s timecard. What do you do?', opts: [
        O('Use “Send Back” in Workday so they fix it.', 0, 'Do not use Send Back. Talk with your team member instead.'),
        O('Talk with your team member directly about the correction.', 1, 'Correct. A conversation makes the fix clear and builds better timekeeping habits.'),
        O('Approve it and let payroll sort it out.', 0, 'Your review is what keeps the hours accurate. Raise it before the Sunday 6:30 PM PT deadline.')] }
    ],
    l5: [
      { q: 'When must an unpaid meal break be provided?', opts: [
        O('After 4 hours of work.', 0, 'The meal break requirement starts once an employee has worked 5 hours or more.'),
        O('After 5 hours of work.', 1, 'Correct. 30 minutes or more, completely relieved of duty. A second one is due after 10 hours.'),
        O('Only if the employee requests it.', 0, 'It is not optional. The meal break must be provided.')] },
      { q: 'How should you report an involuntarily missed meal break?', opts: [
        O('By stopping work 30 minutes early.', 0, 'Skipping the meal and stopping early is prohibited.'),
        O('By reporting it on the “Notice of Involuntarily Missed Rest Break” form.', 0, 'That form is for missed REST breaks. Missed meal breaks are reported on the timecard.'),
        O('By entering your total hours worked consecutively on your timecard without a meal break gap.', 1, 'Correct. Workday then generates the meal break payment in your next paycheck.')] },
      { q: 'When are overtime hours paid at 1.5 times your regular rate?', opts: [
        O('For hours worked over 8 in a day or 40 in a week.', 1, 'Correct. Overtime also applies on Cisco-observed US holidays, and double time applies over 12 hours in a day.'),
        O('Only for hours worked on weekends.', 0, 'Overtime is not limited to weekends. It is triggered by hours over 8 a day or 40 a week.'),
        O('Only if your manager approves it 48 hours in advance.', 0, 'Pre-approval is required before you work overtime, but there is no 48-hour rule, and every overtime hour must be recorded either way.')] }
    ],
    l5lead: [
      { q: 'When must an employee be given an unpaid meal break?', opts: [
        O('After 4 hours of work.', 0, 'The meal break requirement starts once an employee has worked 5 hours or more.'),
        O('After 5 hours of work.', 1, 'Correct. 30 minutes or more, completely relieved of duty. A second one is due after 10 hours.'),
        O('Only if the employee requests it.', 0, 'It is not optional. The meal break must be provided.')] },
      { q: 'How does an employee report an involuntarily missed meal break?', opts: [
        O('By stopping work 30 minutes early.', 0, 'Skipping the meal and stopping early is prohibited.'),
        O('By sending you the “Notice of Involuntarily Missed Rest Break” form.', 0, 'That form is for missed REST breaks. Missed meal breaks are reported on the timecard.'),
        O('By entering the hours worked consecutively on the timecard, with no meal-break gap.', 1, 'Correct. Workday then generates the meal break payment on the next paycheck.')] },
      { q: 'When are an employee’s overtime hours paid at 1.5 times the regular rate?', opts: [
        O('For hours worked over 8 in a day or 40 in a week.', 1, 'Correct. Overtime also applies on Cisco-observed US holidays, and double time applies over 12 hours in a day. Employees need your approval before they start.'),
        O('Only for hours worked on weekends.', 0, 'Overtime is not limited to weekends. It is triggered by hours over 8 a day or 40 a week.'),
        O('Only if you approve it 48 hours in advance.', 0, 'Your approval is required before the employee works overtime, but there is no 48-hour rule, and every overtime hour must be recorded either way.')] }
    ],
    final: [
      { title: 'The overlapping entry', scn: 'Your timecard was pre-populated with 8 hours of “Hours Worked” for Friday. You decide to take that day off for a personal appointment and record 8 hours of “Time Off”. The system is now showing an alert for an overlapping record.', q: 'What is the correct step to take?', opts: [
        O('Do nothing; the system will eventually sort it out during the payroll process.', 0, 'The system will not resolve it for you. You are responsible for the accuracy of your timecard.'),
        O('Reconcile the entries by adjusting your time off or correcting your hours worked in your timecard so they do not overlap.', 1, 'Company policy does not support overlapping records. You are responsible for ensuring your timecard is accurate by reconciling these entries promptly.'),
        O('Delete all your entries for that day and start over from the beginning of the pay period.', 0, 'Far more than needed. Fix only the conflicting entries for that day.')] },
      { title: 'Exceeding daily scheduled hours', scn: 'You are a full-time employee with an 8-hour standard workday. You realize that on Tuesday, you logged 4 hours of “Time Off” and 6 hours of “Work Time,” bringing your daily total to 10 hours.', q: 'How should you correct this?', opts: [
        O('Leave it as is; the system will automatically cap the hours at 8 for you.', 0, 'There is no automatic cap. Your combined total must align with your standard daily schedule.'),
        O('Delete the 6 hours of work time and replace them with 4 hours of work time to reach 8 hours total.', 0, '“Hours Worked” is a factual record of what you did. It cannot be changed to make the total fit.'),
        O('Adjust your entries to align with your standard 8-hour schedule; specifically, reduce the time off to 2 hours so that the combined total of time off and work time equals 8 hours.', 1, 'Your “Hours Worked” must reflect the actual time you spent on the job, so you adjust the “Time Off” entry. Reducing it to 2 hours makes your timecard match the reality of your day.')] },
      { title: 'The Thursday deadline', scn: 'It is Thursday morning, and you receive an automated email reminder about the upcoming 8:00 PM PT auto-submission. You realize you haven’t looked at your timecard all week.', q: 'What do you do?', opts: [
        O('Do nothing; the system will auto-submit it at 8:00 PM, and it will be fine.', 0, 'The system will submit it, but you are responsible for the accuracy of what it submits.'),
        O('Manually submit your timecard at 8:30 PM to ensure it is “extra” submitted.', 0, 'Avoid manual submission between 8:00 PM and 9:00 PM PT. It can cause system conflicts.'),
        O('Review your timecard now to ensure all hours and absences are accurate before the 8:00 PM auto-submission occurs.', 1, 'While the system will auto-submit, you are responsible for the accuracy of your timecard. Reviewing it before the deadline ensures you are paid correctly.')] },
      { title: 'Planning ahead', scn: 'You are planning to take next Friday off for a personal appointment. You know you should log it in Workday.', q: 'What is the best move?', opts: [
        O('Log the time off in advance to ensure it is reflected correctly before the week is pre-populated.', 1, 'Requesting time off in arrears (after your timecard has been pre-populated for the week) frequently leads to overlapping records. Submitting in advance keeps your timecard clean.'),
        O('Wait until you return from your appointment to log the time off.', 0, 'Logging after the week is pre-populated is exactly what causes overlapping records.'),
        O('Don’t log it; just ensure you don’t log any work hours for that day.', 0, 'All time off must be recorded in Workday so your records and payroll are accurate.')] },
      { title: 'Reviewing pre-populated time', scn: 'You notice that your timecard has been pre-populated for the week, but it shows you working on a day you actually took as a holiday.', q: 'What should you do?', opts: [
        O('Ignore it; the system knows what it’s doing.', 0, 'Pre-population is a convenience. It does not know your actual hours or time off.'),
        O('Manually edit your timecard to reflect the correct hours for that day, ensuring you don’t have both holiday time and work hours logged.', 1, 'Pre-population is a convenience, but you are the final authority on the accuracy of your timecard. Your entries must match your actual work and time off.'),
        O('Wait until the end of the pay period to see if it fixes itself.', 0, 'It will not fix itself, and waiting risks missing the Thursday deadline.')] },
      { title: 'Overtime pre-approval', scn: 'You realize that to meet a project deadline, you will need to work 2 hours of overtime this evening.', q: 'What is the correct procedure?', opts: [
        O('Work the hours and just add them to your timecard at the end of the week.', 0, 'Overtime needs approval before you start, and hours should be reported accurately on the day they are performed.'),
        O('Obtain pre-approval from your manager before you begin working those extra hours.', 1, 'Any overtime hours worked must have prior approval from your manager to ensure proper planning and compliance. If you are unable to obtain pre-approval due to unforeseen circumstances, you must report the hours immediately and notify your leader as soon as possible.'),
        O('Send an email to your manager after you have finished working the overtime to let them know.', 0, 'An after-the-fact email is only for unforeseen circumstances, together with reporting the hours immediately in Workday. Here you can ask first.')] },
      { title: 'Handling a missed meal break', scn: 'You have been very busy and worked 6 hours straight without taking your required 30-minute unpaid meal break.', q: 'According to policy, what should you do?', opts: [
        O('Stop working 30 minutes early today to make up for the time you didn’t take for lunch.', 0, 'Cisco policy does not allow skipping a break to leave early.'),
        O('Report your total hours worked consecutively on your timecard without inserting a meal break gap, allowing the system to automatically generate the appropriate compensation.', 1, 'You must report the actual hours worked, and the system will trigger the required compensation in your next paycheck.'),
        O('Bank the 30 minutes to take as extra time off in a future pay period.', 0, 'Cisco policy does not allow banking break time.')] }
    ]
  };

  window.EVENTS = [
    { day: 0, label: 'Auto-fill', who: 'emp', when: 'Monday morning', h: 'Full-time timecards fill with your standard schedule. Part-time employees and interns create their own.' },
    { day: 3, label: 'Email', who: 'emp', when: 'Thursday morning', h: 'Reminder email, every other Thursday. Review your timecard.' },
    { day: 3, label: '8:00 PM', who: 'emp', when: 'Thursday, 8:00 PM PT', h: 'Workday submits your timecard automatically. Enter your expected Friday and weekend time before then.' },
    { day: 3, label: '8–9 PM', who: 'warn', when: 'Thursday, 8:00 – 9:00 PM PT', h: 'Do not submit manually in this window. It can cause system conflicts.' },
    { day: 3, label: '9:00 PM', who: 'lead', when: 'Thursday, 9:00 PM PT', h: 'Timecards with overtime or on-call open for leader review. Leaders are notified in Workday and by email.' },
    { day: 4, label: 'Reminder', who: 'lead', when: 'Friday', h: 'Leaders get a reminder to approve their team’s timecards.' },
    { day: 6, label: '2:30 PM', who: 'emp', when: 'Sunday, 2:30 PM PT', h: 'Last chance to correct Friday or weekend time. Workday re-submits at this moment.' },
    { day: 6, label: '6:30 PM', who: 'lead', when: 'Sunday, 6:30 PM PT', h: 'Final leader deadline. Anything not approved is processed for payment as it stands.' }
  ];

  window.EVENTS_LEAD = [
    { day: 0, label: 'Auto-fill', who: 'emp', when: 'Monday morning', h: 'Full-time employees’ timecards fill with their standard schedule. Part-time employees and interns create their own.' },
    { day: 3, label: 'Email', who: 'emp', when: 'Thursday morning', h: 'Employees receive a reminder email every other Thursday so they can review the timecard before it is submitted.' },
    { day: 3, label: '8:00 PM', who: 'emp', when: 'Thursday, 8:00 PM PT', h: 'Workday submits employee timecards automatically. Employees enter expected Friday and weekend time before then.' },
    { day: 3, label: '8–9 PM', who: 'warn', when: 'Thursday, 8:00 – 9:00 PM PT', h: 'Employees should not submit manually in this window. It can cause system conflicts.' },
    { day: 3, label: '9:00 PM', who: 'lead', when: 'Thursday, 9:00 PM PT', h: 'Timecards with overtime or on-call open for your review. You are notified in Workday and by email.' },
    { day: 4, label: 'Reminder', who: 'lead', when: 'Friday', h: 'You receive a reminder to approve your team’s timecards.' },
    { day: 6, label: '2:30 PM', who: 'emp', when: 'Sunday, 2:30 PM PT', h: 'Last moment employees can correct Friday or weekend time. Workday re-submits at this moment.' },
    { day: 6, label: '6:30 PM', who: 'lead', when: 'Sunday, 6:30 PM PT', h: 'Your final deadline. Anything you have not approved is processed for payment as it stands.' }
  ];
})();
