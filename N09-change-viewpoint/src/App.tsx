// App.tsx — N09 Change Viewpoint Canvas App
// Infinite-grid canvas + Gemini two-call AI + IndexedDB persistence

import React, { useState, useRef, useEffect } from 'react'
import type { CanvasItem as CanvasItemType, ViewType } from './types'
import { callRoom0Analysis, callAnalysis, callImageGeneration, getViewpointLabel } from './lib/gemini'
import type { CameraAngle } from './lib/gemini'
import { runComplianceCheck } from './lib/compliance'
import { saveErrorReport } from './lib/errorReportAgent'
import type { ViewpointType, SideDirection } from './lib/prompt'
import Header from './components/Header'
import CanvasItemComponent from './components/CanvasItem'
import RightPanel from './components/RightPanel'
import LeftToolbar from './components/LeftToolbar'
import BottomControlBar from './components/BottomControlBar'

// ── IndexedDB ─────────────────────────────────────────────────────────────
const DB_NAME = 'n09-canvas'
const DB_STORE = 'state'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbLoad<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const req = tx.objectStore(DB_STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function dbSave(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* ignore */ }
}

// ── Analysis text parser ──────────────────────────────────────────────────
function parseAnalysisText(text: string): {
  analyzedOpticalParams: { angle: string; altitude: string; lens: string }
  analysisReport: CanvasItemType['parameters']['analysisReport']
} {
  const angleM = text.match(/(?:azimuth|angle|방위각)[:\s]+([0-9]{1,2}:[0-9]{2})/i)
  const altM   = text.match(/(?:altitude|고도|촬영\s*고도)[:\s]+([^\n|,;]{1,50})/i)
  const lensM  = text.match(/(?:focal.?length|lens|초점\s*거리)[:\s]+([^\n|,;]{1,30})/i)

  return {
    analyzedOpticalParams: {
      angle:    (angleM?.[1] ?? '—').trim(),
      altitude: (altM?.[1]   ?? '—').trim().slice(0, 40),
      lens:     (lensM?.[1]  ?? '—').trim().slice(0, 20),
    },
    analysisReport: null,
  }
}

// ── ViewType → ViewpointType ───────────────────────────────────────────────
const VIEW_TYPE_MAP: Record<ViewType, ViewpointType> = {
  birdEye:   'bird-eye',
  eyeLevel:  'eye-level',
  front:     'front',
  rightSide: 'side',
  top:       'top',
}

// ── Drag state types ───────────────────────────────────────────────────────
type DragState =
  | { type: 'pan';    startX: number; startY: number; startOX: number; startOY: number }
  | { type: 'item';   id: string; startCX: number; startCY: number; startIX: number; startIY: number }
  | { type: 'resize'; id: string; corner: 'nw'|'ne'|'sw'|'se';
      startCX: number; startCY: number; startIX: number; startIY: number; startIW: number; startIH: number }

