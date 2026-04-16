# Exec Plan v11 — ANALYZE / GENERATE 플로우 분리

## 배경
사용자 확인 사항: View 선택은 ANALYZE 이후, GENERATE 이전에 한다.
현재 코드는 `analyzeViewpoint()`가 `selectedView`를 필요로 해서 View 미선택 시 무반응.

## 의도된 UX 플로우
1. 이미지 업로드
2. **ANALYZE 클릭** → Room 0만 실행 (DNA 추출, View 선택 불필요)
3. **View 선택** (Bird's eye / Front / Top 등)
4. **GENERATE 클릭** → Room 1~3 + 이미지 생성 (lockedDna + selectedView 사용)

## 변경 목록

### [ ] 1. `src/lib/prompt.ts`
- `buildRoom0SystemPrompt()` 추가: protocol만 포함 (Knowledge Doc 없음)

### [ ] 2. `src/lib/gemini.ts`
- `callRoom0Analysis(imageBase64)` 추가: Room 0만 실행, LOCKED_DNA 반환
- `callAnalysis()` 시그니처 변경: `lockedDna` 파라미터 추가, Room 1~3만 실행하도록

### [ ] 3. `src/types.ts`
- `parameters.lockedDna: string | null` 필드 추가

### [ ] 4. `src/App.tsx`
- `analyzeViewpoint()`: `if (!selectedView) return` 제거, `callRoom0Analysis` 호출
- `handleGenerate()`: `item.parameters.lockedDna` 사용하여 `callAnalysis` 호출

### [ ] 5. `src/components/RightPanel.tsx`
- ANALYZE 버튼: `lockedDna` 없을 때 표시 (View 선택 여부 무관)
- GENERATE 버튼: `lockedDna` 있을 때 표시 (기존 `selectedView` 필요 조건 유지)

## 완료 조건
- ANALYZE 클릭 시 View 미선택 상태에서도 분석이 실행됨
- GENERATE 클릭 시 View가 선택된 경우에만 실행됨
- 기존 기능 (이미지 생성) 정상 동작
