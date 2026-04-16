# Exec Plan: Knowledge Docs 폐기 및 신규 프로토콜 파일 교체

## 목적
기존 knowledge-*.txt 5개 파일을 폐기하고, 사용자가 업로드한 6개 프로토콜 파일로 교체

## 변경 사항

### 삭제 대상 (5개)
- [ ] `_context/protocol/knowledge-bird-eye-view.txt`
- [ ] `_context/protocol/knowledge-eye-level-view.txt`
- [ ] `_context/protocol/knowledge-front-view.txt`
- [ ] `_context/protocol/knowledge-side-view.txt`
- [ ] `_context/protocol/knowledge-top-view.txt`

### 생성 대상 (6개) — 업로드된 파일 내용 그대로 적용
- [ ] `_context/protocol/BIRD-EYE-VIEW.txt`
- [ ] `_context/protocol/EYE-LEVEL-VIEW.txt`
- [ ] `_context/protocol/FRONT-VIEW.txt`
- [ ] `_context/protocol/LEFT-VIEW.txt`
- [ ] `_context/protocol/RIGHT-VIEW.txt`
- [ ] `_context/protocol/TOP-VIEW.txt`

## 제약 조건
- 프로토콜 내용 변경 없음 (업로드 내용 그대로 저장)
- `protocol-change-viewpoint-v1.txt` 수정 없음
