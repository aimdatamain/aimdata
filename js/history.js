/* Nome e Local do Ficheiro: js/history.js */

/* ============================================================
   RENDERIZAÇÃO — HISTÓRICO
   Monta a tabela de partidas com filtro por mapa,
   e a linha de edição inline quando o usuário clica em ✎.
   ============================================================ */
function renderLog() {
  const profile = getActiveProfile();
  if (!profile) {
    document.getElementById("logCount").textContent = "0 partidas";
    document.getElementById("logHead").innerHTML = "";
    document.getElementById("logBody").innerHTML = `<tr><td colspan="99" style="text-align:center;padding:32px 20px;color:var(--sub);"><div class="e-icon" style="font-size:36px;margin-bottom:12px;">📋</div><div class="e-title" style="font-family:'Rajdhani',sans-serif;font-size:18px;color:var(--text);margin-bottom:6px;">Nenhum perfil ativo</div><div class="e-sub" style="font-size:13px;">Crie um perfil para visualizar o histórico de partidas</div></td></tr>`;
    return;
  }
  const metrics = profile.metrics;
  const inputMetrics = metrics.filter(m => METRIC_MAP[m]?.type === "input");
  const calcMetrics = metrics.filter(m => METRIC_MAP[m]?.type === "calc");
  const sel = document.getElementById("filterMap");
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos</option>' + profile.maps.map(m => `<option value="${m}"${m===cur?" selected":""}>${m}</option>`).join("");
  const filter = sel.value;
  const filtered = filter ? profile.matches.filter(r => r.map === filter) : profile.matches;
  document.getElementById("logCount").textContent = `${filtered.length} partidas`;

  function sortIcon(c) { if (logSort.col !== c) return ''; return logSort.dir === 'desc' ? ' ▼' : ' ▲'; }
  function sortStyle(c) { return logSort.col === c ? 'color:var(--brand);' : ''; }
  function sortCursor(c) { return c !== 'map' && c !== 'notes' && c !== '#' ? 'cursor:pointer;' : ''; }
  function sortClick(c) { return c !== 'map' && c !== 'notes' && c !== '#' ? `onclick="sortLogTable('${c}')"` : ''; }

  document.getElementById("logHead").innerHTML = `<th>#</th><th ${sortClick('date')} style="${sortStyle('date')}${sortCursor('date')}white-space:nowrap;">Hora / Data${sortIcon('date')}</th>` + ["map",...inputMetrics,...calcMetrics].map(c => `<th ${sortClick(c)} style="${sortStyle(c)}${sortCursor(c)}white-space:nowrap;">${c==="map"?"Mapa":METRIC_MAP[c]?.label||c}${sortIcon(c)}</th>`).join("") + `<th>Notas</th><th></th>`;

  let sortedFiltered = [...filtered];
  if (logSort.col === 'date') {
    sortedFiltered.sort((a, b) => {
      const timeA = a.match_date ? new Date(a.match_date).getTime() : 0;
      const timeB = b.match_date ? new Date(b.match_date).getTime() : 0;
      return logSort.dir === 'desc' ? timeB - timeA : timeA - timeB;
    });
  } else if (logSort.col) {
    sortedFiltered.sort((a, b) => {
      const valA = a[logSort.col];
      const valB = b[logSort.col];
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return logSort.dir === 'desc' ? numB - numA : numA - numB;
      }
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return logSort.dir === 'desc' ? 1 : -1;
      if (strA > strB) return logSort.dir === 'desc' ? -1 : 1;
      return 0;
    });
  }

  document.getElementById("logBody").innerHTML = sortedFiltered.map((r, idx) => {
    if (editingMatchId === r.id) return buildEditRow(r, profile);
    const notesIcon = r.notes ? `<span title="${r.notes.replace(/"/g, '&quot;')}" style="cursor:help;color:var(--brand);font-size:14px;">📝</span>` : `<span style="color:var(--muted);font-size:14px;opacity:0.3;">📝</span>`;
    const actionsHtml = profile.isDemo
      ? `<td style="color:var(--muted);font-size:11px;text-align:center;">Somente leitura</td>`
      : `<td><button class="action-btn" onclick="startEditMatch('${r.id}')">✎</button><button class="action-btn" onclick="duplicateMatch('${r.id}')">⧉</button><button class="action-btn del" onclick="deleteMatch('${r.id}')">✕</button></td>`;
    return `<tr><td class="r-num" style="color:var(--sub);font-size:12px">#${r.match_number || (filtered.length - idx)}</td><td style="font-size:12px;color:var(--sub);white-space:nowrap">${formatDate(r.match_date)}</td><td style="font-family:'Rajdhani',sans-serif;font-weight:600">${r.map}</td>${inputMetrics.filter(m=>m!=="map").map(m => { const val=r[m]; let style="font-family:'Rajdhani',sans-serif;"; const colorVar=METRIC_COLORS[m]; if(colorVar)style+=`color:${colorVar};`; return `<td style="${style}">${val!==undefined?(m==="time"?val+"min":val):"—"}</td>`; }).join("")}${calcMetrics.map(m => `<td class="r-num" style="color:${METRIC_COLORS[m]||'var(--sub)'}">${r[m]!==undefined?r[m]:"—"}</td>`).join("")}<td style="text-align:center;">${notesIcon}</td>${actionsHtml}</tr>`;  }).join("");
}

