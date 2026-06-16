export const TILE = {
  EMPTY: 0,
  ROAD: 1,
  BUILDING: 2,
  BARRICADE: 3,
  START: 4,
  GOAL: 5,
};

export const TILE_COLOR = {
  0: '#1a1a24',
  1: '#3a3a48',
  2: '#5c4a3a',
  3: '#c0392b',
  4: '#51cf66',
  5: '#ffd43b',
};

const DRIVABLE = new Set([TILE.EMPTY, TILE.ROAD, TILE.START, TILE.GOAL]);

export class MapEditor {
  constructor(canvas, { width, height, tileSize }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.tiles = makeEmpty(width, height);

    this.selectedTile = TILE.EMPTY;
    this.editEnabled = true;

    this._painting = false;
    this._eraseMode = false;
    this._onChange = null;

    this._bind();
  }

  setOnChange(fn) { this._onChange = fn; }
  setSelectedTile(t) { this.selectedTile = t; }
  setEditEnabled(b) { this.editEnabled = b; }

  resizeToContainer() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const fitW = Math.floor(rect.width / this.width);
    const fitH = Math.floor(rect.height / this.height);
    this.tileSize = Math.max(8, Math.min(fitW, fitH));
    this.canvas.width = this.width * this.tileSize;
    this.canvas.height = this.height * this.tileSize;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
  }

  clear() {
    this.tiles = makeEmpty(this.width, this.height);
    this._emit();
  }

  loadSample(name) {
    if (name === 'straight') this.tiles = sampleStraight(this.width, this.height);
    else if (name === 'cross') this.tiles = sampleCross(this.width, this.height);
    else if (name === 'maze') this.tiles = sampleMaze(this.width, this.height);
    this._emit();
  }

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      tiles: this.tiles.map(row => [...row]),
    };
  }

  loadJSON(data) {
    if (!data || !Array.isArray(data.tiles)) return;
    this.width = data.width;
    this.height = data.height;
    this.tiles = data.tiles.map(row => [...row]);
    this._emit();
  }

  getStart() { return this._findUnique(TILE.START); }
  getGoal() { return this._findUnique(TILE.GOAL); }

  _findUnique(target) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x] === target) return { x, y };
      }
    }
    return null;
  }

  isBlockedTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return true;
    const v = this.tiles[ty][tx];
    return !DRIVABLE.has(v);
  }

  isBlockedWorld(wx, wy) {
    const tx = Math.floor(wx / this.tileSize);
    const ty = Math.floor(wy / this.tileSize);
    return this.isBlockedTile(tx, ty);
  }

  worldGoal() {
    const g = this.getGoal();
    if (!g) return null;
    return {
      x: (g.x + 0.5) * this.tileSize,
      y: (g.y + 0.5) * this.tileSize,
    };
  }

  worldStart() {
    const s = this.getStart();
    if (!s) return null;
    return {
      x: (s.x + 0.5) * this.tileSize,
      y: (s.y + 0.5) * this.tileSize,
    };
  }

  draw() {
    const { ctx, tileSize, width, height, tiles } = this;
    ctx.fillStyle = TILE_COLOR[TILE.EMPTY];
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y][x];
        if (t === TILE.EMPTY) continue;
        ctx.fillStyle = TILE_COLOR[t];
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        if (t === TILE.GOAL) {
          ctx.strokeStyle = '#fff8c8';
          ctx.lineWidth = 2;
          ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
        } else if (t === TILE.START) {
          ctx.strokeStyle = '#b9f5c0';
          ctx.lineWidth = 2;
          ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
        }
      }
    }
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      ctx.moveTo(x * tileSize + 0.5, 0);
      ctx.lineTo(x * tileSize + 0.5, height * tileSize);
    }
    for (let y = 0; y <= height; y++) {
      ctx.moveTo(0, y * tileSize + 0.5);
      ctx.lineTo(width * tileSize, y * tileSize + 0.5);
    }
    ctx.stroke();
  }

  _bind() {
    const c = this.canvas;
    const onPaint = (e) => {
      if (!this.editEnabled) return;
      const { tx, ty } = this._localTile(e);
      if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return;
      let v = this._eraseMode ? TILE.EMPTY : this.selectedTile;
      if (v === TILE.START || v === TILE.GOAL) {
        this._removeAll(v);
      }
      if (this.tiles[ty][tx] !== v) {
        this.tiles[ty][tx] = v;
        this._emit();
      }
    };
    c.addEventListener('mousedown', (e) => {
      if (!this.editEnabled) return;
      this._painting = true;
      this._eraseMode = e.button === 2;
      onPaint(e);
    });
    c.addEventListener('mousemove', (e) => {
      if (!this._painting) return;
      onPaint(e);
    });
    window.addEventListener('mouseup', () => { this._painting = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _localTile(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    return {
      tx: Math.floor(x / this.tileSize),
      ty: Math.floor(y / this.tileSize),
    };
  }

  _removeAll(t) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x] === t) this.tiles[y][x] = TILE.EMPTY;
      }
    }
  }

  _emit() {
    this.draw();
    if (this._onChange) this._onChange();
  }
}

function makeEmpty(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(TILE.EMPTY));
}

function sampleStraight(w, h) {
  const t = makeEmpty(w, h);
  const midY = Math.floor(h / 2);
  for (let x = 0; x < w; x++) {
    t[midY - 1][x] = TILE.ROAD;
    t[midY][x] = TILE.ROAD;
    t[midY + 1][x] = TILE.ROAD;
  }
  t[midY][1] = TILE.START;
  t[midY][w - 2] = TILE.GOAL;
  return t;
}

function sampleCross(w, h) {
  const t = makeEmpty(w, h);
  const midY = Math.floor(h / 2);
  const midX = Math.floor(w / 2);
  for (let x = 0; x < w; x++) {
    for (let dy = -1; dy <= 1; dy++) t[midY + dy][x] = TILE.ROAD;
  }
  for (let y = 0; y < h; y++) {
    for (let dx = -1; dx <= 1; dx++) t[y][midX + dx] = TILE.ROAD;
  }
  // Place some buildings in the corners
  for (let y = 0; y < midY - 2; y++) {
    for (let x = 0; x < midX - 2; x++) {
      if (Math.random() < 0.45) t[y][x] = TILE.BUILDING;
    }
    for (let x = midX + 3; x < w; x++) {
      if (Math.random() < 0.45) t[y][x] = TILE.BUILDING;
    }
  }
  for (let y = midY + 3; y < h; y++) {
    for (let x = 0; x < midX - 2; x++) {
      if (Math.random() < 0.45) t[y][x] = TILE.BUILDING;
    }
    for (let x = midX + 3; x < w; x++) {
      if (Math.random() < 0.45) t[y][x] = TILE.BUILDING;
    }
  }
  t[midY][2] = TILE.START;
  t[2][midX] = TILE.GOAL;
  return t;
}

function sampleMaze(w, h) {
  const t = makeEmpty(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        t[y][x] = TILE.BARRICADE;
      }
    }
  }
  // Some interior walls
  for (let y = 2; y < h - 2; y += 3) {
    const gap = 1 + Math.floor(Math.random() * (w - 4));
    for (let x = 1; x < w - 1; x++) {
      if (Math.abs(x - gap) > 1 && Math.abs(x - gap) !== 0) {
        if (Math.random() < 0.7) t[y][x] = TILE.BARRICADE;
      }
    }
  }
  t[1][1] = TILE.START;
  t[h - 2][w - 2] = TILE.GOAL;
  return t;
}
