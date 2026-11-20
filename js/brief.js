/* Port of schh-community-guide/webapp/brief.js, served from schh.info so the
   installed app (scope: schh.info) keeps its sign-in. Differences: API_BASE +
   credentials "include", version links. Keep both copies in sync. */
/* Research Brief page (docs/vendor_brief_commissioning_plan.md B2).
   Static shell (brief.html) + this script: fetches the server-rendered,
   sanitized HTML from GET /api/briefs/{vendor_id}/html (or .../versions/{n}/html
   for an older version) and injects it. All Markdown -> HTML happens on the
   server (bff/brief_render.py) — this script never parses brief text itself. */

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s)
    .replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const PANELS = ["checking", "signin", "notfound", "missing", "content"];
  function show(id) {
    for (const p of PANELS) $(p).classList.toggle("hidden", p !== id);
  }

  // schh.info port (see vendors/brief/index.html): the API lives on
  // chat.schh.info; credentials "include" sends its host-only session
  // cookies on this same-site request, like js/guide-chat.js.
  const API_BASE = "https://chat.schh.info";
  function api(path, options) {
    return fetch(API_BASE + path, Object.assign({
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }, options));
  }

  const params = new URLSearchParams(location.search);
  const vendorId = (params.get("vendor_id") || "").trim();
  const versionParam = params.get("version");

  const STATUS_LABEL = {
    published: "Published",
    published_with_limitations: "Published with limitations",
  };

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function renderVersionLine(brief) {
    const total = (brief.history && brief.history.length) || brief.version;
    let html = "Version " + esc(brief.version) + " of " + esc(total);
    const others = (brief.history || []).filter(h => h.version !== brief.version);
    if (others.length) {
      const links = others
        .sort((a, b) => b.version - a.version)
        .map(h => `<a href="/vendors/brief/?vendor_id=${encodeURIComponent(vendorId)}&version=${h.version}">`
          + `v${esc(h.version)} (${esc(formatDate(h.research_date))})</a>`)
        .join(", ");
      html += ' &middot; earlier versions: ' + links;
    }
    return html;
  }

  function renderSources(sources) {
    const list = $("sourcesList");
    list.innerHTML = "";
    if (!sources || !sources.length) {
      $("sourcesSection").classList.add("hidden");
      return;
    }
    $("sourcesSection").classList.remove("hidden");
    const sorted = sources.slice().sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0));
    for (const s of sorted) {
      const li = document.createElement("li");
      const title = esc(s.title || s.url);
      const link = s.url
        ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${title}</a>`
        : title;
      const bits = [];
      if (s.kind) bits.push(esc(s.kind));
      if (s.accessed_at) bits.push("accessed " + esc(formatDate(s.accessed_at)));
      li.innerHTML = link + (bits.length ? ` <span class="src-meta">(${bits.join(", ")})</span>` : "");
      list.appendChild(li);
    }
  }

  function render(brief) {
    document.title = (brief.vendor && brief.vendor.name ? brief.vendor.name + " — " : "")
      + "Research Brief — SCHH Community Guide";
    $("vendorName").textContent = (brief.vendor && brief.vendor.name) || "This vendor";
    $("backLink").href = "https://schh.info/vendors/?vendor_id=" + encodeURIComponent(vendorId);

    $("metaLine").innerHTML = "Research completed " + esc(formatDate(brief.research_date))
      + " &middot; " + renderVersionLine(brief);

    // What changed in this version (plan C3) — only set on a version an
    // applied correction produced; every ordinary version has none.
    const own = (brief.history || []).find(h => h.version === brief.version);
    const changeLine = $("changeNoteLine");
    if (changeLine) {
      if (own && own.change_note) {
        changeLine.textContent = own.change_note;
        changeLine.classList.remove("hidden");
      } else {
        changeLine.classList.add("hidden");
      }
    }

    const badge = $("statusBadge");
    const limited = brief.status === "published_with_limitations";
    badge.textContent = STATUS_LABEL[brief.status] || brief.status;
    badge.className = "badge " + (limited ? "badge-limited" : "badge-published");

    // The plain-language limitations list itself lives at the end of the
    // page, after Sources (bff/briefs.py renders it from the friendly
    // sentence list, not the gate engine's raw reasons) — only a one-line
    // pointer appears up here, and only when the brief actually carries a
    // limitation to point to.
    const limBlock = $("limitationsBlock");
    const pointer = $("limitationsPointer");
    if (brief.limitations_html) {
      $("limitationsBody").innerHTML = brief.limitations_html;
      limBlock.classList.remove("hidden");
      pointer.classList.toggle("hidden", !limited);
    } else {
      limBlock.classList.add("hidden");
      $("limitationsBody").innerHTML = "";
      pointer.classList.add("hidden");
    }

    $("narrativeBody").innerHTML = brief.narrative_html || "";
    wrapTables($("narrativeBody"));
    renderSources(brief.sources);

    currentVersion = brief.version;
    show("content");
  }

  // ----------------------------------------------------- correction panel
  // A signed-in resident only ever reaches #content (the page gates on the
  // session before fetching a brief at all), so this is always the resident
  // form — a business with no account uses brief-correction-business.html,
  // linked from the #signin panel instead.
  let currentVersion = null;

  function submitCorrection() {
    const text = $("correctionText").value.trim();
    const err = $("correctionError");
    err.textContent = "";
    if (text.length < 20) {
      err.textContent = "Say a bit more about what's wrong (at least 20 characters).";
      return;
    }
    $("correctionSubmit").disabled = true;
    api(`/api/briefs/${encodeURIComponent(vendorId)}/corrections`, {
      method: "POST",
      body: JSON.stringify({ text, version: currentVersion }),
    })
      .then(async r => {
        if (r.ok) {
          $("correctionText").value = "";
          $("correctionText").classList.add("hidden");
          $("correctionSubmit").classList.add("hidden");
          $("correctionDone").classList.remove("hidden");
          return;
        }
        const payload = await r.json().catch(() => ({}));
        const message = payload.error && payload.error.message;
        if (r.status === 429) {
          err.textContent = "You've reached today's correction limit — please try again tomorrow.";
        } else {
          err.textContent = message || "Something went wrong. Please try again in a moment.";
        }
        $("correctionSubmit").disabled = false;
      })
      .catch(() => {
        err.textContent = "Something went wrong. Please check your connection and try again.";
        $("correctionSubmit").disabled = false;
      });
  }

  // Tables must scroll inside their own container, never widen the page —
  // the server's sanitized HTML has bare <table> elements, so wrap each one
  // after injection rather than teaching the sanitizer about wrapper divs.
  function wrapTables(root) {
    root.querySelectorAll("table").forEach(table => {
      if (table.parentElement.classList.contains("table-scroll")) return;
      const wrap = document.createElement("div");
      wrap.className = "table-scroll";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function loadBrief() {
    const path = versionParam
      ? `/api/briefs/${encodeURIComponent(vendorId)}/versions/${encodeURIComponent(versionParam)}/html`
      : `/api/briefs/${encodeURIComponent(vendorId)}/html`;
    api(path)
      .then(async r => {
        if (r.status === 401 || r.status === 403) { show("signin"); return; }
        if (r.status === 404) {
          $("notfoundBack").href = "https://schh.info/vendors/?vendor_id=" + encodeURIComponent(vendorId);
          $("notfoundMsg").textContent = versionParam
            ? "That version of this research brief is not available."
            : "No research brief has been published for this vendor yet.";
          show("notfound");
          return;
        }
        if (!r.ok) { show("notfound"); return; }
        const data = await r.json();
        render(data);
      })
      .catch(() => show("notfound"));
  }

  $("correctionSubmit").addEventListener("click", submitCorrection);

  if (!vendorId) { show("missing"); return; }

  api("/api/auth/session", { method: "GET" })
    .then(r => r.json())
    .then(s => { if (s.authenticated) loadBrief(); else show("signin"); })
    .catch(() => show("signin"));
})();
