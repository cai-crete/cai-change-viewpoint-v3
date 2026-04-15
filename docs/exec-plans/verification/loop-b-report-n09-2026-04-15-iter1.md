---
LOOP B VERIFICATION REPORT
Node: N09-change-viewpoint (Side Elevation View / rightSide)
Protocol version: v1
Date: 2026-04-15
Iteration: 1
Execution Agent session context: RIGHTSIDE 측면뷰 생성 실패(Conformance Check 항목 3, 5) 수정 — TRANSFORMATION DIRECTIVE 추가, ZERO PERSPECTIVE DISTORTION 강화, 프로토콜 Failure Mode 2건 추가

아키텍처 메모: N09는 Vite+React 클라이언트 직접 호출 구조 (Next.js API Route 없음).
표준 Loop B 템플릿(buildSystemPrompt / API Route)을 N09 아키텍처에 매핑하여 적용.

---

=== V1: Loop A ===
Overall: FAIL

CHECK 1 — Structural Completeness: FAIL
  Missing sections: ACTION PROTOCOL > Pre-Step
  Missing sub-fields: none
  Note: Pre-flight에 5개 사전 확인 항목이 존재하나, 이를 실행할 ACTION PROTOCOL Pre-Step 없음.
        Pre-flight ↔ Pre-Step 정합성 깨짐.

CHECK 2 — Conciseness: FAIL
  Estimated tokens: ~2,400 (50,000 한도 이내)
  Token limit status: within limit
  Duplicate instances found: 3+
  Duplicate details:
    - "## Prompt JSON" 블록 (lines 89-132)이 GOAL / CONTEXT / RULE /
      Photographer's workflow / Specification 전체를 JSON 형식으로 재진술.
    - 동일 지시가 텍스트 + JSON 두 형식으로 병존 → 3개 이상 중복 인스턴스.

CHECK 3 — Internal Consistency: PASS
  Steps without Post-generation check: none
  Constants without COMPLIANCE CHECK entry: none
  Failure Mode violations: none
  Knowledge Doc conflicts: none (Knowledge Docs 미참조)

CHECK 4 — Contamination Resistance: PASS
  Pattern 1 (Pass-Through): DEFENDED — RULE "절대 금지" + Failure Mode + TRANSFORMATION DIRECTIVE
  Pattern 2 (Geometry): DEFENDED — CONTEXT Immutable Constants + Failure Mode
  Pattern 3 (Step Skip): DEFENDED — Step 2 "Step 1의 고정된 좌표를 기반으로"
  Pattern 4 (Abstract): DEFENDED — RULE 03:00/09:00 번역 + Step 2 Method #1
  Pattern 5 (Hallucination): DEFENDED — Ontological Status + Operational Logic
  Resistance score: 5/5

LOOP A OVERALL VERDICT: FAIL (CHECK 1, CHECK 2 실패)

---

=== V2: Quality Score ===
PCS: 66.7 / 100
  - Pre-Step 누락: 3분의 1 Step 미존재 → PCS = 2/3 × 100 = 66.7

Protocol Compliance: FAIL (PCS 66.7 < 90)
Immutable Constants: PASS
  - Geometry, Proportion, Structural Detail → Post-generation 통합 항목 커버
Boundary Resolution: PASS
  - Out-of-range: "IF [입력 이미지 불명확]" ✅
  - Non-visible: RULE "타겟 측면 파사드 추론" + TRANSFORMATION DIRECTIVE ✅
  - "원본 이미지를 그대로 반환하는 것은 절대 금지" ✅
Output-Specific: PASS
  - Side Elevation View 이미지 출력 명시, COMPLIANCE CHECK 검증 포함
  - (product-spec 파일 미발견 — 프로토콜 내용 기준 판단)

---

