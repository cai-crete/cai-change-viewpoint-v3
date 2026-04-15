# Exec Plan — 이중 루프 시스템 구축

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/` 폴더로 이동합니다.

---

## 개요

- **작업 유형**: 하네스 인프라 신규 구축
- **대상 노드**: 공통 (모든 노드에 적용)
- **시작일**: 2026-04-14

---

## 목표

Protocol 업로드 시 정합성·간결성을 자동 검증하는 **Loop A**,
그리고 실행 에이전트와 검증 에이전트가 상호 견제하며 하네스를 자가 보완하는 **Loop B**를 구축한다.
두 루프가 완성되면 하네스는 외부 수동 검수 없이 스스로 품질을 끌어올릴 수 있는 자율 개선 구조를 갖춘다.

---

## 현재 상태 분석

| 항목 | 현재 | 목표 |
|------|------|------|
| Stage A1 → A2 → B 파이프라인 | 존재 (수동, 선형) | 자동 루프로 전환 |
| 실행-검증 피드백 | 없음 | Loop B로 구축 |
| Protocol 정합성 자동 검증 | 없음 | Loop A로 구축 |
| 자가 보완 메커니즘 | 없음 | Loop A + B 연동 |

---

## Loop A — Protocol 정합성 테스트 루프

### 목적
Protocol 파일 업로드 시 구조적 완결성·간결성·내부 일관성을 자동 검증한다.
추후 업로드할 프로토콜이 정합하고 간결한 상태로만 배포 단계에 진입하도록 보장한다.

### 트리거
- 새 Protocol 파일(`protocol-[node-name]-v[N].txt`)이 `_context/`에 업로드될 때
- Protocol 버전 업 시 (`v[N]` → `v[N+1]`)

### 루프 흐름

```
[Protocol 파일 업로드]
        ↓
┌─── 정합성 검증 에이전트 ─────────────────────────────┐
│                                                     │
│  CHECK 1: 구조 완결성                               │
│    → 5개 필수 섹션 존재 여부                         │
│       (SYSTEM, GOAL, CONTEXT, ROLE,                 │
│        ACTION PROTOCOL, COMPLIANCE CHECK)           │
│                                                     │
│  CHECK 2: 간결성                                    │
│    → 토큰 수 ≤ 모델 컨텍스트의 25%                  │
│    → 중복 지시 없음 (동일 내용 반복 탐지)            │
│                                                     │
│  CHECK 3: 내부 일관성                               │
│    → ACTION PROTOCOL ↔ COMPLIANCE CHECK 정합성      │
│    → Failure Mode가 모든 경계 조건을 커버하는가      │
│    → Knowledge Doc과의 충돌 없음                    │
│                                                     │
│  CHECK 4: 오염 저항성 (Stage A2)                    │
│    → 별도 AI 세션에서 결함 탐지                     │
│    → 점수 ≥ 90 → 통과 / 점수 < 90 → 결함 보고      │
│                                                     │
└──────────────────────────────────────────────────────┘
        ↓ 결함 발견
[수정 권고 보고서 생성]
        ↓
[Protocol 수정] → 루프 재진입
        ↓ 전체 통과
[배포 승인 → Stage B 진입 허가]
```

### 검증 에이전트 프롬프트 구조 (Loop A)

```
역할: 당신은 Protocol 정합성 검증 에이전트입니다.
대상: {protocol_file_path}
기준: docs/design-docs/protocol-design-guide.md §4 (필수 구조), §6 (오염 패턴)
      docs/QUALITY_SCORE.md (PCS 기준)

수행할 것:
1. 5개 필수 섹션 존재 여부를 체크하고 누락 항목을 명시하라
2. 토큰 수를 추정하고 25% 한계 초과 여부를 판단하라
3. ACTION PROTOCOL의 각 Step에 대응하는 COMPLIANCE CHECK 항목이 있는지 확인하라
4. 모든 경계 조건(Failure Mode)이 명시되어 있는지 확인하라
5. 결함이 있으면 구체적 수정 방향을 제시하라 — 모호한 권고 금지

출력 형식:
- PASS / FAIL 판정
- 결함 목록 (위치, 유형, 수정 방향)
- 수정 후 재검증 필요 여부
```

### 루프 종료 조건
- CHECK 1~4 전체 PASS
- PCS 점수 ≥ 90 (Stage A2 기준)

---

## Loop B — 실행-검증 이중 견제 루프

### 목적
실행 에이전트(Protocol 작성 + 앱 구현)와 검증 에이전트(품질 기준 검증)가
상호 견제하며 하네스 스스로 보완·업그레이드하는 자율 개선 구조를 만든다.

### 에이전트 역할 분리

| 에이전트 | 역할 | 금지 사항 |
|----------|------|-----------|
| **실행 에이전트** | Protocol 작성, Next.js 앱 구현, Protocol 수정 | 자체 검증 없이 배포 승인 불가 |
| **검증 에이전트** | QUALITY_SCORE 기준 검증, Stage A/B 실행, 실패 보고서 생성 | 직접 수정 불가 — 보고만 한다 |

### 루프 흐름

```
[세션 시작: 노드 개발 또는 Protocol 수정]
        ↓
┌─── 실행 에이전트 ────────────────────┐
│  1. product-spec 확인                │
│  2. Protocol 작성 / 수정             │
│  3. buildSystemPrompt() 구현         │
│  4. Node App 완성                    │
└──────────────────────────────────────┘
        ↓ 구현 완료 선언
