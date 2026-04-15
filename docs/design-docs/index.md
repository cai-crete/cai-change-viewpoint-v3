# Design Docs — 설계 기준 인덱스

> 이 폴더는 **각 노드의 결과물이 어떤 기준으로 만들어지는가**를 정의하는 문서 모음입니다.
> Agent가 "이 출력 방향이 올바른가"를 판단할 때 첫 번째로 참조하는 위치입니다.

---

## 설계 기준 문서

| 파일 | 이 파일이 답하는 질문 |
|------|-------------------|
| [core-beliefs.md](core-beliefs.md) | 노드 출력물이 올바른지 판단하는 기준은 무엇인가? |
| [protocol-design-guide.md](protocol-design-guide.md) | Protocol은 출력물을 만드는 데 어떤 역할을 하는가? |

---

## N09 프로토콜 파일 (독립 트리거)

> 각 프로토콜은 `selectedView` 입력 값에 따라 독립적으로 트리거됩니다.
> 상세 파일은 `docs/references/` 에 위치합니다.

| 파일 | 트리거 조건 | 뷰 유형 |
|------|-----------|--------|
| [n09-protocol-bird-eye-view.md](../references/n09-protocol-bird-eye-view.md) | `selectedView === 'birdEye'` | 조감투시뷰 |
| [n09-protocol-eye-level-view.md](../references/n09-protocol-eye-level-view.md) | `selectedView === 'eyeLevel'` | 아이레벨투시뷰 |
| [n09-protocol-front-view.md](../references/n09-protocol-front-view.md) | `selectedView === 'front'` | 정면뷰 |
| [n09-protocol-side-view.md](../references/n09-protocol-side-view.md) | `selectedView === 'rightSide'` | 측면뷰 |
| [n09-protocol-top-view.md](../references/n09-protocol-top-view.md) | `selectedView === 'top'` | 탑뷰 |

---

## Agent 사용 지침

| 상황 | 참조 파일 |
|------|----------|
| 출력물의 방향이 올바른지 판단해야 할 때 | `core-beliefs.md` |
| 기술적으로 동등한 구현 선택지 앞에서 | `core-beliefs.md` — "이 방향이 우리 기준에 맞는가" |
| Protocol이 무엇을 해야 하는지 파악할 때 | `protocol-design-guide.md` |
| Protocol 파일의 위치와 구조를 확인할 때 | `protocol-design-guide.md` |
| N09 특정 뷰 타입의 렌더링 기준을 확인할 때 | 위 N09 프로토콜 파일 (트리거 조건으로 선택) |

---

## 읽는 순서

1. `core-beliefs.md` — 출력 기준의 철학적 토대
2. `protocol-design-guide.md` — 그 기준을 실행하는 Protocol의 역할
3. N09 프로토콜 파일 — 실제 뷰 타입별 렌더링 기준 (해당 뷰 선택 시)
