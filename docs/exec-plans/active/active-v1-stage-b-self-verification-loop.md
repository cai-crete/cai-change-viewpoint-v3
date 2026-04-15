# Exec Plan — Full Stage B 자가검증 루프 구현

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/` 폴더로 이동합니다.

---

## 개요

- **작업 유형**: 기능 구현 (App.tsx 단일 파일)
- **대상 노드**: N09 — change-viewpoint
- **대상 파일**: `cai-change-viewpoint-v2/src/App.tsx`
- **시작일**: 2026-04-15
- **승인 상태**: 승인 완료 (Plan Mode 승인 + 장애요인 분석 완료)
- **관련 Plan 파일**: `C:\Users\JE\.claude\plans\eventual-brewing-hippo.md`

---

## 목표

이미지 생성 후 COMPLIANCE CHECK 결과가 FAIL이면 자동으로 재생성하는 인-앱 루프를 구현한다.
최대 2회 재시도(총 3회 시도)로 제한하여 무한루프를 방지한다.

---

## 현재 상태 (As-Is)

```
handleGenerate()
  → runGeneration(modelName)     생성 1회, boolean 반환
     → img.onload 콜백 내부에서 canvas item 추가 (비동기, await 불가)
     → 반환 시 canvas item이 아직 미추가 상태일 수 있음
  → verifyConformance()          fire-and-forget, void 반환, 타임아웃 없음
     → conformanceReport를 canvas item에 저장
```

**문제:**
- FAIL 시 사용자가 수동으로 재생성해야 함
- `verifyConformance()`에 타임아웃 없음
- Stage B 루프 (재생성 → 재검증 반복) 미구현
- `runGeneration`의 `img.onload`가 async 콜백이라 `itemId`를 반환값으로 받을 수 없음 (→ BLOCKER-1)

---

## 목표 상태 (To-Be)

```
handleGenerate()
  → [protocolComplianceCheck 없으면 skip → 1회 생성만 수행]
  → Stage B Loop (최대 3회 시도)
     ┌───────────────────────────────────────────────────┐
     │  attempt 0~2                                       │
     │  1. primary 모델로 runGeneration()                 │
     │     └ 이미지 생성 실패(API 에러/텍스트 반환) 시     │
     │       fallback 모델로 재시도                        │
     │  2. attempt 0: canvas item 신규 생성               │
     │     attempt 1+: 기존 canvas item src 교체 (update) │
     │  3. verifyConformance() → report 반환 (await)      │
     │  4. PASS → 루프 탈출                               │
     │  5. PARTIAL / FAIL + attempt < 2                  │
     │     → 실패 항목을 프롬프트에 주입                   │
     │     → setStageBAttempt(attempt+1)                 │
     │     → 다음 iteration                              │
     │  6. attempt == 2 → 루프 탈출                       │
     └───────────────────────────────────────────────────┘
  → setStageBAttempt(0)
  → setIsGenerating(false)
```

---

## 변경 파일

`cai-change-viewpoint-v2/src/App.tsx` 단일 파일만 수정.

---

## 확정된 설계 결정 (사용자 승인)

| 항목 | 결정 | 근거 |
|------|------|------|
| 재시도 시 canvas item | **update-in-place** (기존 item src 교체) | 캔버스에 실패 이미지 중복 방지 |
| PARTIAL 처리 | **재시도 트리거** (FAIL과 동일) | 보수적 기준 유지 |
| protocolComplianceCheck 없을 때 | **Stage B 루프 skip, 1회 생성만** | 뷰타입 미선택은 handleGenerate line 850에서 early return 처리됨. 실제 발생 케이스 = protocol 파일 fetch 실패(HTTP 404/네트워크 오류)뿐 |
| primary/fallback 폴백 | **attempt마다 primary→fallback 유지** | COMPLIANCE CHECK FAIL은 primary 성공 후 발생 → 실질적으로 fallback 미호출. API 에러/텍스트 반환 시에만 fallback 호출됨 |

---

## 장애요인 분석 (2026-04-15 코드 분석 완료)

### BLOCKER-1 — `img.onload` 비동기 미매칭 ← 계획에 없던 추가 구현 필요

**문제:** 현재 `runGeneration` 내부 `img.onload` 콜백에서 canvas item을 추가하지만, 함수는 `return foundImage`를 먼저 반환함. 즉 함수 반환 시점에 `newGenItem.id`가 아직 확정되지 않아 `itemId`를 반환값으로 넘길 수 없음.

**해결:** `img.onload`를 `Promise<void>`로 래핑하여 `await` 가능하게 변환.

```typescript
// 변경 전 (콜백)
img.onload = () => { ...; setCanvasItems(...); foundImage = true; };
img.src = generatedSrc;
return foundImage; // img.onload 실행 전에 반환될 수 있음

