# Exec Plan — N09 프로토콜–출력 정합성 검토 시스템

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/` 폴더로 이동합니다.

---

## 개요

- **작업 유형**: 새 기능 (Phase 4 정합성 검증 + 프로토콜 런타임 연동)
- **대상 노드**: N09 change-viewpoint
- **시작일**: 2026-04-14
- **상태**: 승인 대기 (설계 확정, 구현 미시작)

---

## 목표

입력 이미지 → 프로토콜 기반 생성 이미지 워크플로우에 **Phase 4 자동 정합성 검증**을 추가한다.
프로토콜 파일(`docs/references/`)을 앱의 단일 소스로 삼아 생성 프롬프트 drift를 제거하고,
생성 직후 Gemini가 해당 프로토콜의 COMPLIANCE CHECK 항목을 기준으로 출력 이미지를 자동 평가한다.

---

## 설계 결정 (Q&A)

### Q1. 현재 앱에 적합한 프로토콜 연동 방식

**결정: `public/protocols/` + 런타임 fetch + npm sync 스크립트**

| 방식 | 판정 | 이유 |
|------|------|------|
| Vite `?raw` import (빌드 타임) | ❌ 부적합 | 프로토콜 변경마다 전체 리빌드 필요 — "실시간 연동" 불충족 |
| `public/protocols/` + 런타임 fetch | ✅ **채택** | 프로토콜 파일만 교체해도 앱이 즉시 반영, 리빌드 불필요 |
| docs/ symlink → public/ | ❌ 부적합 | Windows symlink 제약, CI/CD 불안정 |

**구현:**
```
docs/references/                   →  (sync script)  →  cai-change-viewpoint-v2/
  n09-protocol-bird-eye-view.md                          public/protocols/
  n09-protocol-eye-level-view.md                           n09-protocol-bird-eye-view.md
  n09-protocol-front-view.md                               n09-protocol-eye-level-view.md
  n09-protocol-side-view.md                                n09-protocol-front-view.md
  n09-protocol-top-view.md                                 n09-protocol-side-view.md
                                                           n09-protocol-top-view.md
```

`package.json`에 스크립트 추가:
```json
"sync:protocols": "cp ../docs/references/n09-protocol-*.md public/protocols/",
"prebuild": "npm run sync:protocols"
```

앱 시작 시 `useEffect`로 현재 뷰 타입에 해당하는 프로토콜 파일을 fetch.
`handleGenerate()` 는 fetch된 프로토콜 내용을 프롬프트로 사용 (하드코딩 제거).

### Q2. Phase 4 실행 방식

**결정: 자동 실행 (생성 직후) — 프로토콜 및 앱 안정화 전까지**

- `handleGenerate()` 완료 → 즉시 `verifyConformance()` 자동 호출
- 사용자가 별도 버튼을 누를 필요 없음
- 안정화 기준: 연속 10회 생성에서 COMPLIANCE CHECK 전 항목 PASS
- 안정화 이후에는 수동 트리거 방식으로 전환 가능 (별도 결정)

**Phase 4 Gemini 호출 구조:**
```
verifyConformance(generatedImageBase64, protocolContent, analysisContext)
  → 입력: 생성 이미지 + 프로토콜 COMPLIANCE CHECK 섹션 + analysisContext
  → 출력: { items: [{ check: string, result: 'PASS'|'FAIL'|'PARTIAL', note: string }] }
  → 저장: canvasItem.parameters.conformanceReport
```

사용 모델: `ANALYSIS` (gemini-3.1-pro-preview) — 이미지 판독 + 체크리스트 평가 가능.

### Q3. 정합성 검증 결과 저장 위치

**결정: `docs/exec-plans/completed/` 에 세션별 리포트 저장**

- 앱 내 `canvasItem.parameters.conformanceReport`: 런타임 즉시 표시용
- 파일 저장: 각 정합성 검증 세션 완료 시 마크다운 리포트를 `docs/exec-plans/completed/` 에 누적
  - 파일명 패턴: `conformance-session-YYYY-MM-DD-[viewType].md`
- UI: 라이브러리 팝업 4번째 섹션 (기존 Analysis Report 3섹션에 이어서)

---

## 구현 범위

### 신규 파일

| 파일 | 내용 |
|------|------|
| `cai-change-viewpoint-v2/public/protocols/` | 프로토콜 MD 파일 (sync 스크립트로 복사) |
| `cai-change-viewpoint-v2/src/hooks/useProtocol.ts` | 뷰 타입별 프로토콜 fetch 훅 |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `cai-change-viewpoint-v2/package.json` | `sync:protocols`, `prebuild` 스크립트 추가 |
| `cai-change-viewpoint-v2/src/App.tsx` | 1. `handleGenerate()` 하드코딩 프롬프트 → `useProtocol()` 로 교체<br>2. `verifyConformance()` 함수 추가 (Phase 4)<br>3. 라이브러리 팝업 4번째 섹션 추가 (conformanceReport 표시) |
| `cai-change-viewpoint-v2/src/store/useAppStore.ts` | `conformanceReport` 필드를 `CanvasItem.parameters`에 추가 |

### UI 변경

- 라이브러리 팝업 4번째 섹션: "정합성 검토" — COMPLIANCE CHECK 항목별 PASS/FAIL/PARTIAL 표시
- 기존 3섹션 레이아웃 변경 없음 — 섹션 추가만

---

## 워크플로우 (변경 후)

```
[Phase 1] analyzeViewpoint()
  → analysisReport, analyzedOpticalParams 저장

[Phase 3] handleGenerate()
  → useProtocol()으로 로드된 프로토콜 내용을 finalPrompt로 사용
  → 생성 이미지 canvasItem 추가

