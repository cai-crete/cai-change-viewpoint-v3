# active-v10-migrate-to-onedrive

## 목표
현재 Google Drive 경로의 Vite 프로젝트를 OneDrive 경로로 복사 후 해당 위치에서 작업 계속

## 소스 경로
`g:\내 드라이브\CAI\Project-10\N09-change-viewpoint\N09-change-viewpoint\`

## 대상 경로
`D:\OneDrive\바탕 화면\CRETE\N09-change-viewpoint\`

## 복사 제외 목록
- `node_modules/` (용량 크고 npm install로 재생성 가능)
- `node_modules_old_corrupted/` (불필요)

## 단계별 체크리스트
- [x] exec-plan 생성
- [ ] 대상 경로 존재 여부 확인
- [ ] robocopy로 파일 복사 (node_modules 제외)
- [ ] .env.local 별도 복사 확인 (숨김파일)
- [ ] progress.txt 업데이트

## 참조
- 이전 작업: active-v9-N09-node-app-implementation.md
