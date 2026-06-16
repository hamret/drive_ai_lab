import { MapEditor } from './core/MapEditor.js';
import { createPopulation, evolvePopulation } from './core/Genetic.js';
import { NeuralNetwork } from './core/NeuralNetwork.js';
import { Dashboard } from './ui/Dashboard.js';
import { bindControls } from './ui/Controls.js';

const mapCanvas = document.getElementById('mapCanvas');
const carCanvas = document.getElementById('carCanvas');
const carCtx = carCanvas.getContext('2d');

const state = {
  cfg: null,
  mode: 'edit',
  running: false,
  speed: 1,
  generation: 0,
  bestEverFitness: -Infinity,
  bestBrain: null,
  population: [],
  tickInEpisode: 0,
  successRate: 0,
};

const LOCAL_MAP_KEY = 'drive_ai_lab.map.v1';

let mapEditor = null;
let dashboard = null;

async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error('config fetch failed');
    return await r.json();
  } catch {
    return {
      populationSize: 80, sensorCount: 7, sensorSpread: 1.6, sensorRange: 220,
      hiddenSize: 16, mutationRate: 0.15, mutationStrength: 0.25,
      maxSpeed: 3.2, acceleration: 0.18, friction: 0.04, turnSpeed: 0.045,
      tileSize: 32, mapWidth: 24, mapHeight: 16, maxSteps: 1400, goalReward: 1000,
    };
  }
}

function syncCarCanvas() {
  carCanvas.width = mapCanvas.width;
  carCanvas.height = mapCanvas.height;
  carCanvas.style.width = mapCanvas.style.width;
  carCanvas.style.height = mapCanvas.style.height;
}

function fullResize() {
  mapEditor.resizeToContainer();
  syncCarCanvas();
  mapEditor.draw();
  drawCars();
}

function ensureStartGoal() {
  const start = mapEditor.getStart();
  const goal = mapEditor.getGoal();
  if (!start || !goal) {
    alert('Start와 Goal 타일을 모두 배치해주세요.');
    return false;
  }
  return true;
}

function makeNewPopulation() {
  const start = mapEditor.worldStart();
  const goal = mapEditor.worldGoal();
  const cfg = { ...state.cfg, tileSize: mapEditor.tileSize };
  const angle = computeStartAngle(start, goal);
  const pop = createPopulation(cfg.populationSize, start.x, start.y, cfg);
  const initialDist = Math.hypot(goal.x - start.x, goal.y - start.y);
  pop.forEach(car => {
    car.angle = angle;
    car.initialGoalDist = initialDist;
    if (state.bestBrain) {
      car.brain = NeuralNetwork.clone(state.bestBrain);
      NeuralNetwork.mutate(car.brain, cfg.mutationStrength, cfg.mutationRate);
    }
  });
  if (state.bestBrain && pop[0]) pop[0].brain = NeuralNetwork.clone(state.bestBrain);
  return pop;
}

function computeStartAngle(start, goal) {
  if (!start || !goal) return -Math.PI / 2;
  return Math.atan2(goal.y - start.y, goal.x - start.x);
}

function startSim() {
  if (state.running) return;
  if (!ensureStartGoal()) return;
  if (state.population.length === 0) {
    state.population = makeNewPopulation();
    state.tickInEpisode = 0;
  }
  state.running = true;
  state.mode = 'sim';
  document.body.classList.add('mode-sim');
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === 'sim');
  });
  mapEditor.setEditEnabled(false);
}

function pauseSim() {
  state.running = false;
}

function resetSim() {
  state.running = false;
  state.generation = 0;
  state.bestEverFitness = -Infinity;
  state.bestBrain = null;
  state.population = [];
  state.tickInEpisode = 0;
  state.successRate = 0;
  dashboard.reset();
  dashboard.update({ generation: 0, bestScore: 0, aliveCars: 0, successRate: 0, step: 0 });
  drawCars();
}

function tick() {
  const cfg = { ...state.cfg, tileSize: mapEditor.tileSize };
  const goal = mapEditor.worldGoal();
  let aliveCount = 0;
  for (const car of state.population) {
    if (!car.damaged && !car.reachedGoal) {
      car.update(mapEditor, goal);
    }
    if (!car.damaged && !car.reachedGoal) aliveCount++;
  }
  state.tickInEpisode++;

  const done = aliveCount === 0 || state.tickInEpisode >= cfg.maxSteps;
  dashboard.update({
    generation: state.generation,
    bestScore: Math.max(0, state.bestEverFitness === -Infinity ? 0 : state.bestEverFitness),
    aliveCars: aliveCount,
    step: state.tickInEpisode,
  });
  if (done) evolveStep();
}

