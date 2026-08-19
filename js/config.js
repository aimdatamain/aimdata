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
  { id:"kills",    label:"Abates",        type:"input" },
  { id:"deaths",   label:"Mortes",       type:"input" },
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

/* === PERFIL DE DEMONSTRAÇÃO === */
const DEMO_PROFILE_DATA = {
  id: "__demo__",
  game: "🎯 Demo",
  mode: "Arena Shooter",
  server: "",
  isDemo: true,
  metrics: ["kills","deaths","time","kd","kpm","kpd","points","damage"],
  maps: ["Dockyard","Hangar","Quarry","Refinery"],
  matches: [
    {id:"dm001",match_number:1,match_date:"2026-07-22T18:05:00.000Z",map:"Dockyard",kills:19,deaths:18,time:12.1,points:2283,damage:1977,kd:1.06,kpm:1.57,kpd:1.49,notes:""},
    {id:"dm002",match_number:2,match_date:"2026-07-25T23:00:00.000Z",map:"Hangar",kills:22,deaths:13,time:9.5,points:2750,damage:2122,kd:1.69,kpm:2.32,kpd:1.37,notes:""},
    {id:"dm003",match_number:3,match_date:"2026-07-26T15:06:00.000Z",map:"Quarry",kills:25,deaths:9,time:18.0,points:2681,damage:4164,kd:2.78,kpm:1.39,kpd:0.5,notes:"Ping alto no meio do jogo"},
    {id:"dm004",match_number:4,match_date:"2026-07-26T22:10:00.000Z",map:"Refinery",kills:14,deaths:16,time:8.8,points:2133,damage:2985,kd:0.88,kpm:1.59,kpd:1.82,notes:""},
    {id:"dm005",match_number:5,match_date:"2026-07-27T14:15:00.000Z",map:"Dockyard",kills:10,deaths:18,time:10.8,points:1613,damage:3356,kd:0.56,kpm:0.93,kpd:1.67,notes:""},
    {id:"dm006",match_number:6,match_date:"2026-07-28T16:21:00.000Z",map:"Hangar",kills:16,deaths:12,time:15.6,points:2694,damage:2466,kd:1.33,kpm:1.03,kpd:0.77,notes:"Time desorganizado"},
    {id:"dm007",match_number:7,match_date:"2026-07-28T20:44:00.000Z",map:"Quarry",kills:19,deaths:10,time:10.5,points:2293,damage:4454,kd:1.9,kpm:1.81,kpd:0.95,notes:""},
    {id:"dm008",match_number:8,match_date:"2026-07-30T11:01:00.000Z",map:"Refinery",kills:10,deaths:14,time:15.6,points:3387,damage:2802,kd:0.71,kpm:0.64,kpd:0.9,notes:""},
    {id:"dm009",match_number:9,match_date:"2026-08-01T16:02:00.000Z",map:"Dockyard",kills:13,deaths:12,time:12.6,points:3481,damage:2699,kd:1.08,kpm:1.03,kpd:0.95,notes:"Ping alto no meio do jogo"},
    {id:"dm010",match_number:10,match_date:"2026-08-02T16:14:00.000Z",map:"Hangar",kills:18,deaths:18,time:17.2,points:1429,damage:2738,kd:1.0,kpm:1.05,kpd:1.05,notes:""},
    {id:"dm011",match_number:11,match_date:"2026-08-05T19:17:00.000Z",map:"Quarry",kills:9,deaths:17,time:11.8,points:2296,damage:2071,kd:0.53,kpm:0.76,kpd:1.44,notes:""},
    {id:"dm012",match_number:12,match_date:"2026-08-11T12:13:00.000Z",map:"Refinery",kills:14,deaths:19,time:19.3,points:2488,damage:2670,kd:0.74,kpm:0.73,kpd:0.98,notes:"Time desorganizado"},
    {id:"dm013",match_number:13,match_date:"2026-08-12T12:47:00.000Z",map:"Dockyard",kills:23,deaths:11,time:18.6,points:3079,damage:2385,kd:2.09,kpm:1.24,kpd:0.59,notes:""},
    {id:"dm014",match_number:14,match_date:"2026-08-12T18:38:00.000Z",map:"Hangar",kills:16,deaths:7,time:11.0,points:3499,damage:4007,kd:2.29,kpm:1.45,kpd:0.64,notes:""},
    {id:"dm015",match_number:15,match_date:"2026-08-16T20:47:00.000Z",map:"Quarry",kills:16,deaths:16,time:15.0,points:3590,damage:3435,kd:1.0,kpm:1.07,kpd:1.07,notes:"Melhor partida da semana"},
    {id:"dm016",match_number:16,match_date:"2026-08-17T16:06:00.000Z",map:"Refinery",kills:19,deaths:8,time:20.0,points:1766,damage:3887,kd:2.38,kpm:0.95,kpd:0.4,notes:""},
    {id:"dm017",match_number:17,match_date:"2026-08-19T11:13:00.000Z",map:"Dockyard",kills:23,deaths:6,time:17.1,points:1649,damage:2426,kd:3.83,kpm:1.35,kpd:0.35,notes:"Time desorganizado"},
    {id:"dm018",match_number:18,match_date:"2026-08-19T18:12:00.000Z",map:"Hangar",kills:13,deaths:17,time:16.2,points:1460,damage:3376,kd:0.76,kpm:0.8,kpd:1.05,notes:""}
  ]
};

