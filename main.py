import os

# 생성할 파일 목록과 초기 내용
files = {
    "drive_ai_lab/app/main.py": '''\
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routes import router
import os

app = FastAPI(title="Drive AI Lab")

app.include_router(router, prefix="/api")

static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    return FileResponse(os.path.join(static_dir, "index.html"))
''',

    "drive_ai_lab/app/api/routes.py": '''\
from fastapi import APIRouter

router = APIRouter()

@router.get("/status")
async def status():
    return {"status": "ok"}
''',

    "drive_ai_lab/app/api/__init__.py": "",

    "drive_ai_lab/app/core/__init__.py": "# 추후 서버 사이드 로직 확장용\n",

    "drive_ai_lab/app/static/index.html": '''\
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Drive AI Lab</title>
  <link rel="stylesheet" href="/static/css/styles.css" />
</head>
<body>
  <div id="app">
    <canvas id="simulationCanvas"></canvas>
    <div id="dashboard"></div>
  </div>
  <script src="/static/js/core/NeuralNetwork.js"></script>
  <script src="/static/js/core/Car.js"></script>
  <script src="/static/js/core/Genetic.js"></script>
  <script src="/static/js/ui/Dashboard.js"></script>
  <script src="/static/js/app.js"></script>
</body>
</html>
''',

    "drive_ai_lab/app/static/css/styles.css": '''\
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1a1a2e; color: #eee; font-family: sans-serif; display: flex; height: 100vh; }
#simulationCanvas { flex: 1; display: block; }
#dashboard { width: 280px; padding: 16px; background: #16213e; overflow-y: auto; }
''',

    "drive_ai_lab/app/static/js/app.js": '''\
// 메인 루프, 진화 제어, UI 연결
let population = null;
let generation = 0;

function init() {
  // TODO: 개체군 초기화 및 시뮬레이션 시작
}

function loop() {
  requestAnimationFrame(loop);
  // TODO: 매 프레임 차량 업데이트 및 렌더링
}

window.addEventListener("load", () => {
  init();
  loop();
});
''',

    "drive_ai_lab/app/static/js/core/NeuralNetwork.js": '''\
// 신경망 구현
class NeuralNetwork {
  constructor(inputCount, hiddenCount, outputCount) {
    this.levels = [
      new Level(inputCount, hiddenCount),
      new Level(hiddenCount, outputCount),
    ];
  }

  static feedForward(inputs, network) {
    let output = Level.feedForward(inputs, network.levels[0]);
    for (let i = 1; i < network.levels.length; i++) {
      output = Level.feedForward(output, network.levels[i]);
    }
    return output;
  }

  static mutate(network, amount = 0.1) {
    network.levels.forEach(level => {
      level.biases = level.biases.map(b => lerp(b, Math.random() * 2 - 1, amount));
      level.weights = level.weights.map(row =>
        row.map(w => lerp(w, Math.random() * 2 - 1, amount))
      );
    });
  }
}

class Level {
  constructor(inputCount, outputCount) {
    this.inputs = new Array(inputCount);
    this.outputs = new Array(outputCount);
    this.biases = Array.from({ length: outputCount }, () => Math.random() * 2 - 1);
    this.weights = Array.from({ length: inputCount }, () =>
      Array.from({ length: outputCount }, () => Math.random() * 2 - 1)
    );
  }

  static feedForward(inputs, level) {
    level.inputs = inputs;
    level.outputs = level.biases.map((bias, o) => {
      const sum = level.inputs.reduce((acc, inp, i) => acc + inp * level.weights[i][o], 0);
      return sum > bias ? 1 : 0;
    });
    return level.outputs;
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
''',

    "drive_ai_lab/app/static/js/core/Car.js": '''\
// 차량 물리 + 센서
class Car {
  constructor(x, y, width, height, controlType = "AI", maxSpeed = 3) {
    this.x = x; this.y = y;
    this.width = width; this.height = height;
    this.speed = 0; this.angle = 0;
    this.maxSpeed = maxSpeed;
    this.acceleration = 0.2;
    this.friction = 0.05;
    this.damaged = false;
    this.fitness = 0;
    // TODO: 센서 및 제어 초기화
  }

  update(roadBorders, traffic) {
    if (!this.damaged) {
      // TODO: 물리 및 센서 업데이트
      this.fitness++;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);
    ctx.fillStyle = this.damaged ? "gray" : "blue";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}
''',

    "drive_ai_lab/app/static/js/core/Genetic.js": '''\
// 개체군 생성/진화
class Genetic {
  static createPopulation(size, x, y) {
    return Array.from({ length: size }, (_, i) =>
      new Car(x, y, 30, 50, "AI", i === 0 ? 3 : 3)
    );
  }

  static selectBest(cars) {
    return cars.reduce((best, car) => car.fitness > best.fitness ? car : best, cars[0]);
  }

  static evolve(cars, mutationRate = 0.1) {
    const best = Genetic.selectBest(cars);
    return cars.map(() => {
      const child = new Car(best.x, best.y, best.width, best.height, "AI");
      child.brain = JSON.parse(JSON.stringify(best.brain));
      NeuralNetwork.mutate(child.brain, mutationRate);
      return child;
    });
  }
}
''',

    "drive_ai_lab/app/static/js/ui/Dashboard.js": '''\
// 대시보드 DOM 업데이트
class Dashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  update({ generation, alive, best }) {
    this.container.innerHTML = `
      <h2>Drive AI Lab</h2>
      <p>세대: <strong>${generation}</strong></p>
      <p>생존 차량: <strong>${alive}</strong></p>
      <p>최고 적합도: <strong>${best}</strong></p>
    `;
  }
}
''',

    "drive_ai_lab/docs/pycharm-setup.md": '''\
# PyCharm에서 FastAPI + Uvicorn 실행 가이드

## 1. 의존성 설치
```bash
pip install -r requirements.txt
```

## 2. Run Configuration 설정
1. **Run > Edit Configurations** 열기
2. `+` 버튼 → **Python** 선택
3. 설정:
   - **Script path**: `[가상환경 경로]/bin/uvicorn` (또는 `uvicorn` 모듈 방식)
   - **Parameters**: `app.main:app --reload --host 0.0.0.0 --port 8000`
   - **Working directory**: 프로젝트 루트 (`drive_ai_lab/`)
4. **OK** 저장 후 ▶ 실행

## 3. 모듈 방식으로 실행 (권장)
- **Module name**: `uvicorn`
- **Parameters**: `app.main:app --reload`

## 4. 확인
브라우저에서 `http://localhost:8000` 접속
''',

    "drive_ai_lab/requirements.txt": '''\
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
''',

    "drive_ai_lab/.gitignore": '''\
__pycache__/
*.pyc
*.pyo
.env
.venv/
venv/
*.egg-info/
dist/
build/
.idea/
.DS_Store
''',

    "drive_ai_lab/README.md": '''\
# Drive AI Lab

유전 알고리즘 + 신경망으로 자율주행 AI를 진화시키는 시뮬레이터.

## 기술 스택
- **Backend**: FastAPI + Uvicorn
- **Frontend**: Vanilla JS (Canvas API)
- **AI**: Genetic Algorithm + Neural Network (JS 구현)

## 실행 방법
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

브라우저에서 `http://localhost:8000` 접속

## 프로젝트 구조
- `app/` - FastAPI 서버
- `app/static/js/core/` - 신경망, 차량, 유전 알고리즘
- `app/static/js/ui/` - 대시보드 UI
- `docs/` - 개발 환경 가이드
''',
}

def create_structure(files):
    for path, content in files.items():
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ {path}")

create_structure(files)
print("\n🚀 drive_ai_lab 프로젝트 구조 생성 완료!")