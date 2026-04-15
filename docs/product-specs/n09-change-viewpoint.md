# Node Spec — Change Viewpoint (N09)

> 파일명: `n09-change-viewpoint.md`  
> Protocol 버전 업 시 하단 `## Protocol 버전 History` 섹션에 기록합니다.

---

## 노드 개요

| 항목 | 내용 |
|------|------|
| Node ID | N09 |
| 이름 | change-viewpoint |
| 앱 | `cai-change-viewpoint-v2` |
| Protocol 버전 | v2 |
| AI 엔진 | Google Gemini (`@google/genai`) |
| 백엔드 | 없음 (클라이언트 사이드 직호출) |

---

## 단독 역할

건축물 이미지를 입력받아 건물의 기하학·재료·비례를 변경하지 않은 채, 사용자가 선택한 시점(조감뷰 / 아이레벨뷰 / 정면뷰 / 측면뷰 / 탑뷰)으로 변환한 이미지를 생성한다.

## 플랫폼 역할

설계 초기 단계에서 생성된 스케치·렌더링·사진을 다양한 시점으로 변환하여, 설계자가 단일 이미지에서 복수의 프레젠테이션 앵글을 즉시 도출할 수 있게 한다.

---

## 입력 계약 (Input Contract)

| 항목 | 타입 | 필수 여부 | 설명 |
|------|------|----------|------|
| 건축물 이미지 | `File` (JPEG / PNG / WebP) | 필수 | 분석 및 시점 변환의 원본 |
| 뷰 타입 | `ViewType` enum | 필수 | `birdEye / eyeLevel / front / rightSide / top` |
| 방향 서브옵션 | string | 뷰 타입에 따라 | `birdEye`, `eyeLevel`, `rightSide`의 경우 방향 선택 |
| 고도 서브옵션 | string (m 단위) | 뷰 타입에 따라 | `front`, `rightSide`의 경우 고도 선택 |

**입력 예시:**
```
건축물 외관 사진 (04:30 방향 코너뷰) + 뷰 타입: birdEye + 방향: 07:30
```

---

## 출력 계약 (Output Contract)

| 항목 | 타입 | 설명 |
|------|------|------|
| 변환 이미지 | base64 PNG | Gemini 생성 이미지, 캔버스에 자동 배치 |
| #.정보분석샘플 | JSON (3섹션) | Phase 1 분석 결과, `canvasItem.parameters`에 저장 |

**출력 예시:**
```
동일 건축물의 Bird's-eye view 이미지 (04:30 또는 07:30 방향, 드론 고도)
```

---

## 2-Phase 워크플로우

```
[Phase 1: Analysis — analyzeViewpoint()]
이미지 업로드
  → Pre-Processing: 이미지 재생성 (사용자 비노출, gemini-3.1-flash-image-preview)
  → Gemini 분석 (gemini-3.1-pro-preview)
  → #.정보분석샘플 JSON 파싱 (3섹션)
  → canvasItem.parameters.analysisReport 저장
  → 오른쪽 패널 Analysis 요약 표시 (angle / altitude / lens)

[Phase 2: Generation — handleGenerate()]
뷰 타입 선택 + 서브옵션 설정
  → buildAnalysisContext(): 분석 결과를 마크다운 테이블로 변환
  → View-specific prompt 구성 (5개 뷰 타입별 독립 프롬프트)
  → Gemini 이미지 생성 (gemini-3.1-flash-image-preview)
  → 새 canvasItem(type: 'generated') 캔버스에 추가
  → motherId로 원본 이미지에 연결
```

---

## AI 모델 레지스트리

| 용도 | Primary | Fallback |
|---|---|---|
| Phase 1 — 이미지 Pre-Processing | `gemini-3.1-flash-image-preview` | (실패 시 원본 사용) |
| Phase 1 — Analysis | `gemini-3.1-pro-preview` | `gemini-2.5-pro` |
| Phase 3 — Image Generation | `gemini-3.1-flash-image-preview` | `gemini-2.5-flash-image` |

- API Key: `VITE_GEMINI_API_KEY` (`.env.local`, `import.meta.env.VITE_GEMINI_API_KEY`)
- Fallback 전략: Primary 실패 → Fallback 자동 재시도 → 양쪽 실패 시 사용자 alert

---

## #.정보분석샘플 스키마

Phase 1 Gemini 분석 출력 포맷 (3섹션 JSON).

