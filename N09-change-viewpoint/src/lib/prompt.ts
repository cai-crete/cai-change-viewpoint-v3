import protocolText from '../../_context/protocol/protocol-change-viewpoint-v1.txt?raw'
import eyeLevelView from '../../_context/protocol/EYE-LEVEL-VIEW.txt?raw'
import frontView from '../../_context/protocol/FRONT-VIEW.txt?raw'
import birdEyeView from '../../_context/protocol/BIRD-EYE-VIEW.txt?raw'
import rightView from '../../_context/protocol/RIGHT-VIEW.txt?raw'
import leftView from '../../_context/protocol/LEFT-VIEW.txt?raw'
import topView from '../../_context/protocol/TOP-VIEW.txt?raw'

export type ViewpointType = 'eye-level' | 'front' | 'bird-eye' | 'side' | 'top'
export type SideDirection = '03:00' | '09:00'

// Knowledge Doc 라우팅 테이블
// side + "03:00" → RIGHT-VIEW.txt (우측면)
// side + "09:00" → LEFT-VIEW.txt  (좌측면)
const KNOWLEDGE_DOC_MAP: Record<string, string> = {
  'eye-level':  eyeLevelView,
  'front':      frontView,
  'bird-eye':   birdEyeView,
  'side:03:00': rightView,
  'side:09:00': leftView,
  'top':        topView,
}

export function selectKnowledgeDoc(
  viewpointType: ViewpointType,
  sideDirection?: SideDirection
): string {
  const key = viewpointType === 'side'
    ? `side:${sideDirection ?? '03:00'}`
    : viewpointType
  return KNOWLEDGE_DOC_MAP[key] ?? ''
}

// ARCHITECTURE.md §5 핵심 함수
// [Protocol]\n\n---\n\n[Knowledge Doc 1]\n\n---\n\n...
export function buildSystemPrompt(
  principleProtocol: string,
  knowledgeDocs: string[] = []
): string {
  return [principleProtocol, ...knowledgeDocs].join('\n\n---\n\n')
}

// 편의 래퍼: viewpointType + sideDirection으로 시스템 프롬프트 조합
export function buildViewpointSystemPrompt(
  viewpointType: ViewpointType,
  sideDirection?: SideDirection
): string {
  const knowledgeDoc = selectKnowledgeDoc(viewpointType, sideDirection)
  return buildSystemPrompt(protocolText, [knowledgeDoc])
}

// Room 0 전용: 시점 정보 없이 프로토콜만으로 DNA 추출
export function buildRoom0SystemPrompt(): string {
  return buildSystemPrompt(protocolText, [])
}
