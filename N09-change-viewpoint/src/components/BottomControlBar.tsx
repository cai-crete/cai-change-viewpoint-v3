import React from 'react';
import { Upload, Search, Compass } from 'lucide-react';

interface BottomControlBarProps {
  isRightPanelOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFocus: () => void;
  canvasZoom: number;
  zoomStep: (dir: 1 | -1) => void;
  setIsRightPanelOpen: (open: boolean) => void;
}

export default function BottomControlBar({
  isRightPanelOpen,
  fileInputRef,
  handleImageUpload,
  handleFocus,
  canvasZoom,
  zoomStep,
  setIsRightPanelOpen,
}: BottomControlBarProps) {
  return (
    <div
      className="absolute bottom-[12px] z-30 flex items-center bg-white/90 border border-black/50 shadow-xl dark:bg-black/90 dark:border-white/50 pointer-events-auto transition-all duration-500 ease-in-out rounded-full overflow-hidden h-11 backdrop-blur-sm"
      style={{
        left: isRightPanelOpen ? '50%' : 'calc(100% - 12px)',
        transform: isRightPanelOpen ? 'translateX(-50%)' : 'translateX(-100%)',
        whiteSpace: 'nowrap'
      }}
    >
      {/* Upload */}
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      <div className="flex px-1">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Upload Image"
        >
          <Upload size={18} />
        </button>
      </div>

      <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10" />

      {/* Focus */}
      <div className="flex px-1">
        <button
          onClick={handleFocus}
          className="w-10 h-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Fit to 100% / Focus Target"
        >
          <Search size={18} />
        </button>
      </div>

      <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10" />

      {/* Zoom */}
      <div className="flex px-1 select-none items-center">
        <button onClick={() => zoomStep(-1)} className="w-10 h-full flex items-center justify-center font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Zoom Out">−</button>
        <div className="min-w-[60px] h-full flex items-center justify-center font-mono text-sm px-1 font-bold">{Math.round(canvasZoom)}%</div>
        <button onClick={() => zoomStep(1)} className="w-10 h-full flex items-center justify-center font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Zoom In">+</button>
      </div>

      <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10" />

      {/* Panel Toggle */}
      <div className="flex px-1">
        <button
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className={`w-10 h-9 flex items-center justify-center transition-colors ${isRightPanelOpen ? 'bg-black text-white dark:bg-white dark:text-black rounded-full' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
          title="Toggle Panel"
        >
          <Compass size={18} />
        </button>
      </div>
    </div>
  );
}