┌─── 검증 에이전트 ────────────────────┐
│  1. Loop A 실행 (Protocol 정합성)    │
│  2. QUALITY_SCORE.md 체크리스트 실행 │
│  3. Stage B 동적 테스트 실행         │
│  4. 실패 케이스 목록 + 원인 분석     │
│  5. 수정 우선순위 보고서 생성        │
└──────────────────────────────────────┘
        ↓ 실패 항목 존재
[실행 에이전트에 보고서 전달]
        ↓
[실행 에이전트: 실패 원인 진단 → Protocol 또는 코드 수정]
        ↓
[검증 에이전트: 실패 케이스만 재검증]
        ↓ 루프 반복
        ↓ 전체 Pass
[배포 승인 → 버전 태그 → exec-plan Progress 업데이트]
```

### 검증 에이전트 보고서 형식

```markdown
## 검증 보고서 — {노드명} {날짜}

### PCS 점수: {점수} / 100

### 실패 항목
| 체크 항목 | 실패 유형 | 원인 레이어 | 수정 우선순위 |
|-----------|-----------|------------|--------------|
| [항목]    | [유형]    | A/B/C      | HIGH/MID/LOW |

### 원인 레이어 분류
- A: API 호출 레이어 (system 파라미터 주입 문제)
- B: Protocol 구조 문제 (Step 누락, Failure Mode 부재)
- C: Protocol 언어 문제 (지시 모호성)

### 다음 실행 에이전트 수정 범위
- [ ] [구체적 수정 항목 1]
- [ ] [구체적 수정 항목 2]
```

### 루프 종료 조건
- PCS = 100
- Stage B 전체 Pass
- 실패 케이스 0건

---

## 두 루프의 연동 관계

```
신규 Protocol 업로드
        ↓
    Loop A 실행
        ↓ Pass
    Loop B 실행 (실행 에이전트가 Loop A 통과 Protocol을 기반으로 앱 구현)
        ↓
    검증 에이전트가 Loop A를 내부적으로 재실행 (Protocol 수정이 있었을 경우)
        ↓ 전체 Pass
    배포 승인
```

Loop A는 Loop B의 전제 조건입니다.
Loop B 중 Protocol 수정이 발생하면 Loop A가 자동으로 재실행됩니다.

---

## 구현 단계

### Phase 1: Loop A 프롬프트 파일 작성 (수동 실행 단계)

- [x] 2026-04-14 — 검증 에이전트 프롬프트를 `docs/references/loop-a-verification-agent.txt`로 작성
- [x] 2026-04-14 — 검증 체크리스트를 `QUALITY_SCORE.md`의 공통 체크리스트와 연동 (Loop A 연동 섹션 추가)
- [x] 2026-04-14 — `AGENTS.md` 작업 전/후 체크리스트에 Loop A 진입 조건 명시
- [ ] 첫 번째 노드 Protocol 업로드 시 Loop A 수동 적용 테스트 (Protocol 미존재 — 대기 중)

### Phase 2: Loop B 워크플로우 문서화 및 수동 실행

- [x] 2026-04-14 — AGENTS.md의 `작업 후 체크리스트`에 Loop B 보고서 0건 확인 항목 명시
- [x] 2026-04-14 — `docs/references/loop-b-execution-agent.txt` 작성 (실행 에이전트 프롬프트)
- [x] 2026-04-14 — `docs/references/loop-b-verification-agent.txt` 작성 (검증 에이전트 프롬프트)
- [x] 2026-04-14 — AGENTS.md 세션 유형 테이블에 Loop B 실행·검증 에이전트 항목 추가
- [ ] 첫 번째 노드 Protocol 업로드 시 Loop B 수동 실행 → 보고서 형식 검증 (대기 중)

### Phase 3: 자동화

- [x] 2026-04-14 — `.claude/settings.json` PostToolUse 훅 작성
      Protocol 파일(`protocol-*.txt`) 수정 시 Loop A 필수 실행 경고를 에이전트 컨텍스트에 자동 주입
      파이프 테스트 완료 (매칭 ✓, 비매칭 침묵 ✓), Node.js 구문 검증 완료
- [x] 2026-04-14 — Loop B 검증 에이전트 서브에이전트 분리 설계 완료
      `loop-b-verification-agent.txt` → Execution Agent가 Agent 툴로 스폰
      핸드오프 파일(loop-b-handoff-[node].md) ↔ 보고서(loop-b-report-[node]-iter[N].md) 교환 구조 확립
- [x] 2026-04-14 — 루프 종료 조건 자동 판정 로직 확립
      보고서 내 "DEPLOYMENT APPROVED" 문자열 존재 여부로 판정
      최대 5회 반복 후 미통과 시 인간 검수 에스컬레이션

> ⚠️ 훅 활성화: `/hooks` 메뉴를 한 번 열거나 세션 재시작 시 settings.json이 로드됩니다.

---

## Surprises & Discoveries

- (구현 중 기록)

---

## Decision Log

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-14 | Loop A를 Loop B의 전제 조건으로 설계 | Protocol 정합성 없이 앱 구현을 시작하면 Loop B에서 동일 결함이 반복 발생하기 때문 |
| 2026-04-14 | 검증 에이전트는 수정 권한 없이 보고만 함 | 실행-검증 역할 혼재 시 책임 소재 불명확, 견제 구조 붕괴 가능성 |

---

## Outcomes & Retrospective

- **원래 목표 달성 여부**: [ ] Yes  [ ] Partial  [ ] No
- **결과 요약**: (완료 후 작성)
- **다음 작업에 반영할 것**: (완료 후 작성)

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
