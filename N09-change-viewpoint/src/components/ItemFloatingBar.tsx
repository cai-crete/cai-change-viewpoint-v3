import { Loader2, RotateCcw, Download, Book, Trash2 } from 'lucide-react';
import type { CanvasItem } from '../types';

interface ItemFloatingBarProps {
  item: CanvasItem;
  canvasZoom: number;
  canvasMode: 'select' | 'pan';
  isAnalyzing: boolean;
  isGenerating: boolean;
  selectedItemId: string | null;
  openLibraryItemId: string | null;
  analyzeViewpoint: (src: string, id?: string) => void;
  setOpenLibraryItemId: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export default function ItemFloatingBar({
  item,
  canvasZoom,
  canvasMode,
  isAnalyzing,
  isGenerating,
  selectedItemId,
  openLibraryItemId,
  analyzeViewpoint,
  setOpenLibraryItemId,
  onDelete,
}: ItemFloatingBarProps) {
  const scale = 1 / (canvasZoom / 100);

  return (
    <div
      className={`absolute flex items-center bg-white/70 dark:bg-black/70 backdrop-blur-md z-[40] divide-x divide-black/10 dark:divide-white/10 rounded-2xl shadow-sm ${canvasMode === 'pan' ? 'pointer-events-none' : 'pointer-events-auto'}`}
      style={{
        top: `-${48 / (canvasZoom / 100)}px`,
        right: 0,
        height: `${36 / (canvasZoom / 100)}px`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {item.type === 'upload' && (
        <button
          onClick={() => analyzeViewpoint(item.src, item.id)}
          disabled={isAnalyzing}
          className={`flex items-center justify-center transition-colors rounded-l-2xl ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
          style={{ width: `${40 / (canvasZoom / 100)}px`, height: '100%' }}
          title="재분석"
        >
          {isAnalyzing ? (
            <Loader2 className="animate-spin" size={14 / (canvasZoom / 100)} />
          ) : (
            <RotateCcw size={14 / (canvasZoom / 100)} />
          )}
        </button>
      )}

      {item.type === 'generated' && (
        <a
          href={item.src}
          download="simulation.png"
          className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-l-2xl"
          style={{ width: `${40 / (canvasZoom / 100)}px`, height: '100%' }}
          title="다운로드"
        >
          <Download size={14 / (canvasZoom / 100)} />
        </a>
      )}

      <button
        onClick={() => setOpenLibraryItemId(openLibraryItemId === item.id ? null : item.id)}
        className={`flex items-center justify-center transition-colors ${item.type !== 'generated' && item.type !== 'upload' ? 'rounded-l-2xl' : ''} ${openLibraryItemId === item.id ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        style={{ width: `${40 / (canvasZoom / 100)}px`, height: '100%' }}
        title="라이브러리 (아트보드)"
      >
        <Book size={12 / (canvasZoom / 100)} />
      </button>

      <button
        onClick={() => onDelete(item.id)}
        className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-r-2xl"
        style={{ width: `${40 / (canvasZoom / 100)}px`, height: '100%' }}
        title="삭제"
      >
        <Trash2 size={12 / (canvasZoom / 100)} />
      </button>
    </div>
  );
}