// 변경 후 (Promise)
const newItemId = `gen-${Date.now()}`; // id를 onload 이전에 확정
await new Promise<void>((resolve, reject) => {
  img.onload = () => { ...; setCanvasItems(...); resolve(); };
  img.onerror = reject;
  img.src = generatedSrc;
});
return { base64Data, mimeType, itemId: newItemId };
```

**영향 범위:** Step 6 (`runGeneration` 리팩터링)에 반영 필요.

### BLOCKER-2 — update-in-place를 위한 `existingItemId` 파라미터 필요

**문제:** QUESTION-1 결정(update-in-place)에 따라 attempt 1+에서는 새 canvas item 생성 대신 기존 item의 `src`를 교체해야 함. 현재 `runGeneration`에는 기존 item 참조 수단이 없음.

**해결:** `runGeneration(modelName, promptOverride?, existingItemId?)` 파라미터 추가.
- `existingItemId` 없으면: 새 canvas item 생성 (attempt 0)
- `existingItemId` 있으면: `setCanvasItems(prev => prev.map(item => item.id === existingItemId ? {...item, src: generatedSrc} : item))` (attempt 1+)

**영향 범위:** Step 6에 반영 필요.

---

## 구현 체크리스트

- [ ] Step 1: `ConformanceItem` import 추가 (line 5)
- [ ] Step 2: `STAGE_B_MAX_RETRIES = 2` 상수 추가 (모듈 레벨)
- [ ] Step 3: `buildRetryPrompt()` 헬퍼 추가 (모듈 레벨)
- [ ] Step 4: `stageBAttempt` state 추가 (App 컴포넌트 내부)
- [ ] Step 5: `verifyConformance()` 리팩터링 — 반환형 `Promise<ConformanceReport | null>`, withTimeout 추가, setCanvasItems 제거, genItemId 파라미터 제거
- [ ] Step 6: `runGeneration()` 리팩터링 — `img.onload` Promise화, `promptOverride?` 추가, `existingItemId?` 추가, 반환형 `{base64Data, mimeType, itemId} | null`
- [ ] Step 7: `handleGenerate()` 내 Stage B 루프 구현 (기존 try/catch 블록 교체, protocolComplianceCheck guard 포함)
- [ ] Step 8: Generate 버튼 스피너 UI 업데이트 (`재검증 N/2 · Xs`)

---

## 상세 변경 내용 (확정판)

### Step 1 — Import 변경

```typescript
// FROM:
import { useAppStore, type CanvasItem, type ViewType, type ConformanceReport } from './store/useAppStore';
// TO:
import { useAppStore, type CanvasItem, type ViewType, type ConformanceReport, type ConformanceItem } from './store/useAppStore';
```

### Step 2 — 상수 추가 (모듈 레벨, `const ANGLES` 바로 아래)

```typescript
const STAGE_B_MAX_RETRIES = 2; // 최대 재시도 횟수 (총 시도 = 3)
```

### Step 3 — buildRetryPrompt() 헬퍼 (모듈 레벨, STAGE_B_MAX_RETRIES 바로 아래)

```typescript
const buildRetryPrompt = (basePrompt: string, failedItems: ConformanceItem[]): string => {
  if (!failedItems.length) return basePrompt;
  const failureNotes = failedItems
    .map(i => `- FAILED: ${i.check}. Reason: ${i.note}`)
    .join('\n');
  return `${basePrompt}

## STAGE B RETRY — COMPLIANCE FAILURES TO CORRECT
The previous attempt failed these checks. You MUST correct them in this attempt:
${failureNotes}
Do NOT repeat the same mistakes. Address each failure explicitly.`;
};
```

### Step 4 — 상태 추가 (generatingElapsed 바로 아래)

```typescript
const [stageBAttempt, setStageBAttempt] = useState(0);
```

### Step 5 — verifyConformance() 리팩터링 (현재 line 776~836)

변경 전 시그니처:
```typescript
const verifyConformance = async (
  genItemId: string,   // ← 제거
  genBase64: string,
  genMimeType: string,
  complianceCheckSection: string,
  analysisCtx: string,
  viewType: ViewType,
) => {  // void
```

변경 후 시그니처:
```typescript
const verifyConformance = async (
  genBase64: string,
  genMimeType: string,
  complianceCheckSection: string,
  analysisCtx: string,
  viewType: ViewType,
): Promise<ConformanceReport | null> => {
```

변경 내용:
1. `genItemId` 파라미터 제거
2. 반환형 `void` → `Promise<ConformanceReport | null>`
3. `ai.models.generateContent(...)` → `withTimeout(ai.models.generateContent(...))` 래핑 (30s)
4. `setCanvasItems(...)` 호출 제거
5. `report` 객체를 `return report` 로 반환
6. catch 블록: `return null` 반환

### Step 6 — runGeneration() 리팩터링 (현재 line 1238~1315)

변경 전 시그니처:
```typescript
const runGeneration = async (modelName: string) => { // boolean 반환
```

변경 후 시그니처:
```typescript
const runGeneration = async (
  modelName: string,
  promptOverride?: string,        // attempt 1+: buildRetryPrompt 결과
  existingItemId?: string,        // attempt 1+: update-in-place용
): Promise<{ base64Data: string; mimeType: string; itemId: string } | null> => {
```

변경 내용:
1. `{ text: finalPrompt }` → `{ text: promptOverride ?? finalPrompt }`
2. `newGenItem.id` 확정을 `img.onload` 이전에: `const newItemId = \`gen-${Date.now()}\``
3. `img.onload` → `await new Promise<void>((resolve, reject) => { img.onload = () => { ...; resolve(); }; img.onerror = reject; img.src = generatedSrc; })`
4. `existingItemId` 있을 때: `setCanvasItems(prev => prev.map(item => item.id === existingItemId ? { ...item, src: generatedSrc } : item))`
5. `existingItemId` 없을 때: 기존 canvas item 신규 생성 로직 유지
6. `return foundImage` → `return { base64Data: part.inlineData!.data!, mimeType: part.inlineData!.mimeType!, itemId: existingItemId ?? newItemId }`
7. 이미지 없을 때: `return null`
8. Phase 4 fire-and-forget 호출 블록 제거

### Step 7 — Stage B 루프 구현 (현재 line 1317~1326 교체)

현재 코드:
```typescript
try {
  const success = await runGeneration(IMAGE_GEN);
  if (!success) throw new Error("Text returned instead of image");
} catch (primaryError) {
  console.warn(`Primary model (${IMAGE_GEN}) failed...`, primaryError);
  const success = await runGeneration(IMAGE_GEN_FALLBACK);
  if (!success) { alert("Failed to generate image..."); }
}
```

교체 후:
```typescript
// Stage B self-verification loop
if (!protocolComplianceCheck) {
  // protocol fetch 실패 시 — loop skip, 1회 생성만 수행
  const result = await runGeneration(IMAGE_GEN)
    ?? await runGeneration(IMAGE_GEN_FALLBACK);
  if (!result) alert('Failed to generate image.');
} else {
  let failedItems: ConformanceItem[] = [];
  let currentItemId: string | undefined;

  for (let attempt = 0; attempt <= STAGE_B_MAX_RETRIES; attempt++) {
    setStageBAttempt(attempt);

    const promptForThisAttempt = attempt === 0
      ? finalPrompt
      : buildRetryPrompt(finalPrompt, failedItems);

    // primary → fallback (이미지 생성 실패 시에만 fallback 호출됨)
    const genResult =
      await runGeneration(IMAGE_GEN, promptForThisAttempt, currentItemId)
      ?? await runGeneration(IMAGE_GEN_FALLBACK, promptForThisAttempt, currentItemId);

    if (!genResult) break; // 생성 완전 실패 → 루프 탈출

    const { base64Data: genBase64, mimeType: genMimeType, itemId: genItemId } = genResult;
    currentItemId = genItemId; // attempt 1+에서 update-in-place에 사용

    const report = await verifyConformance(
      genBase64, genMimeType, protocolComplianceCheck, analysisContext, selectedView,
    );

    setCanvasItems(prev => prev.map(item =>
      item.id === genItemId
        ? { ...item, parameters: { ...item.parameters, conformanceReport: report } }
        : item
    ));

    if (report?.overallResult === 'PASS') break;
    if (attempt >= STAGE_B_MAX_RETRIES) break;

    failedItems = report?.items.filter(i => i.result !== 'PASS') ?? [];
  }

  setStageBAttempt(0);
}
```

### Step 8 — 스피너 UI 업데이트 (현재 line 1929)

```typescript
// FROM:
<span className="text-[10px] font-mono tabular-nums">{generatingElapsed}s</span>

// TO:
<span className="text-[10px] font-mono tabular-nums">
  {stageBAttempt > 0
    ? `재검증 ${stageBAttempt}/${STAGE_B_MAX_RETRIES} · ${generatingElapsed}s`
    : `${generatingElapsed}s`}
</span>
```

---

## 구조 변화 요약 (확정판)

| 항목 | Before | After |
|------|--------|-------|
| verifyConformance 반환형 | void (fire-and-forget) | Promise\<ConformanceReport \| null\> |
| verifyConformance 타임아웃 | 없음 | withTimeout 30s |
| verifyConformance genItemId 파라미터 | 있음 | 제거 (호출자가 관리) |
| runGeneration img.onload | 콜백 (await 불가) | Promise 래핑 (await 가능) |
| runGeneration 반환형 | boolean | {base64Data, mimeType, itemId} \| null |
| runGeneration existingItemId 파라미터 | 없음 | 추가 (update-in-place) |
| 재시도 시 canvas item | 항상 신규 생성 | attempt 0 신규 / attempt 1+ src 교체 |
| PARTIAL 처리 | — | FAIL과 동일 (재시도 트리거) |
| 재생성 루프 | 없음 | FAIL/PARTIAL 시 최대 2회 자동 재시도 |
| 실패 항목 주입 | 없음 | buildRetryPrompt()로 FAIL 항목 프롬프트 재주입 |
| 스피너 레이블 | Xs | "재검증 N/2 · Xs" (재시도 시) |

---

## 수행 범위 외

- `ConformanceReport` / `ConformanceItem` 타입 구조 변경 없음 (`useAppStore.ts` 수정 없음)
- UI 패널 레이아웃 변경 없음 (기존 "섹션 4. 정합성 검토" 그대로 사용)
- 프로토콜 파일 변경 없음

---

## Progress

| 날짜 | 상태 | 내용 |
|------|------|------|
| 2026-04-15 | 완료 | Plan Mode 승인, exec-plan 저장 |
| 2026-04-15 | 완료 | 장애요인 분석 (BLOCKER-1, BLOCKER-2 발견), 설계 결정 4건 확정 |
| — | 대기 | 구현 미시작 |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