=== V3: Implementation ===
buildSystemPrompt(): N/A (아키텍처 차이 — 등가 구현 인정)
  - lib/prompt.ts / buildSystemPrompt() 없음 (N09 특성)
  - 등가 구현: finalPrompt = `${protocolContent}\n\n---\n\n${viewCameraSettings[selectedView]}\n\n${analysisContext}\n\n[GENERATE IMAGE NOW]`
  - useProtocol 훅으로 런타임 프로토콜 로드 ✅

API Route (handleGenerate 매핑): FAIL
  Defects found:
  - [HIGH] finalPrompt null/empty guard 없음:
    selectedView가 어느 분기에도 해당하지 않을 경우 finalPrompt = '' 상태로 API 호출.
    RELIABILITY.md §Protocol 주입 실패 — system 파라미터 null 방어 코드 필수.
  - [HIGH] API 타임아웃 미설정:
    Gemini API 호출에 명시적 timeout 없음. RELIABILITY.md §API 안정성 기준 ≤ 30s 위반.
  - [MID] 재시도 정책 불일치:
    try primary → catch fallback 모델 전환(1회)으로 구현. 지수 백오프 없음.
    RELIABILITY.md §API 안정성 기준 "최대 2회, 지수 백오프" 미충족.

Security: FAIL
  Defects found:
  - [HIGH] 이미지 타입·사이즈 코드 레벨 검증 없음:
    `accept="image/*"` 브라우저 레벨만 존재. JPEG/PNG/WebP 명시 체크 및 10MB 제한
    코드 레벨 미구현. SECURITY.md §입력 검증 위반.
  - API 키 하드코딩 없음 ✅
  - import.meta.env.VITE_GEMINI_API_KEY 사용 ✅
  - 업로드 파일 디스크 미저장 ✅

---

=== V3.5: Code Reviewer Analysis ===
code_quality_checker: PASS (자동 패턴 검사 기준)
  - A1 finalPrompt 패턴 존재 ✅ (guard 깊이는 수동 검토에서 플래그)
  - D1 TRANSFORMATION DIRECTIVE ✅
  - B1 Fallback 상수 ✅
  - C1/C2 API 키 보안 ✅
  - 전체 20개 체크: 0 HIGH blocking (자동 기준)

pr_analyzer: SKIPPED (git repository 아님)

Blocking findings (수동 크로스체크):
  - C3 이미지 타입 검증: 자동 PASS (image/ 패턴 매칭), 실제 코드 레벨 검증 부재 → V3 Security에서 HIGH로 상향
  - B2 재시도 정책: 패턴 PASS, 지수 백오프 미구현 → V3 MID

Report saved to: docs/exec-plans/active/code-review-n09-2026-04-15-iter1-manual.md (이 보고서에 통합)

---

=== V4: Stage B Simulation ===
Test Case 1 (Normal): PASS — TRANSFORMATION DIRECTIVE가 SOURCE→TARGET 명확 구분,
  "DO NOT return or replicate source image" + "ZERO PERSPECTIVE DISTORTION" 4개 세부 규칙.
  정상 입력(조감도 → 우측면 입면도) 시 프로토콜 지시 충분.

Test Case 2 (Edge): PASS — 측면 파사드 미노출 시 RULE "타겟 측면 파사드 추론" +
  TRANSFORMATION DIRECTIVE 추론 지시 + Failure Mode "거부 금지". 3중 커버로 충분.

Test Case 3 (Contamination): PASS — Input Pass-Through 3중 방어:
  RULE "절대 금지" + Failure Mode "원본 반환은 프로토콜 위반" + TRANSFORMATION DIRECTIVE.
  오염 저항성 5/5.

---

=== OVERALL VERDICT ===
FAIL — return to Execution Agent

실패 조건:
- V1 Loop A: FAIL (Pre-Step 누락, Prompt JSON 중복)
- V2 PCS: 66.7 < 90
- V3 API Route / Security: FAIL (3개 HIGH 결함)

통과 조건 (V2 Boundary Resolution, Output-Specific, V4 전체): PASS

