# Code Review Checklist — N09 Change Viewpoint (App.tsx)

> **대상 파일:** `cai-change-viewpoint-v2/src/App.tsx`
> **기준 문서:** `docs/RELIABILITY.md`, `docs/SECURITY.md`

---

## CATEGORY A: Protocol Injection

| # | Check | Pass Condition | Priority |
|---|-------|---------------|----------|
| A1 | `finalPrompt` null/empty guard | API 호출 전 `finalPrompt`가 비어있지 않은지 확인 | HIGH |
| A2 | All 5 view types handled | `eyeLevel`, `front`, `top`, `rightSide`, `birdEye` 모두 분기 처리됨 | HIGH |
| A3 | Protocol override applied | `protocolContent` 존재 시 `finalPrompt`에 프로토콜 주입 확인 | HIGH |
| A4 | analysisContext injected | `analysisContext`가 `finalPrompt`에 포함됨 | MID |
| A5 | `[GENERATE IMAGE NOW]` present | 각 뷰 프롬프트 끝에 생성 트리거 존재 | MID |

---

## CATEGORY B: API Reliability (RELIABILITY.md 기준)

| # | Check | Pass Condition | Priority |
|---|-------|---------------|----------|
| B1 | Fallback model exists | `ANALYSIS_FALLBACK` 또는 `IMAGE_GEN_FALLBACK` 사용 | HIGH |
| B2 | Max retry ≤ 2 | 재시도 로직이 최대 2회를 초과하지 않음 | HIGH |
| B3 | User error message on failure | `catch` 블록에서 사용자 노출 오류 메시지 존재 | HIGH |
| B4 | `isGenerating` state guard | 중복 생성 방지 state 플래그 사용 | MID |
| B5 | `finally` cleanup | `setIsGenerating(false)` finally 블록에서 실행 | MID |

---

## CATEGORY C: Security (SECURITY.md 기준)

| # | Check | Pass Condition | Priority |
|---|-------|---------------|----------|
| C1 | No hardcoded API key | 소스코드 내 `AIzaSy` 패턴 없음 | HIGH |
| C2 | Env var usage | `import.meta.env.VITE_GEMINI_API_KEY` 패턴 사용 | HIGH |
| C3 | Image type validation | 업로드 시 JPEG/PNG/WebP 이외 거부 로직 | HIGH |
| C4 | JSON.parse on API response | Gemini 응답 JSON 파싱 시 try/catch 존재 | MID |
| C5 | No API key in logs | `console.log` 등에 API 키 변수 노출 없음 | HIGH |

---

## CATEGORY D: N09-specific

| # | Check | Pass Condition | Priority |
|---|-------|---------------|----------|
| D1 | TRANSFORMATION DIRECTIVE in rightSide | SOURCE/TARGET 정보 프롬프트에 주입됨 | HIGH |
| D2 | `rightSideDirection` auto-determination | `04:30` → `03:00`, `07:30` → `09:00` 로직 존재 | MID |
| D3 | Protocol file fetched at runtime | `useProtocol` hook이 selectedView 기반으로 프로토콜 fetch | MID |
| D4 | Conformance check triggered | 이미지 생성 후 `verifyConformance()` 호출됨 | MID |
| D5 | Source image from motherId | `generated` 타입 아이템은 motherId를 소스로 사용 | LOW |