// ─────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ───────────────────────────────────────────────────────────────
  const [theme, setTheme]           = useState<'light'|'dark'>('light')
  const [canvasItems, setCanvasItems] = useState<CanvasItemType[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string|null>(null)
  const [canvasZoom, setCanvasZoom] = useState(100)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [canvasMode, setCanvasMode] = useState<'select'|'pan'>('select')
  const [historyStates, setHistoryStates] = useState<CanvasItemType[][]>([])
  const [futureStates, setFutureStates]   = useState<CanvasItemType[][]>([])
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [openLibraryItemId, setOpenLibraryItemId] = useState<string|null>(null)
  const [selectedView, setSelectedView]           = useState<ViewType|null>(null)
  const [birdEyeDirection, setBirdEyeDirection]   = useState<'04:30'|'07:30'>('04:30')
  const [eyeLevelDirection, setEyeLevelDirection] = useState<'04:30'|'07:30'>('04:30')
  const [frontAltitude, setFrontAltitude]         = useState('1.6')
  const [rightSideDirection, setRightSideDirection] = useState<'03:00'|'09:00'>('03:00')
  const [rightSideAltitude, setRightSideAltitude]   = useState('1.6')
  const [isAnalyzing, setIsAnalyzing]   = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [analysisStep, setAnalysisStep] = useState('')
  const [analyzedOpticalParams, setAnalyzedOpticalParams] =
    useState<{ angle: string; altitude: string; lens: string }|null>(null)

  // ── Refs ────────────────────────────────────────────────────────────────
  const canvasRef    = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef      = useRef<DragState|null>(null)
  const saveTimer    = useRef<ReturnType<typeof setTimeout>|null>(null)

  // Always-current mirrors for use inside event handlers
  const zoomRef    = useRef(canvasZoom)
  const offsetRef  = useRef(canvasOffset)
  const itemsRef   = useRef(canvasItems)
  const modeRef    = useRef(canvasMode)
  const selIdRef   = useRef(selectedItemId)

  useEffect(() => { zoomRef.current   = canvasZoom },     [canvasZoom])
  useEffect(() => { offsetRef.current = canvasOffset },   [canvasOffset])
  useEffect(() => { itemsRef.current  = canvasItems },    [canvasItems])
  useEffect(() => { modeRef.current   = canvasMode },     [canvasMode])
  useEffect(() => { selIdRef.current  = selectedItemId }, [selectedItemId])

  // ── Persistence ─────────────────────────────────────────────────────────
  useEffect(() => {
    dbLoad<{ canvasItems: CanvasItemType[]; canvasZoom: number; canvasOffset: { x:number; y:number } }>('canvas')
      .then(data => {
        if (!data) return
        setCanvasItems(data.canvasItems ?? [])
        setCanvasZoom(data.canvasZoom   ?? 100)
        setCanvasOffset(data.canvasOffset ?? { x: 0, y: 0 })
      })
  }, [])

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      dbSave('canvas', { canvasItems: itemsRef.current, canvasZoom: zoomRef.current, canvasOffset: offsetRef.current })
    }, 800)
  }

  // ── History ──────────────────────────────────────────────────────────────
  function pushHistory(snapshot: CanvasItemType[]) {
    setHistoryStates(h => [...h.slice(-50), snapshot])
    setFutureStates([])
  }

  function withHistory(updater: (prev: CanvasItemType[]) => CanvasItemType[]) {
    setCanvasItems(prev => {
      pushHistory(prev)
      const next = updater(prev)
      itemsRef.current = next
      scheduleSave()
      return next
    })
  }

  function handleUndo() {
    if (historyStates.length === 0) return
    const prev = historyStates[historyStates.length - 1]
    setHistoryStates(h => h.slice(0, -1))
    setFutureStates(f => [itemsRef.current, ...f])
    setCanvasItems(prev)
    itemsRef.current = prev
    scheduleSave()
  }

  function handleRedo() {
    if (futureStates.length === 0) return
    const next = futureStates[0]
    setFutureStates(f => f.slice(1))
    setHistoryStates(h => [...h, itemsRef.current])
    setCanvasItems(next)
    itemsRef.current = next
    scheduleSave()
  }

  // ── Coordinate conversion ────────────────────────────────────────────────
  function screenToCanvas(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const s = zoomRef.current / 100
    return {
      x: (clientX - rect.left - rect.width  / 2 - offsetRef.current.x) / s,
      y: (clientY - rect.top  - rect.height / 2 - offsetRef.current.y) / s,
    }
  }

  function hitTest(cx: number, cy: number): CanvasItemType | null {
    const items = itemsRef.current
    // Check selected item first (highest z), then rest in reverse order
    const ordered = [
      ...items.filter(i => i.id !== selIdRef.current).reverse(),
      items.find(i => i.id === selIdRef.current),
    ].filter(Boolean) as CanvasItemType[]

    return ordered.find(item =>
      cx >= item.x && cx <= item.x + item.width &&
      cy >= item.y && cy <= item.y + item.height
    ) ?? null
  }

  function hitResizeCorner(item: CanvasItemType, cx: number, cy: number) {
    const H = 14 / (zoomRef.current / 100) // corner hit zone in canvas-space
    const H2 = H / 2
    const corners = [
      { id: 'nw' as const, x: item.x,              y: item.y },
      { id: 'ne' as const, x: item.x + item.width,  y: item.y },
      { id: 'sw' as const, x: item.x,              y: item.y + item.height },
      { id: 'se' as const, x: item.x + item.width,  y: item.y + item.height },
    ]
    return corners.find(c => Math.abs(cx - c.x) <= H2 && Math.abs(cy - c.y) <= H2)?.id ?? null
  }

  // ── Pointer events ───────────────────────────────────────────────────────
  function handleCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)

    const cp = screenToCanvas(e.clientX, e.clientY)
    const mode = modeRef.current

    if (mode === 'pan') {
      dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, startOX: offsetRef.current.x, startOY: offsetRef.current.y }
      return
    }

    const hit = hitTest(cp.x, cp.y)
    if (!hit) {
      setSelectedItemId(null)
      setOpenLibraryItemId(null)
      dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, startOX: offsetRef.current.x, startOY: offsetRef.current.y }
      return
    }

    setSelectedItemId(hit.id)

    // Resize corner check (only on already-selected item)
    if (hit.id === selIdRef.current) {
      const corner = hitResizeCorner(hit, cp.x, cp.y)
      if (corner) {
        dragRef.current = { type: 'resize', id: hit.id, corner, startCX: cp.x, startCY: cp.y, startIX: hit.x, startIY: hit.y, startIW: hit.width, startIH: hit.height }
        return
      }
    }

    // Start item drag — push history NOW so we have a pre-drag snapshot
    pushHistory(itemsRef.current)
    dragRef.current = { type: 'item', id: hit.id, startCX: cp.x, startCY: cp.y, startIX: hit.x, startIY: hit.y }
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return

    if (drag.type === 'pan') {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const next = { x: drag.startOX + dx, y: drag.startOY + dy }
      offsetRef.current = next
      setCanvasOffset(next)
      return
    }

    const cp = screenToCanvas(e.clientX, e.clientY)

    if (drag.type === 'item') {
      const dx = cp.x - drag.startCX
      const dy = cp.y - drag.startCY
      setCanvasItems(prev => prev.map(item =>
        item.id === drag.id
          ? { ...item, x: drag.startIX + dx, y: drag.startIY + dy }
          : item
      ))
      return
    }

    if (drag.type === 'resize') {
      const dx = cp.x - drag.startCX
      const dy = cp.y - drag.startCY
      const MIN = 80
      setCanvasItems(prev => prev.map(item => {
        if (item.id !== drag.id) return item
        let { x, y, width: w, height: h } = { x: drag.startIX, y: drag.startIY, width: drag.startIW, height: drag.startIH }
        if (drag.corner === 'se') { w = Math.max(MIN, drag.startIW + dx); h = Math.max(MIN, drag.startIH + dy) }
        if (drag.corner === 'sw') { x = drag.startIX + dx; w = Math.max(MIN, drag.startIW - dx); h = Math.max(MIN, drag.startIH + dy) }
        if (drag.corner === 'ne') { w = Math.max(MIN, drag.startIW + dx); y = drag.startIY + dy; h = Math.max(MIN, drag.startIH - dy) }
        if (drag.corner === 'nw') { x = drag.startIX + dx; w = Math.max(MIN, drag.startIW - dx); y = drag.startIY + dy; h = Math.max(MIN, drag.startIH - dy) }
        return { ...item, x, y, width: w, height: h }
      }))
    }
  }

  function handleCanvasPointerUp() {
    if (dragRef.current?.type === 'item' || dragRef.current?.type === 'resize') {
      itemsRef.current = canvasItems  // will be synced by next render via effect
      scheduleSave()
    }
    dragRef.current = null
  }

  // ── Wheel zoom (non-passive via DOM) ─────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 8 : -8
      const next = Math.max(10, Math.min(400, zoomRef.current + delta))
      zoomRef.current = next
      setCanvasZoom(next)
      scheduleSave()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function zoomStep(dir: 1 | -1) {
    const next = Math.max(10, Math.min(400, zoomRef.current + dir * 10))
    zoomRef.current = next
    setCanvasZoom(next)
    scheduleSave()
  }

  // ── Focus ────────────────────────────────────────────────────────────────
  function handleFocus() {
    const items = itemsRef.current
    if (items.length === 0) {
      setCanvasZoom(100); setCanvasOffset({ x: 0, y: 0 }); return
    }
    const sel = items.find(i => i.id === selIdRef.current) ?? items[0]
    const cx = -(sel.x + sel.width  / 2)
    const cy = -(sel.y + sel.height / 2)
    setCanvasZoom(100)
    setCanvasOffset({ x: cx, y: cy })
  }

  // ── Image upload ─────────────────────────────────────────────────────────
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string
        const img = new Image()
        img.onload = () => {
          const MAX = 800
          const s = Math.min(1, MAX / Math.max(img.width, img.height))
          const w = Math.round(img.width  * s)
          const h = Math.round(img.height * s)
          const jitter = () => (Math.random() - 0.5) * 60
          const item: CanvasItemType = {
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upload', src,
            x: -w / 2 + jitter(), y: -h / 2 + jitter(),
            width: w, height: h,
            motherId: null, parameters: null,
          }
          withHistory(prev => [...prev, item])
          setSelectedItemId(item.id)
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  function onDelete(id: string) {
    withHistory(prev => prev.filter(i => i.id !== id))
    if (selIdRef.current === id) setSelectedItemId(null)
  }

  // ── Analyze (Room 0 only — View 선택 불필요) ──────────────────────────────
  async function analyzeViewpoint(src: string, id?: string) {
    setIsAnalyzing(true)
    setAnalysisStep('Running MWRS Room 0 — DNA extraction...')
    try {
      const text = await callRoom0Analysis(src)
      if (id) {
        setCanvasItems(prev => prev.map(item =>
          item.id === id ? { ...item, parameters: { ...(item.parameters ?? {}), lockedDna: text } } : item
        ))
      }
      setAnalysisStep('')
    } catch (err) {
      console.error('[N09] analyzeViewpoint error:', err)
      setAnalysisStep('Error — check console')
      await saveErrorReport({
        room: 'ROOM_0',
        fn: 'analyzeViewpoint / callRoom0Analysis',
        error: err,
        inputContext: {
          imageSize: `${(src.length * 0.75 / 1024).toFixed(1)} KB (approx)`,
          itemId: id ?? '(없음)',
        },
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Generate (Room 1~3 + 이미지 생성 — View 선택 필요) ──────────────────
  async function handleGenerate() {
    const selItem = itemsRef.current.find(i => i.id === selIdRef.current)
    if (!selItem || !selectedView) return

    const source = (selItem.type === 'generated' && selItem.motherId)
      ? (itemsRef.current.find(i => i.id === selItem.motherId) ?? selItem)
      : selItem

    setIsGenerating(true)
    setAnalysisStep('')
    try {
      setAnalysisStep('Running MWRS Room 1 → 2 → 3...')
      const vpType = VIEW_TYPE_MAP[selectedView]
      const sideDir: SideDirection | undefined = selectedView === 'rightSide' ? rightSideDirection : undefined
      const cameraAngle: CameraAngle | undefined =
        selectedView === 'birdEye'  ? birdEyeDirection :
        selectedView === 'eyeLevel' ? eyeLevelDirection :
        undefined
      const lockedDna = source.parameters?.lockedDna ?? undefined
      const analysisText = await callAnalysis(source.src, vpType, sideDir, lockedDna, cameraAngle)

      const { analyzedOpticalParams: params, analysisReport } = parseAnalysisText(analysisText)
      setAnalyzedOpticalParams(params)
      if (source.type === 'upload') {
        setCanvasItems(prev => prev.map(i =>
          i.id === source.id ? { ...i, parameters: { ...(i.parameters ?? {}), analyzedOpticalParams: params, analysisReport } } : i
        ))
      }

      setAnalysisStep('Generating image...')
      const generatedSrc = await callImageGeneration(analysisText, source.src)

      // Compliance check — OVERALL FAIL 시 별도 보고서 (API 오류와 분리)
      const viewpointLabel = getViewpointLabel(vpType, sideDir, cameraAngle)
      const compliance = runComplianceCheck(analysisText, generatedSrc, source.src, viewpointLabel)
      if (!compliance.passed) {
        const failedChecks = compliance.checks
          .filter(c => !c.passed)
          .map(c => c.label)
          .join(' | ')
        await saveErrorReport({
          room: 'COMPLIANCE',
          fn: 'runComplianceCheck',
          error: new Error(`OVERALL: FAIL — ${failedChecks}`),
          inputContext: {
            selectedView: selectedView ?? '(미선택)',
            viewpointLabel,
            failedChecks,
            analysisLength: `${analysisText.length} chars`,
          },
          partialOutput: analysisText.slice(0, 800),
        })
      }

      const generated: CanvasItemType = {
        id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'generated', src: generatedSrc,
        x: selItem.x + selItem.width + 40,
        y: selItem.y,
        width: selItem.width, height: selItem.height,
        motherId: source.id,
        parameters: { analyzedOpticalParams: params, analysisReport },
      }
      withHistory(prev => [...prev, generated])
      setSelectedItemId(generated.id)
      setAnalysisStep('')
    } catch (err) {
      console.error('[N09] handleGenerate error:', err)
      setAnalysisStep('Error — check console')
      await saveErrorReport({
        room: 'ROOM_1_3',
        fn: 'handleGenerate / callAnalysis + callImageGeneration',
        error: err,
        inputContext: {
          selectedView: selectedView ?? '(미선택)',
          itemId: selItem?.id ?? '(없음)',
          lockedDna: selItem?.parameters?.lockedDna ? 'present' : 'NOT PROVIDED',
          imageSize: `${(selItem?.src?.length ?? 0) * 0.75 / 1024 | 0} KB (approx)`,
        },
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement
      const inInput = active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)
      if (inInput) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selIdRef.current) onDelete(selIdRef.current)
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); handleUndo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault(); handleRedo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Theme ─────────────────────────────────────────────────────────────────
  function toggleTheme() {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  // ── Cursor ────────────────────────────────────────────────────────────────
  const isPanning = canvasMode === 'pan' || dragRef.current?.type === 'pan'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} w-screen h-screen flex flex-col overflow-hidden bg-white dark:bg-black text-black dark:text-white`}>
      <Header theme={theme} toggleTheme={toggleTheme} />

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Pointer-capture layer */}
        <div
          ref={canvasRef}
          className="absolute inset-0"
          style={{ cursor: isPanning ? 'grab' : 'default', touchAction: 'none' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={handleCanvasPointerUp}
        >
          {/* Transform wrapper — fills viewport, scales/translates around center */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom / 100})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            {/* ── Infinite grid ─────────────────────────────────────── */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-15000px', left: '-15000px',
                width: '30000px', height: '30000px',
                backgroundImage: `
                  linear-gradient(to right,  rgba(128,128,128,0.10) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(128,128,128,0.10) 1px, transparent 1px),
                  linear-gradient(to right,  rgba(128,128,128,0.20) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(128,128,128,0.20) 1px, transparent 1px)
                `,
                backgroundSize: '12px 12px, 12px 12px, 60px 60px, 60px 60px',
                zIndex: -1,
              }}
            />

            {/* ── Canvas items ──────────────────────────────────────── */}
            {canvasItems.map(item => (
              <CanvasItemComponent
                key={item.id}
                item={item}
                selectedItemId={selectedItemId}
                canvasZoom={canvasZoom}
                canvasMode={canvasMode}
                isAnalyzing={isAnalyzing}
                isGenerating={isGenerating}
                openLibraryItemId={openLibraryItemId}
                canvasItems={canvasItems}
                analyzeViewpoint={analyzeViewpoint}
                setOpenLibraryItemId={setOpenLibraryItemId}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>

        {/* ── Left toolbar ───────────────────────────────────────────── */}
        <LeftToolbar
          canvasMode={canvasMode}
          setCanvasMode={setCanvasMode}
          historyStates={historyStates}
          futureStates={futureStates}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
        />

        {/* ── Right panel ────────────────────────────────────────────── */}
        <RightPanel
          isRightPanelOpen={isRightPanelOpen}
          selectedView={selectedView}
          birdEyeDirection={birdEyeDirection}
          eyeLevelDirection={eyeLevelDirection}
          rightSideDirection={rightSideDirection}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
          analyzedOpticalParams={analyzedOpticalParams}
          setSelectedView={setSelectedView}
          setBirdEyeDirection={setBirdEyeDirection}
          setEyeLevelDirection={setEyeLevelDirection}
          frontAltitude={frontAltitude}
          setFrontAltitude={setFrontAltitude}
          setRightSideDirection={setRightSideDirection}
          rightSideAltitude={rightSideAltitude}
          setRightSideAltitude={setRightSideAltitude}
          canvasItems={canvasItems}
          selectedItemId={selectedItemId}
          isGenerating={isGenerating}
          handleGenerate={handleGenerate}
          analyzeViewpoint={analyzeViewpoint}
        />

        {/* ── Bottom control bar ─────────────────────────────────────── */}
        <BottomControlBar
          isRightPanelOpen={isRightPanelOpen}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          handleImageUpload={handleImageUpload}
          handleFocus={handleFocus}
          canvasZoom={canvasZoom}
          zoomStep={zoomStep}
          setIsRightPanelOpen={setIsRightPanelOpen}
        />
      </div>
    </div>
  )
}
