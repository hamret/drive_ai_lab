***

# Drive AI Lab

> 유전 알고리즘(Genetic Algorithm)과 신경망(Neural Network)을 결합하여
> 자율주행 AI 에이전트를 스스로 진화시키는 브라우저 기반 시뮬레이터.






***

## 프로젝트 개요

**Drive AI Lab**은 차량이 도로 환경을 스스로 학습하며 주행하는 AI 시뮬레이터입니다.
별도의 학습 데이터 없이, **유전 알고리즘**을 통해 세대(Generation)를 거듭하며 점점 더 잘 주행하는 AI를 진화시킵니다.

- 백엔드: **FastAPI** 서버가 정적 파일을 서빙
- 프론트엔드: **Vanilla JS + Canvas API**로 실시간 시뮬레이션 렌더링
- AI 로직: **신경망 + 유전 알고리즘** (순수 JavaScript로 구현, 외부 ML 라이브러리 없음)

***

## 핵심 알고리즘

### Neural Network (신경망)

입력층 (센서 데이터) → 은닉층 → 출력층 (가속/감속/좌회전/우회전)

- `NeuralNetwork` 클래스: `Level` 객체 배열로 구성된 다층 신경망
- `Level.feedForward()`: 각 레이어의 가중치와 편향으로 출력 계산 (활성화 함수: threshold)
- `NeuralNetwork.mutate()`: 가중치·편향에 `lerp()`를 이용한 랜덤 변이 적용

### Genetic Algorithm (유전 알고리즘)

| 단계 | 설명 |
|------|------|
| **초기화** | `Genetic.createPopulation(size)` — N개 차량(AI) 동시 생성 |
| **평가** | 각 차량의 `fitness` = 충돌 없이 주행한 프레임 수 |
| **선택** | `Genetic.selectBest()` — 최고 적합도 개체 선택 |
| **진화** | `Genetic.evolve()` — 최우수 개체의 뇌(brain)를 복사 후 변이 |

***

## 프로젝트 구조

- `app/main.py` — FastAPI 앱 진입점, 라우터 및 정적 파일 마운트
- `app/api/routes.py` — API 엔드포인트 (`/api/status` 등)
- `app/core/__init__.py` — 서버 사이드 확장 로직 (예정)
- `app/static/index.html` — 시뮬레이션 메인 페이지
- `app/static/css/styles.css` — 다크 테마 UI 스타일
- `app/static/js/app.js` — 메인 루프, 진화 제어, UI 연결
- `app/static/js/core/NeuralNetwork.js` — 신경망 + Level 클래스
- `app/static/js/core/Car.js` — 차량 물리, 센서
- `app/static/js/core/Genetic.js` — 개체군 생성 및 진화
- `app/static/js/ui/Dashboard.js` — 세대/생존수/적합도 실시간 표시
- `docs/pycharm-setup.md` — PyCharm 개발환경 설정 가이드

***

## 기술 스택

| 분류 | 기술 |
|------|------|
| Backend | FastAPI, Uvicorn |
| Frontend | Vanilla JavaScript (ES6+), Canvas API |
| AI/ML | Genetic Algorithm, Feedforward Neural Network (JS 자체 구현) |
| 개발 환경 | Python 3.10+, PyCharm / VS Code |

***

## 빠른 시작

**1. 의존성 설치**

`pip install -r requirements.txt`

**2. 서버 실행**

`uvicorn app.main:app --reload`

**3. 브라우저 접속**

`http://localhost:8000`

> PyCharm에서 실행하려면 [docs/pycharm-setup.md](docs/pycharm-setup.md) 를 참고하세요.

***

## API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| `GET` | `/` | 시뮬레이터 메인 페이지 (index.html) |
| `GET` | `/api/status` | 서버 상태 확인 (`{"status": "ok"}`) |

***

## 시뮬레이터 화면 구성

왼쪽 **Canvas 영역**에서는 모든 AI 차량의 실시간 주행이 렌더링되며,
오른쪽 **Dashboard 패널**에는 현재 세대 번호, 생존 차량 수, 최고 적합도 수치가 실시간으로 표시됩니다.

***

## 개발 환경 설정 (PyCharm)

**Run > Edit Configurations > Python** 에서 아래와 같이 설정합니다.

- **Module name**: `uvicorn`
- **Parameters**: `app.main:app --reload`
- **Working directory**: `drive_ai_lab/`

***

## 향후 개선 계획 (Roadmap)

- [ ] 차량 센서(레이캐스팅) 완전 구현
- [ ] 도로 경계선 충돌 감지 로직 추가
- [ ] 다중 레이어 신경망 지원 (은닉층 수 동적 설정)
- [ ] 세대별 학습 곡선 시각화 (Chart.js 등)
- [ ] 최우수 뇌(brain) 저장/불러오기 기능 (localStorage / 서버 API)
- [ ] 교통량(traffic) 장애물 추가
- [ ] 변이율(mutation rate) UI에서 실시간 조절
