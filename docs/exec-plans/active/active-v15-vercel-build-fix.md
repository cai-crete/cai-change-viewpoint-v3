# active-v15: Vercel 빌드 오류 수정

## 문제
Vercel 배포 실패: `Command "n/a build" exited with 1`

### 원인
- git repo 루트(`/`)에 `package.json` 없음
- 실제 Vite/React 프로젝트는 `N09-change-viewpoint/` 서브디렉토리에 위치
- Vercel이 루트에서 프레임워크를 감지 못해 "n/a"로 인식 → 빌드 실패

## 해결책
repo 루트에 `vercel.json` 생성:
- `buildCommand`: `N09-change-viewpoint/` 디렉토리 내 빌드 실행
- `outputDirectory`: `N09-change-viewpoint/dist`
- `installCommand`: `N09-change-viewpoint/` 내 의존성 설치

## 체크리스트
- [x] exec-plan 생성
- [ ] `vercel.json` 생성 (repo 루트)
- [ ] git commit & push
- [ ] Vercel 재배포 확인
- [ ] claude-progress.txt 업데이트