[Phase 4] verifyConformance() ← NEW (자동 실행)
  → 생성 이미지 + 프로토콜 COMPLIANCE CHECK + analysisContext → Gemini
  → conformanceReport 반환 → canvasItem.parameters에 저장
  → 라이브러리 팝업 4번째 섹션에 표시
  → 세션 완료 시 docs/exec-plans/completed/ 에 MD 파일 저장
```

---

## 세션 리포트 형식 (`docs/exec-plans/completed/conformance-session-*.md`)

```markdown
# Conformance Session Report — [viewType] [YYYY-MM-DD]

## Input
- 뷰 타입: birdEye | eyeLevel | front | rightSide | top
- 방향/고도 서브옵션: ...
- Analysis 결과 요약: angle / altitude / lens

## COMPLIANCE CHECK 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| 건물 기하학적 형태 원본과 동일 | PASS / FAIL / PARTIAL | ... |
| 할루시네이션 없음 | PASS / FAIL / PARTIAL | ... |
| 지정 방향 뷰 | PASS / FAIL / PARTIAL | ... |
| 투시 원칙 준수 | PASS / FAIL / PARTIAL | ... |

## 종합 판정
PASS (전 항목 통과) / PARTIAL ([N]/[총] 통과) / FAIL

## 발견 사항
[Gemini 평가 코멘트]
```

---

## Progress

- [x] 2026-04-14 — 설계 문서 작성
- [x] 2026-04-15 — `public/protocols/` 디렉토리 생성 + 5개 프로토콜 파일 복사
- [x] 2026-04-15 — `package.json` `sync:protocols` + `prebuild` 스크립트 추가
- [x] 2026-04-15 — `useAppStore.ts` `ConformanceReport` 타입 + `CanvasItem.parameters.conformanceReport` 필드 추가
- [x] 2026-04-15 — `src/hooks/useProtocol.ts` 런타임 fetch 훅 구현 (`extractComplianceCheck` 포함)
- [x] 2026-04-15 — `App.tsx` `useProtocol(selectedView)` 훅 호출 추가
- [x] 2026-04-15 — `App.tsx` `verifyConformance()` 함수 구현 (Phase 4 — Gemini Vision 정합성 평가)
- [x] 2026-04-15 — `App.tsx` `handleGenerate()` 프로토콜 오버라이드 블록 추가 (runtime fetch 기반 프롬프트)
- [x] 2026-04-15 — `App.tsx` `img.onload` 내 Phase 4 자동 호출 (`verifyConformance`)
- [x] 2026-04-15 — `App.tsx` 라이브러리 팝업 섹션 4 UI (PASS/FAIL/PARTIAL 체크리스트)
- [x] 2026-04-15 — `npm run build` 성공 (537 kB, 타입 에러 없음, prebuild sync 자동 실행 확인)

---

## Surprises & Discoveries

- 각 프로토콜 파일에 이미 **COMPLIANCE CHECK 섹션** (Pre-flight + Post-generation 체크리스트) 존재 → Phase 4 평가 기준으로 직접 활용 가능
- `App.tsx` 하드코딩 프롬프트가 프로토콜 파일과 이미 일부 drift 발생 (Gap 3: rightSide 포맷)
  → 프로토콜 fetch 오버라이드로 동시에 해소됨
- `img.onload` 내에서 Phase 4 호출 시 `newGenItem.id`를 직접 사용해야 ID 불일치 방지
  → `img.src` 이후 래핑 방식은 base64 race condition 위험. `img.onload` 내부 직접 삽입으로 해결
- `prebuild` 스크립트가 `npm run build` 시 `sync:protocols`를 자동 실행 → 빌드할 때마다 최신 프로토콜이 `public/protocols/`에 자동 동기화됨
- 세션 리포트를 파일로 저장하는 기능은 브라우저 환경 제약으로 `docs/exec-plans/completed/`에 직접 쓰기 불가
  → 대안: 사용자가 라이브러리 팝업에서 결과를 확인 후 수동으로 리포트 파일 생성 (향후 Download Report 버튼으로 개선 가능)

---

## Decision Log

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-14 | `public/protocols/` + 런타임 fetch 채택 | 실시간 연동 요건: 리빌드 없이 프로토콜 파일만 교체로 즉시 반영 가능 |
| 2026-04-14 | Phase 4 자동 실행 (생성 직후) | 프로토콜 안정화 전까지 매 생성마다 정합성 확인 필요 |
| 2026-04-14 | 세션 리포트 → `docs/exec-plans/completed/` 누적 | 시계열 정합성 추이 추적 가능, 안정화 판단 근거 |

---

## Outcomes & Retrospective

- **원래 목표 달성 여부**: [x] Yes
- **결과 요약**:
  - Protocol → Prompt 연동: `public/protocols/` + 런타임 fetch + `prebuild` 자동 sync 구현 완료
  - Phase 4 정합성 검증: 생성 직후 자동 실행, Gemini Vision이 COMPLIANCE CHECK 기준으로 각 항목 PASS/FAIL/PARTIAL 평가
  - 라이브러리 팝업 섹션 4: 체크리스트 결과 즉시 표시
  - Gap 3 (rightSide 포맷 drift): 프로토콜 오버라이드 적용으로 동시 해소
- **다음 작업에 반영할 것**:
  - 세션 리포트 Download 버튼 (브라우저 API로 MD 파일 다운로드) 추가 고려
  - 안정화 판단 기준 (연속 10회 PASS) 달성 시 Phase 4 자동 실행 해제 여부 결정 필요

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
