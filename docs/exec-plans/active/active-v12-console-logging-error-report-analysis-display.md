# active-v12 — 콘솔 로깅 / 오류 보고서 AGENT / ANALYZE 결과 출력

DATE: 2026-04-16
SESSION: N09

## 목적
1. ROOM별 진행 상황을 콘솔에 구조적으로 출력 (개발자 디버그 지원)
2. 앱 오류 발생 시 오류 보고서를 docs/exec-plans/report/ 에 자동 저장하는 AGENT 도입
3. ANALYZE(Room 0) 완료 후 오른쪽 패널에 DNA 분석 결과 표시, 콘솔에 상세 정보 출력

## 체크리스트

- [x] exec-plan 생성
- [x] gemini.ts — ROOM별 console.group 구조 로깅 추가
  - Room 0: start/end, 모델명, 이미지 크기, LOCKED_DNA 미리보기
  - Room 1~3: start/end, viewpointType, lockedDna 유무, 출력 미리보기
  - Image Generation: start/end, 출력 이미지 크기
  - 각 Room 오류 발생 시 console.error에 상세 정보 포함
- [x] src/lib/errorReportAgent.ts 생성 (새 파일)
  - ErrorReportContext 인터페이스 정의
  - formatReport() — 마크다운 포맷 보고서 생성
  - saveErrorReport() — POST /api/save-error-report → fallback download
- [x] vite.config.ts — configureServer 플러그인 추가
  - POST /api/save-error-report 엔드포인트
  - docs/exec-plans/report/ 디렉토리에 파일 저장
- [x] src/components/RightPanel.tsx — DNA 결과 섹션 추가
  - selItem.parameters?.lockedDna가 있을 때 DNA 요약 표시
  - JSON 파싱하여 skin_system, mass, roof_level, color_palette, materiality 표시
  - Room 1~3 optical params 섹션도 별도 표시 (Optical Params)
- [x] src/App.tsx — errorReportAgent 연동
  - analyzeViewpoint() catch 블록에 saveErrorReport() 호출
  - handleGenerate() catch 블록에 saveErrorReport() 호출
- [x] docs/exec-plans/report/ 폴더 생성 (.gitkeep)
- [x] claude-progress.txt 업데이트

## 변경 파일 목록
- vite.config.ts
- src/lib/gemini.ts
- src/lib/errorReportAgent.ts (신규)
- src/components/RightPanel.tsx
- src/App.tsx
- docs/exec-plans/report/.gitkeep (신규)
