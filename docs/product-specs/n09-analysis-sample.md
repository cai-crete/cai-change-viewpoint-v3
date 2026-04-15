# N09 — #.정보분석샘플 (Phase 1 출력 템플릿)

> Phase 1 `analyzeViewpoint()` 실행 시 Gemini가 반환하는 분석 결과의 표준 포맷 및 예시 샘플.
> 이 파일은 품질 기준 판단 및 새 Protocol 검증 시 참조 기준으로 사용합니다.

---

### **1. 광학 및 시점 파라미터 (Optical & Viewpoint Data)**

입력된 이미지의 카메라 위치 및 촬영 환경을 수치화된 데이터로 변환한 값입니다.

| 변수 (Variable) | 구조화 데이터 (Value) |
| :--- | :--- |
| **촬영 시점 (Viewpoint)** | 하이 앵글 코너 뷰 (부분 조감도) |
| **방위각 (Azimuth)** | 04:30 방향 (건물 정면 06:00 기준) |
| **촬영 고도 (Altitude)** | 100m ~ 150m (교차로 상공) |
| **투시 왜곡 (Perspective)** | 2점 투시 (수직선 평행 유지) |
| **센서 포맷 (Sensor)** | 중형 포맷 (Medium Format) |
| **초점 거리 (Focal Length)** | 45mm ~ 50mm (표준 화각) |
| **광원 및 날씨 (Lighting)** | 확산광 (Overcast), 옅은 안개 |
| **대비 강도 (Contrast)** | 낮음 (부드러운 그림자) |

---

### **2. 기하학 및 공간 구조 명세 (Geometric & Spatial Specifications)**

건축물의 매스와 파사드 구성을 층위별 시스템 구조로 분해한 데이터입니다.

| 시스템 분류 | 구조 및 형태 사양 |
| :--- | :--- |
| **외피 시스템 (Skin)** | 이중 외피 구조 (Double-skin facade) |
| **내부 파사드 (Inner)** | 평활형 유리 커튼월 (Glass Curtain Wall) |
| **외부 파사드 (Outer)** | 유체역학적 3D 곡선 패턴의 수평 파라메트릭 루버 |
| **기본 매스 (Mass)** | 견고한 직육면체 매스 (Solid Glass Box) |
| **하층부 (1F Base)** | 필로티 구조, 독립 노출 기둥 배치 |
| **중층부 (Mid Body)** | 코너부 V자 형태 오픈 발코니 (보이드 공간) |
| **상층부 (Roof)** | 평지붕, 중앙 기계설비(MEP) 박스, 루버 연장형 파라펫 |

---

### **3. 개념 및 시각적 속성 (Conceptual & Visual Attributes)**

디자인 방법론과 감성적 품질을 측정 가능한 시각적 키워드 세트로 추출한 결과입니다.

| 속성 분류 | 데이터 지표 |
| :--- | :--- |
| **디자인 알고리즘** | 파라메트릭 디자인 (Parametricism) |
| **주조색 (Color Palette)** | 무채색 (밝은 회색), 투명 (유리) |
| **형태 모티브 (Motif)** | 무형의 에너지 (바람, 파동, 데이터 흐름) |
| **형태적 대비 (Form)** | 도심의 직교 체계 ↔ 파사드의 유기적 곡선 |
| **감성적 대비 (Mood)** | 하이테크/미래지향적 특성 ↔ 시각적 우아함 |

---

## 활용 기준

- **컴플라이언스 체크:** 실제 분석 출력이 위 3섹션 구조를 완전히 포함하는지 확인
- **PCS 채점:** 누락 필드가 있을 경우 Boundary Resolution 실패로 판정
- **Fallback 기준:** JSON 파싱 실패 또는 `angle` 필드 없음 → Fallback 모델 재시도

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`