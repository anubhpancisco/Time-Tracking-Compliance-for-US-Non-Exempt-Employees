/* SCORM 2004 3rd Edition runtime.
   Completion is 80 percent of lessons. Status is completed / incomplete.
   Success (passed / failed) is left unknown so the LMS can report Complete/Incomplete. */
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

  function readState() {
    var state = { lessons: [], location: 0 };
    var raw = get("cmi.suspend_data");
    if (raw && raw.charAt(0) === "{") {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.lessons)) state.lessons = parsed.lessons;
        if (parsed && typeof parsed.location === "number") state.location = parsed.location;
      } catch (err) {
        state.location = 0;
      }
    }
    var loc = get("cmi.location");
    if (loc && !isNaN(parseInt(loc, 10))) state.location = parseInt(loc, 10);
    return state;
  }

  function writeState(state, lessonCount) {
    var unique = [];
    state.lessons.forEach(function (n) {
      if (unique.indexOf(n) === -1) unique.push(n);
    });
    state.lessons = unique;
    var payload = JSON.stringify({ lessons: unique, location: state.location });
    if (payload.length > 4000) {
      payload = JSON.stringify({ lessons: unique.slice(-20), location: state.location });
    }
    var percent = lessonCount ? Math.round((unique.length / lessonCount) * 100) : 0;
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
    var current = get("cmi.completion_status");
    if (current !== "completed") {
      set("cmi.completion_status", percent >= COMPLETION_PERCENT ? "completed" : "incomplete");
    }
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
