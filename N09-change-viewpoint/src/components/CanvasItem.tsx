import { Loader2 } from 'lucide-react';
import { CanvasItem as CanvasItemType } from '../types';
import ItemFloatingBar from './ItemFloatingBar';
import LibraryArtboard from './LibraryArtboard';

interface CanvasItemProps {
  item: CanvasItemType;
  selectedItemId: string | null;
  canvasZoom: number;
  canvasMode: 'select' | 'pan';
  isAnalyzing: boolean;
  isGenerating: boolean;
  openLibraryItemId: string | null;
  canvasItems: CanvasItemType[];
  analyzeViewpoint: (src: string, id?: string) => void;
  setOpenLibraryItemId: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export default function CanvasItem({
  item,
  selectedItemId,
  canvasZoom,
  canvasMode,
  isAnalyzing,
  isGenerating,
  openLibraryItemId,
  canvasItems,
  analyzeViewpoint,
  setOpenLibraryItemId,
  onDelete,
}: CanvasItemProps) {
  const isSelected = selectedItemId === item.id;

  return (
    <div
      style={{
        position: 'absolute',
        left: `calc(50% + ${item.x}px)`,
        top: `calc(50% + ${item.y}px)`,
        width: item.width,
        height: item.height,
        zIndex: isSelected ? 20 : 10,
        pointerEvents: canvasMode === 'pan' ? 'none' : 'auto',
      }}
    >
      <img
        src={item.src}
        alt={item.id}
        className="w-full h-full object-contain pointer-events-none shadow-xl border border-black/5 dark:border-white/5"
        referrerPolicy="no-referrer"
        draggable={false}
      />

      {/* Selection Overlay */}
      {isSelected && (
        <div
          className="absolute -inset-[1px] pointer-events-none border-[#1d4ed8] z-[30]"
          style={{ borderWidth: `${1.6 / (canvasZoom / 100)}px` }}
        >
          {/* Floating Control Bar */}
          <ItemFloatingBar
            item={item}
            canvasZoom={canvasZoom}
            canvasMode={canvasMode}
            isAnalyzing={isAnalyzing}
            isGenerating={isGenerating}
            selectedItemId={selectedItemId}
            openLibraryItemId={openLibraryItemId}
            analyzeViewpoint={analyzeViewpoint}
            setOpenLibraryItemId={setOpenLibraryItemId}
            onDelete={onDelete}
          />

          {/* Item-bound Library Artboard */}
          {openLibraryItemId === item.id && (
            <LibraryArtboard
              item={item}
              canvasItems={canvasItems}
              canvasZoom={canvasZoom}
              canvasMode={canvasMode}
            />
          )}

          {/* Generating Overlay */}
          {isGenerating && selectedItemId === item.id && (item.motherId === item.id || !item.motherId) && (
            <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md pointer-events-auto">
              <Loader2 className="animate-spin text-black w-12 h-12" />
            </div>
          )}

          {/* Corner Resize Handles */}
          {[
            { top: true,    left: true,  cursor: 'nwse-resize' },
            { top: true,    right: true, cursor: 'nesw-resize' },
            { bottom: true, left: true,  cursor: 'nesw-resize' },
            { bottom: true, right: true, cursor: 'nwse-resize' },
          ].map((pos, idx) => {
            const s = 1 / (canvasZoom / 100);
            const size = 12 * s;
            const style: React.CSSProperties = {
              width: size,
              height: size,
              borderWidth: 1.6 * s,
              position: 'absolute',
              backgroundColor: 'white',
              borderColor: '#808080',
              borderRadius: '999px',
              top: pos.top ? -size / 2 : 'auto',
              bottom: (pos as any).bottom ? -size / 2 : 'auto',
              left: pos.left ? -size / 2 : 'auto',
              right: (pos as any).right ? -size / 2 : 'auto',
              pointerEvents: 'auto',
              cursor: pos.cursor,
            };
            return <div key={idx} style={style} />;
          })}
        </div>
      )}
    </div>
  );
}