function sortLogTable(col) {
  if (logSort.col === col) {
    logSort.dir = logSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    logSort.col = col;
    logSort.dir = 'desc';
  }
  renderLog();
}

function buildEditRow(r, profile) {
  const inputMetrics = profile.metrics.filter(m => METRIC_MAP[m]?.type === "input");
  const calcMetrics = profile.metrics.filter(m => METRIC_MAP[m]?.type === "calc");
  return `<tr style="background:#0d1017">
    <td class="r-num" style="color:var(--sub);font-size:12px">#${r.match_number || r.id}</td>
    
    <!-- HORA / DATA   (agora na 2ª coluna, igual ao modo visualização) -->
    <td style="white-space:nowrap;">
      <input class="edit-input" type="date" id="edit-date" value="${toLocalDate(r.match_date)}" style="width:110px!important;font-size:12px;display:inline-block;">
      <input class="edit-input" type="time" id="edit-daytime" value="${toLocalTime(r.match_date)}" style="width:75px!important;font-size:12px;display:inline-block;">
    </td>
    
    <!-- MAPA (agora na 3ª coluna, igual ao modo visualização) -->
    <td><select class="edit-select" id="edit-map">${profile.maps.map(m=>`<option${m===r.map?" selected":""}>${m}</option>`).join("")}</select></td>
    
    ${inputMetrics.filter(m=>m!=="map").map(m=>`<td><input class="edit-input" type="number" id="edit-${m}" value="${r[m]??""}" placeholder="${METRIC_MAP[m]?.label}"></td>`).join("")}
    <td colspan="${calcMetrics.length}" style="color:var(--sub);font-size:11px;white-space:nowrap">auto-calculado</td>
    <td><input class="edit-input" type="text" id="edit-notes" value="${(r.notes??"").replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" placeholder="Anotações" style="width:120px!important;"></td>
    <td><button class="save-btn" onclick="saveEditMatch()">OK</button><button class="cancel-btn" onclick="cancelEditMatch()">✕</button></td>
  </tr>`;
}

function startEditMatch(id) { editingMatchId = id; renderLog(); }
function cancelEditMatch() { editingMatchId = null; renderLog(); }

