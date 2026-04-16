import type { CanvasItem } from '../types';

interface LibraryArtboardProps {
  item: CanvasItem;
  canvasItems: CanvasItem[];
  canvasZoom: number;
  canvasMode: 'select' | 'pan';
}

export default function LibraryArtboard({ item, canvasItems, canvasZoom, canvasMode }: LibraryArtboardProps) {
  const resolvedReport = (item.type === 'generated' && item.motherId)
    ? canvasItems.find((i: CanvasItem) => i.id === item.motherId)?.parameters?.analysisReport
    : item.parameters?.analysisReport;

  const s1 = resolvedReport?.section1 || {};
  const s2 = resolvedReport?.section2 || {};
  const s3 = resolvedReport?.section3 || {};
  const scale = 1 / (canvasZoom / 100);

  return (
    <div
      className={`absolute bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl shadow-xl rounded-2xl overflow-visible ${canvasMode === 'pan' ? 'pointer-events-none' : 'pointer-events-auto'}`}
      style={{ left: `calc(100% + ${12 * scale}px)`, top: 0, width: `${480 * scale}px`, fontSize: `${11 * scale}px` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="p-5 flex flex-col gap-4">
        <div>
          <div className="font-['Bebas_Neue'] tracking-[0.1em] text-black dark:text-white mb-1" style={{ fontSize: `${18 * scale}px` }}>ANALYSIS REPORT</div>
          <div className="h-[1px] bg-black/20 dark:bg-white/20" />
        </div>

        {resolvedReport ? (
          <>
            {/* Section 1 */}
            <div>
              <div className="font-mono font-bold uppercase tracking-widest opacity-60 mb-2" style={{ fontSize: `${9 * scale}px` }}>섹션 1. 광학 및 시점 파라미터</div>
              <table className="w-full border-collapse">
                <tbody>
                  {([
                    ['촬영 시점', s1.viewpoint],
                    ['방위각', s1.azimuth],
                    ['촬영 고도', s1.altitude],
                    ['투시 왜곡', s1.perspective],
                    ['센서 포맷', s1.sensor],
                    ['초점 거리', s1.focal_length],
                    ['광원 및 날씨', s1.lighting],
                    ['대비 강도', s1.contrast],
                  ] as [string, string][]).map(([k, v]) => (
                    <tr key={k} className="border-b border-black/5 dark:border-white/5">
                      <td className="font-mono opacity-50 py-1 pr-3 whitespace-nowrap">{k}</td>
                      <td className="font-mono font-bold py-1">{v || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 2 */}
            <div>
              <div className="font-mono font-bold uppercase tracking-widest opacity-60 mb-2" style={{ fontSize: `${9 * scale}px` }}>섹션 2. 기하학 및 공간 구조 명세</div>
              <table className="w-full border-collapse">
                <tbody>
                  {([
                    ['외피 시스템', s2.skin],
                    ['내부 파사드', s2.inner],
                    ['외부 파사드', s2.outer],
                    ['기본 매스', s2.mass],
                    ['하층부 1F', s2.base_1f],
                    ['중층부', s2.mid_body],
                    ['상층부 Roof', s2.roof],
                  ] as [string, string][]).map(([k, v]) => (
                    <tr key={k} className="border-b border-black/5 dark:border-white/5">
                      <td className="font-mono opacity-50 py-1 pr-3 whitespace-nowrap">{k}</td>
                      <td className="font-mono font-bold py-1">{v || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3 */}
            <div>
              <div className="font-mono font-bold uppercase tracking-widest opacity-60 mb-2" style={{ fontSize: `${9 * scale}px` }}>섹션 3. 개념 및 시각적 속성</div>
              <table className="w-full border-collapse">
                <tbody>
                  {([
                    ['디자인 알고리즘', s3.design_algorithm],
                    ['주조색', s3.color_palette],
                    ['형태 모티브', s3.form_motif],
                    ['형태적 대비', s3.form_contrast],
                    ['감성적 대비', s3.mood_contrast],
                  ] as [string, string][]).map(([k, v]) => (
                    <tr key={k} className="border-b border-black/5 dark:border-white/5">
                      <td className="font-mono opacity-50 py-1 pr-3 whitespace-nowrap">{k}</td>
                      <td className="font-mono font-bold py-1">{v || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="font-mono opacity-40 uppercase tracking-widest text-center py-8" style={{ fontSize: `${10 * scale}px` }}>No Analysis Data — Run Analysis First</div>
        )}
      </div>
    </div>
  );
}
