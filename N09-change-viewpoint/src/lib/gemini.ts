// lib/gemini.ts
// Gemini API 호출 레이어 — ARCHITECTURE.md §3 레이어 경계 규칙 준수
// Call 1: gemini-3.1-pro-preview  — Room 0-3 실행 (분석 + 프롬프트 생성)
// Call 2: gemini-3.1-flash-image-preview — 이미지 생성

import { GoogleGenAI } from '@google/genai'
import type { ViewpointType, SideDirection } from './prompt'
import { buildRoom0SystemPrompt, buildViewpointSystemPrompt } from './prompt'

export type CameraAngle = '04:30' | '07:30'

const ANALYSIS_MODEL = 'gemini-3.1-pro-preview'
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview'

// Knowledge Doc 공식 명칭 맵 — userText에 Gemini가 인식하는 정확한 명칭 전달
const VIEWPOINT_LABEL: Record<string, string> = {
  'bird-eye':        "Bird's-eye Perspective View",
  'bird-eye:04:30':  "Bird's-eye Perspective View (04:30)",
  'bird-eye:07:30':  "Bird's-eye Perspective View (07:30)",
  'eye-level':       "Eye-Level Corner View",
  'eye-level:04:30': "Eye-Level Corner View (04:30)",
  'eye-level:07:30': "Eye-Level Corner View (07:30)",
  'front':           "Front Elevation View",
  'side:03:00':      "Right Elevation View",
  'side:09:00':      "Left Elevation View",
  'top':             "Orthographic TOP View",
}

export function getViewpointLabel(
  viewpointType: ViewpointType,
  sideDirection?: SideDirection,
  cameraAngle?: CameraAngle
): string {
  let key: string = viewpointType
  if (viewpointType === 'side') {
    key = `side:${sideDirection ?? '03:00'}`
  } else if ((viewpointType === 'bird-eye' || viewpointType === 'eye-level') && cameraAngle) {
    key = `${viewpointType}:${cameraAngle}`
  }
  return VIEWPOINT_LABEL[key] ?? viewpointType
}

function getAI(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.')
  return new GoogleGenAI({ apiKey })
}

function parseMimeType(base64: string): string {
  const match = base64.match(/^data:([^;]+);base64,/)
  return match ? match[1] : 'image/jpeg'
}

function parseBase64Data(base64: string): string {
  return base64.includes(',') ? base64.split(',')[1] : base64
}

/** base64 데이터 크기를 KB 단위로 반환 */
function estimateSizeKB(base64: string): string {
  const raw = base64.includes(',') ? base64.split(',')[1] : base64
  return ((raw.length * 0.75) / 1024).toFixed(1)
}

/** JSON 코드블록에서 JSON 객체를 추출 */
function extractJsonFromCodeBlock(text: string): Record<string, unknown> | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) } catch { return null }
}

