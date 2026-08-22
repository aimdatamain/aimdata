/* Nome e Local do Ficheiro: js/auth.js */

/* ============================================================
   AUTENTICAÇÃO SUPABASE
   Login com Discord, logout e controle de estado do usuário.
   ============================================================ */

let currentUser = null;

function toggleSettingsDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById("settingsDropdown");
  dropdown.classList.toggle("open");
}

function toggleAccountDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById("accountDropdown");
  if (dropdown) dropdown.classList.toggle("open");
}

function closeAccountDropdown() {
  const dropdown = document.getElementById("accountDropdown");
  if (dropdown) dropdown.classList.remove("open");
}

function closeSettingsDropdown() {
  const dropdown = document.getElementById("settingsDropdown");
  if (dropdown) dropdown.classList.remove("open");
}

async function checkAuth() {
  if (!supabaseClient) return;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      const isNewLogin = !currentUser || currentUser.id !== session.user.id;
      currentUser = session.user;

      // Carrega estado da conta
      state = loadState();
      activeProfileId = state.activeProfileId || null;
      updateAuthButton();

      if (state.profiles.length > 0) {
        refreshAll();
      }

      if (isNewLogin) {
        // Verifica se ha dados offline nao resolvidos
        const offlineState = loadOfflineState();
        if (offlineState && offlineState.profiles.length > 0) {
          const diffs = getOfflineProfileDiffs(offlineState, state);
          if (diffs.newProfiles.length > 0 || diffs.duplicates.length > 0) {
            // Pausa o fluxo automatico — usuario precisa decidir primeiro
            showNewOfflineProfilesModal(diffs.newProfiles, diffs.duplicates);
            return; // NAO chama promptFirstSync ainda
          }
        }
      }

      // Fluxo normal se nao ha conflitos offline
      setTimeout(() => promptFirstSync(), 500);

    } else {
      currentUser = null;
      state = loadState();
      activeProfileId = state.activeProfileId || null;
      editingMatchId = null;
      offlineMergeChecked = false;
      updateAuthButton();
      refreshAll();
    }
  } catch (e) {
    logStructuredError({ level: 'ERROR', operation: 'checkAuth', message: 'Erro ao verificar sessão', context: { error: e.message } });
    currentUser = null;
    state = loadState();
    activeProfileId = state.activeProfileId || null;
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const isNewLogin = !currentUser || currentUser.id !== session.user.id;
      currentUser = session.user;
      updateAuthButton();
      if (isNewLogin) {
        state = loadState();
        activeProfileId = state.activeProfileId || null;
        editingMatchId = null;
        refreshAll();

        // Mesma logica de deteccao no evento de auth
        const offlineState = loadOfflineState();
        if (offlineState && offlineState.profiles.length > 0) {
          const diffs = getOfflineProfileDiffs(offlineState, state);
          if (diffs.newProfiles.length > 0 || diffs.duplicates.length > 0) {
            showNewOfflineProfilesModal(diffs.newProfiles, diffs.duplicates);
            return;
          }
        }

        setTimeout(() => promptFirstSync(), 500);
        setTimeout(() => checkOfflineMerge(), 1200);
      }
    } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      currentUser = null;
      state = loadState();
      activeProfileId = state.activeProfileId || null;
      editingMatchId = null;
      offlineMergeChecked = false;
      updateAuthButton();
      refreshAll();
      showToast("⚠ Sessao encerrada. Faca login novamente.");
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      currentUser = session.user;
    }
  });
}

function updateAuthButton() {
  const btn = document.getElementById("authBtn");
  const accountWrapper = document.getElementById("accountWrapper");
  const settingsWrapper = document.getElementById("settingsWrapper");
  if (!btn) return;
  if (currentUser) {
    const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "Usuário";
    btn.textContent = name + " ▼";
    btn.onclick = toggleAccountDropdown;
    if (settingsWrapper) settingsWrapper.style.display = "none";
    if (accountWrapper) accountWrapper.style.display = "";
  } else {
    btn.textContent = "🎮 Entrar com Discord";
    btn.onclick = handleAuthClick;
    if (settingsWrapper) settingsWrapper.style.display = "";
    if (accountWrapper) accountWrapper.style.display = "";
    closeAccountDropdown();
  }
}

async function handleAuthClick() {
  if (!supabaseClient) {
    showToast("⚠ Conexão indisponível. Verifique sua internet.");
    return;
  }
  const btn = document.getElementById("authBtn");
  btn.textContent = "Conectando...";
  btn.disabled = true;
const REDIRECT_URL = window.location.origin + window.location.pathname + window.location.search;
const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: REDIRECT_URL } });
  if (error) {
    btn.textContent = "Entrar";
    btn.disabled = false;
    showToast("⚠ Erro ao conectar com Discord");
    logStructuredError({ level: 'ERROR', operation: 'handleAuthClick', message: 'Erro ao conectar com Discord', context: { error: error.message } });
  }
}

async function handleLogout() {
  if (!confirm("Sair da conta? Seus dados locais permanecem no navegador.")) return;
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  state = loadState(); // agora le gt_v1 (offline)
  activeProfileId = state.activeProfileId || null;
  editingMatchId = null;
  offlineMergeChecked = false;
  updateAuthButton();
  refreshAll();
  showToast("✓ Desconectado");
}

