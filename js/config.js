/* Nome e Local do Ficheiro: js/config.js */

/* ============================================================
   CONSTANTES E CONFIGURAÇÃO
   Valores fixos que não mudam durante o uso do app.
   Aqui ficam: chave do localStorage, mapa de cores,
   lista de métricas disponíveis e dados de exemplo (SEED).
   ============================================================ */
/* === CHAVE DE ARMAZENAMENTO DINÂMICA === */
function getStorageKey() {
  return currentUser ? `gt_v1_${currentUser.id}` : "gt_v1";
}
/* === SUPABASE CONFIG === */
// Cliente inicializado diretamente em initSupabase()

let supabaseClient = null;

function getOfflineStorageKey() {
  return "gt_v1";
}

function loadOfflineState() {
  try {
    const raw = localStorage.getItem(getOfflineStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.profiles)) return null;
    return parsed;
  } catch (e) {
    console.error("Erro ao ler estado offline:", e);
    return null;
  }
}

function getOfflineProfileDiffs(offlineState, accountState) {
  if (!offlineState || !Array.isArray(offlineState.profiles)) {
    return { newProfiles: [], duplicates: [] };
  }
  const accountProfiles = accountState?.profiles || [];
  const accountSigs = new Set(
    accountProfiles.map(p => `${p.game}|${p.mode || ''}|${p.server || ''}`)
  );
  const accountIds = new Set(accountProfiles.map(p => p.id));

  const newProfiles = [];
  const duplicates = [];

  for (const op of offlineState.profiles) {
    const sig = `${op.game}|${op.mode || ''}|${op.server || ''}`;
    if (accountIds.has(op.id)) {
      // Mesmo ID já sincronizado anteriormente — não é conflito
      continue;
    } else if (accountSigs.has(sig)) {
      duplicates.push(op);
    } else {
      newProfiles.push(op);
    }
  }
  return { newProfiles, duplicates };
}

function initSupabase() {
  try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(
        "https://yvybixhnsxvpwhfyvsgb.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eWJpeGhuc3h2cHdoZnl2c2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTY2NTcsImV4cCI6MjA5Nzk5MjY1N30.PqC9pTYLYEfWfYLp7FONFfqnau2mwRvbucVbMILBC7Y"
      );
      console.log("✓ Supabase conectado");
      return true;
    } else {
      console.warn("Biblioteca Supabase não disponível. Modo offline.");
      return false;
    }
  } catch (e) {
    logStructuredError({ level: 'ERROR', operation: 'initSupabase', message: 'Falha ao iniciar Supabase', context: { error: e.message } });
    supabaseClient = null;
    return false;
  }
}

// Tenta imediatamente
let supabaseReady = initSupabase();

// Se falhou, tenta novamente após 1 segundo (CDN pode estar lento)
if (!supabaseReady) {
  setTimeout(() => {
    if (!supabaseClient) {
      supabaseReady = initSupabase();
      if (supabaseReady && typeof checkAuth === 'function') {
        checkAuth();
      }
    }
  }, 1000);
}

/* === MAPA DE CORES: métricas → variáveis CSS === */
const METRIC_COLORS = {
  kills:    "var(--metric-kills)",
  deaths:   "var(--metric-deaths)",
  kd:       "var(--metric-kd)",
  kpm:      "var(--metric-kpm)",
  kpd:      "var(--metric-kpd)",
  time:     "var(--metric-time)",
  points:   "var(--metric-points)",
  damage:   "var(--metric-damage)",
  assists:  "var(--metric-assists)",
  position: "var(--metric-position)",
};

