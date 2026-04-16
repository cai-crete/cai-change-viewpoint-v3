# active-v9-N09-node-app-implementation

## 목표
N09 Node App 기능 구현 (Vite + React + Gemini SDK)

## 확정 사항
- 프레임워크: Vite + React (Next.js 아님) → Gemini SDK 브라우저 직접 호출
- API 키 환경변수: `VITE_GEMINI_API_KEY` (.env.local)
- side_direction 매핑: `"03:00"` → `RIGHT-VIEW.txt` / `"09:00"` → `LEFT-VIEW.txt`
- Knowledge Doc 선택: viewpoint_type + side_direction으로 프론트에서 결정 후 buildSystemPrompt에 주입
- Gemini 호출 2단계: Call 1 (텍스트 분석·프롬프트 생성) → Call 2 (이미지 생성)

## Knowledge Doc 라우팅 테이블
| viewpoint_type | side_direction | Knowledge Doc |
|----------------|----------------|---------------|
| eye-level      | —              | EYE-LEVEL-VIEW.txt |
| front          | —              | FRONT-VIEW.txt |
| bird-eye       | —              | BIRD-EYE-VIEW.txt |
| side           | 03:00          | RIGHT-VIEW.txt |
| side           | 09:00          | LEFT-VIEW.txt |
| top            | —              | TOP-VIEW.txt |

## 구현 파일 목록
| 파일 | 역할 |
|------|------|
| `.env.local` | VITE_GEMINI_API_KEY 설정 |
| `src/lib/prompt.ts` | buildSystemPrompt(), selectKnowledgeDoc() |
| `src/lib/compliance.ts` | runComplianceCheck() — 콘솔 전용 |
| `src/lib/gemini.ts` | callAnalysis(), callImageGeneration() |
| `src/App.tsx` | UI 전체 (업로드, 선택, 결과 표시) |

## Gemini 호출 구조
```
Call 1 — 분석 + Room 0-3 실행 (텍스트)
  model: gemini-3.1-pro-preview
  system: buildSystemPrompt(protocol, knowledgeDoc)
  user: 원본 이미지(base64) + viewpoint 요청
  output: Room 3 최종 마크다운 프롬프트 + room_0_locked_dna

Call 2 — 이미지 생성
  model: gemini-3.1-flash-image-preview
  config: responseModalities: ["TEXT", "IMAGE"]
  user: Call 1의 Room 3 프롬프트 + 원본 이미지
  output: 생성 이미지 (base64)
```

## UI 요구사항
- 이미지 업로드 (drag & drop 또는 file input)
- viewpoint_type 선택 5종: eye-level / front / bird-eye / side / top
- side_direction 조건부 표시: viewpoint_type === "side" 일 때만
  - "03:00" (우측면) / "09:00" (좌측면)
- 생성 결과: 원본 이미지 우측 인접 배치, 동일 높이, 비율 유지 폭
- 로딩 상태 표시

## 단계별 체크리스트
- [x] exec-plan 생성
- [x] .env.local 생성 (VITE_GEMINI_API_KEY)
- [x] src/vite-env.d.ts 생성 (ImportMetaEnv 타입 선언)
- [x] src/types.ts 생성 (ViewType, CanvasItem)
- [x] src/constants.ts 생성 (ANALYSIS, IMAGE_GEN 모델명)
- [x] src/lib/prompt.ts — buildSystemPrompt(), selectKnowledgeDoc(), buildViewpointSystemPrompt()
- [x] src/lib/compliance.ts — runComplianceCheck()
- [x] src/lib/gemini.ts — callAnalysis(), callImageGeneration()
- [x] src/App.tsx — 무한 grid 캔버스 + 모든 컴포넌트 연결 + Gemini 2-call + IndexedDB
- [x] tailwind.config.js 생성 (darkMode: 'class', fontFamily.display: Bebas Neue)
- [x] postcss.config.js 생성
- [x] src/index.css 교체 (Tailwind directives + 전체 뷰포트 리셋)
- [x] src/App.css 초기화
- [x] package.json 업데이트 (lucide-react, tailwindcss, postcss, autoprefixer 추가)
- [x] index.html — Bebas Neue Google Fonts 링크 추가
- [ ] npm install 실행 (사용자가 Windows 터미널에서 직접)
- [ ] 동작 확인 후 loop-b-handoff 작성

## 참조
- product-spec: `docs/product-specs/N09-change-viewpoint.md`
- protocol: `N09-change-viewpoint/_context/protocol/protocol-change-viewpoint-v1.txt`
- ARCHITECTURE.md
