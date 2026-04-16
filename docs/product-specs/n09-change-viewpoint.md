# Node Spec — change-viewpoint (N09)

> 파일명: `N09-change-viewpoint.md`
> Protocol 버전 업 시 하단 `## Protocol 버전 History` 섹션에 변경 내용을 기록합니다.

---

## 노드 개요

| 항목 | 내용 |
|------|------|
| Node ID | N09 |
| 이름 | change-viewpoint |
| Phase | 1 |
| Protocol 버전 | v1 |

---

## 단독 역할

건축물 이미지를 업로드하면 AI가 건물의 기하학적 구조·재료·광학 조건을 분석하고,
사용자가 선택한 전문 촬영 시점(아이레벨/정면/조감/측면/탑뷰)으로 사실적인 건축 시뮬레이션 이미지를 생성한다.

## 플랫폼 역할

CAI 파이프라인 내에서 건축 시각화 노드로 기능하며,
단일 원본 이미지에서 다양한 전문 건축 촬영 시점 이미지를 자동 생성한다.

---

## 입력 계약 (Input Contract)

| 항목 | 타입 | 필수 여부 | 설명 |
|------|------|----------|------|
| `image` | `string` (base64) | 필수 | 건축물 이미지 |
| `viewpoint_type` | `"eye-level" \| "front" \| "bird-eye" \| "side" \| "top"` | 필수 | 생성할 시점 유형 |
| `side_direction` | `"03:00" \| "09:00"` | 조건부 필수 | `viewpoint_type === "side"` 일 때 필수. `"03:00"` = 우측면, `"09:00"` = 좌측면 |

> **side_direction 자동 설정:** ANALYSIS ROOM 출력의 독립 필드 `angle`에서 자동 결정.
> `angle === "04:30"` → `"03:00"` (우측면) / `angle === "07:30"` → `"09:00"` (좌측면).
> UI에서 수동 변경 가능.

> **altitude 고정값:** 정면뷰 및 측면뷰 카메라 고도는 현 단계에서 10m로 고정. Input Contract 항목 제외.

