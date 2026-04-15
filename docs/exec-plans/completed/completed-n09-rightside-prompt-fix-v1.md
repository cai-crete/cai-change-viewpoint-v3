# 계획: RIGHTSIDE 측면뷰 생성 실패 & 1점 투시 미적용 수정

> **작성일:** 2026-04-15
> **대상 이슈:** Conformance Check FAIL — RIGHTSIDE / 2026-04-15 (항목 3, 5)

## Context
정합성 검토(Conformance Check) 결과에서 RIGHTSIDE 뷰 생성 시 두 가지 실패가 확인됨:
- **실패 3**: 측면뷰가 생성되지 않고 원본 이미지(조감도)가 그대로 출력됨
- **실패 5**: 1점 투시(One-point perspective) 미적용 — 조감도의 3점 투시 왜곡이 그대로 남아 있음

두 실패는 같은 근본 원인에서 비롯됨: 이미지 생성 모델이 **원본 이미지를 그대로 반환**하고 있음 (뷰포인트 변환 미수행).

---

## 근본 원인 분석

### 원인 1: 출발 시점(Source Viewpoint) 미명시
현재 `rightSide` 프롬프트에는 원본 이미지가 어떤 시점인지(조감도, 아이레벨 등) 명시하지 않음. AI 모델은 "어디서 어디로" 변환해야 하는지 맥락이 없어 그냥 원본을 유지.

→ **위치:** `App.tsx` `viewCameraSettings.rightSide` (L1117-1121) 및 hardcoded prompt (L967-1026)

### 원인 2: "건물을 변경하지 말라"와 "카메라를 이동하라"의 혼동
"Ontological Locking — DO NOT modify architectural form" 지시를 AI가 "원본 이미지를 유지하라"로 오해. 불변 대상은 **건물**(형태, 재료)이지 **카메라 위치**가 아님을 명확히 구분하지 않음.

→ **위치:** `public/protocols/n09-protocol-side-view.md` Step 1 & Step 2 및 프롬프트 전체

### 원인 3: 측면 파사드 추론 지시 없음
조감도에서는 측면 파사드가 완전히 보이지 않을 수 있음. AI는 측면 파사드를 어떻게 추론해야 하는지 지시가 없어 생성을 포기하고 원본을 반환.

→ **위치:** `n09-protocol-side-view.md` Step 2 / Action Protocol

### 원인 4: 1점 투시 / 투시 제거 지시 불충분
"1-Point Perspective (Side)"라고만 명시되어 있으나, 조감도→측면 입면도로의 변환에서 모든 투시 왜곡을 제거하고 센서를 파사드와 완벽히 평행하게 배치한다는 **절대적 요구사항**이 약함.

→ **위치:** 프롬프트 Camera Settings 블록 및 프로토콜 Specification 섹션

---

## 수정 계획

### 수정 파일
1. `src/App.tsx` — L1018-1022 (hardcoded Camera Settings), L1117-1121 (protocol override camera settings)
2. `public/protocols/n09-protocol-side-view.md` — RULE, Step 2 ACTION PROTOCOL, Failure Mode

---

## 수정 1: `App.tsx` — hardcoded `rightSide` Camera Settings 블록 강화 (L1018)

기존 Camera Settings 블록(L1018-1022)을 아래로 교체:

```
## TRANSFORMATION DIRECTIVE
* **SOURCE**: Original image — [${analyzedOpticalParams?.angle ?? 'N/A'} position, ${analyzedOpticalParams?.altitude ?? 'N/A'}]
* **TARGET**: ${rightSideDirection} — Flat Side Elevation (측면 입면도)
* ⚠️ **DO NOT return or replicate the source image.** Generate a COMPLETELY NEW view.
* **건물(Geometry/Materials)은 불변 상수**, **카메라 위치·각도는 완전히 재배치** 대상입니다.
* 타겟 측면 파사드가 원본에서 일부 미노출된 경우, 가시적 구조·재료·비례 데이터로 추론하여 완성하십시오.

## Camera Settings for This Render
* **View Direction**: ${rightSideDirection}
  * `03:00` = **Right Side Elevation** (우측면 입면도)
  * `09:00` = **Left Side Elevation** (좌측면 입면도)
* **Altitude**: ${rightSideAltitude}m
* **Lens**: 50mm (Standard Tilt-Shift)
* **Perspective**: ZERO PERSPECTIVE DISTORTION — Tilt-Shift Flat Elevation
  * All vertical lines → perfectly VERTICAL in frame
  * All horizontal lines → perfectly HORIZONTAL in frame
  * NO vanishing points. NO three-point perspective.
  * Camera sensor plane PERFECTLY PARALLEL to the target side facade.
```

---

## 수정 2: `App.tsx` — protocol override `viewCameraSettings.rightSide` 강화 (L1117)

현재 (L1117-1121):
```typescript
rightSide: `## Camera Settings for This Render
* **View Direction**: ${rightSideDirection} (...)
* **Altitude**: ${rightSideAltitude}m
* **Lens**: 50mm (Standard Tilt-Shift)
* **Perspective**: 1-Point Perspective (Side)`,
```