function saveEditMatch() {
  const profile = getActiveProfile();
  if (profile.isDemo) {
    showToast("⚠ Não é possível editar partidas do perfil de demonstração");
    editingMatchId = null;
    renderLog();
    return;
  }
  const inputMetrics = profile.metrics.filter(m => METRIC_MAP[m]?.type === "input");
  const map = document.getElementById("edit-map").value;
  const dateInput = document.getElementById("edit-date")?.value;
  const timeInput = document.getElementById("edit-daytime")?.value;
  const notes = document.getElementById("edit-notes")?.value.trim() || "";
  console.log("[DBG] inputMetrics =", JSON.stringify(inputMetrics));
  console.log("[DBG] edit-time element =", document.getElementById("edit-time"));
  console.log("[DBG] edit-time value  =", document.getElementById("edit-time")?.value);
  console.log("[DBG] qty de edit-time no DOM =", document.querySelectorAll('[id="edit-time"]').length);
  console.log("[DBG] dateInput =", dateInput, "| timeInput =", timeInput);
  const values = { map, notes }; let valid = true;
  inputMetrics.filter(m=>m!=="map").forEach(m => { const v=parseFloat(document.getElementById(`edit-${m}`)?.value); if(isNaN(v)){valid=false;return;} values[m]=v; });
  console.log("[DBG] values final =", JSON.stringify(values));
  if (!valid) { showToast("⚠ Valores inválidos"); return; }



  profile.matches = profile.matches.map(r => {
  if (r.id !== editingMatchId) return r;
  const updated = buildMatch(values, profile.metrics, profile);
  updated.id = editingMatchId;
  // PRESERVAR: match_number (edição não muda ordem cronológica)
  updated.match_number = r.match_number;
    // hora/Data: converte hora local digitada para UTC
    if (dateInput) {
      const localDate = toLocalDate(r.match_date);
      const localTime = toLocalTime(r.match_date);
      
      if (dateInput === localDate && timeInput === localTime) {
        updated.match_date = r.match_date;
      } else {
        const timeToUse = timeInput || localTime || "12:00";
        // Converte hora local digitada para UTC real
        const local = new Date(`${dateInput}T${timeToUse}:00`);
        updated.match_date = local.toISOString();
      }
    } else {
      updated.match_date = r.match_date;
    }
  return updated;
  });
  // Captura os match_number antes de normalizar para detectar quais mudaram
  const numbersBefore = new Map(
    profile.matches
      .filter(m => m.id && !m.id.startsWith('m'))
      .map(m => [m.id, m.match_number])
  );

  normalizeProfileMatches(profile);

  // Detecta quais partidas tiveram match_number alterado pela normalização
  const changedMatches = profile.matches.filter(m => {
    if (!m.id || m.id.startsWith('m')) return false;
    return numbersBefore.get(m.id) !== m.match_number;
  });

  const updatedMatch = profile.matches.find(r => r.id === editingMatchId);

  saveState();

  // Envia para a nuvem só as partidas que realmente mudaram de número,
  // mais a partida editada (que pode ter mudado outros campos além do número)
  const toSync = changedMatches.some(m => m.id === editingMatchId)
    ? changedMatches
    : [...changedMatches, updatedMatch];

    (async () => {
      await syncToCloud("upsert_matches", { profileId: activeProfileId, matches: toSync });
    })();

  editingMatchId=null; renderLog(); showToast("✓ Partida atualizada");
}

function deleteMatch(id) {
  const profile = getActiveProfile();
  if (profile.isDemo) {
    showToast("⚠ Não é possível excluir partidas do perfil de demonstração");
    return;
  }

  profile.matches = profile.matches.filter(r => r.id !== id);
  normalizeProfileMatches(profile);
  saveState();
  syncToCloud("delete_match", { profileId: activeProfileId, matchId: id });
  renderLog(); showToast("Partida removida");
}

function duplicateMatch(id) {
  const profile = getActiveProfile();
  if (!profile) return;
  if (profile.isDemo) {
    showToast("⚠ Não é possível duplicar partidas do perfil de demonstração");
    return;
  }

  const original = profile.matches.find(r => r.id === id);
  if (!original) return;

  const copy = { ...original };
  copy.id = "m" + Date.now() + Math.random().toString(36).substr(2, 5);
  // NOVO: cópia recebe um match_number novo (é uma nova entrada no histórico)
  const maxNum = profile.matches.reduce((max, match) => {
    const num = parseInt(match.match_number);
    return !isNaN(num) && num > max ? num : max;
  }, 0);
  copy.match_number = maxNum + 1;
  copy.match_date = new Date().toISOString();
  profile.matches.push(copy);
  normalizeProfileMatches(profile);
  saveState();

  syncToCloud("upsert_match", { profileId: activeProfileId, match: copy })
    .then(cloudId => {
      if (cloudId) {
        copy.id = cloudId;
        saveState();
      }
    })
    .catch(err => console.error("Erro ao sincronizar cópia:", err));

  renderLog();
  showToast("✓ Partida duplicada");
}