# Loop B Handoff — N09-change-viewpoint
**Date:** 2026-04-15
**Iteration:** 2 (Loop B Verification Agent가 이 파일을 읽는 세션)
**Previous Verification Report:** docs/exec-plans/verification/loop-b-report-n09-2026-04-15-iter1.md

---

## 이번 세션에서 수행한 작업

Iteration 1 보고서의 HIGH 5건 결함을 모두 수정했습니다.
추가로 타임아웃 정책 개선 2건을 보강했습니다 (작업별 타임아웃 분리 + 경과 시간 UI).

### 수정 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `cai-change-viewpoint-v2/public/protocols/n09-protocol-side-view.md` | Pre-Step 추가, Prompt JSON 블록 제거 |
| `docs/references/n09-protocol-side-view.md` | 위 파일과 동기화 (cp) |
| `cai-change-viewpoint-v2/src/App.tsx` | finalPrompt null guard, 이미지 검증, 타임아웃 구현, 경과 시간 UI |

---

## 결함별 수정 내용

### HIGH #1 — Pre-Step 추가 (Protocol)
**위치:** `public/protocols/n09-protocol-side-view.md` > `# ACTION PROTOCOL`  
**수정:** Step 1 직전에 `## Pre-Step. 입력 준비 및 파라미터 확정` 추가.  
Pre-flight 5개 항목에 대응하는 실행 지시 (입력 위상 선언, 불변 상수 고정 확인, 정면 특정, 방향 확정, 고도 확인).

### HIGH #2 — Prompt JSON 블록 제거 (Protocol)
**위치:** `public/protocols/n09-protocol-side-view.md` > `## Prompt JSON` 섹션 (구 lines 89-132)  
**수정:** 전체 삭제. 텍스트 본문과 동일 내용을 JSON으로 재진술한 3+ 중복 인스턴스 제거.  
프로토콜 순서: COMPLIANCE CHECK가 Action Protocol 직후에 오도록 정리됨.

### HIGH #3 — finalPrompt null guard (App.tsx)
**위치:** `App.tsx` > `handleGenerate()` 내 프롬프트 분기 블록 종료 직후  
**수정:**
```typescript
if (!finalPrompt || !finalPrompt.trim()) {
  alert('프롬프트가 생성되지 않았습니다. 뷰 타입을 확인하거나 페이지를 새로고침하세요.');
  setIsGenerating(false);
  return;
}
```

### HIGH #4 — 이미지 타입·사이즈 코드 레벨 검증 (App.tsx)
**위치:** `App.tsx` > `handleImageUpload()` 파일 수신 직후  
**수정:**
```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) { alert(...); e.target.value = ''; return; }
if (file.size > 10 * 1024 * 1024) { alert(...); e.target.value = ''; return; }
```

### HIGH #5 — 작업별 타임아웃 분리 (App.tsx)
**위치:** `App.tsx` module-level + `runAnalysis()` + `runGeneration()`  
**수정 A:** `withTimeout<T,>()` helper 추가 — `Promise.race`로 구현.
```typescript
const withTimeout = <T,>(promise: Promise<T>, ms = 30000): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`API 응답 타임아웃: ${ms / 1000}초 초과`)), ms)
  );
  return Promise.race([promise, timeout]);
};
```
**수정 B:** 작업별 타임아웃 값 분리 적용:
```typescript
// runAnalysis: 텍스트 응답 → 기본값 30s 유지
await withTimeout(ai.models.generateContent({...}))

// runGeneration: 이미지 생성 → 60s (이미지 생성은 복잡한 프롬프트 시 30~60s 소요)
await withTimeout(ai.models.generateContent({...}), 60_000)
```
**근거:** 이미지 생성(TRANSFORMATION DIRECTIVE 포함)은 30s를 정상 범위 내에서도 초과할 수 있음.
30s 단일값 적용 시 정상 응답도 타임아웃 처리되는 false-positive 위험 존재.
텍스트 분석(runAnalysis)은 30s가 충분하므로 기본값 유지.

### 보강 — 생성 경과 시간 UI (App.tsx)
**위치:** `App.tsx` > `isGenerating` 스피너 내부 + 컴포넌트 상단 state 선언  
**수정:** `generatingElapsed` 로컬 state + useEffect(1초 인터벌) 추가.
스피너 옆에 경과 시간(초)을 실시간 표시:
```typescript
// state
const [generatingElapsed, setGeneratingElapsed] = useState(0);
useEffect(() => {
  if (!isGenerating) { setGeneratingElapsed(0); return; }
  const t = setInterval(() => setGeneratingElapsed((s: number) => s + 1), 1000);
  return () => clearInterval(t);
}, [isGenerating]);

// UI (Generate 버튼 스피너)
{isGenerating && (
  <span className="absolute inset-0 flex items-center justify-center gap-1.5">
    <Loader2 size={18} className="animate-spin" />
    <span className="text-[10px] font-mono tabular-nums">{generatingElapsed}s</span>
  </span>
)}
```
**효과:** 사용자가 "멈췄나?" 혼동 없이 진행 중임을 인지. 타임아웃(60s) 전까지 대기 허용 범위 확대.

---

## 미해결 MID 항목

| 항목 | 내용 | 결정 |
|------|------|------|
| MID — 재시도 지수 백오프 | 현재 primary→fallback 모델 전환(1회). 지수 백오프 없음. | 클라이언트 아키텍처 특성상 폴백 모델 전환 방식 유지. Iteration 2에서 MID 판정 유지 예상. |

---

## Verification Agent에게

다음 프로토콜 파일을 Loop A 재검증 대상으로 사용하십시오:
- **대상 Protocol:** `cai-change-viewpoint-v2/public/protocols/n09-protocol-side-view.md`
- **대상 구현 코드:** `cai-change-viewpoint-v2/src/App.tsx`

Iteration 1에서 PASS였던 항목 (재검증 불필요):
- V1 CHECK 3 (Internal Consistency): PASS
- V1 CHECK 4 (Contamination Resistance): 5/5
- V2 Immutable Constants: PASS
- V2 Boundary Resolution: PASS
- V2 Output-Specific: PASS
- V4 Test Case 1, 2, 3: 모두 PASS

Iteration 1에서 FAIL이었던 항목 (재검증 필수):
- V1 CHECK 1: Pre-Step 추가 여부 → 수정 완료, PASS 예상
- V1 CHECK 2: Prompt JSON 블록 제거 여부 → 수정 완료, PASS 예상
- V2 PCS: Pre-Step 추가로 3/3 = 100% 예상 → PASS 예상
- V3 API Route: finalPrompt guard 및 타임아웃 적용 여부 → 수정 완료, PASS 예상
- V3 Security: 이미지 타입·사이즈 코드 레벨 검증 여부 → 수정 완료, PASS 예상
- V3 MID: 재시도 지수 백오프 → 미수정, MID 판정 유지
