---
AGENT C DESIGN HANDOFF — n09-change-viewpoint
Written by: Design Agent (AGENT C)
Date: 2026-04-14
Version: v1
Session constraint: 기존 src/ 변경 없음 (감사 세션) — Zustand 마이그레이션은 별도 실행 계획으로 승인됨
---

## What I Built

감사 세션으로 진행됨 — `cai-change-viewpoint-v2/src/App.tsx` (1757줄) 전체 구조 분석.
신규 컴포넌트 생성 없음. 변경된 src/ 파일 없음.

- `App.tsx`: 단일 파일 Vite+React+Tailwind 앱. 전체 상태(23개 useState) + 이벤트 핸들러 + JSX 렌더 포함
- `SitePlanDiagram`: 인라인 정의된 SVG 클락페이스 뷰포인트 다이어그램 컴포넌트
- `constants.ts`: Gemini 모델 ID 상수 (`ANALYSIS`, `IMAGE_GEN`, `ANALYSIS_FALLBACK`, `IMAGE_GEN_FALLBACK`)

---

## Files Modified

| File | Change |
|------|--------|
| (없음) | 감사 전용 세션 — src/ 수정 없음 |

---

## App 구조 (as-is)

```
Header (h-16)
  "C" + "CHANGE VIEWPOINT V2" | 테마 토글

Main
  Canvas (무한 캔버스, 12px/60px 그리드, center-origin)
    ├── Left pill toolbar: Select / Pan / Undo / Redo
    ├── Bottom pill toolbar: Upload / Focus / Zoom / Panel toggle (Compass)
    └── Items: <img> 렌더 + Selection overlay + Floating control bar
               └── Library artboard: Analysis Report 3섹션 팝업

  Right sidebar (284px, floating overlay, z-50, toggleable)
    ├── SitePlanDiagram SVG
    ├── Analysis summary (angle / altitude / lens)
    ├── View selection (5개 뷰 버튼)
    ├── Sub-options (방향 / 고도)
    └── CTA: Analysis → Generate (선택 상태 전환)
```

### 데이터 흐름

```
Upload → analyzeViewpoint() [Gemini pro]
  → JSON #.정보분석샘플 → CanvasItem.parameters
  ↓
handleGenerate() [Gemini flash-image]
  → 뷰타입별 finalPrompt 조립
  → 생성 이미지 CanvasItem 추가 (type: 'generated')
  → <a download="simulation.png"> 다운로드
```

### 상태 목록 (23개 useState)

```
canvasItems, selectedItemId, isGenerating
isDraggingItem, isResizingItem, isDraggingPan
selectedView, birdEyeDirection, eyeLevelDirection
frontAltitude, rightSideDirection, rightSideAltitude
analysisReport, analyzedOpticalParams, isAnalyzing, analysisStep
theme, isRightPanelOpen, openLibraryItemId
canvasZoom, canvasOffset, focusMode, canvasMode
appScale, dbLoaded, historyStates, futureStates
```

---

## Design Decisions

1. **무한 캔버스 center-origin 좌표계** (DESIGN.md §UI 원칙 — 단일 목적 UI)
   - 아이템 배치: `left: calc(50% + ${item.x}px)` — 화면 중심 = (0,0) 기준
   - 이유: 생성 이미지를 원본 옆에 정렬하는 UX 패턴 지원

2. **우측 패널 floating overlay (z-50)** — 캔버스 전체를 활용하고 필요할 때만 노출
   - 바텀 툴바 위치가 패널 열림 여부에 따라 동적 이동 (`left` 전환)

3. **Analysis → Generate CTA 전환** — 아이템 선택 + 분석 완료 후에만 Generate 표시
   - `selItem.parameters?.analyzedOpticalParams` 존재 여부로 판단

4. **IndexedDB 800ms debounce 자동저장** — 캔버스 작업 중 빈번한 저장 방지
   - 저장 대상: `canvasItems`, `canvasZoom`, `canvasOffset`

---

## Integration Points

API Route called: 없음 (N09는 API Route 없음 — 클라이언트 직접 Gemini 호출)

Input payload shape:
```
analyzeViewpoint: { inlineData: base64, mimeType } + analysisPrompt
handleGenerate:  { inlineData: base64, mimeType } + finalPrompt (뷰타입별)
```

