import { NeuralNetwork } from './NeuralNetwork.js';

const INPUT_EXTRAS = 4; // speed, goal-bearing sin/cos, goal-distance

export class Car {
  constructor(x, y, cfg) {
    this.cfg = cfg;
    this.startX = x;
    this.startY = y;
    this.width = Math.max(10, cfg.tileSize * 0.5);
    this.height = Math.max(16, cfg.tileSize * 0.8);

    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.speed = 0;

    this.maxSpeed = cfg.maxSpeed;
    this.acceleration = cfg.acceleration;
    this.friction = cfg.friction;
    this.turnSpeed = cfg.turnSpeed;

    this.sensorCount = cfg.sensorCount;
    this.sensorSpread = cfg.sensorSpread;
    this.sensorRange = cfg.sensorRange;
    this.sensorReadings = new Array(this.sensorCount).fill(1);

    this.damaged = false;
    this.reachedGoal = false;
    this.steps = 0;
    this.distance = 0;
    this.initialGoalDist = 1;
    this.minGoalDist = Infinity;

    const inputs = this.sensorCount + INPUT_EXTRAS;
    const hidden = cfg.hiddenSize;
    this.brain = new NeuralNetwork([inputs, hidden, 2]);
  }

  reset(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle ?? -Math.PI / 2;
    this.speed = 0;
    this.damaged = false;
    this.reachedGoal = false;
    this.steps = 0;
    this.distance = 0;
    this.minGoalDist = Infinity;
  }

  update(map, goal) {
    if (this.damaged || this.reachedGoal) return;
    this.steps++;

    this._readSensors(map);
    const inputs = this._buildInputs(goal);
    const [steerOut, throttleOut] = NeuralNetwork.feedForward(inputs, this.brain);

    this.angle += steerOut * this.turnSpeed * (0.4 + Math.abs(this.speed) / this.maxSpeed);

    this.speed += throttleOut * this.acceleration;
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;
    if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction);
    else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction);

    const dx = Math.cos(this.angle) * this.speed;
    const dy = Math.sin(this.angle) * this.speed;
    const nx = this.x + dx;
    const ny = this.y + dy;
    this.distance += Math.abs(this.speed);

    if (this._collides(map, nx, ny)) {
      this.damaged = true;
      return;
    }
    this.x = nx;
    this.y = ny;

    if (goal) {
      const d = Math.hypot(this.x - goal.x, this.y - goal.y);
      this.minGoalDist = Math.min(this.minGoalDist, d);
      if (d < map.tileSize * 0.6) this.reachedGoal = true;
    }
  }

  _collides(map, cx, cy) {
    const r = this.width * 0.45;
    const cornerOffsets = [
      [-r, -r], [r, -r], [-r, r], [r, r], [0, 0],
    ];
    for (const [ox, oy] of cornerOffsets) {
      if (map.isBlockedWorld(cx + ox, cy + oy)) return true;
    }
    return false;
  }

  _readSensors(map) {
    const half = this.sensorSpread / 2;
    for (let i = 0; i < this.sensorCount; i++) {
      const t = this.sensorCount === 1 ? 0.5 : i / (this.sensorCount - 1);
      const localAngle = -half + this.sensorSpread * t;
      const a = this.angle + localAngle;
      this.sensorReadings[i] = this._castRay(map, a);
    }
  }

  _castRay(map, angle) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const stepSize = Math.max(2, map.tileSize * 0.15);
    let dist = 0;
    while (dist < this.sensorRange) {
      dist += stepSize;
      const px = this.x + cosA * dist;
      const py = this.y + sinA * dist;
      if (map.isBlockedWorld(px, py)) {
        return Math.min(1, dist / this.sensorRange);
      }
    }
    return 1;
  }

  _buildInputs(goal) {
    const sensors = this.sensorReadings.map(v => 1 - v);
    if (!goal) {
      return [...sensors, this.speed / this.maxSpeed, 0, 0, 0];
    }
    const dx = goal.x - this.x;
    const dy = goal.y - this.y;
    const goalDist = Math.hypot(dx, dy);
    const goalAngle = Math.atan2(dy, dx) - this.angle;
    const range = Math.hypot(800, 800);
    return [
      ...sensors,
      this.speed / this.maxSpeed,
      Math.sin(goalAngle),
      Math.cos(goalAngle),
      Math.min(1, goalDist / range),
    ];
  }

  fitness(cfg) {
    const initial = this.initialGoalDist || 1;
    const closest = this.minGoalDist === Infinity ? initial : this.minGoalDist;
    const progress = Math.max(0, initial - closest) / initial;
    let fit = progress * 600 + this.distance * 0.3;
    if (this.reachedGoal) {
      fit += cfg.goalReward + Math.max(0, cfg.maxSteps - this.steps);
    } else if (this.damaged) {
      fit -= 50;
    }
    return fit;
  }

  draw(ctx, { highlight = false, showSensors = false } = {}) {
    if (showSensors) this._drawSensors(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (this.reachedGoal) ctx.fillStyle = '#ffd43b';
    else if (this.damaged) ctx.fillStyle = 'rgba(120,120,140,0.4)';
    else if (highlight) ctx.fillStyle = '#5c7cfa';
    else ctx.fillStyle = 'rgba(140,160,220,0.5)';
    ctx.strokeStyle = highlight ? '#fff' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = highlight ? 1.5 : 0.5;
    const w = this.height;
    const h = this.width;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = highlight ? '#fff' : 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 - 4, -3);
    ctx.lineTo(w / 2 - 4, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawSensors(ctx) {
    const half = this.sensorSpread / 2;
    ctx.lineWidth = 1;
    for (let i = 0; i < this.sensorCount; i++) {
      const t = this.sensorCount === 1 ? 0.5 : i / (this.sensorCount - 1);
      const localAngle = -half + this.sensorSpread * t;
      const a = this.angle + localAngle;
      const r = this.sensorReadings[i] * this.sensorRange;
      const ex = this.x + Math.cos(a) * r;
      const ey = this.y + Math.sin(a) * r;
      ctx.strokeStyle = 'rgba(92,124,250,0.35)';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = this.sensorReadings[i] < 1 ? '#ff6b6b' : 'rgba(92,124,250,0.6)';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
