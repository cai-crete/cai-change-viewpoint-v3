import { Loader2 } from 'lucide-react';

interface SitePlanDiagramProps {
  angle: string;
  lens: number;
  isAnalyzing: boolean;
  analysisStep: string;
  visibleV0Index?: number | null;
}

export default function SitePlanDiagram({ angle, lens, isAnalyzing, analysisStep, visibleV0Index }: SitePlanDiagramProps) {
  const angleMap: Record<string, number> = {
    '12:00': 0, '1:30': 45, '3:00': 90, '03:00': 90, '04:30': 135,
    '06:00': 180, '07:30': 225, '09:00': 270, '10:30': 315
  };

  const rotation = angleMap[angle] !== undefined ? angleMap[angle] : 180;
  const radius = 90;
  const cx = 100;
  const cy = 100;

  const rad = (rotation - 90) * (Math.PI / 180);
  const cameraX = cx + radius * Math.cos(rad);
  const cameraY = cy + radius * Math.sin(rad);

  return (
    <div className="w-full aspect-square relative flex items-center justify-center overflow-hidden transition-colors duration-300">
      {/* Central Building Representation */}
      <div className="absolute w-[80%] h-[80%] flex items-center justify-center z-0">
        <div className="relative w-[60%] h-[40%] bg-black dark:bg-white flex items-center justify-center z-0 overflow-hidden border border-white/50">
          <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,white_2px,white_4px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,black_2px,black_4px)]" />
        </div>
      </div>

      {/* Optical Orbit and Camera Tracker */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke="currentColor" strokeWidth="1"
          strokeDasharray="8 4"
          className="text-black/30 dark:text-white/30"
        />
        <g transform={`translate(${cameraX}, ${cameraY}) rotate(${rotation})`}>
          <circle cx="0" cy="0" r="4.0" fill="currentColor" className="text-black dark:text-white" />
        </g>
      </svg>

      {/* Analyzing Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 transition-colors duration-300">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="font-display text-xs uppercase tracking-widest text-center px-4">{analysisStep || 'Analyzing...'}</p>
        </div>
      )}
    </div>
  );
}
