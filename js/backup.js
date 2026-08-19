/* Nome e Local do Ficheiro: js/backup.js */

/* ============================================================
   BACKUP / EXPORT / IMPORT
   Exportação, importação e backup de emergência (Regra 31).
   ============================================================ */

function generateEmergencyBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `aimdata-emergency-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  return true;
}

function exportData() {
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="aimdata-backup.json"; a.click(); showToast("✓ Backup exportado");
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Regra 31: backup antes de operação destrutiva
  generateEmergencyBackup();
  showToast("💾 Backup de segurança baixado");

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.profiles || !Array.isArray(data.profiles)) {
        showToast("⚠ Arquivo inválido");
        return;
      }

      // Normaliza dados importados (ordenação, match_number, limpa cloudId)
      data.profiles.forEach(profile => {
        // Validação: descarta partidas inválidas para não corromper o estado
        if (Array.isArray(profile.matches)) {
          profile.matches = profile.matches.filter(m => m && typeof m.map === 'string' && m.map.trim() !== '');
        } else {
          profile.matches = [];
        }
        
        if (Array.isArray(profile.matches)) {
          profile.matches.sort((a, b) => {
            const dateA = a.match_date ? new Date(a.match_date).getTime() : 0;
            const dateB = b.match_date ? new Date(b.match_date).getTime() : 0;
            return dateA - dateB;
          });
          normalizeProfileMatches(profile);
        }
        // Sempre limpa cloudId — backup pode vir de outra conta/banco
        if (profile.cloudId) delete profile.cloudId;
      });

      // Detecta conflitos: mesmo game + mode + server
      const conflicts = [];
      const newProfiles = [];

      data.profiles.forEach(imported => {
        const existing = state.profiles.find(p =>
          p.game === imported.game &&
          p.mode === imported.mode &&
          p.server === imported.server
        );
        if (existing) {
          conflicts.push({ existing, imported });
        } else {
          newProfiles.push(imported);
        }
      });

      // Se não há conflitos: importa silenciosamente
      if (conflicts.length === 0) {
        // Sanitiza IDs de partidas para evitar colisão com UUIDs de outra conta
        const sanitized = newProfiles.map(p => ({
          ...p,
          cloudId: null,
          matches: (p.matches || []).map(m => ({
            ...m,
            id: "m" + Date.now() + Math.random().toString(36).substr(2, 5)
          }))
        }));
        state.profiles.push(...sanitized);
        if (!state.activeProfileId && state.profiles.length > 0) {
          state.activeProfileId = state.profiles[0].id;
          activeProfileId = state.activeProfileId;
        }
        saveState();
        refreshAll();
        showToast(`✓ ${newProfiles.length} perfil(s) importado(s)`);
        if (currentUser && supabaseClient) {
          markSyncPending();
          showToast("✓ Importado. Clique em ☁ Sync para enviar à nuvem.");
        }
        return;
      }

      // Se há conflitos: mostra modal de decisão
      showImportConflictModal(conflicts, newProfiles);

    } catch (err) {
      console.error("Erro ao importar:", err);
      showToast("⚠ Erro ao ler arquivo");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// Nova função: modal de conflitos de importação
function showImportConflictModal(conflicts, newProfiles) {
  closeModal(); // fecha qualquer modal aberto

  let bodyHtml = `<p style="font-size:13px;color:var(--sub);line-height:1.7;margin-bottom:16px;">
    Detectamos ${conflicts.length} perfil(s) já existente(s) com o mesmo jogo, modo e servidor. Escolha o que fazer com cada um:
  </p>`;

  conflicts.forEach((c, idx) => {
    const existingLabel = profileLabel(c.existing);
    const importedCount = c.imported.matches?.length || 0;
    const existingCount = c.existing.matches?.length || 0;

    bodyHtml += `
      <div style="background:var(--surface);border:1px solid var(--border);padding:14px 16px;margin-bottom:12px;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text);">
          ${existingLabel}
        </div>
        <div style="font-size:12px;color:var(--sub);margin-bottom:10px;">
          Existente: ${existingCount} partidas · Importado: ${importedCount} partidas
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text);">
            <input type="radio" name="conflict-${idx}" value="merge" checked>
            <span>Mesclar partidas no perfil existente</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text);">
            <input type="radio" name="conflict-${idx}" value="separate">
            <span>Criar perfil separado</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text);">
            <input type="radio" name="conflict-${idx}" value="skip">
            <span>Ignorar este perfil importado</span>
          </label>
        </div>
      </div>
    `;
  });

  if (newProfiles.length > 0) {
    bodyHtml += `<p style="font-size:12px;color:var(--confirm);margin-bottom:16px;">
      ✓ ${newProfiles.length} perfil(s) novo(s) serão importados automaticamente (sem conflito).
    </p>`;
  }

  document.getElementById("modal-title").textContent = "Conflito de Importação";
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-actions").innerHTML = `
    <button class="modal-cancel" onclick="closeModal()">Cancelar Importação</button>
    <button class="modal-save" onclick="resolveImportConflicts(${conflicts.length}, ${newProfiles.length})">Confirmar Importação</button>
  `;
  document.getElementById("modal-overlay").classList.add("open");

  // Armazena temporariamente para uso no confirmar
  window._pendingImport = { conflicts, newProfiles };
}

function resolveImportConflicts(conflictCount, newCount) {
  const { conflicts, newProfiles } = window._pendingImport || {};
  if (!conflicts) { closeModal(); return; }

  // Adiciona perfis sem conflito primeiro
  if (newProfiles && newProfiles.length > 0) {
    state.profiles.push(...newProfiles);
  }

  // Processa cada conflito conforme escolha do usuário
  conflicts.forEach((c, idx) => {
    const choice = document.querySelector(`input[name="conflict-${idx}"]:checked`)?.value || 'merge';

    if (choice === 'skip') {
      // Não faz nada — ignora o perfil importado
      return;
    }

    if (choice === 'separate') {
      // Cria novo perfil com ID novo para não colidir
      c.imported.id = "p" + Date.now() + Math.random().toString(36).substr(2, 5) + "-" + idx;
      state.profiles.push(c.imported);
      return;
    }

    if (choice === 'merge') {
      // Mescla partidas: adiciona todas do importado ao existente
      // Evita duplicatas por match_number (se houver colisão, renumera)
      const existing = c.existing;
      const incoming = c.imported.matches || [];

      incoming.forEach(m => {
        // Gera ID novo para evitar colisão de ID
        const newMatch = { ...m, id: "m" + Date.now() + Math.random().toString(36).substr(2, 5) };
        existing.matches.push(newMatch);
      });

      // Mescla mapas (union)
      (c.imported.maps || []).forEach(map => {
        if (!existing.maps.includes(map)) existing.maps.push(map);
      });

      // Reordena e renumera
      normalizeProfileMatches(existing);
      return;
    }
  });

  // Atualiza perfil ativo se necessário
  if (!state.activeProfileId && state.profiles.length > 0) {
    state.activeProfileId = state.profiles[0].id;
    activeProfileId = state.activeProfileId;
  }

  saveState();
  closeModal();
  delete window._pendingImport;
  refreshAll();

  const totalImported = newProfiles.length + conflicts.filter((_, i) => {
    const choice = document.querySelector(`input[name="conflict-${i}"]:checked`)?.value;
    return choice !== 'skip';
  }).length;

  showToast(`✓ ${totalImported} perfil(s) processado(s)`);

  if (currentUser && supabaseClient) {
    markSyncPending();
    showToast("✓ Importado. Clique em ☁ Sync para enviar à nuvem.");
  }
}

