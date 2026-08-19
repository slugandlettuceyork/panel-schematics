/**
 * APP.JS
 * ----------------------------------------------------------------
 * Shared logic for the panel schematic site.
 *
 * SETUP: fill in your Supabase project URL + anon key below.
 * You get these from your Supabase project's Settings > API page.
 * The anon key is safe to expose publicly — it can only do what
 * your Row Level Security policies (see supabase-schema.sql) allow.
 */
const SUPABASE_URL = "https://sqhelmsuxkyzmxgqlsya.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxaGVsbXN1eGt5em14Z3Fsc3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjMyMTAsImV4cCI6MjEwMjY5OTIxMH0.igJDfbWeqwmbdZ99Kh_07dimkHWMHb4IZNsgH--OvhQ";

const sb = (SUPABASE_URL.startsWith("http"))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const App = (() => {

  let session = null;
  let notesCache = {}; // key: `${panelSlug}::${position}` -> row

  // ---------------- auth ----------------

  async function initAuth(){
    if(!sb) return;
    const { data } = await sb.auth.getSession();
    session = data.session;
    sb.auth.onAuthStateChange((_evt, newSession) => {
      session = newSession;
      document.dispatchEvent(new CustomEvent("authchange"));
    });
    document.dispatchEvent(new CustomEvent("authchange"));
  }

  function isEditor(){ return !!session; }

  async function login(email, password){
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function logout(){
    await sb.auth.signOut();
  }

  async function sendPasswordReset(email){
    const redirectTo = new URL("reset-password.html", window.location.href).toString();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? error.message : null;
  }

  // ---------------- notes data ----------------

  async function loadNotesForPanel(panelSlug){
    if(!sb) return {};
    const { data, error } = await sb
      .from("circuit_notes")
      .select("*")
      .eq("panel_slug", panelSlug);
    if(error){ console.error(error); return {}; }
    const map = {};
    (data || []).forEach(row => {
      map[`${row.panel_slug}::${row.position}`] = row;
      notesCache[`${row.panel_slug}::${row.position}`] = row;
    });
    return map;
  }

  async function loadAllNotes(){
    if(!sb) return {};
    const { data, error } = await sb.from("circuit_notes").select("*");
    if(error){ console.error(error); return {}; }
    const map = {};
    (data || []).forEach(row => {
      map[`${row.panel_slug}::${row.position}`] = row;
      notesCache[`${row.panel_slug}::${row.position}`] = row;
    });
    return map;
  }

  async function saveNote(panelSlug, position, { custom_label, notes }){
    if(!sb || !isEditor()) return "Not signed in.";
    const { error } = await sb
      .from("circuit_notes")
      .upsert({
        panel_slug: panelSlug,
        position: position,
        custom_label: custom_label || "",
        notes: notes || "",
        updated_at: new Date().toISOString(),
        updated_by: session.user.email
      }, { onConflict: "panel_slug,position" });
    return error ? error.message : null;
  }

  // ---------------- rendering: schematic board ----------------

  function circuitKey(panelSlug, position){ return `${panelSlug}::${position}`; }

  function renderBoard(mountEl, panelSlug, panelDef, notesMap){
    mountEl.innerHTML = "";

    const left = panelDef.circuits.filter(c => c.side === "L");
    const right = panelDef.circuits.filter(c => c.side === "R");

    const boardEl = document.createElement("div");
    boardEl.className = "board";

    const cols = document.createElement("div");
    cols.className = "board-columns";

    function buildColumn(list, labelText){
      const wrap = document.createElement("div");
      if(labelText){
        const l = document.createElement("div");
        l.className = "col-label";
        l.textContent = labelText;
        wrap.appendChild(l);
      }
      const ul = document.createElement("ul");
      ul.className = "breaker-list";
      list.forEach(c => ul.appendChild(buildBreakerEl(panelSlug, c, notesMap)));
      wrap.appendChild(ul);
      return wrap;
    }

    if(right.length){
      cols.appendChild(buildColumn(left, "Column 1"));
      cols.appendChild(buildColumn(right, "Column 2"));
    } else {
      cols.style.gridTemplateColumns = "1fr";
      cols.appendChild(buildColumn(left, null));
    }

    boardEl.appendChild(cols);
    mountEl.appendChild(boardEl);
  }

  function buildBreakerEl(panelSlug, c, notesMap){
    const row = notesMap[circuitKey(panelSlug, c.position)];
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "breaker" + (row && (row.notes || row.custom_label) ? " has-note" : "") + (c.flag ? " flagged" : "");
    btn.type = "button";
    btn.dataset.searchText = [
      c.position, c.label, row?.custom_label, row?.notes
    ].filter(Boolean).join(" ").toLowerCase();

    btn.innerHTML = `
      <span class="phase-dot ${c.phase || 'none'}"></span>
      <span class="breaker-toggle"></span>
      <span class="breaker-text">
        <span class="breaker-pos">${escapeHtml(c.position)}</span>
        <div class="breaker-label">${escapeHtml(row?.custom_label || c.label)}</div>
        ${row?.custom_label ? `<div class="breaker-custom">as-labelled: ${escapeHtml(c.label)}</div>` : ""}
      </span>
      ${c.flag ? `<span class="badge warn">verify</span>` : ""}
    `;
    btn.addEventListener("click", () => openModal(panelSlug, c, notesMap));
    li.appendChild(btn);
    return li;
  }

  function escapeHtml(s){
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[m]));
  }

  // ---------------- modal ----------------

  let modalState = null;

  function openModal(panelSlug, circuitDef, notesMap){
    const row = notesMap[circuitKey(panelSlug, circuitDef.position)] || {};
    modalState = { panelSlug, circuitDef, notesMap };

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "activeModal";

    const editing = isEditor();

    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2>${escapeHtml(row.custom_label || circuitDef.label)}</h2>
          <button class="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-meta">
          Position ${escapeHtml(circuitDef.position)}
          ${circuitDef.phase ? ` · Phase ${circuitDef.phase}` : ""}
          · As printed on panel: "${escapeHtml(circuitDef.label)}"
        </div>
        ${circuitDef.flag ? `<div class="modal-flag">⚠ ${escapeHtml(circuitDef.flagNote || "This reading is uncertain — please verify against the physical panel.")}</div>` : ""}

        <div id="modalBody"></div>
      </div>
    `;

    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (e) => { if(e.target === backdrop) closeModal(); });
    backdrop.querySelector(".modal-close").addEventListener("click", closeModal);

    renderModalBody(row);
  }

  function renderModalBody(row){
    const body = document.getElementById("modalBody");
    if(!sb){
      body.innerHTML = `<div class="modal-section"><div class="small-note">Supabase isn't configured yet — notes can't be loaded or saved. See README.md.</div></div>`;
      return;
    }
    if(isEditor()){
      body.innerHTML = `
        <div class="modal-section">
          <label>Circuit name (override)</label>
          <input type="text" id="f_label" value="${escapeHtml(row.custom_label || "")}" placeholder="Leave blank to keep the printed label">
        </div>
        <div class="modal-section">
          <label>Notes — what this actually feeds / where it goes</label>
          <textarea id="f_notes" placeholder="e.g. Feeds the walk-in freezer condenser unit outside the back door, plus the compressor room light.">${escapeHtml(row.notes || "")}</textarea>
        </div>
        <div id="saveMsg"></div>
        <div class="btn-row">
          <button class="btn btn-primary" id="saveBtn">Save changes</button>
          <button class="btn btn-secondary" id="signOutBtn">Sign out</button>
        </div>
        <div class="small-note">Signed in as ${escapeHtml(session.user.email)}. Saved changes are visible to everyone immediately.</div>
      `;
      document.getElementById("saveBtn").addEventListener("click", onSaveClicked);
      document.getElementById("signOutBtn").addEventListener("click", async () => { await logout(); closeModal(); });
    } else {
      body.innerHTML = `
        <div class="modal-section">
          <label>Notes</label>
          <div class="notes-view ${row.notes ? "" : "empty"}">${escapeHtml(row.notes || "")}</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="editModeBtn">Sign in to edit</button>
        </div>
      `;
      document.getElementById("editModeBtn").addEventListener("click", showLoginForm);
    }
  }

  async function onSaveClicked(){
    const { panelSlug, circuitDef, notesMap } = modalState;
    const custom_label = document.getElementById("f_label").value.trim();
    const notes = document.getElementById("f_notes").value.trim();
    const saveMsg = document.getElementById("saveMsg");
    saveMsg.innerHTML = `<div class="small-note">Saving…</div>`;
    const err = await saveNote(panelSlug, circuitDef.position, { custom_label, notes });
    if(err){
      saveMsg.innerHTML = `<div class="err">Couldn't save: ${escapeHtml(err)}</div>`;
      return;
    }
    saveMsg.innerHTML = `<div class="ok-msg">Saved.</div>`;
    notesMap[circuitKey(panelSlug, circuitDef.position)] = {
      panel_slug: panelSlug, position: circuitDef.position, custom_label, notes
    };
    document.dispatchEvent(new CustomEvent("notesupdated"));
  }

  function showLoginForm(){
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="modal-section">
        <label>Email</label>
        <input type="email" id="loginEmail" placeholder="you@yourcompany.com">
      </div>
      <div class="modal-section">
        <label>Password</label>
        <input type="password" id="loginPassword">
      </div>
      <div id="loginMsg"></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="loginBtn">Sign in</button>
        <button class="btn btn-ghost" id="forgotBtn">Forgot password?</button>
      </div>
    `;
    document.getElementById("loginBtn").addEventListener("click", async () => {
      const email = document.getElementById("loginEmail").value.trim();
      const pw = document.getElementById("loginPassword").value;
      const msg = document.getElementById("loginMsg");
      msg.innerHTML = `<div class="small-note">Signing in…</div>`;
      const err = await login(email, pw);
      if(err){ msg.innerHTML = `<div class="err">${escapeHtml(err)}</div>`; return; }
      renderModalBody(modalState.notesMap[circuitKey(modalState.panelSlug, modalState.circuitDef.position)] || {});
    });
    document.getElementById("forgotBtn").addEventListener("click", async () => {
      const email = document.getElementById("loginEmail").value.trim();
      const msg = document.getElementById("loginMsg");
      if(!email){ msg.innerHTML = `<div class="err">Enter your email above first.</div>`; return; }
      msg.innerHTML = `<div class="small-note">Sending reset link…</div>`;
      const err = await sendPasswordReset(email);
      msg.innerHTML = err
        ? `<div class="err">${escapeHtml(err)}</div>`
        : `<div class="ok-msg">Reset link sent — check your email.</div>`;
    });
  }

  function closeModal(){
    const el = document.getElementById("activeModal");
    if(el) el.remove();
    modalState = null;
  }

  // ---------------- search ----------------

  function wireSearch(inputEl, containerEl, countEl){
    inputEl.addEventListener("input", () => {
      const q = inputEl.value.trim().toLowerCase();
      let visible = 0;
      containerEl.querySelectorAll(".breaker").forEach(btn => {
        const match = !q || (btn.dataset.searchText || "").includes(q);
        btn.classList.toggle("dimmed", !match);
        if(match) visible++;
      });
      if(countEl) countEl.textContent = q ? `${visible} match${visible===1?"":"es"}` : "";
    });
  }

  return {
    initAuth, isEditor, login, logout, sendPasswordReset,
    loadNotesForPanel, loadAllNotes, saveNote,
    renderBoard, wireSearch, escapeHtml, circuitKey,
    get sb(){ return sb; }
  };
})();
