# active-v1-N09-project-setup

## 목표
N09-change-viewpoint 노드 앱의 초기 프로젝트 구조 구축
무한 캔버스 위에 시점 변경 이미지를 업로드·출력하는 앱

## 스택 (사용자 지정)
- Vite + React + TypeScript (사용자 명시 선택 — ARCHITECTURE.md 표준인 Next.js와 다름)
- react-zoom-pan-pinch (무한 캔버스 줌/패닝)
- zustand (전역 상태 관리)
- Tailwind CSS v4

## 작업 경로
- 앱 위치: `D:\OneDrive\바탕 화면\CRETE\N09-change-viewpoint`
- 문서 위치: `g:\내 드라이브\CAI\Project-10\N09-change-viewpoint\cai-harness-main\docs`

## 단계별 체크리스트

- [x] 1. Vite React TS 프로젝트 생성
- [x] 2. 의존성 설치: `react-zoom-pan-pinch`, `zustand`, `tailwindcss`, `@tailwindcss/vite`
- [x] 3. Tailwind CSS v4 설정 (`vite.config.ts`, `index.css`)
- [x] 4. Zustand store 기본 구조 (`src/store/useCanvasStore.ts`)
- [x] 5. 무한 캔버스 컴포넌트 (`src/components/InfiniteCanvas.tsx`)
- [x] 6. 이미지 노드 컴포넌트 (`src/components/ImageNode.tsx`)
- [x] 7. 이미지 업로드 컴포넌트 (`src/components/ImageUploader.tsx`)
- [x] 8. App.tsx 연결 및 개발 서버 실행 확인 (`http://localhost:5173`)
- [ ] 9. N09 product-spec 작성 (AGENTS.md 요구사항 — 미완)
- [ ] 10. Protocol 파일 작성 (ANALYSIS ROOM + GENERATION ROOM)
- [ ] 11. .env.local 설정 (GEMINI_API_KEY)

## 현재 상태
Phase 1 (UI 기반) 완료. Phase 2 (AI 통합)는 product-spec 작성 후 시작.