```json
{
  "visual_reasoning": "정면 인식 로직 서술",
  "angle": "12:00 | 1:30 | 3:00 | 04:30 | 06:00 | 07:30 | 09:00 | 10:30",

  "section1_optical": {
    "viewpoint":     "촬영 시점 (예: 하이 앵글 코너 뷰)",
    "azimuth":       "방위각 (예: 04:30 방향)",
    "altitude":      "촬영 고도 (예: 100m ~ 150m)",
    "perspective":   "투시 왜곡 (예: 2점 투시)",
    "sensor":        "센서 포맷 (예: 중형 포맷)",
    "focal_length":  "초점 거리 (예: 45mm ~ 50mm)",
    "lighting":      "광원 및 날씨 (예: 확산광, 옅은 안개)",
    "contrast":      "대비 강도 (예: 낮음)"
  },

  "section2_geometric": {
    "skin":     "외피 시스템 (예: 이중 외피 구조)",
    "inner":    "내부 파사드 (예: 유리 커튼월)",
    "outer":    "외부 파사드 (예: 파라메트릭 루버)",
    "mass":     "기본 매스 (예: 직육면체)",
    "base_1f":  "하층부 (예: 필로티 구조)",
    "mid_body": "중층부 (예: V자 오픈 발코니)",
    "roof":     "상층부 (예: 평지붕 + MEP 박스)"
  },

  "section3_conceptual": {
    "design_algorithm": "디자인 방법론 (예: 파라메트릭 디자인)",
    "color_palette":    "주조색 (예: 무채색, 투명)",
    "form_motif":       "형태 모티브 (예: 바람, 파동)",
    "form_contrast":    "형태적 대비",
    "mood_contrast":    "감성적 대비"
  }
}
```

---

## 시계 방향 각도 시스템 (Clock-face)

건물 정면 = **06:00** 기준. 8방향.

| 각도 | 의미 |
|---|---|
| `06:00` | 정면 (Front) |
| `04:30` | 정면 우측 코너 |
| `07:30` | 정면 좌측 코너 |
| `03:00` | 우측면 |
| `09:00` | 좌측면 |
| `12:00` | 후면 |
| `1:30` | 후면 우측 코너 |
| `10:30` | 후면 좌측 코너 |

---

## 5개 View Type 명세

### `birdEye` — Bird's eye view
| 파라미터 | 값 |
|---|---|
| 방향 옵션 | `04:30` (Front-Right) / `07:30` (Front-Left) |
| 고도 | 드론 고정 (45–60° 하향) |
| 렌즈 | 24mm Hasselblad Wide-angle |
| 투시 | 2점 투시 |
| 카메라 | DJI Mavic 3 Pro Cine |
| 조명 | 맑은 낮 또는 골든아워, 강한 방향성 햇빛 |

### `eyeLevel` — Perspective view (Eye-Level Corner View)
| 파라미터 | 값 |
|---|---|
| 방향 옵션 | `04:30` (Front-Right) / `07:30` (Front-Left) |
| 고도 | 1.6m 고정 (눈높이) |
| 렌즈 | 24–32mm Tilt-Shift |
| 투시 | 2점 투시, 수직선 완전 평행 |
| 카메라 | Sony A7R V |
| 조명 | 확산광 (흐린 날) |

### `front` — Front View (정면 입면뷰)
| 파라미터 | 값 |
|---|---|
| 방향 | `06:00` 고정 |
| 고도 옵션 | 0 / 1.6 / 10 / 50 / 150m |
| 렌즈 | 50mm Tilt-Shift |
| 투시 | 1점 투시 (입면 왜곡 없음) |
| 카메라 | Sony A7R V |

### `rightSide` — Right/Left View (측면뷰)
| 파라미터 | 값 |
|---|---|
| 방향 옵션 | `03:00` (우측면) / `09:00` (좌측면) |
| 고도 옵션 | 0 / 1.6 / 10 / 50 / 150m |
| 렌즈 | 50mm Tilt-Shift |
| 투시 | 1점 투시 |
| 자동 결정 | 분석 angle `04:30` → `03:00`, `07:30` → `09:00` |

### `top` — Top view (탑뷰)
| 파라미터 | 값 |
|---|---|
| 방향 | `06:00` 나디르 고정 |
| 고도 | 300m 고정 |
| 렌즈 | 24mm |
| 투시 | 직교 투영 (원근 없음) |
| 비율 | 1:1 정사각형 |
| 카메라 | DJI Mavic 3 Pro Cine |

---

## 불변 상수 (Immutable Constants)

| 상수 | 설명 |
|---|---|
| **Geometry** | 건물의 모든 기하학적 좌표·형태 |
| **Materials** | 재료·마감·텍스처 |
| **Proportion** | 구조적 비례와 스케일 |
| **Structural Detail** | 구조적 세부 요소 (기둥, 슬래브, 개구부) |

변경 가능:
- **Angle of View** (시점 방향, 고도)
- **Optical Environment** (렌즈, 조명, 날씨)

---

## Protocol 구성

> N09는 뷰 타입 선택 값에 따라 해당 프로토콜이 독립적으로 작동합니다.
> 하나의 통합 프로토콜이 아닌, 입력 값(`selectedView`)에 따라 아래 5개 중 하나가 트리거됩니다.

