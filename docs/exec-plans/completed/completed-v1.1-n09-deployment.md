# N09 Change Viewpoint — v1.1 배포 완료 기록

**날짜:** 2026-04-15  
**버전:** v1.1  
**Loop B 결과:** PASS (Iter 2 — DEPLOYMENT APPROVED)

---

## 배포 산출물

| 파일 | 설명 |
|------|------|
| `cai-change-viewpoint-v2/src/App.tsx` | 핵심 구현 (HIGH 5건 수정 + 이미지 자동 리사이즈) |
| `cai-change-viewpoint-v2/public/protocols/n09-protocol-side-view.md` | Protocol v1.1 (Pre-Step 추가, Prompt JSON 제거) |
| `docs/references/n09-protocol-side-view.md` | 위 파일 동기화 사본 |

## v1.1 변경 내역 요약

| 카테고리 | 변경 내용 |
|----------|----------|
| Protocol (Layer B) | Pre-Step 5개 항목 추가 (Pre-flight ↔ Pre-Step 정합 완성) |
| Protocol (Layer B) | Prompt JSON 중복 블록 제거 (CHECK 2 PASS) |
| Code (Layer D) | `finalPrompt` null/empty guard 추가 |
| Code (Layer D) | 이미지 타입 코드 레벨 검증 (JPEG/PNG/WebP) |
| Code (Layer D) | `withTimeout()` helper — 분석 30s / 생성 60s 분리 |
| Code (Layer D) | `generatingElapsed` UI — 생성 경과 시간 실시간 표시 |
| Code (Layer D) | `resizeImageIfNeeded()` — 10MB 초과 이미지 Canvas 자동 리사이즈 |

## Loop B 검증 결과

| 체크 | 결과 |
|------|------|
| V1 Loop A (4 checks) | PASS |
| V2 PCS | 100 / 100 |
| V2 4개 품질 차원 | 전체 PASS |
| V3 API Route / Security | PASS |
| V3.5 Blocking findings | 0건 |
| V4 Stage B Simulation | 3/3 PASS |

보고서: `docs/exec-plans/verification/loop-b-report-n09-2026-04-15-iter2.md`

## 잔존 MID (배포 차단 아님)

- `runGeneration` 타임아웃 60s (RELIABILITY.md 30s 기준 의도적 이탈 — 이미지 생성 특성)
- 재시도 지수 백오프 미구현 (클라이언트 전용 아키텍처 특성)

## 배포 방법

```bash
cd cai-change-viewpoint-v2
npm run build
# dist/ 폴더를 정적 호스팅 서버에 업로드
```

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
