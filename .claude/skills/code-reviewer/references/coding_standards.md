# Coding Standards — N09 Change Viewpoint

> **적용 범위:** `cai-change-viewpoint-v2/src/` (TypeScript + React + Gemini API)

---

## 1. Gemini API 호출 패턴

```typescript
// ✅ 올바른 패턴 — fallback 포함
const runGeneration = async (modelName: string) => {
  const response = await ai.models.generateContent({ model: modelName, contents: { parts } });
  // ... process response
};
try {
  await runGeneration(IMAGE_GEN);
} catch {
  await runGeneration(IMAGE_GEN_FALLBACK);
}

// ❌ 금지 — fallback 없음
await ai.models.generateContent({ model: IMAGE_GEN, contents: { parts } });
```

---

## 2. 환경 변수 사용

```typescript
// ✅ 올바른 패턴
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// ❌ 금지 — 하드코딩
const ai = new GoogleGenAI({ apiKey: 'AIzaSy...' });
```

---

## 3. 오류 처리 및 사용자 피드백

```typescript
// ✅ 올바른 패턴
try {
  setIsGenerating(true);
  // ... generation logic
} catch (err) {
  alert('생성 실패: ' + String(err)); // 사용자에게 노출
  console.warn('[Generate] Failed:', err);
} finally {
  setIsGenerating(false); // 항상 해제
}

// ❌ 금지 — silent failure
try { /* ... */ } catch {}
```

---

## 4. 이미지 업로드 검증

```typescript
// ✅ 올바른 패턴
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
if (!ALLOWED_TYPES.includes(file.type)) return;
if (file.size > MAX_SIZE) return;

// ❌ 금지 — 검증 없음
const reader = new FileReader();
reader.readAsDataURL(file);
```

---

## 5. Protocol 프롬프트 구성

```typescript
// ✅ 올바른 패턴 — TRANSFORMATION DIRECTIVE 포함 (rightSide)
finalPrompt = `## TRANSFORMATION DIRECTIVE
* **SOURCE**: Original image — [${analyzedOpticalParams?.angle ?? 'N/A'} ...]
* **TARGET**: ${rightSideDirection} — Flat Side Elevation
* ⚠️ DO NOT return or replicate the source image.
...
[GENERATE IMAGE NOW]`;

// ❌ 금지 — 변환 지시 없음
finalPrompt = `Generate a side view.`;
```

---

## 6. JSON 응답 파싱

```typescript
// ✅ 올바른 패턴
const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
const jsonMatch = rawText.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('No JSON in response');
const parsed = JSON.parse(jsonMatch[0]);

// ❌ 금지 — 방어 코드 없음
const parsed = JSON.parse(response.text);
```

---

## 7. 모델 상수 관리

```typescript
// ✅ 올바른 패턴 — constants.ts에서 import
import { ANALYSIS, IMAGE_GEN, ANALYSIS_FALLBACK, IMAGE_GEN_FALLBACK } from './constants';

// ❌ 금지 — 인라인 하드코딩
const response = await ai.models.generateContent({ model: 'gemini-3.1-flash-image-preview', ... });
```
