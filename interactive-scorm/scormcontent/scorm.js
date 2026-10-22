/* SCORM 2004 3rd Edition runtime.
   The course is completed when the learner finishes 80 percent of the lessons
   on the path they chose. Status is completed / incomplete.
   Success (passed / failed) stays unknown so the LMS reports Complete/Incomplete. */
(function () {
  var COMPLETION_PERCENT = 80;
  var started = Date.now();

  function findAPI(win) {
    var attempts = 0;
    var current = win;
    while (current && attempts < 500) {
      try {
        if (current.API_1484_11) return current.API_1484_11;
      } catch (err) {
        return null;
      }
      if (current.parent && current.parent !== current) {
        current = current.parent;
        attempts += 1;
      } else {
        break;
      }
    }
    return null;
  }

  function MemoryAPI() {
    this.store = {
      "cmi.completion_status": "not attempted",
      "cmi.success_status": "unknown",
      "cmi.location": "",
      "cmi.suspend_data": "",
      "cmi.progress_measure": "",
      "cmi.score.scaled": "",
      "cmi.score.raw": "",
      "cmi.score.min": "0",
      "cmi.score.max": "100",
      "cmi.session_time": "",
      "cmi.exit": ""
    };
  }
  MemoryAPI.prototype.Initialize = function () { return "true"; };
  MemoryAPI.prototype.Terminate = function () { return "true"; };
  MemoryAPI.prototype.GetValue = function (key) { return this.store[key] || ""; };
  MemoryAPI.prototype.SetValue = function (key, value) {
    this.store[key] = String(value);
    return "true";
  };
  MemoryAPI.prototype.Commit = function () { return "true"; };
  MemoryAPI.prototype.GetLastError = function () { return "0"; };
  MemoryAPI.prototype.GetErrorString = function () { return ""; };
  MemoryAPI.prototype.GetDiagnostic = function () { return ""; };

  var api = findAPI(window);
  if (!api) {
    try {
      if (window.opener) api = findAPI(window.opener);
    } catch (err) {
      api = null;
    }
  }
  var preview = false;
  if (!api) {
    api = new MemoryAPI();
    preview = true;
  }

  var initResult = api.Initialize("");
  var ready = initResult === "true" || initResult === true;
  var terminated = false;

  function get(key) {
    if (!ready || terminated) return "";
    return api.GetValue(key) || "";
  }
  function set(key, value) {
    if (!ready || terminated) return;
    api.SetValue(key, String(value));
  }
  function commit() {
    if (!ready || terminated) return;
    api.Commit("");
  }
  function sessionTime() {
    var total = Math.max(0, Math.floor((Date.now() - started) / 1000));
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    return "PT" + hours + "H" + minutes + "M" + seconds + "S";
  }
  function scaled(percent) {
    if (percent >= 100) return "1";
    if (percent <= 0) return "0";
    return (percent / 100).toFixed(2);
  }

  var completion = get("cmi.completion_status");
  if (!completion || completion === "not attempted" || completion === "unknown") {
    set("cmi.completion_status", "incomplete");
    set("cmi.success_status", "unknown");
    set("cmi.score.min", "0");
    set("cmi.score.max", "100");
    set("cmi.score.raw", "0");
    set("cmi.score.scaled", "0");
    set("cmi.progress_measure", "0");
    commit();
  }

  /* These match the paths in app.js. A lesson id is stored only on the path
     that actually contains it, so finishing the employee path cannot check
     People Leaders, and finishing the leader path cannot check employee lessons. */
  var EMP_IDS = [0, 1, 2, 3, 4, 5, 6, 8, 9];
  var LEAD_IDS = [0, 4, 7, 8];
  var STATE_VERSION = 3;

  function blankState() {
    return { byRole: { emp: [], lead: [] }, location: 0, role: "" };
  }

  function lessonIds(list, allowed) {
    var out = [];
    if (!Array.isArray(list)) return out;
    list.forEach(function (value) {
      var n = typeof value === "number" ? value : NaN;
      if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) n = parseInt(value, 10);
      if (n >= 0 && n % 1 === 0 && out.indexOf(n) === -1 && (!allowed || allowed.indexOf(n) > -1)) out.push(n);
    });
    return out;
  }

  /* Older packages stored one lesson list for both paths. Cornerstone restores
     that list on the same registration, which painted checks before a learner
     had opened anything. Those saves are cleared. A new attempt (ab-initio)
     also starts blank. */
  function clearSavedProgress() {
    set("cmi.suspend_data", "");
    set("cmi.location", "0");
    set("cmi.completion_status", "incomplete");
    set("cmi.success_status", "unknown");
    set("cmi.score.raw", "0");
    set("cmi.score.scaled", "0");
    set("cmi.progress_measure", "0");
    set("cmi.exit", "suspend");
    commit();
  }

  function readState() {
    var entry = (get("cmi.entry") || "").toLowerCase();
    var raw = (get("cmi.suspend_data") || "").replace(/^\uFEFF/, "").trim();
    var parsed = null;
    if (raw.charAt(0) === "{") {
      try { parsed = JSON.parse(raw); } catch (err) { parsed = null; }
    }
    var current = parsed && parsed.v === STATE_VERSION && parsed.byRole && typeof parsed.byRole === "object";
    if (entry === "ab-initio" || !current) {
      if (raw || get("cmi.completion_status") === "completed") clearSavedProgress();
      return blankState();
    }
    var state = blankState();
    state.byRole.emp = lessonIds(parsed.byRole.emp, EMP_IDS);
    state.byRole.lead = lessonIds(parsed.byRole.lead, LEAD_IDS);
    if (parsed.role === "emp" || parsed.role === "lead") state.role = parsed.role;
    if (typeof parsed.location === "number" && parsed.location >= 0) state.location = parsed.location;
    return state;
  }

  function writeState(state, pathIds) {
    var byRole = {
      emp: lessonIds(state.byRole && state.byRole.emp, EMP_IDS),
      lead: lessonIds(state.byRole && state.byRole.lead, LEAD_IDS)
    };
    state.byRole = byRole;
    var ids = Array.isArray(pathIds) ? pathIds : [];
    var role = state.role === "emp" || state.role === "lead" ? state.role : "";
    var current = role ? byRole[role] : [];
    var payload = JSON.stringify({ v: STATE_VERSION, byRole: byRole, location: state.location, role: role });
    if (payload.length > 4000) {
      payload = JSON.stringify({
        v: STATE_VERSION,
        byRole: { emp: byRole.emp.slice(-12), lead: byRole.lead.slice(-12) },
        location: state.location,
        role: role
      });
    }
    var doneOnPath = 0;
    ids.forEach(function (n) { if (current.indexOf(n) > -1) doneOnPath += 1; });
    var percent = ids.length ? Math.round((doneOnPath / ids.length) * 100) : 0;
    var measure = scaled(percent);
    set("cmi.suspend_data", payload);
    set("cmi.location", String(state.location));
    set("cmi.progress_measure", measure);
    set("cmi.score.min", "0");
    set("cmi.score.max", "100");
    set("cmi.score.raw", String(percent));
    set("cmi.score.scaled", measure);
    set("cmi.success_status", "unknown");
    set("cmi.exit", "suspend");
    set("cmi.session_time", sessionTime());
    var alreadyComplete = get("cmi.completion_status") === "completed";
    var met = ids.length > 0 && (doneOnPath / ids.length) >= (COMPLETION_PERCENT / 100);
    set("cmi.completion_status", (alreadyComplete || met) ? "completed" : "incomplete");
    commit();
    return get("cmi.completion_status");
  }

  function finish() {
    if (!ready || terminated) return;
    set("cmi.exit", "suspend");
    set("cmi.session_time", sessionTime());
    commit();
    terminated = true;
    try { api.Terminate(""); } catch (err) { /* player already closed the session */ }
  }

  window.addEventListener("pagehide", finish);

  window.SCORM = {
    preview: preview,
    completion: COMPLETION_PERCENT / 100,
    get: get,
    readState: readState,
    writeState: writeState,
    status: function () { return get("cmi.completion_status"); }
  };
})();
