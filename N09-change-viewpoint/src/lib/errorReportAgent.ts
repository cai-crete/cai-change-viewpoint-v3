// lib/errorReportAgent.ts
// N09 오류 보고서 AGENT
// 역할: Room 실행 중 오류 발생 시 마크다운 보고서를 생성하고
//       - (1) 개발 서버에서는 POST /api/save-error-report 로 파일 저장
//       - (2) 서버 미응답 시 브라우저 다운로드로 fallback
//       - (3) 항상 콘솔에 전체 보고서 출력

// ── 타입 ──────────────────────────────────────────────────────────────────────
export interface ErrorReportContext {
  /** 오류가 발생한 Room 레이블 */
  room: 'ROOM_0' | 'ROOM_1_3' | 'IMAGE_GENERATION' | 'COMPLIANCE' | string
  /** 오류가 발생한 함수명 */
  fn: string
  /** 오류 객체 */
  error: unknown
  /** 입력 컨텍스트 — Room에서 사용된 파라미터 요약 */
  inputContext: Record<string, string>
  /** 오류 발생 전 수집한 중간 출력 (선택) */
  partialOutput?: string
}

// ── 포맷터 ────────────────────────────────────────────────────────────────────
function formatError(err: unknown): { message: string; stack: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? '(no stack)' }
  }
  return { message: String(err), stack: '(no stack — non-Error thrown)' }
}

function formatReport(ctx: ErrorReportContext): string {
  const now = new Date()
  const isoDate = now.toISOString()
  const localDate = now.toLocaleString('ko-KR')
  const { message, stack } = formatError(ctx.error)

  const inputLines = Object.entries(ctx.inputContext)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n')

  const partialSection = ctx.partialOutput
    ? `\n## 중간 출력 (오류 직전)\n\`\`\`\n${ctx.partialOutput.slice(0, 800)}${ctx.partialOutput.length > 800 ? '\n...(truncated)' : ''}\n\`\`\`\n`
    : ''

  return `# N09 Error Report

**생성 시각**: ${localDate} (UTC: ${isoDate})
**세션**: N09-change-viewpoint
**Room**: ${ctx.room}
**함수**: \`${ctx.fn}\`

## 오류 메시지

\`\`\`
${message}
\`\`\`

## Stack Trace

\`\`\`
${stack}
\`\`\`

## 입력 컨텍스트

${inputLines || '(없음)'}
${partialSection}
## 확인 포인트

- [ ] API 키 설정 확인 (.env.local → VITE_GEMINI_API_KEY)
- [ ] 이미지 형식 확인 (JPEG/PNG/WEBP 권장)
- [ ] 네트워크 연결 확인
- [ ] Gemini 모델 이름 확인 (gemini-3.1-pro-preview / gemini-3.1-flash-image-preview)
- [ ] Room 0 실행 여부 확인 (GENERATE 전에 ANALYZE 필요)
- [ ] lockedDna 유효성 확인 (JSON 형식)
`
}

// ── 파일명 생성 ───────────────────────────────────────────────────────────────
function buildFilename(room: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const slug = room.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `error-${slug}-${ts}.md`
}

// ── 저장 로직 ─────────────────────────────────────────────────────────────────
async function trySaveToServer(filename: string, content: string): Promise<boolean> {
  try {
    const res = await fetch('/api/save-error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content }),
    })
    if (!res.ok) return false
    const json = await res.json() as { ok: boolean; path?: string }
    if (json.ok) {
      console.info(`%c[N09] Error report saved → ${json.path}`, 'color: #22c55e')
      return true
    }
    return false
  } catch {
    return false
  }
}

function downloadReport(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  console.info(`%c[N09] Error report downloaded: ${filename}`, 'color: #facc15')
}

// ── 공개 API ──────────────────────────────────────────────────────────────────
/**
 * 오류 보고서를 생성하고 저장합니다.
 * - 개발 서버 실행 중: docs/exec-plans/report/ 에 마크다운 파일 저장
 * - 서버 미응답: 브라우저에서 파일 다운로드
 * - 항상 콘솔에 전체 보고서 출력
 */
export async function saveErrorReport(ctx: ErrorReportContext): Promise<void> {
  const filename = buildFilename(ctx.room)
  const content = formatReport(ctx)

  // 콘솔에 전체 보고서 출력 (항상)
  console.groupCollapsed(
    `%c[N09] ⚠ ERROR REPORT — ${ctx.room} (${ctx.fn})`,
    'color: #ef4444; font-weight: bold; font-size: 13px'
  )
  console.error('[N09] Error:', formatError(ctx.error).message)
  console.log('[N09] Full report:\n\n' + content)
  console.groupEnd()

  // 저장 시도
  const saved = await trySaveToServer(filename, content)
  if (!saved) {
    // fallback: 브라우저 다운로드
    downloadReport(filename, content)
  }
}
