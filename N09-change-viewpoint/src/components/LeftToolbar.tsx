import { MousePointer2, Hand, Undo, Redo } from 'lucide-react';
import type { CanvasItem } from '../types';

interface LeftToolbarProps {
  canvasMode: 'select' | 'pan';
  setCanvasMode: (mode: 'select' | 'pan') => void;
  historyStates: CanvasItem[][];
  futureStates: CanvasItem[][];
  handleUndo: () => void;
  handleRedo: () => void;
}

export default function LeftToolbar({ canvasMode, setCanvasMode, historyStates, futureStates, handleUndo, handleRedo }: LeftToolbarProps) {
  return (
    <div className="absolute left-[12px] top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 bg-white/90 border border-black/50 shadow-xl dark:bg-black/90 dark:border-white/50 pointer-events-auto transition-all duration-300 rounded-full py-2 w-11 backdrop-blur-sm">
      {/* Select Mode */}
      <button
        onClick={() => setCanvasMode('select')}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${canvasMode === 'select' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        title="Select Mode"
      >
        <MousePointer2 size={18} />
      </button>

      {/* Pan Mode */}
      <button
        onClick={() => setCanvasMode('pan')}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${canvasMode === 'pan' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        title="Pan Mode"
      >
        <Hand size={18} />
      </button>

      <div className="w-6 h-[1px] bg-black/10 dark:bg-white/10 my-1" />

      {/* Undo */}
      <button
        onClick={handleUndo}
        disabled={historyStates.length === 0}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${historyStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        title="Undo"
      >
        <Undo size={18} />
      </button>

      {/* Redo */}
      <button
        onClick={handleRedo}
        disabled={futureStates.length === 0}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${futureStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        title="Redo"
      >
        <Redo size={18} />
      </button>
    </div>
  );
}