/** LOCKED_DNA 요약 출력 (Room 0 결과 콘솔 미리보기) */
function logLockedDnaSummary(text: string): void {
  const parsed = extractJsonFromCodeBlock(text)
  if (parsed) {
    const dna = (parsed['LOCKED_DNA'] ?? parsed) as Record<string, unknown>
    const geo = dna['geometric_specs'] as Record<string, unknown> | undefined
    const concept = dna['conceptual_attributes'] as Record<string, unknown> | undefined
    console.log('%c[N09] LOCKED_DNA 요약:', 'color: #22c55e; font-weight: bold')
    if (geo) {
      console.log('  geometric_specs:')
      Object.entries(geo).forEach(([k, v]) => console.log(`    ${k}:`, v))
    }
    if (concept) {
      console.log('  conceptual_attributes:')
      Object.entries(concept).forEach(([k, v]) => console.log(`    ${k}:`, v))
    }
    console.log('  raw JSON:', parsed)
  } else {
    // JSON 파싱 실패 시 텍스트 앞 400자 출력
    console.log('%c[N09] Room 0 출력 (미리보기):', 'color: #22c55e')
    console.log(text.slice(0, 400) + (text.length > 400 ? '\n  ...(truncated)' : ''))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Call 1a — MWRS Room 0 전용
// 시스템 프롬프트: protocol only (Knowledge Doc 없음, 시점 정보 불필요)
// 출력: LOCKED_DNA JSON (Room 0 Completion Report)
// ─────────────────────────────────────────────────────────────────────────────
export async function callRoom0Analysis(imageBase64: string): Promise<string> {
  const ai = getAI()
  const systemPrompt = buildRoom0SystemPrompt()
  const mimeType = parseMimeType(imageBase64)
  const imageData = parseBase64Data(imageBase64)
  const sizeKB = estimateSizeKB(imageBase64)

  // ── ROOM 0 시작 로그 ─────────────────────────────────────────────────────
  console.groupCollapsed(
    `%c[N09] ▶ ROOM 0: Image Analysis  |  ${mimeType}  ${sizeKB} KB`,
    'color: #60a5fa; font-weight: bold'
  )
  console.log('Model :', ANALYSIS_MODEL)
  console.log('Image :', `${mimeType} / ${sizeKB} KB`)
  console.log('System prompt length :', systemPrompt.length, 'chars')
  const t0 = performance.now()

  const userText = [
    'Please analyze this architectural image.',
    'Execute Room 0 (Image Analysis Room) ONLY.',
    'Extract LOCKED_DNA: geometric_specs (skin_system, mass, roof_level) and conceptual_attributes (color_palette, materiality).',
    'Output the Room 0 Completion Report as a JSON code block.',
    'Do NOT execute Room 1, Room 2, or Room 3.',
  ].join('\n')

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      config: { systemInstruction: systemPrompt },
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageData } },
          { text: userText },
        ],
      }],
    })

    const text = response.text ?? ''
    const elapsed = (performance.now() - t0).toFixed(0)

    console.log(`%c[N09] ✔ ROOM 0: COMPLETE  (${elapsed} ms)`, 'color: #22c55e; font-weight: bold')
    console.log('Output length :', text.length, 'chars')
    logLockedDnaSummary(text)
    console.groupEnd()
    return text

  } catch (err) {
    const elapsed = (performance.now() - t0).toFixed(0)
    console.error(`%c[N09] ✘ ROOM 0: ERROR  (${elapsed} ms)`, 'color: #ef4444; font-weight: bold')
    console.error('Error details:', err)
    console.groupEnd()
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Call 1b — MWRS Room 1~3 실행
// 시스템 프롬프트: protocol + Knowledge Doc (시점별)
// 입력: Room 0에서 추출한 lockedDna + 원본 이미지 + 시점 정보
// 출력: Room 1~3 완료 보고서 + Room 3 최종 마크다운 프롬프트
// ─────────────────────────────────────────────────────────────────────────────
export async function callAnalysis(
  imageBase64: string,
  viewpointType: ViewpointType,
  sideDirection?: SideDirection,
  lockedDna?: string,
  cameraAngle?: CameraAngle
): Promise<string> {
  const ai = getAI()
  const systemPrompt = buildViewpointSystemPrompt(viewpointType, sideDirection)
  const mimeType = parseMimeType(imageBase64)
  const imageData = parseBase64Data(imageBase64)
  const sizeKB = estimateSizeKB(imageBase64)

  const viewpointLabel = getViewpointLabel(viewpointType, sideDirection, cameraAngle)

  const dnaBlock = lockedDna
    ? `\n\n--- LOCKED_DNA from Room 0 ---\n${lockedDna}\n---`
    : ''

  // ── ROOM 1~3 시작 로그 ────────────────────────────────────────────────────
  console.groupCollapsed(
    `%c[N09] ▶ ROOM 1→2→3: Viewpoint Analysis  |  ${viewpointLabel}`,
    'color: #a78bfa; font-weight: bold'
  )
  console.log('Model          :', ANALYSIS_MODEL)
  console.log('Viewpoint label:', viewpointLabel)
  if (cameraAngle) console.log('Camera angle   :', cameraAngle)
  console.log('Image          :', `${mimeType} / ${sizeKB} KB`)
  console.log('lockedDna      :', lockedDna ? `present (${lockedDna.length} chars)` : 'NOT PROVIDED — Room 0 미실행 상태')
  if (!lockedDna) console.warn('[N09] lockedDna 없음 — ANALYZE를 먼저 실행하세요.')
  console.log('System prompt length :', systemPrompt.length, 'chars')
  const t0 = performance.now()

  const userText = [
    'Please perform the viewpoint change protocol for this architectural image.',
    `Target viewpoint: ${viewpointLabel}`,
    cameraAngle ? `Camera angle: ${cameraAngle}` : '',
    dnaBlock,
    'Execute Room 1 → Room 2 → Room 3 in sequence.',
    'Complete all Completion Reports and output the final Room 3 markdown prompt for image generation.',
  ].filter(Boolean).join('\n')

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      config: { systemInstruction: systemPrompt },
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageData } },
          { text: userText },
        ],
      }],
    })

    const text = response.text ?? ''
    const elapsed = (performance.now() - t0).toFixed(0)

    console.log(`%c[N09] ✔ ROOM 1→2→3: COMPLETE  (${elapsed} ms)`, 'color: #22c55e; font-weight: bold')
    console.log('Output length :', text.length, 'chars')
    console.log('%c[N09] Room 1→2→3 출력 미리보기 (앞 600자):', 'color: #a78bfa')
    console.log(text.slice(0, 600) + (text.length > 600 ? '\n...(truncated)' : ''))
    console.log('%c[N09] Full analysis output:', 'color: #a78bfa', text)
    console.groupEnd()
    return text

  } catch (err) {
    const elapsed = (performance.now() - t0).toFixed(0)
    console.error(`%c[N09] ✘ ROOM 1→2→3: ERROR  (${elapsed} ms)`, 'color: #ef4444; font-weight: bold')
    console.error('Error details:', err)
    console.groupEnd()
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Call 2 — 이미지 생성
// Room 3의 최종 마크다운 프롬프트 + 원본 이미지로 시점 변환 이미지 생성
// ─────────────────────────────────────────────────────────────────────────────
export async function callImageGeneration(
  analysisText: string,
  originalImageBase64: string
): Promise<string> {
  const ai = getAI()
  const mimeType = parseMimeType(originalImageBase64)
  const imageData = parseBase64Data(originalImageBase64)
  const sizeKB = estimateSizeKB(originalImageBase64)

  // ── IMAGE GENERATION 시작 로그 ────────────────────────────────────────────
  console.groupCollapsed(
    `%c[N09] ▶ IMAGE GENERATION  |  ${IMAGE_MODEL}`,
    'color: #fb923c; font-weight: bold'
  )
  console.log('Model           :', IMAGE_MODEL)
  console.log('Original image  :', `${mimeType} / ${sizeKB} KB`)
  console.log('Analysis input  :', analysisText.length, 'chars')
  const t0 = performance.now()

  const userText = [
    'Based on the following MWRS analysis and Room 3 final prompt, generate the viewpoint-changed architectural image.',
    'Apply the GEOMETRIC LOCK COMMAND strictly — do not alter the building geometry, proportions, or materials.',
    '',
    '--- MWRS Analysis Output ---',
    analysisText,
  ].join('\n')

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageData } },
          { text: userText },
        ],
      }],
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      if (part.inlineData?.data) {
        const outMime = part.inlineData.mimeType ?? 'image/png'
        const outSizeKB = ((part.inlineData.data.length * 0.75) / 1024).toFixed(1)
        const elapsed = (performance.now() - t0).toFixed(0)

        console.log(`%c[N09] ✔ IMAGE GENERATION: COMPLETE  (${elapsed} ms)`, 'color: #22c55e; font-weight: bold')
        console.log('Output image :', `${outMime} / ${outSizeKB} KB`)
        console.groupEnd()
        return `data:${outMime};base64,${part.inlineData.data}`
      }
    }

    // 이미지 없음 — 텍스트 응답만 있는 경우
    const elapsed = (performance.now() - t0).toFixed(0)
    const textParts = parts.filter(p => p.text).map(p => p.text).join('\n')
    console.error(`%c[N09] ✘ IMAGE GENERATION: 이미지 없음  (${elapsed} ms)`, 'color: #ef4444; font-weight: bold')
    console.error('[N09] 텍스트 응답만 반환됨:', textParts.slice(0, 400))
    console.groupEnd()
    throw new Error('이미지 생성 실패: 응답에 이미지 데이터가 없습니다.\n텍스트 응답: ' + textParts.slice(0, 200))

  } catch (err) {
    if (!(err instanceof Error) || !err.message.startsWith('이미지 생성 실패')) {
      const elapsed = (performance.now() - t0).toFixed(0)
      console.error(`%c[N09] ✘ IMAGE GENERATION: ERROR  (${elapsed} ms)`, 'color: #ef4444; font-weight: bold')
      console.error('Error details:', err)
      console.groupEnd()
    }
    throw err
  }
}
