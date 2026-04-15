# FRONTEND.md — 프론트엔드 개발 가이드

---

## 기술 스택

| 레이어 | 표준 |
|--------|------|
| Framework | Vite + React |
| Styling | Tailwind CSS |
| Language | TypeScript |
| AI Library | `@google/genai` (GoogleGenAI) |
| Icons | `lucide-react` |
| Persistence | IndexedDB (브라우저 내장, 백엔드 없음) |
| Package Manager | npm |

> ⚠️ N09 노드는 Next.js를 사용하지 않습니다. 백엔드 API Route 없이 클라이언트 사이드에서 Gemini를 직접 호출합니다.

---

## 프로젝트 구조 (N09 기준)

```
cai-change-viewpoint-v2/
├── src/
│   ├── App.tsx          ← 전체 앱 (캔버스 + AI 로직 + UI)
│   ├── constants.ts     ← AI 모델 상수
│   ├── main.tsx         ← 엔트리포인트
│   └── vite-env.d.ts
├── public/
├── .env.local           ← VITE_GEMINI_API_KEY (gitignore 필수)
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 환경 변수

```
# .env.local
VITE_GEMINI_API_KEY=AIza...
```

접근 방식: `import.meta.env.VITE_GEMINI_API_KEY`

---

## AI 호출 패턴 (N09 표준)

```typescript
import { GoogleGenAI } from '@google/genai';
import { ANALYSIS, IMAGE_GEN, ANALYSIS_FALLBACK, IMAGE_GEN_FALLBACK } from './constants';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// 텍스트 분석 (JSON 반환)
const result = await ai.models.generateContent({
  model: ANALYSIS,
  contents: {
    parts: [
      { inlineData: { data: base64Data, mimeType: mimeType } },
      { text: analysisPrompt },
    ],
  },
});

// 이미지 생성
const response = await ai.models.generateContent({
  model: IMAGE_GEN,
  contents: { parts: [
    { inlineData: { data: base64Data, mimeType: mimeType } },
    { text: generationPrompt },
  ]},
});

// 이미지 추출
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    // ... 사용
  }
}
```

---

## AI 모델 상수 (`src/constants.ts`)

```typescript
export const ANALYSIS      = 'gemini-3.1-pro-preview';
export const IMAGE_GEN     = 'gemini-3.1-flash-image-preview';
export const ANALYSIS_FALLBACK  = 'gemini-2.5-pro';
export const IMAGE_GEN_FALLBACK = 'gemini-2.5-flash-image';
```

---

## Fallback 패턴

```typescript
const run = async (modelName: string) => {
  // ... API 호출
};

try {
  await run(PRIMARY_MODEL);
} catch (primaryError) {
  console.warn(`Primary failed, retrying with fallback...`, primaryError);
  await run(FALLBACK_MODEL);
}
```

---

## IndexedDB 영속성 패턴

```typescript
// 자동 저장 (800ms 디바운스)
useEffect(() => {
  if (!dbLoaded) return;
  const timer = setTimeout(() => {
    dbSave({ canvasItems, canvasZoom, canvasOffset });
  }, 800);
  return () => clearTimeout(timer);
}, [canvasItems, canvasZoom, canvasOffset, dbLoaded]);

// 마운트 시 복원
useEffect(() => {
  dbLoad().then((saved) => {
    if (saved?.canvasItems) setCanvasItems(saved.canvasItems);
    setDbLoaded(true);
  });
}, []);
```

---

## 코딩 원칙

- 프롬프트 내용은 `App.tsx` 내 해당 함수(`analyzeViewpoint`, `handleGenerate`)에서만 관리
- `system` 파라미터 없음 — Gemini는 `contents.parts`로 지시
- API Key는 `.env.local`에만 존재, 코드에 하드코딩 금지
- 이미지 업로드: `accept="image/*"`, base64 변환 후 처리
- 에러 응답은 사용자에게 alert로 명확히 표시

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
