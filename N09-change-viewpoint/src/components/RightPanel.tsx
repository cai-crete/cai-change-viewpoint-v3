import { Loader2 } from 'lucide-react';
import type { CanvasItem, ViewType } from '../types';
import SitePlanDiagram from './SitePlanDiagram';

interface RightPanelProps {
  isRightPanelOpen: boolean;
  // Diagram
  selectedView: ViewType | null;
  birdEyeDirection: '04:30' | '07:30';
  eyeLevelDirection: '04:30' | '07:30';
  rightSideDirection: '03:00' | '09:00';
  isAnalyzing: boolean;
  analysisStep: string;
  // Analysis summary (Room 1~3 optical params)
  analyzedOpticalParams: { angle: string; altitude: string; lens: string } | null;
  // View selector
  setSelectedView: (v: ViewType) => void;
  setBirdEyeDirection: (d: '04:30' | '07:30') => void;
  setEyeLevelDirection: (d: '04:30' | '07:30') => void;
  frontAltitude: string;
  setFrontAltitude: (v: string) => void;
  setRightSideDirection: (d: '03:00' | '09:00') => void;
  rightSideAltitude: string;
  setRightSideAltitude: (v: string) => void;
  // Bottom action
  canvasItems: CanvasItem[];
  selectedItemId: string | null;
  isGenerating: boolean;
  handleGenerate: () => void;
  analyzeViewpoint: (src: string, id?: string) => void;
}

const VIEW_LABELS: Record<ViewType, string> = {
  birdEye: "Bird's eye view",
  eyeLevel: 'Perspective view',
  front: 'Front View',
  rightSide: 'Right / Left View',
  top: 'Top view',
};

// ── LOCKED_DNA JSON 파싱 ──────────────────────────────────────────────────────
interface DnaSummary {
  skin_system?: string;
  mass?: string;
  roof_level?: string;
  color_palette?: string;
  materiality?: string;
}

function parseDnaSummary(lockedDna: string): DnaSummary | null {
  try {
    const match = lockedDna.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = match ? match[1].trim() : lockedDna.trim()
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    const dna = (parsed['LOCKED_DNA'] ?? parsed) as Record<string, unknown>
    const geo = dna['geometric_specs'] as Record<string, string> | undefined
    const concept = dna['conceptual_attributes'] as Record<string, string> | undefined
    return {
      skin_system:   geo?.['skin_system'],
      mass:          geo?.['mass'],
      roof_level:    geo?.['roof_level'],
      color_palette: concept?.['color_palette'],
      materiality:   concept?.['materiality'],
    }
  } catch {
    return null
  }
}

function truncate(val: string | undefined, len = 38): string {
  if (!val) return '—'
  return val.length > len ? val.slice(0, len) + '…' : val
}

