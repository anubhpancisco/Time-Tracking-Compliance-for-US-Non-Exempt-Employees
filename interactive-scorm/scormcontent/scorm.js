/* SCORM 2004 3rd Edition runtime.
   Completion is every lesson on the learner's chosen path. Status is completed / incomplete.
   Success (passed / failed) is left unknown so the LMS can report Complete/Incomplete. */
(function () {
  var COMPLETION_PERCENT = 100;
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

  function lessonIds(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    list.forEach(function (n) {
      if (typeof n === "number" && n >= 0 && n % 1 === 0 && out.indexOf(n) === -1) out.push(n);
    });
    return out;
  }

  function readState() {
    var state = { byRole: { emp: [], lead: [] }, location: 0, role: "" };
    var raw = get("cmi.suspend_data");
    if (raw && raw.charAt(0) === "{") {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.byRole && typeof parsed.byRole === "object") {
          state.byRole.emp = lessonIds(parsed.byRole.emp);
          state.byRole.lead = lessonIds(parsed.byRole.lead);
        } else if (parsed && Array.isArray(parsed.lessons)) {
          /* Older saves kept one lesson list for both paths. A list that
             includes the leader-only lesson belongs to the leader path. */
          var lessons = lessonIds(parsed.lessons);
          var empOnly = [1, 2, 3, 5, 6, 9];
          var leadOnly = [7];
          var shared = [0, 4, 8];
          var hasEmp = lessons.some(function (n) { return empOnly.indexOf(n) > -1; });
          var hasLead = lessons.some(function (n) { return leadOnly.indexOf(n) > -1; });
          var legacyRole = parsed.role === "emp" || parsed.role === "lead" ? parsed.role : "";
          if (hasLead && !hasEmp) state.byRole.lead = lessons;
          else if (hasEmp && !hasLead) state.byRole.emp = lessons;
          else if (hasEmp && hasLead) {
            state.byRole.emp = lessons.filter(function (n) { return leadOnly.indexOf(n) === -1 && shared.indexOf(n) === -1; });
            state.byRole.lead = lessons.filter(function (n) { return empOnly.indexOf(n) === -1 && shared.indexOf(n) === -1; });
          } else if (legacyRole) state.byRole[legacyRole] = lessons;
        }
        if (parsed && typeof parsed.location === "number") state.location = parsed.location;
        if (parsed && (parsed.role === "emp" || parsed.role === "lead")) state.role = parsed.role;
      } catch (err) {
        state.location = 0;
      }
    }
    var loc = get("cmi.location");
    if (loc && !isNaN(parseInt(loc, 10))) state.location = parseInt(loc, 10);
    return state;
  }

  function writeState(state, pathIds) {
    var byRole = {
      emp: lessonIds(state.byRole && state.byRole.emp),
      lead: lessonIds(state.byRole && state.byRole.lead)
    };
    state.byRole = byRole;
    var ids = Array.isArray(pathIds) ? pathIds : [];
    var role = state.role === "emp" || state.role === "lead" ? state.role : "";
    var current = role ? byRole[role] : [];
    var payload = JSON.stringify({ byRole: byRole, location: state.location, role: role });
    if (payload.length > 4000) {
      payload = JSON.stringify({
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
    set("cmi.completion_status", ids.length && doneOnPath >= ids.length ? "completed" : "incomplete");
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