| 파일 | 유형 | 트리거 조건 |
|------|------|------------|
| [`docs/references/n09-protocol-bird-eye-view.md`](../references/n09-protocol-bird-eye-view.md) | 뷰 생성 프로토콜 | `selectedView === 'birdEye'` |
| [`docs/references/n09-protocol-eye-level-view.md`](../references/n09-protocol-eye-level-view.md) | 뷰 생성 프로토콜 | `selectedView === 'eyeLevel'` |
| [`docs/references/n09-protocol-front-view.md`](../references/n09-protocol-front-view.md) | 뷰 생성 프로토콜 | `selectedView === 'front'` |
| [`docs/references/n09-protocol-side-view.md`](../references/n09-protocol-side-view.md) | 뷰 생성 프로토콜 | `selectedView === 'rightSide'` |
| [`docs/references/n09-protocol-top-view.md`](../references/n09-protocol-top-view.md) | 뷰 생성 프로토콜 | `selectedView === 'top'` |
| [`docs/product-specs/n09-analysis-sample.md`](n09-analysis-sample.md) | Phase 1 출력 템플릿 | `analyzeViewpoint()` 실행 시 |
| `src/constants.ts` | AI 모델 상수 | `ANALYSIS`, `IMAGE_GEN`, fallback 포함 |

---

## 컴플라이언스 체크리스트

```
Phase 1 (Analysis):
[ ] Pre-Processing 단계 실행 여부 (이미지 재생성)
[ ] #.정보분석샘플 JSON 3섹션 완전 파싱 여부
[ ] angle 필드가 8개 Clock-face 값 중 하나인지
[ ] analyzedOpticalParams 저장 여부 (angle / altitude / focal_length)
[ ] Fallback 모델 재시도 로직 동작 여부

Phase 3 (Generation):
[ ] selectedView가 null이 아닌지 확인 후 실행
[ ] analysisContext 블록이 프롬프트에 포함되었는지
[ ] 생성 이미지가 텍스트가 아닌 inlineData 형태인지 (foundImage 체크)
[ ] motherId가 업로드 원본 아이템의 id로 올바르게 설정되었는지
[ ] Fallback 모델 재시도 로직 동작 여부

Immutable Constants:
[ ] 생성 이미지에서 건물 층수·비례 변화 없음
[ ] 재료 변환 없음 (콘크리트 → 유리 등)
[ ] 시점·조명 외 요소 변경 없음

Boundary Resolution:
[ ] JSON 미반환 시 Fallback 실행
[ ] Quota 초과 시 alert + 기본값 처리
[ ] 텍스트 반환 시 Fallback 실행
```

---

## 알려진 실패 패턴

| 패턴 | 재현 조건 | 처방 |
|------|----------|------|
| **Hallucination** | 창문·층수·디테일 추가 | 프롬프트에 "LOCK geometry" + "DO NOT modify architectural form" 명령 강화 |
| **텍스트 반환** | 이미지 대신 텍스트 응답 | `foundImage` 체크 → Fallback 재시도 |
| **JSON 파싱 실패** | 분석 응답에서 JSON 블록 없음 | `responseText.match(/\{[\s\S]*\}/)` 실패 → Fallback 모델 재시도 |
| **재료 변환** | 재료 시스템 변경 (예: 콘크리트→유리) | 분석 context의 skin/inner/outer 필드를 프롬프트에 더 명시적으로 삽입 |
| **Quota 초과** | 429 에러 반복 | alert 표시 + `setIsAnalyzing(false)` 처리 |

---

## 캔버스 & 앱 사양 요약

| 기능 | 사양 |
|---|---|
| 좌표계 | 중심 원점 (V55/V56, `calc(50% + Xpx)`) |
| 줌 범위 | 10% ~ 150% |
| 줌 스텝 | `[10, 25, 50, 75, 100, 125, 150]` |
| 영속성 | IndexedDB, 800ms 디바운스 자동 저장 |
| Undo/Redo | 히스토리 스택 (드래그·리사이즈·생성·삭제 모두 기록) |
| 반응형 | 1440×900 기준 스케일 (`Math.min(widthRatio, heightRatio)`) |
| 터치 | 핀치줌 + 2핑거 팬 |

---

## Protocol 버전 History

| 버전 | 날짜 | 변경 이유 | Stage B 결과 |
|------|------|----------|-------------|
| v1 | 2026-04-14 | 초기 작성 (App.tsx v2 기준 역추출) | — |
| v1.1 | 2026-04-15 | Loop B Iter1 HIGH 5건 수정: Pre-Step 추가, Prompt JSON 중복 제거, finalPrompt null guard, 이미지 타입·사이즈 검증, 타임아웃 분리(분석 30s/생성 60s) + 이미지 자동 리사이즈 구현 | **PASS** (Loop B Iter2 DEPLOYMENT APPROVED) |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
