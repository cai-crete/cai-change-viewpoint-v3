export type ViewType = 'birdEye' | 'eyeLevel' | 'front' | 'rightSide' | 'top';

export interface CanvasItem {
  id: string;
  type: 'upload' | 'generated';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  motherId: string | null;
  parameters: {
    lockedDna?: string | null;
    analyzedOpticalParams?: { angle: string; altitude: string; lens: string } | null;
    analysisReport?: {
      section1: Record<string, string>;
      section2: Record<string, string>;
      section3: Record<string, string>;
    } | null;
  } | null;
}