---

=== DEFECT LIST ===
Priority | Layer | Location                                | Defect                                  | Required Fix
---------|-------|-----------------------------------------|-----------------------------------------|-------------
HIGH     | B     | n09-protocol-side-view.md               | ACTION PROTOCOL Pre-Step 누락.          | Pre-flight 5개 항목에 대응하는 Pre-Step 추가:
         |       |                                         | Pre-flight ↔ Pre-Step 정합성 파괴.       | "입력 이미지 위상 선언, 방향·고도 확정,
         |       |                                         |                                         | Ontological Locking 선언 확인"
HIGH     | B     | n09-protocol-side-view.md               | Prompt JSON 블록 (lines 89-132)         | Prompt JSON 섹션 전체 삭제 또는
         |       | ## Prompt JSON 섹션                     | 프로토콜 전체 내용 중복 재진술.           | 별도 파일(n09-prompt-schema.json)로 분리.
         |       |                                         | CHECK 2 FAIL 원인 (3+ 중복 인스턴스).   | Protocol 파일에서는 제거.
HIGH     | D     | cai-change-viewpoint-v2/src/App.tsx     | finalPrompt null/empty guard 없음.      | handleGenerate() 내 프롬프트 분기 직후:
         |       | handleGenerate() 프롬프트 분기 후       | 빈 finalPrompt로 Gemini API 호출 가능.  | `if (!finalPrompt) { alert('...'); return; }`
         |       |                                         | RELIABILITY.md §Protocol 주입 실패.     |
HIGH     | D     | cai-change-viewpoint-v2/src/App.tsx     | 이미지 타입·사이즈 코드 레벨 검증 없음.  | handleImageUpload()에:
         |       | handleImageUpload() L510                | accept="image/*" 브라우저 레벨만.       | `if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { alert(...); return; }`
         |       |                                         | SECURITY.md §입력 검증 위반.            | `if (file.size > 10 * 1024 * 1024) { alert(...); return; }`
HIGH     | D     | cai-change-viewpoint-v2/src/App.tsx     | Gemini API 타임아웃 미설정.              | generateContent() 호출 시 AbortController +
         |       | runGeneration() / runAnalysis() 내      | RELIABILITY.md §API 안정성 ≤ 30s.      | setTimeout 30000ms 조합으로 타임아웃 구현.
MID      | D     | cai-change-viewpoint-v2/src/App.tsx     | 재시도 정책이 지수 백오프 아님.           | 폴백 모델 전환 방식 유지 허용 (N09 클라이언트
         |       | runGeneration() catch 블록              | RELIABILITY.md §API 안정성 위반.        | 아키텍처 특성), 또는 폴백 전에 1회 대기
         |       |                                         |                                         | setTimeout(1000) 추가로 최소화.

Layer classification:
  A = API call layer (system 파라미터 주입)
  B = Protocol 구조 (Step 누락, Failure Mode)
  C = Protocol 언어 (모호한 지시)
  D = 코드 구현

---

=== NEXT STEP FOR EXECUTION AGENT ===
[ ] 프로토콜 수정 HIGH #1: n09-protocol-side-view.md에 Pre-Step 추가
[ ] 프로토콜 수정 HIGH #2: n09-protocol-side-view.md에서 Prompt JSON 블록 제거
[ ] 코드 수정 HIGH #3: App.tsx handleGenerate()에 finalPrompt null guard 추가
[ ] 코드 수정 HIGH #4: App.tsx handleImageUpload()에 JPEG/PNG/WebP + 10MB 검증 추가
[ ] 코드 수정 HIGH #5: App.tsx generateContent() 호출에 30s 타임아웃 구현
[ ] (선택) 코드 수정 MID: 재시도 폴백 전 최소 대기 추가
[ ] 수정 완료 후 loop-b-handoff-n09.md 작성
[ ] 신규 Verification Agent 세션 시작 (Iteration 2)
---
