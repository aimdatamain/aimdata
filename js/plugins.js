/* Nome e Local do Ficheiro: js/plugins.js */

/* ============================================================
   PLUGIN DE BOLINHAS DE RECORDE
   Desenha marcadores dourado, prata e bronze nos 3 maiores
   (ou menores, para KPD) valores do gráfico linear.
   ============================================================ */
const RECORD_MEDALS = [
  { color: '#FFD700', glow: 'rgba(255,215,0,0.65)',   size: 3.2, label: '🥇 Ouro',   rank: '1º Recorde', cls: 'record-gold'   },
  { color: '#C0C0C0', glow: 'rgba(192,192,192,0.50)', size: 2.8, label: '🥈 Prata',  rank: '2º Recorde', cls: 'record-silver' },
  { color: '#CD7F32', glow: 'rgba(205,127,50,0.50)',  size: 2.6, label: '🥉 Bronze', rank: '3º Recorde', cls: 'record-bronze' },
];

const recordDotsPlugin = {
  id: 'recordDots',
  afterDatasetsDraw(chart, args, opts) {
    if (!opts || !opts.enabled) return;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    
    // Se o dataset principal (índice 0) está oculto, não desenha bolinhas
    const meta0 = chart.getDatasetMeta(0);
    if (meta0.hidden) return;

    const vals = dataset.data;
    const isInverted = opts.inverted || false;

    const indexed = vals.map((v, i) => ({ v, i }))
      .filter(x => x.v !== null && x.v !== undefined && x.v > 0);
    if (!indexed.length) return;

    const sorted = [...indexed].sort((a, b) => isInverted ? a.v - b.v : b.v - a.v);
    const top3 = sorted.slice(0, Math.min(3, sorted.length));

    const meta = chart.getDatasetMeta(0);
    const chartArea = chart.chartArea;
    
    // Limpa e repopula as posições para hit-test
    chart._recordDotsPositions = [];

    top3.forEach(({ v, i }, rank) => {
      const point = meta.data[i];
      if (!point) return;
      
      // Guard: não desenha se o ponto está fora da área visível do gráfico
      if (point.x < chartArea.left || point.x > chartArea.right ||
          point.y < chartArea.top || point.y > chartArea.bottom) {
        return;
      }
      
      const x = point.x;
      const y = point.y;
      const medal = RECORD_MEDALS[rank];

      // Armazena para o hit-test posterior
      chart._recordDotsPositions.push({ x, y, rank, index: i });

      ctx.save();
      ctx.shadowColor = medal.glow;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, medal.size + 2, 0, 2 * Math.PI);
      ctx.fillStyle = medal.glow;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = medal.glow;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, medal.size, 0, 2 * Math.PI);
      ctx.fillStyle = medal.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });
  }
};

/* ============================================================
   PLUGIN: LINHA DE META NO GRÁFICO DE BARRAS
   Desenha uma linha tracejada horizontal de ponta a ponta
   e o valor da meta no canto direito, fora do grid.
   É ativado/desativado pelo clique na legenda do dataset
   associado (datasetIndex).
   ============================================================ */
const mapGoalLinePlugin = {
  id: 'mapGoalLine',
  beforeDatasetsDraw(chart, args, options) {
    if (!options || !options.enabled) return;

    const ctx = chart.ctx;
    const yScale = chart.scales.y;
    const chartArea = chart.chartArea;
    const goalValue = options.goalValue;

    if (goalValue === null || goalValue === undefined) return;

    const y = yScale.getPixelForValue(goalValue);
    if (y < chartArea.top || y > chartArea.bottom) return;

    const color = options.color || '#b388ff';

    ctx.save();

    // Linha tracejada de ponta a ponta (borda esquerda até borda direita do grid)
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();

    // Rótulo empilhado: "Meta" acima, valor abaixo
    const padding = 8;
    ctx.fillStyle = color;
    ctx.textAlign = "left";

    ctx.font = "bold 11px Rajdhani, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText("Meta", chartArea.right + padding, y - 2);

    ctx.font = "bold 13px Rajdhani, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(String(goalValue), chartArea.right + padding, y + 2);

    ctx.restore();
  }
};

// Métricas que exibem bolinhas de recorde e se são invertidas
const RECORD_METRICS = { kd: false, kpm: false, kills: false, kpd: true };

