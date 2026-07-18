/* SCHH Community Guide chat component.
   Canonical copy: schh-community-guide/webapp/chat.js — the schh-info
   site repo carries a copy at js/guide-chat.js; edit here, then re-copy.

   Usage on any page:
     <div id="guide-app" data-api-base="https://chat.schh.info"></div>
     <script src="/js/guide-chat.js"></script>

   data-api-base is omitted on the standalone chat.schh.info page
   (same-origin). Cross-origin use relies on the BFF's CORS allowlist and
   works because schh.info and chat.schh.info are the same site for
   cookie purposes. */

(function () {
  "use strict";
  const root = document.getElementById("guide-app");
  if (!root) return;
  const API = (root.dataset.apiBase || "").replace(/\/$/, "");

  root.innerHTML = `
    <section class="ga-card ga-hidden" data-ga="login">
      <h2>Sign in</h2>
      <p>Enter the email address associated with your resident account.
         We&rsquo;ll send you a six-digit sign-in code.</p>
      <label for="ga-email">Email address</label>
      <input type="email" id="ga-email" autocomplete="email" required>
      <button class="ga-btn" data-ga="sendCode">Send code</button>
      <p class="ga-note">You will not need to create or remember a password.</p>
      <p class="ga-error" data-ga="loginError" role="alert"></p>
    </section>

    <section class="ga-card ga-hidden" data-ga="otp">
      <h2>Check your email</h2>
      <p>Enter the six-digit code sent to <strong data-ga="maskedEmail"></strong>.</p>
      <label for="ga-code">Sign-in code</label>
      <input type="text" id="ga-code" class="ga-otp" inputmode="numeric"
             autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}">
      <button class="ga-btn" data-ga="verify">Verify and continue</button>
      <p class="ga-note">
        <button class="ga-linkish" data-ga="resend" disabled>Resend code
          (<span data-ga="countdown">60</span>s)</button>
        &nbsp;&middot;&nbsp;
        <button class="ga-linkish" data-ga="changeEmail">Use a different email</button>
      </p>
      <p class="ga-error" data-ga="otpError" role="alert"></p>
    </section>

    <div class="ga-hidden" data-ga="chatWrap">
      <div class="ga-toolbar">
        <button class="ga-linkish" data-ga="newConvo">Clear conversation</button>
        <span class="ga-toolbar-sep">&middot;</span>
        <button class="ga-linkish" data-ga="logout">Sign out</button>
      </div>
      <div class="ga-messages" data-ga="messages" aria-live="polite"></div>
      <form class="ga-composer" data-ga="composer">
        <input data-ga="question" placeholder="Ask about events, news, amenities, rules&hellip;"
               autocomplete="off" maxlength="2000">
        <button type="submit">Send</button>
      </form>
    </div>`;

  const el = {};
  root.querySelectorAll("[data-ga]").forEach(node => { el[node.dataset.ga] = node; });
  const emailInput = root.querySelector("#ga-email");
  const codeInput = root.querySelector("#ga-code");

  let conversationId = null;
  let pendingEmail = "";
  let firstName = "";
  let timer = null;

  function greet() {
    const hello = firstName ? `Welcome, ${firstName}!` : "Welcome!";
    addBubble("bot", hello + " Ask me about community events, recent news, amenities, "
      + "or rules and procedures — answers include links to the source documents.");
  }

  function show(screen) {
    el.login.classList.toggle("ga-hidden", screen !== "login");
    el.otp.classList.toggle("ga-hidden", screen !== "otp");
    el.chatWrap.classList.toggle("ga-hidden", screen !== "chat");
    // history is loaded separately (enterChat); only greet here when we
    // arrive at an empty panel through a path that doesn't load history
    if (screen === "chat" && !el.messages.childElementCount) greet();
  }

  // Enter the chat screen, resuming the resident's most recent conversation
  // across browser sessions (Dify stores it, keyed to the stable identity).
  async function enterChat() {
    el.chatWrap.classList.remove("ga-hidden");
    el.login.classList.add("ga-hidden");
    el.otp.classList.add("ga-hidden");
    el.messages.innerHTML = "";
    try {
      const response = await api("/api/chat/latest", { method: "GET" });
      const data = response.ok ? await response.json() : {};
      conversationId = data.conversationId || null;
      if (data.messages && data.messages.length) {
        for (const m of data.messages) addBubble(m.role, m.text);
      } else {
        greet();
      }
    } catch {
      greet();
    }
    el.messages.scrollTop = el.messages.scrollHeight;
    el.question.focus();
  }

  // Clears the conversation on both sides: the server deletes the Dify
  // threads (otherwise /api/chat/latest resurrects them on the next page
  // load) and the panel resets. Deliberately does NOT focus the input: on
  // phones that would pop the virtual keyboard the moment the resident
  // taps Clear. If the server call fails, the panel still clears; worst
  // case the history returns on the next reload (the old behavior).
  function clearConversation() {
    conversationId = null;
    el.messages.innerHTML = "";
    greet();
    api("/api/chat/clear", { method: "POST" }).catch(() => {});
  }

  function api(path, options) {
    return fetch(API + path, Object.assign({
      headers: { "Content-Type": "application/json" },
      credentials: API ? "include" : "same-origin",
    }, options));
  }

  // GFM pipe tables -> <table>. Runs after inline formatting so cells keep
  // their links/bold, and before the paragraph split so the multi-line block
  // collapses to one block element. A table is a header row, an alignment
  // delimiter row (dashes/colons), then data rows.
  function renderTables(text) {
    const cells = row => row.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    const isDelim = row => /-/.test(row) && /^\s*\|?(\s*:?-+:?\s*\|)*\s*:?-+:?\s*\|?\s*$/.test(row);
    const lines = text.split("\n");
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("|") && i + 1 < lines.length && isDelim(lines[i + 1])) {
        const head = cells(lines[i]);
        const align = cells(lines[i + 1]).map(c =>
          c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : "");
        const sty = j => align[j] ? ` style="text-align:${align[j]}"` : "";
        const body = [];
        i += 2;
        while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") { body.push(cells(lines[i])); i++; }
        i--; // the for-loop re-increments past the last consumed row
        out.push(
          "<table><thead><tr>" + head.map((c, j) => `<th${sty(j)}>${c}</th>`).join("") + "</tr></thead><tbody>" +
          body.map(r => "<tr>" + head.map((_, j) => `<td${sty(j)}>${r[j] || ""}</td>`).join("") + "</tr>").join("") +
          "</tbody></table>");
      } else {
        out.push(lines[i]);
      }
    }
    return out.join("\n");
  }

  // minimal safe markdown: escape first, then links/bold/headings/tables/lists
  function render(md) {
    let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    h = h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    h = renderTables(h);
    h = h.replace(/^###\s?(.+)$/gm, "<h3>$1</h3>").replace(/^##\s?(.+)$/gm, "<h2>$1</h2>");
    h = h.replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
         .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    return h.split(/\n{2,}/).map(p =>
      /^<(h\d|ul|table)/.test(p) ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }

  // ---- Google Maps links for known community locations ----------------
  // Location table GENERATED by src/build_guide_locations.py from
  // Amenity_Locations.geojson. Regenerate + paste into BOTH widget copies
  // (webapp/chat.js and schh-info js/guide-chat.js) when the geojson changes.
  const GUIDE_LOCATIONS = [
    ["New River Sports Park Pickleball Courts", 32.2784, -80.97255],
    ["Hidden Cypress Golf Clubhouse", 32.27776, -80.97926],
    ["Hidden Cypress Fitness Center", 32.27779, -80.97865],
    ["The Clubhouse at Okatie Creek", 32.28943, -80.95197],
    ["Town Square Bocce Ball Courts", 32.29398, -80.95281],
    ["Breakwater Fitness Collective", 32.32489, -80.96231],
    ["Argent Lakes Pub & Pizzeria", 32.30913, -80.95466],
    ["Argent Lakes Golf Clubhouse", 32.309, -80.95464],
    ["Hidden Cypress Outdoor Pool", 32.27787, -80.97818],
    ["Lakehouse Pickleball Courts", 32.30932, -80.95404],
    ["Okatie Creek Golf Clubhouse", 32.28945, -80.95191],
    ["Boat and RV Park/Campsite", 32.27872, -80.94732],
    ["Purrysburg Fitness Center", 32.29441, -80.95275],
    ["Town Square Tennis Courts", 32.29381, -80.95367],
    ["Breakwater Outdoor Courts", 32.32571, -80.96217],
    ["The Brackish Bar & Lounge", 32.32409, -80.96235],
    ["Sgt. William Jasper Gate", 32.31531, -80.95819],
    ["Lakehouse Tennis Courts", 32.30969, -80.95419],
    ["Veterans Memorial Field", 32.27707, -80.9719],
    ["William Pope Drive Gate", 32.29742, -80.95068],
    ["Breakwater Outdoor Pool", 32.32441, -80.96196],
    ["Barataria Outdoor Pool", 32.29435, -80.95328],
    ["Lakehouse Outdoor Pool", 32.30968, -80.95624],
    ["Riverbend Outdoor Pool", 32.30778, -80.92969],
    ["Sun City West Dog Park", 32.32455, -80.96874],
    ["Yemassee Crafts Center", 32.29394, -80.95186],
    ["Kings Creek Drive Gate", 32.3008, -80.94655],
    ["Argent Lakes Dog Park", 32.30987, -80.9567],
    ["New River Sports Park", 32.27726, -80.97195],
    ["Okatie Farms Andover", 32.2848, -80.97751],
    ["Tidewatch Drive Gate", 32.31095, -80.94255],
    ["Jameson’s Charhouse", 32.27779, -80.9789],
    ["Sundance Drive Gate", 32.322, -80.97097],
    ["Lake Somerset Gate", 32.28664, -80.94315],
    ["Sun City West Gate", 32.3175, -80.95978],
    ["Argent Blvd Bridge", 32.31621, -80.95842],
    ["Okatie Farms East", 32.27981, -80.97171],
    ["Okatie Farms West", 32.28009, -80.97207],
    ["Woodworkers' Shop", 32.27674, -80.9692],
    ["Millennium Bridge", 32.29967, -80.95034],
    ["Palmetto Commons", 32.2907, -80.95085],
    ["Red Dam Dog Park", 32.27712, -80.97017],
    ["Volleyball Court", 32.27815, -80.97228],
    ["Mulching Center", 32.27734, -80.96782],
    ["Riverbend Lodge", 32.30754, -80.92972],
    ["Dreamscape Gate", 32.31999, -80.95264],
    ["Riverbend Gate", 32.31154, -80.93439],
    ["Bull Hill Gate", 32.27137, -80.95328],
    ["Lake Somerset", 32.28868, -80.94412],
    ["Logo Building", 32.29418, -80.95319],
    ["Magnolia Hall", 32.29297, -80.95262],
    ["Pinckney Hall", 32.29323, -80.95168],
    ["Computer Club", 32.29417, -80.95177],
    ["Nature Trail", 32.28699, -80.96646],
    ["Brackish Bar", 32.32409, -80.96235],
    ["North Gate", 32.30221, -80.95584],
    ["Lakehouse", 32.3097, -80.95519],
    ["Main Gate", 32.29971, -80.95606],
    ["AL's Pub", 32.30913, -80.95466],
    ["Pavilion", 32.29362, -80.95256],
  ];
  const _locNorm = s => s.replace(/[’']/g, "'").replace(/&/g, "and").replace(/\s+/g, " ").trim().toLowerCase();
  const _locCoords = new Map(GUIDE_LOCATIONS.map(([n, lat, lng]) => [_locNorm(n), lat + "," + lng]));
  const _locPat = n => {
    const MARK = "@AMP@";
    let s = n.replace(/[.^$*+?()[\]{}|\\/]/g, m => "\\" + m);
    s = s.replace(/[’']/g, "['’]");
    s = s.replace(/\s*&\s*/g, MARK);
    s = s.replace(/\s+/g, "\\s+");
    return s.split(MARK).join("\\s*(?:&|and)\\s*");
  };
  const _locRe = new RegExp("\\b(" + GUIDE_LOCATIONS.map(([n]) => _locPat(n)).join("|") + ")\\b", "gi");
  const _MAP_ICON = '<svg class="ga-mapicon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';

  // Turn known community locations mentioned in an answer into Google Maps
  // links (first mention of each). Walks text nodes and skips any already
  // inside a link (e.g. citations) so existing HTML is never corrupted.
  function linkifyLocations(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && n.parentElement.closest("a")) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    const seen = new Set();
    for (const node of nodes) {
      const text = node.nodeValue;
      _locRe.lastIndex = 0;
      let m, last = 0, made = false;
      const frag = document.createDocumentFragment();
      while ((m = _locRe.exec(text))) {
        const key = _locNorm(m[1]);
        const coords = _locCoords.get(key);
        if (!coords || seen.has(key)) continue;
        seen.add(key);
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const a = document.createElement("a");
        a.className = "ga-maplink";
        a.href = "https://www.google.com/maps/search/?api=1&query=" + coords;
        a.target = "_blank";
        a.rel = "noopener";
        a.appendChild(document.createTextNode(m[1]));
        a.insertAdjacentHTML("beforeend", _MAP_ICON);
        frag.appendChild(a);
        last = m.index + m[1].length;
        made = true;
      }
      if (!made) continue;
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    }
  }

  function addBubble(who, text) {
    const wrap = document.createElement("div");
    wrap.className = `ga-msg ga-${who}`;
    const bubble = document.createElement("div");
    bubble.className = "ga-bubble";
    if (who === "you") bubble.textContent = text; else { bubble.innerHTML = render(text); linkifyLocations(bubble); }
    wrap.appendChild(bubble);
    el.messages.appendChild(wrap);
    el.messages.scrollTop = el.messages.scrollHeight;
    return bubble;
  }

  // ------------------------------------------------------------- login
  el.sendCode.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    el.loginError.textContent = "";
    if (!email) { el.loginError.textContent = "Enter your email address."; return; }
    el.sendCode.disabled = true;
    try {
      await api("/api/auth/request-otp", { method: "POST", body: JSON.stringify({ email }) });
      pendingEmail = email;
      el.maskedEmail.textContent = email.replace(/^(.).*(@.*)$/, "$1***$2");
      codeInput.value = "";
      show("otp"); codeInput.focus(); startCountdown();
    } catch { el.loginError.textContent = "Something went wrong. Try again."; }
    el.sendCode.disabled = false;
  });

  function startCountdown() {
    let seconds = 60;
    el.resend.disabled = true;
    el.countdown.textContent = seconds;
    clearInterval(timer);
    timer = setInterval(() => {
      seconds -= 1;
      el.countdown.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        el.resend.disabled = false;
        el.resend.textContent = "Resend code";
      }
    }, 1000);
  }

  el.resend.addEventListener("click", async () => {
    await api("/api/auth/request-otp",
      { method: "POST", body: JSON.stringify({ email: pendingEmail }) });
    el.resend.innerHTML = 'Resend code (<span data-ga="countdown">60</span>s)';
    el.countdown = el.resend.querySelector("[data-ga=countdown]");
    startCountdown();
  });

  el.changeEmail.addEventListener("click", () => show("login"));

  el.verify.addEventListener("click", async () => {
    el.otpError.textContent = "";
    const token = codeInput.value.trim();
    if (!/^[0-9]{6}$/.test(token)) {
      el.otpError.textContent = "Enter the six-digit code."; return;
    }
    el.verify.disabled = true;
    const response = await api("/api/auth/verify-otp",
      { method: "POST", body: JSON.stringify({ email: pendingEmail, token }) });
    el.verify.disabled = false;
    if (response.ok) {
      const body = await response.json().catch(() => ({}));
      firstName = (body.user && body.user.firstName) || "";
      enterChat();
    } else {
      const body = await response.json().catch(() => ({}));
      el.otpError.textContent = (body.error && body.error.message)
        || "The code is invalid or has expired.";
    }
  });
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); el.verify.click(); }
  });

  el.newConvo.addEventListener("click", clearConversation);

  el.logout.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    conversationId = null;
    firstName = "";
    el.messages.innerHTML = "";
    show("login");
  });

  // -------------------------------------------------------------- chat
  el.composer.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = el.question.value.trim();
    if (!message) return;
    el.question.value = "";
    addBubble("you", message);
    const bubble = addBubble("bot", "");
    bubble.innerHTML = '<span class="ga-typing">Looking that up'
      + '<span class="ga-typing-dots" aria-hidden="true">'
      + '<span>.</span><span>.</span><span>.</span></span></span>';

    const response = await api("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
    });
    if (!response.ok) {
      if (response.status === 401) { show("login"); return; }
      const body = await response.json().catch(() => ({}));
      bubble.textContent = (body.error && body.error.message)
        || "The guide is temporarily unavailable. Please try again.";
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", answer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop();
      for (const event of events) {
        const line = event.split("\n").find(l => l.startsWith("data: "));
        if (!line) continue;
        let payload;
        try { payload = JSON.parse(line.slice(6)); } catch { continue; }
        if (payload.conversation_id) conversationId = payload.conversation_id;
        if (payload.event === "message" && payload.answer) {
          answer += payload.answer;
          bubble.innerHTML = render(answer); linkifyLocations(bubble);
          el.messages.scrollTop = el.messages.scrollHeight;
        } else if (payload.event === "error") {
          answer += "\n\n_The guide hit a problem answering this._";
          bubble.innerHTML = render(answer); linkifyLocations(bubble);
        }
      }
    }
    if (!answer) bubble.textContent = "No answer was returned. Please try again.";
  });

  // ----------------------------------------------------------- startup
  api("/api/auth/session", { method: "GET" })
    .then(r => r.json())
    .then(s => {
      firstName = (s.user && s.user.firstName) || "";
      if (s.authenticated) enterChat(); else show("login");
    })
    .catch(() => show("login"));
})();