export default function RightPanel({
  isRightPanelOpen,
  selectedView,
  birdEyeDirection,
  eyeLevelDirection,
  rightSideDirection,
  isAnalyzing,
  analysisStep,
  analyzedOpticalParams,
  setSelectedView,
  setBirdEyeDirection,
  setEyeLevelDirection,
  frontAltitude,
  setFrontAltitude,
  setRightSideDirection,
  rightSideAltitude,
  setRightSideAltitude,
  canvasItems,
  selectedItemId,
  isGenerating,
  handleGenerate,
  analyzeViewpoint,
}: RightPanelProps) {
  const diagramAngle =
    selectedView === 'birdEye' ? birdEyeDirection :
    selectedView === 'eyeLevel' ? eyeLevelDirection :
    selectedView === 'rightSide' ? rightSideDirection :
    '06:00';

  const diagramLens =
    selectedView === 'top' ? 24 :
    (selectedView === 'front' || selectedView === 'rightSide') ? 50 : 24;

  const selItem = canvasItems.find(i => i.id === selectedItemId);

  // Room 0 DNA 요약 (ANALYZE 완료 후)
  const lockedDna = selItem?.parameters?.lockedDna ?? null;
  const dnaSummary = lockedDna ? parseDnaSummary(lockedDna) : null;

  // Room 1~3 optical params (GENERATE 완료 후) — selItem 또는 전달된 state
  const opticalParams = analyzedOpticalParams
    ?? selItem?.parameters?.analyzedOpticalParams
    ?? null;

  return (
    <div className="absolute top-0 right-0 h-full z-50 pointer-events-none flex justify-end p-[12px]">
      <div className={`relative h-full transition-all duration-500 ease-in-out flex items-center ${isRightPanelOpen ? 'w-[284px]' : 'w-0'}`}>
        <div className={`w-full h-full overflow-hidden transition-all duration-500 ${isRightPanelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
          <aside className="h-full w-[284px] rounded-[20px] flex flex-col overflow-hidden pointer-events-auto border border-black/50 shadow-xl dark:border-white/50 bg-white/90 dark:bg-black/90 backdrop-blur-sm">
            <div className={`flex flex-col h-full overflow-hidden transition-opacity duration-200 ${isRightPanelOpen ? 'opacity-100 delay-150' : 'opacity-0'}`}>
              <div className="pt-1.5 pb-0" />

              <div className="flex flex-col gap-4 p-5 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {/* Viewpoint Diagram */}
                <div className="flex flex-col">
                  <div className="font-mono text-xs font-bold tracking-wide uppercase mb-3 opacity-70">Viewpoint</div>
                  <SitePlanDiagram
                    angle={diagramAngle}
                    lens={diagramLens}
                    isAnalyzing={isAnalyzing}
                    analysisStep={analysisStep}
                    visibleV0Index={null}
                  />
                </div>

                {/* ── Room 0 DNA 분석 결과 (ANALYZE 완료 후) ─────────────── */}
                {lockedDna && (
                  <div className="flex flex-col gap-1 font-mono text-[10px] border-t border-black/10 dark:border-white/10 pt-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold uppercase tracking-widest opacity-100">DNA</span>
                      <span className="px-1 py-0.5 rounded text-[8px] uppercase tracking-wider bg-green-500/20 text-green-700 dark:text-green-400 font-bold">Locked</span>
                    </div>
                    {dnaSummary ? (
                      <>
                        <div className="flex justify-between gap-1">
                          <span className="opacity-60 shrink-0">Skin</span>
                          <span className="font-bold text-right truncate ml-1">{truncate(dnaSummary.skin_system)}</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="opacity-60 shrink-0">Mass</span>
                          <span className="font-bold text-right truncate ml-1">{truncate(dnaSummary.mass)}</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="opacity-60 shrink-0">Roof</span>
                          <span className="font-bold text-right truncate ml-1">{truncate(dnaSummary.roof_level)}</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="opacity-60 shrink-0">Color</span>
                          <span className="font-bold text-right truncate ml-1">{truncate(dnaSummary.color_palette)}</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="opacity-60 shrink-0">Material</span>
                          <span className="font-bold text-right truncate ml-1">{truncate(dnaSummary.materiality)}</span>
                        </div>
                      </>
                    ) : (
                      // JSON 파싱 실패 시 원문 앞 120자 표시
                      <div className="opacity-60 text-[9px] break-all leading-relaxed">
                        {lockedDna.slice(0, 120)}{lockedDna.length > 120 ? '…' : ''}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Room 1~3 광학 분석 결과 (GENERATE 완료 후) ─────────── */}
                {opticalParams && (
                  <div className="flex flex-col gap-1 font-mono text-[10px] border-t border-black/10 dark:border-white/10 pt-3">
                    <div className="font-bold uppercase tracking-widest mb-1 opacity-100">Optical Params</div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Angle</span>
                      <span className="font-bold">{opticalParams.angle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Altitude</span>
                      <span className="font-bold truncate ml-2 text-right">{opticalParams.altitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Lens</span>
                      <span className="font-bold truncate ml-2 text-right">{opticalParams.lens}</span>
                    </div>
                  </div>
                )}

                {/* ── View Selector ──────────────────────────────────────── */}
                <div className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 pt-3 flex-1 min-h-0">
                  <div className="font-mono text-xs font-bold tracking-wide uppercase opacity-70 mb-1">View</div>
                  {(['birdEye', 'eyeLevel', 'front', 'rightSide', 'top'] as ViewType[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedView(v)}
                      className={`w-full py-1.5 font-mono text-xs tracking-wide uppercase border transition-all ${selectedView === v ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black' : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'}`}
                    >
                      {VIEW_LABELS[v]}
                    </button>
                  ))}

                  {/* Sub-options: Bird's Eye */}
                  {selectedView === 'birdEye' && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="font-mono text-[10px] opacity-60 uppercase tracking-widest">Angle</span>
                      <div className="flex gap-2">
                        {(['04:30', '07:30'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => setBirdEyeDirection(dir)}
                            className={`flex-1 py-1 font-mono text-[10px] border transition-all ${birdEyeDirection === dir ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black' : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'}`}
                          >
                            {dir}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-options: Eye Level */}
                  {selectedView === 'eyeLevel' && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="font-mono text-[10px] opacity-60 uppercase tracking-widest">Angle</span>
                      <div className="flex gap-2">
                        {(['04:30', '07:30'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => setEyeLevelDirection(dir)}
                            className={`flex-1 py-1 font-mono text-[10px] border transition-all ${eyeLevelDirection === dir ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black' : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'}`}
                          >
                            {dir}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-options: Front */}
                  {selectedView === 'front' && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="font-mono text-[10px] opacity-60 uppercase tracking-widest">Altitude</span>
                      <select
                        value={frontAltitude}
                        onChange={(e) => setFrontAltitude(e.target.value)}
                        className="w-full border border-black/30 dark:border-white/30 bg-transparent font-mono text-xs py-1 px-2 focus:outline-none focus:border-black dark:focus:border-white dark:text-white"
                      >
                        <option value="0">0m</option>
                        <option value="1.6">1.6m</option>
                        <option value="10">10m</option>
                        <option value="50">50m</option>
                        <option value="150">150m</option>
                      </select>
                    </div>
                  )}

                  {/* Sub-options: Right / Left Side */}
                  {selectedView === 'rightSide' && (
                    <>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="font-mono text-[10px] opacity-60 uppercase tracking-widest">Angle</span>
                        <div className="flex gap-2">
                          {(['03:00', '09:00'] as const).map((dir) => (
                            <button
                              key={dir}
                              onClick={() => setRightSideDirection(dir)}
                              className={`flex-1 py-1 font-mono text-[10px] border transition-all ${rightSideDirection === dir ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black' : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'}`}
                            >
                              {dir}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="font-mono text-[10px] opacity-60 uppercase tracking-widest">Altitude</span>
                        <select
                          value={rightSideAltitude}
                          onChange={(e) => setRightSideAltitude(e.target.value)}
                          className="w-full border border-black/30 dark:border-white/30 bg-transparent font-mono text-xs py-1 px-2 focus:outline-none focus:border-black dark:focus:border-white dark:text-white"
                        >
                          <option value="0">0m</option>
                          <option value="1.6">1.6m</option>
                          <option value="10">10m</option>
                          <option value="50">50m</option>
                          <option value="150">150m</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Sub-options: Top */}
                  {selectedView === 'top' && (
                    <div className="font-mono text-[10px] opacity-50 text-center mt-1">06:00 / 300m / 24mm</div>
                  )}
                </div>
              </div>

              {/* Bottom Action */}
              <div className="p-5 mt-auto">
                {selItem && (
                  selItem.parameters?.lockedDna || selItem.type === 'generated' ? (
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !selectedView}
                      className="relative w-full border border-black dark:border-white py-2 font-display tracking-widests uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className={`block transition-opacity ${isGenerating ? 'opacity-0' : 'opacity-100'}`}>Generate</span>
                      {isGenerating && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Loader2 size={18} className="animate-spin" />
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => analyzeViewpoint(selItem.src, selItem.id)}
                      disabled={isAnalyzing}
                      className="w-full border border-black dark:border-white py-2 font-display tracking-widest uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-30"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analysis'}
                    </button>
                  )
                )}
                <p className="font-mono text-[9px] opacity-40 text-center mt-4 tracking-tighter">
                  © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
