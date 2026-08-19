/* Nome e Local do Ficheiro: js/navigation.js */

/* ============================================================
   NAVEGAÇÃO E CONTROLE DE ABAS
   Funções que controlam qual aba/painel está visível e
   reagem a troca de perfil.
   ============================================================ */
function renderProfileSelector() {
  const sel = document.getElementById("profileSelect");
  if (!state.profiles.length) {
    sel.innerHTML = `<option value="">— Selecione um perfil —</option>`;
    return;
  }
  sel.innerHTML = state.profiles.map(p =>
    `<option value="${p.id}"${p.id===activeProfileId?" selected":""}>${profileLabel(p)}</option>`
  ).join("");
}

function switchProfile(id) {
  if (!id) return;
  activeProfileId = id; state.activeProfileId = id; saveState(); editingMatchId = null; dashboardMapFilter = ""; refreshAll();
}

function setTab(name) {
  document.querySelectorAll(".pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("pane-" + name).classList.add("active");
  const navTabs = ["dashboard","log"];
  const idx = navTabs.indexOf(name);
  if (idx >= 0) {
    document.querySelectorAll(".tab-btn")[idx].classList.add("active");
  }
  if (name === "dashboard") renderDashboard();
  if (name === "log")       renderLog();
}

function refreshAll() {
  renderProfileSelector();
  const active = document.querySelector(".tab-btn.active");
  const navTabs = ["dashboard","log"];
  const idx = [...document.querySelectorAll(".tab-btn")].indexOf(active);
  if (idx >= 0) setTab(navTabs[idx]); else setTab("dashboard");
}

