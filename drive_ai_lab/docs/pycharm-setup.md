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
