# active-v5-N09-protocol

## 목표
N09-change-viewpoint Protocol v1 파일 작성 및 Loop A 검증

## 작업 경로
- Protocol 파일: `D:\OneDrive\바탕 화면\CRETE\N09-change-viewpoint\_context\protocol\protocol-change-viewpoint-v1.txt`
- Knowledge Docs: 이미 존재 (`_context/protocol/knowledge-*.txt` 5개)

## 확정 사항 (사용자 승인)
- Q1: Knowledge Docs → 별도 세션에서 작성 (이번 세션은 Protocol만)
- Q2: angle 허용값
  - eye-level-view, bird-eye-view 입력: "04:30" | "07:30"
  - side-view 입력: "03:00" | "09:00"
  - front-view 입력: "06:00" (고정)
  - 전체 enum: "03:00" | "04:30" | "06:00" | "07:30" | "09:00"
  - side_direction 자동 매핑: 03:00→03:00, 04:30→03:00, 07:30→09:00, 09:00→09:00, 06:00→수동선택
- Q3: Loop A 검증 → 이번 세션에서 직접 수행

## 단계별 체크리스트

- [x] 1. exec-plan 작성
- [ ] 2. `protocol-change-viewpoint-v1.txt` 작성
  - [GOAL] / [CONTEXT] / [ROLE]
  - [ANALYSIS ROOM] — PRE-STEP + STEP 1~3 + SPEC_OUTPUT
  - [GENERATION ROOM] — STEP 1~4 + SPEC_OUTPUT (5개 분기 포함)
  - [COMPLIANCE CHECK] / [FAILURE MODES]
- [ ] 3. Loop A 자체 검증 (4개 체크 항목)
  - ① 구조 완결성
  - ② 간결성
  - ③ 내부 일관성
  - ④ 오염 저항성 (§7 전항목)
- [ ] 4. loop-b-handoff-change-viewpoint.md 작성
- [ ] 5. claude-progress.txt REVISION 5 저장

## 참조
- product-spec: `docs/product-specs/N09-change-viewpoint.md`
- protocol-design-guide: `docs/product-specs/protocol-design-guide.md`
