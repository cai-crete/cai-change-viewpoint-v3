# active-v14 — Bird's-eye / Eye-Level 방향 Gemini 전달 (CameraAngle Passthrough)

## 목표
`birdEyeDirection` / `eyeLevelDirection` (`'04:30' | '07:30'`) 값을 Gemini API 호출까지 전달하여,
시계 방향 정보가 실제 분석에 반영되도록 한다.

## 확정 사양 (사용자 답변 기반)

| 항목 | 결정 |
|---|---|
| Q1. Knowledge Doc 분기 | 동일 Doc 유지. userText에 방향만 추가 |
| Q2. Gemini 전달 형식 | 시계 방향 그대로: `"Camera angle: 04:30"` |
| Q3. 라벨 포함 여부 | **포함** — `"Bird's-eye Perspective View (04:30)"` 형태 + VIEWPOINT_KEYWORDS 방향 변형 추가 |

## 변경 대상 파일

### 1. `src/lib/gemini.ts`
- [x] `CameraAngle` 타입 export: `'04:30' | '07:30'`
- [x] `VIEWPOINT_LABEL` 맵에 방향 변형 추가:
  - `'bird-eye:04:30'` → `"Bird's-eye Perspective View (04:30)"`
  - `'bird-eye:07:30'` → `"Bird's-eye Perspective View (07:30)"`
  - `'eye-level:04:30'` → `"Eye-Level Corner View (04:30)"`
  - `'eye-level:07:30'` → `"Eye-Level Corner View (07:30)"`
- [x] `getViewpointLabel(viewpointType, sideDirection?, cameraAngle?)` 파라미터 추가
- [x] `callAnalysis()` 5번째 인자 `cameraAngle?: CameraAngle` 추가
- [x] userText에 `"Camera angle: 04:30"` 라인 추가 (cameraAngle 존재 시)
- [x] 콘솔 로그에 cameraAngle 반영

### 2. `src/lib/compliance.ts`
- [x] `VIEWPOINT_KEYWORDS`에 방향별 변형 엔트리 4개 추가:
  - `"Bird's-eye Perspective View (04:30)"` → 기존 bird-eye 키워드 + `"04:30"`
  - `"Bird's-eye Perspective View (07:30)"` → 기존 bird-eye 키워드 + `"07:30"`
  - `"Eye-Level Corner View (04:30)"` → 기존 eye-level 키워드 + `"04:30"`
  - `"Eye-Level Corner View (07:30)"` → 기존 eye-level 키워드 + `"07:30"`

### 3. `src/App.tsx`
- [x] `CameraAngle` import 추가
- [x] `handleGenerate()` 내 cameraAngle 파생:
  ```ts
  const cameraAngle: CameraAngle | undefined =
    selectedView === 'birdEye' ? birdEyeDirection :
    selectedView === 'eyeLevel' ? eyeLevelDirection :
    undefined
  ```
- [x] `callAnalysis()` 호출 시 cameraAngle 전달
- [x] `getViewpointLabel()` 호출 시 cameraAngle 전달

## 예상 콘솔 출력 (04:30 선택 시)
```
[N09] ▶ ROOM 1→2→3: Viewpoint Analysis  |  Bird's-eye Perspective View (04:30)
[N09 COMPLIANCE CHECK] — Bird's-eye Perspective View (04:30)
✅ VP-1 요청 시점 반영 확인 (Bird's-eye Perspective View (04:30))
```