function evolveStep() {
  const start = mapEditor.worldStart();
  const goal = mapEditor.worldGoal();
  const cfg = { ...state.cfg, tileSize: mapEditor.tileSize };
  if (!start || !goal) { pauseSim(); return; }
  const result = evolvePopulation(state.population, cfg.populationSize, start.x, start.y, cfg);
  if (result.bestFitness > state.bestEverFitness) {
    state.bestEverFitness = result.bestFitness;
    state.bestBrain = result.bestBrain;
  }
  const angle = computeStartAngle(start, goal);
  const initialDist = Math.hypot(goal.x - start.x, goal.y - start.y);
  result.population.forEach(c => {
    c.angle = angle;
    c.initialGoalDist = initialDist;
  });
  state.population = result.population;
  state.tickInEpisode = 0;
  state.generation++;
  state.successRate = result.successCount / Math.max(1, cfg.populationSize);
  dashboard.addHistory(result.bestFitness);
  dashboard.update({
    generation: state.generation,
    bestScore: Math.max(0, state.bestEverFitness),
    successRate: state.successRate,
    aliveCars: cfg.populationSize,
    step: 0,
  });
}

function drawCars() {
  carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
  if (state.mode !== 'sim' || state.population.length === 0) return;

  const goal = mapEditor.worldGoal();
  if (goal) {
    carCtx.strokeStyle = 'rgba(255,212,59,0.5)';
    carCtx.lineWidth = 1;
    carCtx.beginPath();
    carCtx.arc(goal.x, goal.y, mapEditor.tileSize * 0.6, 0, Math.PI * 2);
    carCtx.stroke();
  }

  let best = null;
  let bestKey = -Infinity;
  for (const c of state.population) {
    const k = c.reachedGoal ? Infinity : (c.damaged ? -1 : c.distance);
    if (k > bestKey) { bestKey = k; best = c; }
  }

  for (const c of state.population) {
    if (c === best) continue;
    c.draw(carCtx, { highlight: false, showSensors: false });
  }
  if (best) best.draw(carCtx, { highlight: true, showSensors: true });
}

function loop() {
  if (state.running) {
    for (let i = 0; i < state.speed; i++) tick();
  }
  drawCars();
  requestAnimationFrame(loop);
}

async function saveMap() {
  const data = mapEditor.toJSON();
  localStorage.setItem(LOCAL_MAP_KEY, JSON.stringify(data));
  try {
    const res = await fetch('/api/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('server save failed');
    flash('Map saved (server + local)');
  } catch {
    flash('Map saved locally only');
  }
}

async function loadMap() {
  try {
    const res = await fetch('/api/map');
    if (res.ok) {
      const data = await res.json();
      mapEditor.loadJSON(data);
      fullResize();
      flash('Loaded from server');
      return;
    }
  } catch { /* fall through */ }
  const raw = localStorage.getItem(LOCAL_MAP_KEY);
  if (raw) {
    try {
      mapEditor.loadJSON(JSON.parse(raw));
      fullResize();
      flash('Loaded from local');
      return;
    } catch { /* fall through */ }
  }
  flash('No saved map found');
}

let flashTimer = null;
function flash(msg) {
  let el = document.getElementById('flashMsg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flashMsg';
    Object.assign(el.style, {
      position: 'fixed', bottom: '12px', right: '14px',
      background: 'rgba(20,20,30,0.95)', color: '#fff',
      padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem',
      border: '1px solid #2e2e3e', zIndex: 1000, opacity: '0',
      transition: 'opacity 0.2s ease',
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 1800);
}

(async () => {
  state.cfg = await loadConfig();
  dashboard = new Dashboard();
  dashboard.setConfig(state.cfg);

  mapEditor = new MapEditor(mapCanvas, {
    width: state.cfg.mapWidth,
    height: state.cfg.mapHeight,
    tileSize: state.cfg.tileSize,
  });
  mapEditor.setOnChange(() => {
    syncCarCanvas();
    drawCars();
  });
  mapEditor.loadSample('cross');
  fullResize();

  bindControls({
    onStart: startSim,
    onPause: pauseSim,
    onReset: () => { resetSim(); mapEditor.draw(); },
    onSpeed: (v) => { state.speed = v; },
    onMode: (mode) => {
      state.mode = mode;
      mapEditor.setEditEnabled(mode === 'edit');
      if (mode === 'edit') state.running = false;
      drawCars();
    },
    onTile: (t) => mapEditor.setSelectedTile(t),
    onClear: () => { mapEditor.clear(); fullResize(); },
    onSave: saveMap,
    onLoad: loadMap,
    onSample: (name) => { mapEditor.loadSample(name); fullResize(); },
  });

  window.addEventListener('resize', fullResize);
  loop();
})();
