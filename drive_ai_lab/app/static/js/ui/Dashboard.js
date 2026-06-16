export class Dashboard {
  constructor() {
    this.el = {
      gen: document.getElementById('statGen'),
      best: document.getElementById('statBest'),
      alive: document.getElementById('statAlive'),
      success: document.getElementById('statSuccess'),
      step: document.getElementById('statStep'),
      pop: document.getElementById('cfgPop'),
      sensor: document.getElementById('cfgSensor'),
      mut: document.getElementById('cfgMut'),
      tile: document.getElementById('cfgTile'),
    };
    this.histCanvas = document.getElementById('histChart');
    this.histCtx = this.histCanvas.getContext('2d');
    this.history = [];
    this._resizeHist();
    window.addEventListener('resize', () => { this._resizeHist(); this._drawHistory(); });
  }

  update({ generation, bestScore, aliveCars, successRate, step }) {
    if (generation !== undefined) this.el.gen.textContent = generation;
    if (bestScore !== undefined) this.el.best.textContent = Math.round(bestScore);
    if (aliveCars !== undefined) this.el.alive.textContent = aliveCars;
    if (successRate !== undefined) this.el.success.textContent = `${(successRate * 100).toFixed(0)}%`;
    if (step !== undefined) this.el.step.textContent = step;
  }

  setConfig(cfg) {
    this.el.pop.textContent = cfg.populationSize;
    this.el.sensor.textContent = cfg.sensorCount;
    this.el.mut.textContent = `${cfg.mutationStrength} / ${cfg.mutationRate}`;
    this.el.tile.textContent = cfg.tileSize;
  }

  addHistory(bestFitness) {
    this.history.push(bestFitness);
    if (this.history.length > 200) this.history.shift();
    this._drawHistory();
  }

  reset() {
    this.history = [];
    this._drawHistory();
  }

  _resizeHist() {
    const rect = this.histCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.histCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.histCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.histCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _drawHistory() {
    const ctx = this.histCtx;
    const rect = this.histCanvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    if (this.history.length < 1) return;
    const min = Math.min(...this.history, 0);
    const max = Math.max(...this.history, 1);
    const span = Math.max(1, max - min);

    // Baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - ((0 - min) / span) * h);
    ctx.lineTo(w, h - ((0 - min) / span) * h);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#5c7cfa';
    ctx.lineWidth = 1.5;
    this.history.forEach((v, i) => {
      const x = this.history.length === 1 ? w / 2 : (i / (this.history.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Last point dot
    const last = this.history[this.history.length - 1];
    const lx = w;
    const ly = h - ((last - min) / span) * h;
    ctx.fillStyle = '#5c7cfa';
    ctx.beginPath();
    ctx.arc(lx - 2, ly, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