**입력 예시:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "viewpoint_type": "eye-level"
}
```
```json
{
  "image": "data:image/jpeg;base64,...",
  "viewpoint_type": "side",
  "side_direction": "03:00"
}
```

---

## 출력 계약 (Output Contract)

| 항목 | 타입 | 설명 |
|------|------|------|
| `generated_image` | `string` (base64) | 선택된 시점으로 생성된 건축 이미지 |
| `analysis_spec` | `AnalysisSpec` (JSON) | ANALYSIS ROOM 결과. 내부 전달용 — 개발자 오염/오류 확인 용도 |
| `generation_spec` | `GenerationSpec` (JSON) | GENERATION ROOM 완료 기록. 내부 품질 검증 증적 |

> **확정:** 생성 이미지는 소스 이미지 우측 인접 배치, 동일 높이, 비율 유지 폭, 겹침 방지 로직 적용. (`생성 이미지 캔버스 배치` 섹션 참조)

**출력 예시:**
```json
{
  "generated_image": "data:image/png;base64,...",
  "analysis_spec": {
    "process": "analysis",
    "angle": "04:30",
    "results": [
      { "axis": "optical_viewpoint", "finding": "{ viewpoint: '아이레벨 코너뷰', azimuth: '04:30', altitude: '1.7m', ... }", "confidence": "HIGH" },
      { "axis": "geometric_spatial", "finding": "{ skin: 'Double-skin facade', mass: 'Solid Glass Box', ... }", "confidence": "HIGH" },
      { "axis": "conceptual_visual", "finding": "{ algorithm: 'Parametricism', palette: '무채색/투명', ... }", "confidence": "MID" }
    ],
    "failure_modes": [],
    "passed": true
  },
  "generation_spec": {
    "process": "generation",
    "engine": "gemini-flash-image-preview",
    "type": "image",
    "input_refs": {
      "analysis_spec": "optical_viewpoint HIGH, geometric_spatial HIGH, conceptual_visual MID",
      "input_spec": "viewpoint_type: eye-level"
    },
    "output": "data:image/png;base64,...",
    "quality_gate": "PASS",
    "regenerated": false
  }
}
```

---

## NodeContract (TypeScript)

```typescript
const N09Contract: NodeContract = {
  nodeId: "N09",
  nodeName: "change-viewpoint",
  phase: 1,
  input: {
    type: "image + viewpoint_type + side_direction(conditional)",
    schema: {
      image: { type: "string", format: "base64", required: true },
      viewpoint_type: {
        type: "string",
        enum: ["eye-level", "front", "bird-eye", "side", "top"],
        required: true
      },
      side_direction: {
        type: "string",
        enum: ["03:00", "09:00"],
        required: "when viewpoint_type === 'side'",
        note: "03:00 = right side, 09:00 = left side. Auto-set from analysis_spec.angle."
      }
    }
  },
  output: {
    type: "image + analysis_spec(internal) + generation_spec(internal)",
    schema: {
      generated_image: { type: "string", format: "base64" },
      analysis_spec: { type: "AnalysisSpec", visibility: "internal" },
      generation_spec: { type: "GenerationSpec", visibility: "internal" }
    }
  },
  protocolVersion: "v1",
  knowledgeDocs: [
    "knowledge-eye-level-view.txt",
    "knowledge-front-view.txt",
    "knowledge-bird-eye-view.txt",
    "knowledge-side-view.txt",
    "knowledge-top-view.txt"
  ],
  complianceChecks: [
    "Pre-Step: 입력 이미지 건축물 포함 여부 확인",
    "Step 1: ANALYSIS ROOM — optical_viewpoint 축 분석 실행",
    "Step 2: ANALYSIS ROOM — geometric_spatial 축 분석 실행",
    "Step 3: ANALYSIS ROOM — conceptual_visual 축 분석 실행",
    "Step 4: analysis-spec 구조화 출력 (자유 서술 금지)",
    "Step 5: USER INPUT — viewpoint_type 수신 및 해당 Knowledge Doc 로드",
    "Step 6: GENERATION ROOM — 선택된 Knowledge Doc 기반 이미지 생성",
    "Step 7: generation-spec 구조화 출력",
    "Immutable Constants: 건물 기하학(Geometry) 변형 없음",
    "Immutable Constants: 건물 비율(Proportion) 변형 없음",
    "Immutable Constants: 재료 및 구조 디테일 변형 없음",
    "Boundary Resolution: 빈 출력 또는 원본 반환 없음",
    "Boundary Resolution: 분석 불가 축은 null 반환 + 이유 명시"
  ]
}
```

---

## Protocol 구성

> 파일 위치 기준: `docs/product-specs/protocol-design-guide.md §6` — `_context/` 폴더 사용
> ※ `ARCHITECTURE.md`는 `protocol/`로 표기 중 — 불일치 존재, `_context/`를 현행 기준으로 채택

| 파일 | 유형 | 설명 |
|------|------|------|
| `_context/protocol/protocol-change-viewpoint-v1.txt` | Principle Protocol | ANALYSIS ROOM + GENERATION ROOM 정의 |
| `_context/protocol/knowledge-eye-level-view.txt` | Knowledge Doc | 아이레벨 투시뷰 촬영 명세 |
| `_context/protocol/knowledge-front-view.txt` | Knowledge Doc | 정면뷰 촬영 명세 |
| `_context/protocol/knowledge-bird-eye-view.txt` | Knowledge Doc | 조감 투시도 촬영 명세 |
| `_context/protocol/knowledge-side-view.txt` | Knowledge Doc | 측면뷰 촬영 명세 (좌/우 방향 포함) |
| `_context/protocol/knowledge-top-view.txt` | Knowledge Doc | 탑뷰(정사투영) 촬영 명세 |

**로드 규칙:**
- ANALYSIS ROOM: `protocol-change-viewpoint-v1.txt` 단독 사용
- GENERATION ROOM: `protocol-change-viewpoint-v1.txt` + `knowledge-[viewpoint_type].txt` (선택된 1개만 로드)

---

## ANALYSIS ROOM Axes 정의

`#.정보분석샘플.md` 기반으로 3개 축 정의:

| Axis | 설명 | 추출 데이터 |
|------|------|-----------|
| `optical_viewpoint` | 카메라 위치 및 광학/시점 파라미터 | Viewpoint, Azimuth, Altitude, Perspective, Sensor, Focal Length, Lighting, Contrast |
| `geometric_spatial` | 기하학 및 공간 구조 명세 | Skin(외피), Inner/Outer Facade, Mass(매스), 저층/중층/상층 구조 |
| `conceptual_visual` | 개념 및 시각적 속성 | Design Algorithm, Color Palette, Form Motif, Form/Mood |

