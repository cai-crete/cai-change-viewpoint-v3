# active-v13 — Viewpoint Label 교정 + Compliance 시점 검증 + FAIL 보고서 분리

## 배경
- RIGHT/LEFT VIEW 요청 시 FRONT VIEW처럼 출력되는 품질 오류 발생
- `callAnalysis()` userText에 내부 코드명(`side`)이 전달되어 Gemini가 Knowledge Doc 명칭과 연결 실패
- Compliance Check가 실행되나 결과를 무시(반환값 버림), 시점 검증 항목 없음
- API 오류(예외)와 품질 오류(Compliance FAIL)를 분리 보고 필요

## 변경 파일
- `src/lib/gemini.ts`
- `src/lib/compliance.ts`
- `src/App.tsx`
- 위 3개 파일 OneDrive 경로 동기화

## 작업 체크리스트

### ① gemini.ts — viewpoint label 맵 + userText 교정
- [x] `VIEWPOINT_LABEL` 맵 추가 (6종: bird-eye, eye-level, front, side:03:00, side:09:00, top)
- [x] `getViewpointLabel()` 함수 추가 (export)
- [x] `callAnalysis()` userText를 `Target viewpoint: ${viewpointLabel}` 형식으로 교체
- [x] 콘솔 로그에도 label 반영

### ② compliance.ts — 시점 검증 체크 추가
- [x] `runComplianceCheck()` 시그니처에 `viewpointLabel?: string` 파라미터 추가
- [x] VP-1 체크 추가: analysisText에 viewpointLabel 키워드 포함 여부 (5종 전체)
- [x] 콘솔 출력에 요청 시점 표시

### ③ App.tsx — Compliance 결과 활용 + FAIL 보고서 분리
- [x] `getViewpointLabel` import 추가
- [x] `runComplianceCheck()` 반환값 수령
- [x] Compliance FAIL 시 `saveErrorReport({ room: 'COMPLIANCE' })` 별도 호출
  - `partialOutput`: analysisText 앞 800자
  - `inputContext`: selectedView, viewpointLabel, failedChecks 목록

### ④ OneDrive 동기화
- [x] `D:\OneDrive\바탕 화면\CRETE\N09-change-viewpoint\src\lib\gemini.ts`
- [x] `D:\OneDrive\바탕 화면\CRETE\N09-change-viewpoint\src\lib\compliance.ts`
- [x] `D:\OneDrive\바탕 화면\CRETE\N09-change-viewpoint\src\App.tsx`

## Knowledge Doc 공식 명칭 (맵 기준)
| ViewpointType | direction | 공식 명칭 |
|---------------|-----------|-----------|
| bird-eye | — | Bird's-eye Perspective View |
| eye-level | — | Eye-Level Corner View |
| front | — | Front Elevation View |
| side | 03:00 | Right Elevation View |
| side | 09:00 | Left Elevation View |
| top | — | Orthographic TOP View |
