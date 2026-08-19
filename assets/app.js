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

  let unlockedPin = null; // the verified PIN, held in memory only — cleared on page reload/close
  let notesCache = {}; // key: `${panelSlug}::${position}` -> row
  let areaTagTree = []; // [{id,label,subOptions:[{id,label}]}] — loaded from Supabase

  // ---------------- area tags (loaded from Supabase) ----------------

  async function loadAreaTags(){
    if(!sb) return [];
    const [tagsRes, subRes] = await Promise.all([
      sb.from("area_tags").select("*").order("sort_order"),
      sb.from("area_sub_tags").select("*").order("sort_order"),
    ]);
    const tags = tagsRes.data || [];
    const subs = subRes.data || [];
    areaTagTree = tags.map(t => ({
      id: t.id, label: t.label,
      subOptions: subs.filter(s => s.parent_id === t.id).map(s => ({ id: s.id, label: s.label }))
    }));
    return areaTagTree;
  }

  function findAreaTagLocal(id){
    return areaTagTree.find(t => t.id === id) || null;
  }

  function areaLabel(row){
    const areas = Array.isArray(row?.area) ? row.area : (row?.area ? [row.area] : []);
    if(!areas.length) return "";
    const details = Array.isArray(row?.area_detail) ? row.area_detail : (row?.area_detail ? [row.area_detail] : []);
    return areas.map(id => {
      const tag = findAreaTagLocal(id);
      const label = tag?.label || "(unknown tag)";
      const subs = (tag?.subOptions || []).filter(s => details.includes(s.id)).map(s => s.label);
      return subs.length ? `${label} (${subs.join(", ")})` : label;
    }).join(", ");
  }

  // ---------------- auth (PIN-based) ----------------

  async function initAuth(){
    document.dispatchEvent(new CustomEvent("authchange"));
  }

  function isEditor(){ return !!unlockedPin; }

  async function verifyPin(pin){
    if(!sb) return "Supabase isn't configured yet.";
    if(!/^[0-9]{4,8}$/.test(pin)) return "Enter your PIN.";
    const { data, error } = await sb.rpc("verify_edit_pin", { pin });
    if(error) return error.message;
    if(!data) return "Incorrect PIN.";
    unlockedPin = pin;
    document.dispatchEvent(new CustomEvent("authchange"));
    return null;
  }

  function lockEditing(){
    unlockedPin = null;
    document.dispatchEvent(new CustomEvent("authchange"));
  }

  async function changePin(oldPin, newPin){
    if(!sb) return "Supabase isn't configured yet.";
    if(!/^[0-9]{7}$/.test(newPin)) return "New PIN must be exactly 7 digits.";
    const { data, error } = await sb.rpc("change_edit_pin", { old_pin: oldPin, new_pin: newPin });
    if(error) return error.message.replace(/^.*?:\s*/, "");
    unlockedPin = newPin;
    return null;
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

  async function saveNote(panelSlug, position, { custom_label, notes, area, area_detail }){
    if(!sb || !isEditor()) return "Editing is locked — enter the PIN first.";
    const { data, error } = await sb.rpc("save_circuit_note", {
      p_pin: unlockedPin,
      p_panel_slug: panelSlug,
      p_position: position,
      p_custom_label: custom_label || "",
      p_notes: notes || "",
      p_areas: area || [],
      p_area_details: area_detail || []
    });
    if(error){
      if(/pin/i.test(error.message)) lockEditing(); // stale/wrong PIN — force re-entry
      return error.message.replace(/^.*?:\s*/, "");
    }
    return null;
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
    const areaTxt = areaLabel(row);
    const isTriple = c.phase === "RYB";
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "breaker"
      + (row && (row.notes || row.custom_label) ? " has-note" : "")
      + (c.flag ? " flagged" : "")
      + (isTriple ? " triple" : "");
    btn.type = "button";
    btn.dataset.searchText = [
      c.position, c.label, row?.custom_label, row?.notes, areaTxt
    ].filter(Boolean).join(" ").toLowerCase();

    const hasCustom = !!row?.custom_label;
    const hasArea = !!areaTxt;

    btn.innerHTML = `
      <span class="phase-dot ${c.phase || 'none'}"></span>
      <span class="breaker-toggle"></span>
      <span class="breaker-text">
        <span class="breaker-pos">${escapeHtml(c.position)}${isTriple ? " (3 poles)" : ""}</span>
        <div class="breaker-label">${escapeHtml(row?.custom_label || c.label)}</div>
        <div class="breaker-custom${hasCustom ? "" : " invisible"}">${hasCustom ? "as-labelled: " + escapeHtml(c.label) : "\u00A0"}</div>
        <div class="area-chip${hasArea ? "" : " invisible"}">${hasArea ? escapeHtml(areaTxt) : "\u00A0"}</div>
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
          ${circuitDef.phase ? ` · ${circuitDef.phase === 'RYB' ? 'Triple-pole (R/Y/B)' : 'Phase ' + circuitDef.phase}` : ""}
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
      const selectedArea = row.area || "";
      const selectedDetail = row.area_detail || "";
      body.innerHTML = `
        <div class="modal-section">
          <label>Area</label>
          <div class="tag-row" id="areaTagRow"></div>
          <div class="tag-row" id="subTagRow" style="display:none; margin-top:6px;"></div>
        </div>
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
          <button class="btn btn-secondary" id="lockBtn">Lock editing</button>
        </div>
        <button class="btn-ghost" id="changePinBtn" style="margin-top:8px;">Change PIN</button>
        <div class="small-note">Saved changes are visible to everyone immediately.</div>
      `;
      buildAreaTagPicker(selectedArea, selectedDetail);
      document.getElementById("saveBtn").addEventListener("click", onSaveClicked);
      document.getElementById("lockBtn").addEventListener("click", () => { lockEditing(); closeModal(); });
      document.getElementById("changePinBtn").addEventListener("click", showChangePinForm);
    } else {
      const areaTxt = areaLabel(row);
      body.innerHTML = `
        ${areaTxt ? `<div class="area-chip standalone">${escapeHtml(areaTxt)}</div>` : ""}
        <div class="modal-section">
          <label>Notes</label>
          <div class="notes-view ${row.notes ? "" : "empty"}">${escapeHtml(row.notes || "")}</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="editModeBtn">Enter PIN to edit</button>
        </div>
      `;
      document.getElementById("editModeBtn").addEventListener("click", showPinForm);
    }
  }

  // currently selected area/sub-tags while the edit form is open (multi-select)
  let pickedAreas = [];
  let pickedAreaDetails = [];

  function buildAreaTagPicker(initialAreas, initialDetails){
    pickedAreas = Array.isArray(initialAreas) ? [...initialAreas] : (initialAreas ? [initialAreas] : []);
    pickedAreaDetails = Array.isArray(initialDetails) ? [...initialDetails] : (initialDetails ? [initialDetails] : []);

    function renderMain(){
      const row = document.getElementById("areaTagRow");
      row.innerHTML = "";
      if(!areaTagTree.length){
        row.innerHTML = `<div class="small-note">No area tags set up yet.</div>`;
        return;
      }
      areaTagTree.forEach(tag => {
        const t = document.createElement("button");
        t.type = "button";
        t.className = "tag-tile" + (pickedAreas.includes(tag.id) ? " selected" : "");
        t.textContent = tag.label;
        t.addEventListener("click", () => {
          if(pickedAreas.includes(tag.id)){
            pickedAreas = pickedAreas.filter(id => id !== tag.id);
            // drop any sub-selections that belonged only to this tag
            const subIds = (tag.subOptions || []).map(s => s.id);
            pickedAreaDetails = pickedAreaDetails.filter(id => !subIds.includes(id));
          } else {
            pickedAreas.push(tag.id);
          }
          renderMain();
          renderSub();
        });
        row.appendChild(t);
      });
    }

    function renderSub(){
      const subRow = document.getElementById("subTagRow");
      const groups = areaTagTree.filter(t => pickedAreas.includes(t.id) && t.subOptions && t.subOptions.length);
      if(!groups.length){
        subRow.style.display = "none";
        subRow.innerHTML = "";
        return;
      }
      subRow.style.display = "block";
      subRow.innerHTML = "";
      groups.forEach(tag => {
        const groupWrap = document.createElement("div");
        groupWrap.style.marginBottom = "8px";
        const groupLabel = document.createElement("div");
        groupLabel.className = "small-note";
        groupLabel.style.marginBottom = "4px";
        groupLabel.textContent = `${tag.label} — select any that apply:`;
        groupWrap.appendChild(groupLabel);
        const tilesRow = document.createElement("div");
        tilesRow.className = "tag-row";
        tag.subOptions.forEach(sub => {
          const t = document.createElement("button");
          t.type = "button";
          t.className = "tag-tile sub" + (pickedAreaDetails.includes(sub.id) ? " selected" : "");
          t.textContent = sub.label;
          t.addEventListener("click", () => {
            pickedAreaDetails = pickedAreaDetails.includes(sub.id)
              ? pickedAreaDetails.filter(id => id !== sub.id)
              : [...pickedAreaDetails, sub.id];
            renderSub();
          });
          tilesRow.appendChild(t);
        });
        groupWrap.appendChild(tilesRow);
        subRow.appendChild(groupWrap);
      });
    }

    renderMain();
    renderSub();
  }



  async function onSaveClicked(){
    const { panelSlug, circuitDef, notesMap } = modalState;
    const custom_label = document.getElementById("f_label").value.trim();
    const notes = document.getElementById("f_notes").value.trim();
    const area = pickedAreas;
    const area_detail = pickedAreaDetails;
    const saveMsg = document.getElementById("saveMsg");
    saveMsg.innerHTML = `<div class="small-note">Saving…</div>`;
    const err = await saveNote(panelSlug, circuitDef.position, { custom_label, notes, area, area_detail });
    if(err){
      saveMsg.innerHTML = `<div class="err">Couldn't save: ${escapeHtml(err)}</div>`;
      return;
    }
    saveMsg.innerHTML = `<div class="ok-msg">Saved.</div>`;
    notesMap[circuitKey(panelSlug, circuitDef.position)] = {
      panel_slug: panelSlug, position: circuitDef.position, custom_label, notes, area, area_detail
    };
    document.dispatchEvent(new CustomEvent("notesupdated"));
  }

  function showPinForm(){
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="modal-section">
        <label>Enter PIN</label>
        <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" id="pinInput" placeholder="•••••••">
      </div>
      <div id="pinMsg"></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="unlockBtn">Unlock editing</button>
      </div>
    `;
    const input = document.getElementById("pinInput");
    input.focus();
    const attempt = async () => {
      const pin = input.value.trim();
      const msg = document.getElementById("pinMsg");
      msg.innerHTML = `<div class="small-note">Checking…</div>`;
      const err = await verifyPin(pin);
      if(err){ msg.innerHTML = `<div class="err">${escapeHtml(err)}</div>`; return; }
      renderModalBody(modalState.notesMap[circuitKey(modalState.panelSlug, modalState.circuitDef.position)] || {});
    };
    document.getElementById("unlockBtn").addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => { if(e.key === "Enter") attempt(); });
  }

  function showChangePinForm(){
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="modal-section">
        <label>Current PIN</label>
        <input type="password" inputmode="numeric" maxlength="8" id="oldPin">
      </div>
      <div class="modal-section">
        <label>New 7-digit PIN</label>
        <input type="password" inputmode="numeric" maxlength="7" id="newPin">
      </div>
      <div id="cpMsg"></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="cpSaveBtn">Update PIN</button>
        <button class="btn btn-secondary" id="cpCancelBtn">Cancel</button>
      </div>
      <div class="small-note">This changes the PIN for everyone who edits this site — let your team know.</div>
    `;
    document.getElementById("cpSaveBtn").addEventListener("click", async () => {
      const oldPin = document.getElementById("oldPin").value.trim();
      const newPin = document.getElementById("newPin").value.trim();
      const msg = document.getElementById("cpMsg");
      msg.innerHTML = `<div class="small-note">Updating…</div>`;
      const err = await changePin(oldPin, newPin);
      if(err){ msg.innerHTML = `<div class="err">${escapeHtml(err)}</div>`; return; }
      msg.innerHTML = `<div class="ok-msg">PIN updated.</div>`;
      setTimeout(() => renderModalBody(modalState.notesMap[circuitKey(modalState.panelSlug, modalState.circuitDef.position)] || {}), 700);
    });
    document.getElementById("cpCancelBtn").addEventListener("click", () => {
      renderModalBody(modalState.notesMap[circuitKey(modalState.panelSlug, modalState.circuitDef.position)] || {});
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
    initAuth, isEditor, verifyPin, lockEditing, changePin,
    loadNotesForPanel, loadAllNotes, saveNote,
    loadAreaTags, areaLabel,
    renderBoard, wireSearch, escapeHtml, circuitKey,
    get sb(){ return sb; }
  };
})();