**`angle` 독립 필드 (analysis-spec 최상위):**

| 필드 | 타입 | 설명 |
|------|------|------|
| `angle` | `string` (clock-face) | 원본 이미지의 건물 촬영 방향. 건물 정면 = 06:00 기준. 예: `"04:30"`, `"07:30"` |

- ANALYSIS ROOM이 `optical_viewpoint` 분석과 동시에 `angle`을 결정하여 analysis-spec 최상위 필드로 출력
- GENERATION ROOM은 `viewpoint_type === "side"` 시 `angle`로 `side_direction` 자동 결정
  - `angle === "04:30"` → `side_direction = "03:00"` (우측면)
  - `angle === "07:30"` → `side_direction = "09:00"` (좌측면)

## 생성 이미지 캔버스 배치

| 항목 | 규칙 |
|------|------|
| X 위치 | 소스 이미지 우측 인접 (`sourceItem.x + sourceItem.width + 12px`) |
| Y 위치 | 소스 이미지와 동일 (`sourceItem.y`) |
| Width | 생성 이미지 실제 비율 유지 (`img.width / img.height × sourceItem.height`) |
| Height | 소스 이미지와 동일 높이 |
| 겹침 방지 | 기존 아이템과 겹치면 X를 우측으로 추가 이동 (반복 체크) |

---

## 컴플라이언스 체크리스트

```
Protocol Compliance (PCS):
[ ] Pre-Step: 입력 이미지가 건축물을 포함하는지 확인
[ ] Step 1: optical_viewpoint 축 분석 실행 + 구조화 finding 출력
[ ] Step 2: geometric_spatial 축 분석 실행 + 구조화 finding 출력
[ ] Step 3: conceptual_visual 축 분석 실행 + 구조화 finding 출력
[ ] Step 4: analysis-spec JSON 형식으로 출력 (자유 서술 금지)
[ ] Step 5: viewpoint_type 수신 후 해당 Knowledge Doc 로드 확인
[ ] Step 6: GENERATION ROOM — Knowledge Doc 기반 이미지 프롬프트 생성 및 실행
[ ] Step 7: generation-spec JSON 형식으로 출력
[ ] Compliance Check 섹션 실행 여부

Immutable Constants:
[ ] 건물 기하학(Geometry) — 원본 대비 변형 없음
[ ] 건물 비율(Proportion) — 원본 대비 변형 없음
[ ] 재료 및 구조 디테일(Material/Structural Detail) — 원본 대비 변형 없음

Boundary Resolution:
[ ] 빈 출력(empty output) 없음
[ ] 원본 이미지 패스스루(원본 반환) 없음
[ ] 분석 불가 Axis → null + 이유 1문장 명시 (자의적 추측 금지)
[ ] 이미지 품질 불충분 → ANALYSIS ROOM 중단 + 재업로드 요청

Output-Specific (N09):
[ ] 생성 이미지가 선택된 뷰타입의 촬영 명세(Knowledge Doc)를 준수하는가
[ ] 수직선 왜곡 없음 (정면뷰/측면뷰/탑뷰의 tilt-shift 조건 준수)
[ ] 정사투영 조건 준수 (탑뷰)
[ ] 측면뷰 방향 (left/right) 정확히 적용됨
```

---

## 알려진 실패 패턴

| 패턴 | 재현 조건 | 처방 |
|------|----------|------|
| **기하 변형** | 건물 비율·구조 변경 | CONTEXT에 Immutable Constants 강조 반복 + Pre-flight 체크 추가 |
| **시점 오염** | 선택된 뷰타입과 다른 앵글로 생성 | GENERATION ROOM에 viewpoint_type 강제 매핑 조건 명시 |
| **할루시네이션** | 원본에 없는 건물 요소 추가 | CONTEXT Ontological Status 강화 ("완공된 현실로 취급") |
| **측면 방향 오류** | left 선택 시 right 뷰 생성 | GENERATION ROOM에 side_direction → 03:00/09:00 변환 명시 |

---

## Protocol 버전 History

| 버전 | 날짜 | 변경 이유 | Stage B 결과 |
|------|------|----------|-------------|
| v1 | 2026-04-16 | 초기 작성 | — |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
