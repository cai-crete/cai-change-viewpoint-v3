// lib/compliance.ts
// COMPLIANCE CHECK — 코드 레이어 전용
// 프로토콜 포인터: protocol-change-viewpoint-v1.txt # COMPLIANCE CHECK 섹션
// 결과는 브라우저 콘솔에만 출력. API 응답/UI에 포함하지 않는다.

export interface ComplianceCheck {
  label: string
  passed: boolean
}

export interface ComplianceResult {
  passed: boolean
  checks: ComplianceCheck[]
}

// 시점별 검증 키워드 맵 — Knowledge Doc 공식 명칭 기반
const VIEWPOINT_KEYWORDS: Record<string, string[]> = {
  "Bird's-eye Perspective View":        ["bird's-eye", "bird's eye", "bird-eye", "aerial", "perspective view"],
  "Bird's-eye Perspective View (04:30)": ["bird's-eye", "bird's eye", "bird-eye", "aerial", "04:30"],
  "Bird's-eye Perspective View (07:30)": ["bird's-eye", "bird's eye", "bird-eye", "aerial", "07:30"],
  "Eye-Level Corner View":              ["eye-level", "eye level", "corner view"],
  "Eye-Level Corner View (04:30)":      ["eye-level", "eye level", "corner view", "04:30"],
  "Eye-Level Corner View (07:30)":      ["eye-level", "eye level", "corner view", "07:30"],
  "Front Elevation View":               ["front elevation", "front facade", "front view"],
  "Right Elevation View":               ["right elevation", "right facade", "right side"],
  "Left Elevation View":                ["left elevation", "left facade", "left side"],
  "Orthographic TOP View":              ["orthographic top", "top view", "top-down", "overhead"],
}

export function runComplianceCheck(
  analysisText: string,
  generatedImage: string | null,
  originalImage: string,
  viewpointLabel?: string
): ComplianceResult {
  const t = analysisText.toLowerCase()

  // VP-1: 요청 시점 키워드 포함 여부 (viewpointLabel 제공 시)
  const vpCheck: ComplianceCheck[] = viewpointLabel
    ? [{
        label: `VP-1 요청 시점 반영 확인 (${viewpointLabel})`,
        passed: (VIEWPOINT_KEYWORDS[viewpointLabel] ?? [viewpointLabel.toLowerCase()])
          .some(kw => t.includes(kw.toLowerCase())),
      }]
    : []

  const checks: ComplianceCheck[] = [
    ...vpCheck,
    // Protocol Compliance (PCS) — MWRS Room 실행 여부
    {
      label: 'PCS-1 Room 0 — LOCKED_DNA 추출',
      passed: t.includes('locked_dna') || t.includes('room_0') || t.includes('room 0'),
    },
    {
      label: 'PCS-2 Room 1 — matched_preset 식별',
      passed: t.includes('matched_preset') || t.includes('room_1') || t.includes('room 1'),
    },
    {
      label: 'PCS-3 Room 2 — Knowledge Doc 호출',
      passed: t.includes('room_2') || t.includes('room 2') || t.includes('optical_setup') || t.includes('optical setup'),
    },
    {
      label: 'PCS-4 Room 3 — GEOMETRIC LOCK COMMAND 포함',
      passed: analysisText.includes('GEOMETRIC LOCK COMMAND'),
    },
    // Immutable Constants
    {
      label: 'IC-1 Geometry — 기하학 변형 지시 없음',
      passed: !t.includes('alter the geometry') && !t.includes('change the shape'),
    },
    // Boundary Resolution
    {
      label: 'BR-1 이미지 생성됨 (빈 출력 없음)',
      passed: generatedImage !== null && generatedImage.length > 0,
    },
    {
      label: 'BR-2 원본 패스스루 없음',
      passed: generatedImage !== originalImage,
    },
  ]

  const passed = checks.every(c => c.passed)

  console.group(`[N09 COMPLIANCE CHECK]${viewpointLabel ? ` — ${viewpointLabel}` : ''}`)
  checks.forEach(c => {
    const icon = c.passed ? '✅' : '❌'
    console.log(`${icon} ${c.label}`)
  })
  console.log(`─── Overall: ${passed ? 'PASS' : 'FAIL'} ───`)
  console.groupEnd()

  return { passed, checks }
}