변경 후 (동일한 TRANSFORMATION DIRECTIVE + 강화된 Camera Settings 적용):
```typescript
rightSide: `## TRANSFORMATION DIRECTIVE
* **SOURCE**: Original image — [${analyzedOpticalParams?.angle ?? 'N/A'} position, ${analyzedOpticalParams?.altitude ?? 'N/A'}]
* **TARGET**: ${rightSideDirection} — Flat Side Elevation (측면 입면도)
* ⚠️ DO NOT return or replicate the source image. Generate a COMPLETELY NEW view.
* 건물(Geometry/Materials)은 불변 상수. 카메라 위치·각도는 완전히 재배치 대상.
* 타겟 측면 파사드가 원본에서 미노출 시, 가시적 구조·재료·비례 데이터로 추론·완성.

## Camera Settings for This Render
* **View Direction**: ${rightSideDirection}
  * `03:00` = **Right Side Elevation** (우측면 입면도)
  * `09:00` = **Left Side Elevation** (좌측면 입면도)
* **Altitude**: ${rightSideAltitude}m
* **Lens**: 50mm (Standard Tilt-Shift)
* **Perspective**: ZERO PERSPECTIVE DISTORTION — Tilt-Shift Flat Elevation
  * All vertical lines → perfectly VERTICAL in frame
  * All horizontal lines → perfectly HORIZONTAL in frame
  * NO vanishing points. NO three-point perspective.
  * Camera sensor plane PERFECTLY PARALLEL to the target side facade.`,
```

> **참고:** `analyzedOpticalParams`는 `handleGenerate` 스코프 내 `useAppStore` state로, `App.tsx` L784 근처에서 이미 구조분해되어 있음.

---

## 수정 3: `n09-protocol-side-view.md` — 프로토콜 강화

**RULE 섹션에 2개 항목 추가 (기존 03:00/09:00 규칙 다음):**
```markdown
* **⚠️ 뷰포인트 변환 원칙:** 불변 대상은 **건축물(형태, 재료, 비례)**이며, **카메라 위치와 각도는 완전히 재배치**되어야 합니다. 원본 이미지를 그대로 반환하는 것은 절대 금지입니다.
* **타겟 측면 파사드 추론:** 원본 이미지에서 타겟 측면이 일부 가려진 경우, 노출된 파사드의 구조적 패턴·재료·비례를 기반으로 측면 파사드를 논리적으로 추론하여 완성하십시오.
```

**Step 2 ACTION PROTOCOL Method 항목 다음에 새 소섹션 추가:**
```markdown
### ⚠️ 극단적 뷰포인트 전환 처리
원본 이미지가 조감도(Bird's-eye), 사선 뷰(Corner), 또는 아이레벨 뷰인 경우:
1. 원본 이미지를 건물의 **3D 청사진**으로 취급합니다 (단순 2D 이미지가 아님).
2. 해당 청사진에서 타겟 측면(03:00 또는 09:00)의 파사드 데이터를 추출합니다.
3. 완전히 새로운 카메라 위치(센서 평면이 타겟 파사드와 완벽히 평행)에서 렌더링합니다.
4. 원본 이미지의 원근 왜곡을 **모두 제거**합니다 — tilt-shift 입면 사진과 동일한 결과.
```

**Failure Mode에 2개 항목 추가:**
```markdown
- IF [원본 이미지 그대로 출력]: 즉시 재생성. **원본 이미지 반환은 프로토콜 위반**. 타겟 측면 파사드 추론을 통해 반드시 새로운 이미지를 생성하십시오.
- IF [3점 투시 또는 고각 원근 왜곡 존재]: 투시 완전 제거 후 재생성. 측면 입면도는 tilt-shift 평면 사진으로, 모든 수직·수평선이 프레임에 완벽히 평행해야 합니다.
```

---

## 수정 범위 요약

| 파일 | 수정 위치 | 수정 내용 |
|------|----------|----------|
| `src/App.tsx` | L1018-1022 (hardcoded Camera Settings) | TRANSFORMATION DIRECTIVE + ZERO PERSPECTIVE 추가 |
| `src/App.tsx` | L1117-1121 (protocol override camera settings) | 동일한 강화 내용 반영 |
| `public/protocols/n09-protocol-side-view.md` | RULE, Step 2, Failure Mode | 뷰포인트 변환 원칙 + 측면 파사드 추론 + 원본 반환 금지 강화 |

---

## 검증 방법

1. 조감도(bird's-eye view) 이미지를 업로드 후 Analysis 수행
2. `rightSide` 뷰 선택, 방향 03:00, 고도 1.6m 설정
3. Generate 실행
4. 출력 이미지 확인:
   - 원본 조감도와 **다른** 이미지가 생성되는가?
   - 측면 파사드(우측면)가 정면으로 나타나는가?
   - 수직·수평선이 프레임과 평행한가? (투시 없음)
5. Conformance Check 실행 → 항목 3, 5 PASS 확인
