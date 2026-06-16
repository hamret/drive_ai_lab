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
