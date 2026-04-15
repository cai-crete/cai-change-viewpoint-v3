# Common Antipatterns — N09 Change Viewpoint

> **심각도:** 🔴 HIGH (배포 차단) / 🟡 MID (수정 권고) / 🟢 LOW (개선 권고)

---

## 🔴 AP-01: 하드코딩된 API 키

```typescript
// ❌ 금지
const ai = new GoogleGenAI({ apiKey: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX' });
```
**위험:** 소스코드 노출 시 API 키 유출. git 커밋 시 영구 기록.
**처방:** `import.meta.env.VITE_GEMINI_API_KEY` 사용.

---

## 🔴 AP-02: Fallback 없는 API 단일 호출

```typescript
// ❌ 금지
const response = await ai.models.generateContent({ model: ANALYSIS, contents });
```
**위험:** 모델 할당량 초과 또는 일시 장애 시 전체 기능 실패.
**처방:** `try { primary } catch { fallback }` 패턴 사용. RELIABILITY.md 재시도 정책 준수.

---

## 🔴 AP-03: Protocol 주입 누락 (finalPrompt 빈 문자열)

```typescript
// ❌ 금지
let finalPrompt = '';
// selectedView 분기 누락 또는 누락된 케이스
const parts = [{ inlineData }, { text: finalPrompt }]; // 빈 프롬프트로 호출
```
**위험:** AI 모델이 아무 지시 없이 이미지 생성 → 무작위 출력.
**처방:** 모든 `ViewType` 분기 처리 확인. 빈 프롬프트 guard 추가.

---

## 🔴 AP-04: 원본 이미지 반환 방지 지시 누락 (rightSide)

```typescript
// ❌ 금지 (rightSide에서)
finalPrompt = `Generate a side elevation view.`;
// TRANSFORMATION DIRECTIVE 없음
```
**위험:** AI 모델이 원본 이미지를 그대로 반환. Conformance Check 항목 3 FAIL.
**처방:** TRANSFORMATION DIRECTIVE + `⚠️ DO NOT return or replicate the source image` 포함.

---

## 🟡 AP-05: finally 블록 없는 로딩 상태

```typescript
// ❌ 금지
setIsGenerating(true);
try {
  await runGeneration(MODEL);
  setIsGenerating(false); // catch에서 실행 안 됨
} catch (err) {
  console.warn(err); // setIsGenerating(false) 누락
}
```
**위험:** 오류 발생 시 로딩 스피너가 영구 표시.
**처방:** `finally { setIsGenerating(false) }` 사용.

---

## 🟡 AP-06: JSON 응답 방어 코드 누락

```typescript
// ❌ 금지
const parsed = JSON.parse(response.candidates[0].content.parts[0].text);
```
**위험:** API 응답 형식 변경 또는 파싱 오류 시 앱 크래시.
**처방:** `?.` optional chaining + `try/catch` + JSON 패턴 추출 후 파싱.

---

## 🟡 AP-07: 이미지 업로드 타입/사이즈 미검증

```typescript
// ❌ 금지
input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.readAsDataURL(file); // 검증 없음
});
```
**위험:** 악의적 파일 형식 또는 대용량 파일로 앱 오동작.
**처방:** JPEG/PNG/WebP + 10MB 이하 검증 후 처리.

---

## 🟡 AP-08: 모델명 인라인 하드코딩

```typescript
// ❌ 금지
await ai.models.generateContent({ model: 'gemini-3.1-flash-image-preview', ... });
```
**위험:** 모델 업그레이드 시 여러 곳 수정 필요. constants.ts 중앙 관리 원칙 위반.
**처방:** `import { IMAGE_GEN } from './constants'` 사용.

---

## 🟢 AP-09: 분석 컨텍스트 미주입

```typescript
// ❌ 권고하지 않음
finalPrompt = `## Camera Settings\n...`; // analysisContext 없음
```
**위험:** AI가 원본 이미지의 기하·재료 정보 없이 생성 → 할루시네이션 위험 증가.
**처방:** `${analysisContext}` 블록 finalPrompt에 포함.

---

## 🟢 AP-10: console.log에 민감 변수 노출

```typescript
// ❌ 권고하지 않음
console.log('API Key:', import.meta.env.VITE_GEMINI_API_KEY);
```
**위험:** 브라우저 DevTools에서 API 키 노출.
**처방:** 민감 환경 변수는 로그에서 제외.
