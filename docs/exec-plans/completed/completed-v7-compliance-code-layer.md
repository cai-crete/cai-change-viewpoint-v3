# exec-plan-v7: COMPLIANCE CHECK → 코드 레이어 분리

## 목적
COMPLIANCE CHECK를 AI 프롬프트에서 제거하고 개발자 전용 콘솔 출력으로 이동

## 체크리스트
- [x] exec-plan 생성
- [x] loop-a-verification-agent.txt: 위임 패턴 예외 규칙 추가
- [x] protocol-change-viewpoint-v1.txt: # COMPLIANCE CHECK → 포인터 추가
- [x] Loop A 재실행 — FAIL (SYSTEM/CONTEXT/ACTION PROTOCOL 헤더 누락)
      사용자 결정: 현행 프로토콜 구조(MWRS) 유지, 헤더 수정 없이 진행

## 변경 파일
1. `docs/references/loop-a-verification-agent.txt` — CHECK 1 예외 규칙 추가
2. `N09-change-viewpoint/_context/protocol/protocol-change-viewpoint-v1.txt` — COMPLIANCE CHECK 섹션 포인터 추가

## 비고
- lib/compliance.ts 구현은 Node App 개발 단계에서 진행 (이번 범위 아님)