const KPI_HELP = {
  kd: `<strong>Média K/D</strong><br><br>
<em>Kills ÷ Deaths</em> — quantas eliminações você faz para cada morte.<br><br>
<strong>Meta:</strong> valor que você quer atingir. Digite e pressione Enter.<br>
<strong>Progresso:</strong> verde = acima da meta (bom), vermelho = abaixo.<br>
<strong>min / max:</strong> menor e maior K/D no período selecionado.<br><br>
<em>Quanto maior, melhor.</em>`,
  kpm: `<strong>Média KPM</strong><br><br>
<em>Kills ÷ Minutos</em> — eliminações por minuto de jogo.<br><br>
<strong>Meta:</strong> valor que você quer atingir. Digite e pressione Enter.<br>
<strong>Progresso:</strong> verde = acima da meta (bom), vermelho = abaixo.<br>
<strong>min / max:</strong> menor e maior KPM no período selecionado.<br><br>
<em>Quanto maior, melhor.</em>`,
  kpd: `<strong>Média KPD</strong><br><br>
<em>Deaths ÷ Minutos</em> — mortes por minuto de jogo.<br><br>
<strong>Meta:</strong> valor que você quer atingir. Digite e pressione Enter.<br>
<strong>Progresso:</strong> <em>invertido</em> — verde = abaixo da meta (bom), vermelho = acima.<br>
<strong>min / max:</strong> menor e maior KPD no período selecionado.<br><br>
<em>Quanto menor, melhor. Menos mortes = mais sobrevivência.</em>`,
  points: `<strong>Média de Pontos</strong><br><br>
<em>Soma dos pontos ÷ Partidas</em> — pontuação média por partida.<br><br>
<strong>Meta:</strong> valor que você quer atingir. Digite e pressione Enter.<br>
<strong>Progresso:</strong> verde = acima da meta (bom), vermelho = abaixo.<br>
<strong>min / max:</strong> menor e maior pontuação no período selecionado.<br><br>
<em>Quanto maior, melhor.</em>`,
  damage: `<strong>Média de Dano</strong><br><br>
<em>Soma do dano ÷ Partidas</em> — dano médio causado por partida.<br><br>
<strong>Meta:</strong> valor que você quer atingir. Digite e pressione Enter.<br>
<strong>Progresso:</strong> verde = acima da meta (bom), vermelho = abaixo.<br>
<strong>min / max:</strong> menor e maior dano no período selecionado.<br><br>
<em>Quanto maior, melhor.</em>`,
  assists: `<strong>Média de Assistências</strong><br><br>
<em>Soma das assistências ÷ Partidas</em> — assistências médias por partida.<br><br>
<strong>Meta:</strong> valor que você quer atingir. Digite e pressione Enter.<br>
<strong>Progresso:</strong> verde = acima da meta (bom), vermelho = abaixo.<br>
<strong>min / max:</strong> menor e maior número de assistências no período selecionado.<br><br>
<em>Quanto maior, melhor.</em>`,
  position: `<strong>Média de Posição</strong><br><br>
<em>Soma das posições ÷ Partidas</em> — colocação média por partida.<br><br>
<strong>Meta:</strong> valor que você quer atingir. Digite e pressione Enter.<br>
<strong>Progresso:</strong> <em>invertido</em> — verde = abaixo da meta (bom), vermelho = acima.<br>
<strong>min / max:</strong> melhor (menor número) e pior (maior número) colocação no período selecionado.<br><br>
<em>Quanto menor, melhor. 1º lugar é a melhor posição possível.</em>`,
};

const ALL_METRICS = [
  { id:"kills",    label:"Kills",        type:"input" },
  { id:"deaths",   label:"Deaths",       type:"input" },
  { id:"time",     label:"Tempo (min)",  type:"input" },
  { id:"points",   label:"Pontos",       type:"input" },
  { id:"damage",   label:"Dano",         type:"input" },
  { id:"assists",  label:"Assistências", type:"input" },
  { id:"position", label:"Posição",      type:"input" },
  { id:"kd",  label:"K/D", type:"calc", needs:["kills","deaths"] },
  { id:"kpm", label:"KPM", type:"calc", needs:["kills","time"]   },
  { id:"kpd", label:"KPD", type:"calc", needs:["deaths","time"]  },
];
const METRIC_MAP = Object.fromEntries(ALL_METRICS.map(m => [m.id, m]));
const CHARTABLE = ["kills","deaths","kd","kpm","kpd","points","damage","assists","position"];

