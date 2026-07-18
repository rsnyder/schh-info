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

  // Clears the visible conversation and detaches from the old thread.
  // Deliberately does NOT focus the input: on phones that would pop the
  // virtual keyboard the moment the resident taps Clear.
  function clearConversation() {
    conversationId = null;
    el.messages.innerHTML = "";
    greet();
  }

  function api(path, options) {
    return fetch(API + path, Object.assign({
      headers: { "Content-Type": "application/json" },
      credentials: API ? "include" : "same-origin",
    }, options));
  }

  // minimal safe markdown: escape first, then links/bold/headings/lists
  function render(md) {
    let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    h = h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/^###\s?(.+)$/gm, "<h3>$1</h3>").replace(/^##\s?(.+)$/gm, "<h2>$1</h2>");
    h = h.replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
         .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    return h.split(/\n{2,}/).map(p =>
      /^<(h\d|ul)/.test(p) ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }

  function addBubble(who, text) {
    const wrap = document.createElement("div");
    wrap.className = `ga-msg ga-${who}`;
    const bubble = document.createElement("div");
    bubble.className = "ga-bubble";
    if (who === "you") bubble.textContent = text; else bubble.innerHTML = render(text);
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
          bubble.innerHTML = render(answer);
          el.messages.scrollTop = el.messages.scrollHeight;
        } else if (payload.event === "error") {
          answer += "\n\n_The guide hit a problem answering this._";
          bubble.innerHTML = render(answer);
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
