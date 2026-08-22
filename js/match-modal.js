/* Nome e Local do Ficheiro: js/match-modal.js */

/* ============================================================
   RENDERIZAÇÃO — NOVA PARTIDA
   Monta o formulário de registro e o preview ao vivo
   dos valores calculados (K/D, KPM, KPD).
   ============================================================ */

function openAddMatchModal() {
  const profile = getActiveProfile();
  if (!profile) {
    showToast("⚠ Crie um perfil antes de registrar partidas");
    return;
  }
  if (profile.isDemo) {
    showToast("⚠ Este é um perfil de demonstração. Crie seu próprio perfil para registrar partidas.");
    return;
  }
  document.getElementById("match-modal-overlay").classList.add("open");
  renderAddMatchForm();
}

function closeAddMatchModal() {
  document.getElementById("match-modal-overlay").classList.remove("open");
}

function renderModalProfileBar() {
  const bar = document.getElementById("match-modal-profile-bar");
  if (!bar) return;
  const realProfiles = state.profiles.filter(p => !p.isDemo);
  if (realProfiles.length < 2) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }
  bar.style.display = "block";
  bar.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">
    <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--sub);font-family:'Rajdhani',sans-serif;font-weight:600;">Perfil ativo:</span>
    <select id="modal-profile-select" onchange="switchProfileInModal(this.value)" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-family:'Rajdhani',sans-serif;font-size:13px;cursor:pointer;min-width:180px;">
      ${realProfiles.map(p => `<option value="${p.id}"${p.id === activeProfileId ? " selected" : ""}>${profileLabel(p)}</option>`).join("")}
    </select>
  </div>`;
}

function switchProfileInModal(id) {
  if (!id || id === activeProfileId) return;
  switchProfile(id);
  renderAddMatchForm();
  showToast(`🎮 Perfil alterado para: ${profileLabel(getActiveProfile())}`);
}

function setupMatchModalNav() {
  const modal = document.getElementById('match-modal');
  if (!modal || modal._navSetup) return;
  modal._navSetup = true;
  modal.addEventListener('keydown', function(e) {
    const focusables = Array.from(modal.querySelectorAll('input:not([type="file"]):not([type="hidden"]), textarea, button.modal-save')).filter(el => {
      const hiddenParent = el.closest('.collapse-content');
      return !hiddenParent || hiddenParent.style.display !== 'none';
    });
    const current = document.activeElement;
    const idx = focusables.indexOf(current);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Campo de mapa: autocompleta com o primeiro match do datalist
      if (current && current.id === 'f-map') {
        const profile = getActiveProfile();
        const typed = current.value.trim().toLowerCase();
        if (typed && profile && profile.maps) {
          const match = profile.maps.find(m => m.toLowerCase().startsWith(typed)) 
                     || profile.maps.find(m => m.toLowerCase().includes(typed));
          if (match) current.value = match;
        }
      }
      
      // Botão Registrar: salva
      if (current && current.classList.contains('modal-save')) {
        addMatch();
        return;
      }
      
      // Avança para o próximo campo focável
      const next = focusables[idx + 1];
      if (next) {
        next.focus();
        if (next.select) next.select();
      }
      
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab volta para o campo anterior
      const prev = focusables[idx - 1];
      if (prev) {
        prev.focus();
        if (prev.select) prev.select();
      }
      
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const hasValues = focusables.some(el => {
        if (el.tagName === 'INPUT' && el.type !== 'file' && el.type !== 'hidden') return el.value.trim() !== '';
        if (el.tagName === 'TEXTAREA') return el.value.trim() !== '';
        return false;
      });
      
      if (hasValues) {
        // Primeiro Escape: limpa tudo
        focusables.forEach(el => { 
          if ((el.tagName === 'INPUT' && el.type !== 'file' && el.type !== 'hidden') || el.tagName === 'TEXTAREA') {
            el.value = ''; 
          }
        });
        updatePreview();
        const mapInput = document.getElementById('f-map');
        if (mapInput) { mapInput.focus(); mapInput.select(); }
      } else {
        // Segundo Escape (já limpo): fecha o modal
        closeAddMatchModal();
      }
    }
  });
}

function renderAddMatchForm() {
  const profile = getActiveProfile();
  const body = document.getElementById("match-modal-body");
  renderModalProfileBar();
  if (!profile) {
    body.innerHTML = `<div class="empty-state" style="padding:32px 20px;"><div class="e-icon">🎮</div><div class="e-title">Nenhum perfil ativo</div><div class="e-sub">Crie um perfil antes de adicionar partidas</div></div>`;
    return;
  }

  const isFirstMatch = profile.matches.length === 0;
  const allInputMetrics = ALL_METRICS.filter(m => m.type === "input").map(m => m.id);
  const allCalcMetrics = ALL_METRICS.filter(m => m.type === "calc").map(m => m.id);
  const inputMetrics = allInputMetrics;
  const calcMetrics = allCalcMetrics;
  const REQUIRED_INPUTS = ['kills', 'deaths', 'time'];
  
  let html = `<div class="form-wrap" style="max-width:none;margin:0;">`;
  
  // Mapa (primeiro)
  html += `<div class="field"><label>Mapa</label><input type="text" id="f-map" list="f-map-list" placeholder="Digite ou selecione..." oninput="updatePreview()" autocomplete="off"><datalist id="f-map-list">${profile.maps.map(m=>`<option value="${m}">`).join("")}</datalist></div>`;
  
  const PRIMARY_INPUTS = ['kills', 'deaths', 'time'];
  const primaryInputs = inputMetrics.filter(m => PRIMARY_INPUTS.includes(m));
  const secondaryInputs = inputMetrics.filter(m => !PRIMARY_INPUTS.includes(m));
  
  // Métricas primárias (linhas de 3)
  for (let i = 0; i < primaryInputs.length; i += 3) {
    html += `<div class="form-row" style="margin-bottom:12px;grid-template-columns:1fr 1fr 1fr;">`;
    for (let j = i; j < Math.min(i+3, primaryInputs.length); j++) {
      const m = primaryInputs[j]; const meta = METRIC_MAP[m];
      html += `<div class="field" style="margin-bottom:0"><label>${meta.label}</label><input type="number" id="f-${m}" min="0" placeholder="ex: 0" oninput="updatePreview()"></div>`;
    }
    html += `</div>`;
  }
  
  // Métricas secundárias (colapsáveis)
  if (secondaryInputs.length) {
    html += `<div class="field" style="margin-bottom:8px;">
      <div class="collapse-toggle" onclick="toggleSecondaryMetrics(this)" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 0;">
        <span class="collapse-arrow" style="display:inline-block;transition:transform 0.2s ease;">▸</span>
        <span style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub);font-family:'Rajdhani',sans-serif;font-weight:600;">Métricas Secundárias</span>
      </div>
      <div class="collapse-content" style="display:none;">`;
    
    for (let i = 0; i < secondaryInputs.length; i += 3) {
      html += `<div class="form-row" style="margin-bottom:12px;grid-template-columns:1fr 1fr 1fr;">`;
      for (let j = i; j < Math.min(i+3, secondaryInputs.length); j++) {
        const m = secondaryInputs[j]; const meta = METRIC_MAP[m];
        html += `<div class="field" style="margin-bottom:0"><label>${meta.label}</label><input type="number" id="f-${m}" min="0" placeholder="ex: 0" oninput="updatePreview()"></div>`;
      }
      html += `</div>`;
    }
    
    html += `</div></div>`;
  }
  
  // Anotações (sempre por último)
  html += `<div class="field" style="margin-bottom:12px;"><label>Anotações</label><textarea id="f-notes" placeholder="Como foi a partida? O que aprendeu? O faria diferente?" style="height:40px;min-height:40px;transition:height 0.25s ease;resize:none;" onfocus="this.style.height='120px'" onblur="this.style.height='40px'"></textarea></div>`;
  
  if (isFirstMatch) {
    html += `<div style="background:rgba(0,229,255,0.05);border:1px solid var(--brand);padding:12px 16px;margin-top:16px;font-size:12px;color:var(--sub);">
      <strong style="color:var(--brand);">💡 Dica:</strong> Registre os dados logo após a partida para não esquecer. Você pode editar depois se precisar.
    </div>`;
  }
  
  html += `<div class="preview-box" id="preview" style="display:${calcMetrics.length ? 'flex' : 'none'};margin-top:14px;">`;
  html += calcMetrics.map(m => `<div class="preview-item"><div class="p-label">${METRIC_MAP[m].label}</div><div class="p-val" id="prev-${m}" style="color:var(--sub)">—</div></div>`).join("");
  html += `</div></div>`;
  
  body.innerHTML = html;
  updatePreview();
  setupMatchModalNav();
  setTimeout(() => {
    const mapInput = document.getElementById('f-map');
    if (mapInput) { mapInput.focus(); mapInput.select(); }
  }, 0);
}

function updatePreview() {
  const profile = getActiveProfile();
  const calcMetrics = profile.metrics.filter(m => METRIC_MAP[m]?.type === "calc");
  if (!calcMetrics.length) return;
  const kills = parseFloat(document.getElementById("f-kills")?.value);
  const deaths = parseFloat(document.getElementById("f-deaths")?.value);
  const time = parseFloat(document.getElementById("f-time")?.value);
  calcMetrics.forEach(m => {
    const el = document.getElementById(`prev-${m}`); if (!el) return;
    let val = "—";
    if (m==="kd" && !isNaN(kills)&&!isNaN(deaths)&&deaths>0) val=+(kills/deaths).toFixed(2);
    if (m==="kpm"&&!isNaN(kills)&&!isNaN(time)&&time>0) val=+(kills/time).toFixed(2);
    if (m==="kpd"&&!isNaN(deaths)&&!isNaN(time)&&time>0) val=+(deaths/time).toFixed(2);
    el.textContent = val;
    const colorVar = METRIC_COLORS[m];
    el.style.color = (colorVar && typeof val === "number") ? colorVar : "var(--sub)";
  });
}

async function addMatch() {
  console.log("=== addMatch INICIADO ===");
  
  const profile = getActiveProfile();
  console.log("Profile:", profile ? profile.game : "NULL");
  if (!profile) {
    showToast("⚠ Nenhum perfil ativo");
    console.log("=== addMatch ABORTADO: sem perfil ===");
    return;
  }
  if (profile.isDemo) {
    showToast("⚠ Não é possível adicionar partidas no perfil de demonstração");
    console.log("=== addMatch ABORTADO: perfil demo ===");
    return;
  }

  const inputMetrics = ALL_METRICS.filter(m => m.type === "input").map(m => m.id);
  console.log("Input metrics:", inputMetrics);
  
  const mapEl = document.getElementById("f-map");
  console.log("Map element:", mapEl ? "encontrado" : "NÃO ENCONTRADO");
  console.log("Map value:", mapEl?.value);
  
  const map = mapEl?.value || "";
  const notes = document.getElementById("f-notes")?.value.trim() || "";
  const values = { map, notes };
  let valid = true;
  const REQUIRED_INPUTS = ['kills', 'deaths', 'time'];

  for (const m of inputMetrics) {
    const el = document.getElementById(`f-${m}`);
    console.log(`Campo f-${m}:`, el ? `valor="${el.value}"` : "NÃO ENCONTRADO");
    if (!el) {
      valid = false;
      break;
    }
    const v = parseFloat(el.value);
    if (REQUIRED_INPUTS.includes(m) && (isNaN(v) || v < 0)) {
      console.log(`Campo ${m} inválido:`, el.value);
      valid = false;
      break;
    }
    if (!isNaN(v) && v >= 0) {
      values[m] = v;
    }
  }

  console.log("Valid:", valid, "Map:", map);
  if (!valid || !map) {
    showToast("⚠ Preencha pelo menos \"Mapa\", \"Abates\", \"Mortes\" e \"Tempo\" para prosseguir");
    console.log("=== addMatch ABORTADO: validação falhou ===");
    return;
  }

  const prevRecords = getRecords(profile.matches, profile.metrics);
  const match = buildMatch(values, profile.metrics, profile);
  console.log("Match criado:", match);

  showToast("⏳ Salvando partida...");

  let savedId = null;
  try {
    savedId = await syncToCloud("upsert_match", { profileId: activeProfileId, match });
    console.log("SavedId da nuvem:", savedId);
  } catch (e) {
    console.log("Sync erro:", e);
  }

  if (savedId) {
    match.id = savedId;
  } else {
    match.id = "m" + Date.now() + Math.random().toString(36).substr(2, 5);
  }
  console.log("Match ID final:", match.id);

  // CORREÇÃO: inserir na posição ordenada por match_date, não no final
  const insertIndex = profile.matches.findIndex(m => {
    if (!m.match_date || !match.match_date) return false;
    return new Date(m.match_date) > new Date(match.match_date);
  });
  
  if (insertIndex === -1) {
    // Nenhuma partida mais recente, insere no final
    profile.matches.push(match);
  } else {
    // Insere antes da primeira partida mais recente
    profile.matches.splice(insertIndex, 0, match);
  }
  
  normalizeProfileMatches(profile);
  console.log("Total de partidas agora:", profile.matches.length);
  
  saveState();
  console.log("State salvo no localStorage");

  const newRecords = getRecords(profile.matches, profile.metrics);
  checkNewRecords(prevRecords, newRecords);

  for (const m of inputMetrics) {
    const el = document.getElementById(`f-${m}`);
    if (el) el.value = "";
  }
  const notesEl = document.getElementById("f-notes");
  if (notesEl) notesEl.value = "";

  document.querySelectorAll("#preview .p-val").forEach(el => {
    el.textContent = "—";
    el.style.color = "var(--sub)";
  });

  const summaryMetrics = profile.metrics.filter(m => ["kd", "kpm", "kills"].includes(m));
  const summary = summaryMetrics.map(m => `${METRIC_MAP[m].label} ${match[m]}`).join(" · ");
  showToast(summary ? `✓ Partida salva — ${summary}` : "✓ Partida salva");
  console.log("=== addMatch CONCLUÍDO ===");
  // Mantém o modal aberto para adicionar várias partidas seguidas
  logSort = { col: 'date', dir: 'desc' };
  refreshAll();

  // Foca no campo de mapa para agilizar a próxima entrada
  setTimeout(() => {
    const mapInput = document.getElementById("f-map");
    if (mapInput) { mapInput.select(); mapInput.focus(); }
  }, 50);
}

/* ============================================================
   CONTROLE DO MODAL DE NOVA PARTIDA
   Impede fechamento acidental ao selecionar texto que termina
   fora do modal. Só fecha se o clique COMEÇOU e TERMINOU no
   fundo escuro (overlay).
   ============================================================ */
function toggleSecondaryMetrics(el) {
  const content = el.nextElementSibling;
  const arrow = el.querySelector('.collapse-arrow');
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
}

(function setupMatchModalClose() {
  const overlay = document.getElementById("match-modal-overlay");
  if (!overlay) return;
  let mouseDownOnOverlay = false;

  overlay.addEventListener("mousedown", function(e) {
    mouseDownOnOverlay = (e.target === overlay);
  });

  overlay.addEventListener("click", function(e) {
    if (e.target === overlay && mouseDownOnOverlay) {
      closeAddMatchModal();
    }
    mouseDownOnOverlay = false;
  });
})();

