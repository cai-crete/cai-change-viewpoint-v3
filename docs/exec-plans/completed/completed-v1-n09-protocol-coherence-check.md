# N09 프로토콜 정합성 검증 보고서

```
Revision:  v1
Date:      2026-04-14
Agent:     AGENT A (실행 에이전트)
Type:      Loop A — 정합성 검증 (Stage A1)
Status:    COMPLETED
Target:    docs/references/n09-protocol-*.md (5개 파일)
```

---

## 검증 기준

`docs/design-docs/protocol-design-guide.md` §4 필수 구조 + §6 오염 패턴 카탈로그

| 섹션 | 역할 |
|------|------|
| `# SYSTEM:` | 노드명·버전 식별자 |
| `# GOAL` | 단일 목표 문장 |
| `# CONTEXT` | Ontological Status, Operational Logic, Immutable Constants |
| `# ROLE` | AI 정체성·역할 |
| `# ACTION PROTOCOL` | 실행 단계 (N09는 Photographer's Workflow 허용, §9.2) |
| `# COMPLIANCE CHECK` | Pre-flight, Post-generation, Failure Mode |

> **N09 허용 패턴:** ACTION PROTOCOL은 "Photographer's Workflow"로 대체 가능 (§9.2).
> CONTEXT·ROLE·COMPLIANCE CHECK는 면제되지 않는다.

---

## 검증 전 구조 체크 (as-was)

| 섹션 | bird-eye | eye-level | front | side | top |
|------|---------|-----------|-------|------|-----|
| SYSTEM 헤더 | ❌ | ❌ | ❌ | ❌ | ❌ |
| GOAL | ✅ | ✅ | ✅ | ✅ | ✅ |
| CONTEXT (Ontological Locking) | ❌ | ❌ | ❌ | ✅ | ❌ |
| ROLE | ❌ | ❌ | ❌ | ✅ | ❌ |
| ACTION PROTOCOL / Workflow | ✅ | ✅ | ✅ | ✅ | ✅ |
| COMPLIANCE CHECK | ❌ | ❌ | ❌ | ❌ | ❌ |
| Prompt JSON | ✅ | ✅ | ✅ | ❌ | ✅ |
| 서브옵션 명시 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **완성도** | **3/8** | **3/8** | **3/8** | **4/8** | **3/8** |

---

## 분류 결과 (검증 전)

### 🟡 부분 안정 (Partially Stable) — `bird-eye`, `eye-level`, `front`, `top`

**공통 결함:**
- `# SYSTEM:` 헤더 없음 — 버전 추적 불가
- `# CONTEXT` 없음 → Physical Reality Principle 미보장 → 할루시네이션 위험
- `# ROLE` 없음 → AI 정체성 미정립
- `# COMPLIANCE CHECK` 없음 → Failure Mode 미정의

**개별 추가 결함:**

| 프로토콜 | 추가 결함 |
|---------|---------|
| `bird-eye` | 04:30 / 07:30 방향 선택 기준이 프롬프트에 미반영 |
| `eye-level` | 고도 1.6m 고정이 Prompt JSON에 미명시 |
| `front` | 없음 (고도는 앱 UI에서 사용자 런타임 입력 — 프로토콜 결함 아님) |
| `top` | 직교 투영(원근 제거) 강제 조건이 Photographer's Workflow에 약하게 기술됨 |

> **고도 서브옵션 분류 기준 (확정):**
> - 고도 값(0 / 1.6 / 10 / 50 / 150m)은 앱 UI에서 사용자가 선택 후 프롬프트에 주입됨
> - 프로토콜이 고도를 정의해야 하는 경우: 고도가 고정값일 때만 (`top` = 300m, `eyeLevel` = 1.6m)
> - 가변 고도(`front`, `rightSide`)는 프로토콜 정의 대상이 아님

### 🟠 구조 우수·출력 검증 취약 — `side-view`

**강점:** CONTEXT + ROLE + ACTION PROTOCOL 3섹션 완비, Ontological Locking 구현
**결함:** COMPLIANCE CHECK 없음, Prompt JSON 없음, 마크다운 헤더 포맷 혼용

---

## 오염 위험도 매핑 (검증 전, §6 기준)

| 오염 패턴 | bird-eye | eye-level | front | side | top |
|----------|---------|-----------|-------|------|-----|
| 할루시네이션 | 🔴 고위험 | 🔴 고위험 | 🔴 고위험 | 🟡 중간 | 🔴 고위험 |
| 기하 변형 | 🔴 고위험 | 🔴 고위험 | 🔴 고위험 | 🟡 중간 | 🔴 고위험 |
| 입력 패스스루 | 🟡 중간 | 🟡 중간 | 🟡 중간 | 🟡 중간 | 🟡 중간 |
| 추상 명령 미변환 | 🟡 중간 | 🟡 중간 | 🟡 중간 | 🟢 낮음 | 🟡 중간 |
| 단계 건너뜀 | 🟢 낮음 | 🟢 낮음 | 🟢 낮음 | 🟡 중간 | 🟢 낮음 |

---

## 수행된 수정 내역

### Phase 1 — 공통 결함 수정 (5개 전체)

모든 프로토콜에 아래 섹션 추가:

| 추가 섹션 | 내용 |
|----------|------|
| `# SYSTEM:` | `N09-change-viewpoint / [뷰타입] Protocol v1` |
| `# CONTEXT` | Ontological Status + Operational Logic + Immutable Constants |
| `# ROLE` | 건축 사진가 (Architectural Simulation Engine & Virtual Photographer) |
| `# COMPLIANCE CHECK` | Pre-flight / Post-generation / Failure Mode |

### Phase 2 — 개별 결함 수정

| 프로토콜 | 수정 내용 |
|---------|---------|
| `bird-eye` | Step 0 "방향 결정" 추가 — 04:30 → Front-Right / 07:30 → Front-Left |
| `eye-level` | CONTEXT에 "고도 1.6m 고정" 불변 파라미터 명시 |
| `top` | CONTEXT에 "직교 투영 고정·원근법 완전 제거" 명시, Pre-flight에 직교 투영 + 1:1 비율 체크 추가 |
| `side` | 마크다운 헤더 정규화(`**# X**` → `# X`), Prompt JSON 신규 추가, Step 1→2 전환 조건 명시 |
| `front` | 수정 없음 (결함 없음) |

---

## 검증 후 구조 체크 (as-is)

| 섹션 | bird-eye | eye-level | front | side | top |
|------|---------|-----------|-------|------|-----|
| SYSTEM 헤더 | ✅ | ✅ | ✅ | ✅ | ✅ |
| GOAL | ✅ | ✅ | ✅ | ✅ | ✅ |
| CONTEXT | ✅ | ✅ | ✅ | ✅ | ✅ |
| ROLE | ✅ | ✅ | ✅ | ✅ | ✅ |
| ACTION PROTOCOL / Workflow | ✅ | ✅ | ✅ | ✅ | ✅ |
| COMPLIANCE CHECK | ✅ | ✅ | ✅ | ✅ | ✅ |
| Prompt JSON | ✅ | ✅ | ✅ | ✅ | ✅ |
| **완성도** | **8/8** | **8/8** | **8/8** | **8/8** | **8/8** |

---

## PASS / FAIL 판정

| 프로토콜 | Stage A1 판정 |
|---------|-------------|
| `n09-protocol-bird-eye-view.md` | ✅ PASS |
| `n09-protocol-eye-level-view.md` | ✅ PASS |
| `n09-protocol-front-view.md` | ✅ PASS |
| `n09-protocol-side-view.md` | ✅ PASS |
| `n09-protocol-top-view.md` | ✅ PASS |

> **Stage A1 전체 PASS** — Stage B (동적 테스트) 진행 가능.
> Stage B는 실제 `handleGenerate()` 호출 후 출력물 기반 검증입니다.

---

## 다음 단계 (Next Actions)

- [ ] Stage B — `handleGenerate()` 실제 호출로 각 뷰 타입 출력물 검증
- [ ] AGENT B 검증 에이전트 발동 → PASS/FAIL 독립 판정
- [ ] Protocol 버전 히스토리 `docs/product-specs/n09-change-viewpoint.md`에 기록

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`