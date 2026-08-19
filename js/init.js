/* Nome e Local do Ficheiro: js/init.js */

/* ============================================================
   INICIALIZAÇÃO
   Executado uma vez quando a página carrega.
   ============================================================ */

document.addEventListener("click", function(e) {
  const settingsWrapper = document.getElementById("settingsBtn")?.closest(".settings-wrapper");
  if (settingsWrapper && !settingsWrapper.contains(e.target)) {
    closeSettingsDropdown();
  }
  const accountWrapper = document.getElementById("authBtn")?.closest(".settings-wrapper");
  if (accountWrapper && !accountWrapper.contains(e.target)) {
    closeAccountDropdown();
  }
});

try {
  state = loadState();
  activeProfileId = state.activeProfileId || null;
  renderProfileSelector();
  renderDashboard();
  if (getActiveProfile()) {
    setTimeout(() => openAddMatchModal(), 300);
  }
} catch (e) {
  console.error("Erro ao renderizar dashboard:", e);
  document.getElementById("dash-inner").innerHTML = 
    `<div class="empty-state"><div class="e-icon">⚠</div><div class="e-title">Erro ao carregar</div><div class="e-sub">Tente recarregar a página (F5)</div></div>`;
}

try {
  checkAuth();
} catch (e) {
  console.error("Erro ao verificar auth:", e);
}

// Atalho global: N abre o modal de nova partida
document.addEventListener('keydown', function(e) {
  if (e.key === 'n' || e.key === 'N') {
    const tag = document.activeElement?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    const modalOpen = document.getElementById("match-modal-overlay")?.classList.contains("open");
    if (!isTyping && !modalOpen) {
      e.preventDefault();
      openAddMatchModal();
    }
  }
});