Output response shape:
```
analyzeViewpoint: JSON { angle, section1_optical, section2_geometric, section3_conceptual }
handleGenerate:  inlineData { mimeType, data } (이미지)
```

Error state handled: **부분적 (alert() 사용)**
- `analyzeViewpoint` 실패: `alert("분석 API 호출이 실패하거나...")`
- `handleGenerate` 실패: `alert("An error occurred during generation.")`
- 입력 없음: `alert("Please upload at least one image first.")`

---

## Brand Compliance

### Identity

| 항목 | 판정 |
|------|------|
| 전문적·간결 (선언형 레이블) | ✅ PASS |
| 노드명 kebab-case | ✅ PASS — "CHANGE VIEWPOINT V2" |
| 컴포넌트 PascalCase | ✅ PASS — `SitePlanDiagram`, `CanvasItem` |
| 법규·보장 문구 없음 | ✅ PASS |

**Identity: ✅ PASS**

### Visual

| 항목 | 판정 |
|------|------|
| "참고용 시각화" 워터마크 (generated 이미지) | ❌ FAIL |
| 라이선스 없는 폰트/에셋 | ✅ PASS |
| 컬러 토큰 일관성 (black/white + opacity) | ✅ PASS |

**Visual: ❌ FAIL**

### Legal

| 항목 | 판정 |
|------|------|
| 법규·구조 보장 문구 없음 | ✅ PASS |
| "참고용 시각화" 라벨 표시 | ❌ FAIL |

**Legal: ❌ FAIL**

---

## Known Limitations / Open Questions

### Gap 1 — "참고용 시각화" 워터마크 없음 [Critical]

**위치:** `App.tsx:1378–1384` — 캔버스 아이템 렌더 블록

```tsx
// 현재: 워터마크 없는 순수 <img>
<img src={item.src} alt={item.id} className="w-full h-full object-contain ..." />

// 필요: type === 'generated' 시 오버레이 추가
{item.type === 'generated' && (
  <div className="absolute bottom-2 right-2 font-mono text-[10px] text-white/70
                  bg-black/40 px-2 py-1 pointer-events-none select-none">
    참고용 시각화
  </div>
)}
```

다운로드 시(`<a download="simulation.png">`)에도 base64 원본 그대로 전달 — 워터마크 없음.

### Gap 2 — `alert()` 오류 처리 [Non-Critical]

**위치:** App.tsx:771, 789, 792, 1179, 1184

현재 브라우저 `alert()` 다이얼로그 사용 → 브랜드 UX 단절.
권장: 인라인 `ErrorBanner` 컴포넌트 (loop-c-design-agent.txt §BUILD SEQUENCE 4번).

### Gap 3 — rightSide 프롬프트 헤더 포맷 불일치 [Minor]

**위치:** `App.tsx:965`

```tsx
finalPrompt = `**# GOAL**   // ← 구 포맷 (bold + heading 혼용)
**# CONTEXT**
```

`n09-protocol-side-view.md` v1 수정 완료 후에도 `handleGenerate()` 내 `rightSide` 분기는
구 포맷(`**# X**`) 그대로. 프로토콜 문서와 코드 sync 필요.

### Gap 4 — Zustand 미적용 [Architecture]

현재 23개 useState가 단일 컴포넌트에 집중 → 컴포넌트 추출 불가, 렌더 최적화 한계.
→ **별도 실행 계획으로 승인됨** (`docs/exec-plans/active/` 참조).

---

## Next Step

**AGENT B (Verification Agent):** `loop-b-verification-agent.txt` 로드 후 V3 Implementation Check 수행.

우선 검증 대상:
1. **Gap 1** — `type === 'generated'` 이미지에 워터마크 오버레이 존재 여부 (Visual/Legal FAIL 항목)
2. **Gap 2** — 오류 처리 방식 (`alert()` vs 인라인 ErrorBanner)
3. **Gap 3** — `handleGenerate()` rightSide 분기 프롬프트 헤더 포맷
4. **Zustand 마이그레이션** 완료 후 재검증 — 동일 UI/UX 보장 확인

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
