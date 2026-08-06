# CocoEchoAdmin

[cocoapi](file:///d:/Github/Unity/cocoapi) 백엔드 데이터(유저 접속 현황, 로그인 이력, 플레이 시간 통계 등)를 모니터링하고 분석할 수 있는 대표/관리자용 어드민 대시보드 프로젝트입니다.

## 주요 기능 (Key Features)

1. **대시보드 요약 (Executive Overview)**
   - 총 유저 수, 오늘/이번 주 활성 유저(DAU/WAU), 평균 플레이 시간 카드
   - 일자별 접속자 추이 차트

2. **유저 접속 및 플레이 통계 (User Activity & Playtime)**
   - 유저별 최근 로그인 일시 (`lastLogin`), 가입일 (`createdAt`), 디바이스 OS
   - 자녀(Child)별 누적 플레이 타임 및 세션 기록 조회
   - 유저/아이별 로그인 이력 및 플레이 이력 테이블 검색/필터링

3. **실시간/상세 로그 조회 (Activity Logs)**
   - `GameLog` 및 `GameResult` 기반 플레이 기록 세부 조회

## 기술 스택 (Tech Stack)

- **Frontend Framework**: React 19 + TypeScript + Vite
- **UI & Icon Component**: Vanilla CSS + Lucide Icons (대시보드 테마 적용)
- **Chart**: Recharts / Chart.js
- **API Target**: [cocoapi](file:///d:/Github/Unity/cocoapi) (`http://localhost:8000/api/v1` 혹은 지정된 개발/운영 API 서버)

## 개발 실행 방법 (Getting Started)

```bash
# 1. 패키지 설치
npm install

# 2. 개발 서버 실행
npm run dev
```
