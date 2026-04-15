import { create } from 'zustand';

// --- Shared Types (exported for App.tsx) ---

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
    analyzedOpticalParams?: any | null;
    analysisReport?: any | null;
    conformanceReport?: ConformanceReport | null;
  } | null;
}

export type ViewType = 'birdEye' | 'eyeLevel' | 'front' | 'rightSide' | 'top';

export interface ConformanceItem {
  check: string;
  result: 'PASS' | 'FAIL' | 'PARTIAL';
  note: string;
}

export interface ConformanceReport {
  viewType: ViewType;
  overallResult: 'PASS' | 'PARTIAL' | 'FAIL';
  items: ConformanceItem[];
  sessionDate: string;
}

// --- Updater helper (mirrors React setState functional form) ---
type Updater<T> = T | ((prev: T) => T);

const apply = <T>(val: Updater<T>, prev: T): T =>
  typeof val === 'function' ? (val as (p: T) => T)(prev) : val;

// --- Zoom Steps (shared constant) ---
export const ZOOM_STEPS_BUTTON = [10, 25, 50, 75, 100, 125, 150];

// --- State ---
interface AppState {
  // Canvas
  canvasItems: CanvasItem[];
  selectedItemId: string | null;
  canvasZoom: number;
  canvasOffset: { x: number; y: number };
  canvasMode: 'select' | 'pan';
  focusMode: 'all' | 'target';
  // Drag render triggers (cursor CSS)
  isDraggingItem: boolean;
  isResizingItem: boolean;
  isDraggingPan: boolean;
  // History
  historyStates: CanvasItem[][];
  futureStates: CanvasItem[][];
  // View selection
  selectedView: ViewType | null;
  birdEyeDirection: '04:30' | '07:30';
  eyeLevelDirection: '04:30' | '07:30';
  frontAltitude: string;
  rightSideDirection: '03:00' | '09:00';
  rightSideAltitude: string;
  // Analysis
  analysisReport: any | null;
  analyzedOpticalParams: { angle: string; altitude: string; lens: string } | null;
  isAnalyzing: boolean;
  analysisStep: string;
  // Generation
  isGenerating: boolean;
  // UI
  theme: 'light' | 'dark';
  isRightPanelOpen: boolean;
  openLibraryItemId: string | null;
  // Scale
  appScale: number;
  // DB
  dbLoaded: boolean;
}

// --- Actions ---
interface AppActions {
  // Canvas
  setCanvasItems: (val: Updater<CanvasItem[]>) => void;
  setSelectedItemId: (id: string | null) => void;
  setCanvasZoom: (val: Updater<number>) => void;
  setCanvasOffset: (val: Updater<{ x: number; y: number }>) => void;
  setCanvasMode: (mode: 'select' | 'pan') => void;
  setFocusMode: (mode: 'all' | 'target') => void;
  // Drag
  setIsDraggingItem: (val: boolean) => void;
  setIsResizingItem: (val: boolean) => void;
  setIsDraggingPan: (val: boolean) => void;
  // History
  setHistoryStates: (val: Updater<CanvasItem[][]>) => void;
  setFutureStates: (val: Updater<CanvasItem[][]>) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  // View
  setSelectedView: (view: ViewType | null) => void;
  setBirdEyeDirection: (dir: '04:30' | '07:30') => void;
  setEyeLevelDirection: (dir: '04:30' | '07:30') => void;
  setFrontAltitude: (alt: string) => void;
  setRightSideDirection: (dir: '03:00' | '09:00') => void;
  setRightSideAltitude: (alt: string) => void;
  // Analysis
  setAnalysisReport: (report: any | null) => void;
  setAnalyzedOpticalParams: (params: { angle: string; altitude: string; lens: string } | null) => void;
  setIsAnalyzing: (val: boolean) => void;
  setAnalysisStep: (step: string) => void;
  // Generation
  setIsGenerating: (val: boolean) => void;
  // UI
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setIsRightPanelOpen: (val: boolean) => void;
  setOpenLibraryItemId: (id: string | null) => void;
  // Scale
  setAppScale: (val: number) => void;
  // DB
  setDbLoaded: (val: boolean) => void;
  // Compound actions
  zoomStep: (dir: 1 | -1) => void;
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  // --- Initial State ---
  canvasItems: [],
  selectedItemId: null,
  canvasZoom: 100,
  canvasOffset: { x: 0, y: 0 },
  canvasMode: 'select',
  focusMode: 'all',
  isDraggingItem: false,
  isResizingItem: false,
  isDraggingPan: false,
  historyStates: [],
  futureStates: [],
  selectedView: null,
  birdEyeDirection: '04:30',
  eyeLevelDirection: '04:30',
  frontAltitude: '10',
  rightSideDirection: '03:00',
  rightSideAltitude: '10',
  analysisReport: null,
  analyzedOpticalParams: null,
  isAnalyzing: false,
  analysisStep: '',
  isGenerating: false,
  theme: 'light',
  isRightPanelOpen: true,
  openLibraryItemId: null,
  appScale: 1,
  dbLoaded: false,

  // --- Actions ---
  setCanvasItems: (val) => set(s => ({ canvasItems: apply(val, s.canvasItems) })),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setCanvasZoom: (val) => set(s => ({ canvasZoom: apply(val, s.canvasZoom) })),
  setCanvasOffset: (val) => set(s => ({ canvasOffset: apply(val, s.canvasOffset) })),
  setCanvasMode: (mode) => set({ canvasMode: mode }),
  setFocusMode: (mode) => set({ focusMode: mode }),
  setIsDraggingItem: (val) => set({ isDraggingItem: val }),
  setIsResizingItem: (val) => set({ isResizingItem: val }),
  setIsDraggingPan: (val) => set({ isDraggingPan: val }),
  setHistoryStates: (val) => set(s => ({ historyStates: apply(val, s.historyStates) })),
  setFutureStates: (val) => set(s => ({ futureStates: apply(val, s.futureStates) })),

  handleUndo: () => {
    const { historyStates, canvasItems, futureStates } = get();
    if (historyStates.length === 0) return;
    set({
      futureStates: [...futureStates, canvasItems],
      canvasItems: historyStates[historyStates.length - 1],
      historyStates: historyStates.slice(0, -1),
      selectedItemId: null,
    });
  },

  handleRedo: () => {
    const { futureStates, canvasItems, historyStates } = get();
    if (futureStates.length === 0) return;
    set({
      historyStates: [...historyStates, canvasItems],
      canvasItems: futureStates[futureStates.length - 1],
      futureStates: futureStates.slice(0, -1),
      selectedItemId: null,
    });
  },

  setSelectedView: (view) => set({ selectedView: view }),
  setBirdEyeDirection: (dir) => set({ birdEyeDirection: dir }),
  setEyeLevelDirection: (dir) => set({ eyeLevelDirection: dir }),
  setFrontAltitude: (alt) => set({ frontAltitude: alt }),
  setRightSideDirection: (dir) => set({ rightSideDirection: dir }),
  setRightSideAltitude: (alt) => set({ rightSideAltitude: alt }),
  setAnalysisReport: (report) => set({ analysisReport: report }),
  setAnalyzedOpticalParams: (params) => set({ analyzedOpticalParams: params }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  setAnalysisStep: (step) => set({ analysisStep: step }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setIsRightPanelOpen: (val) => set({ isRightPanelOpen: val }),
  setOpenLibraryItemId: (id) => set({ openLibraryItemId: id }),
  setAppScale: (val) => set({ appScale: val }),
  setDbLoaded: (val) => set({ dbLoaded: val }),

  // Compound: zoom + offset update in one set call (avoids nested setState anti-pattern)
  zoomStep: (dir: 1 | -1) => {
    const { canvasZoom, canvasOffset } = get();
    const newZoom = dir === 1
      ? (ZOOM_STEPS_BUTTON.find(v => v > canvasZoom) ?? 150)
      : ([...ZOOM_STEPS_BUTTON].reverse().find(v => v < canvasZoom) ?? 10);
    set({
      canvasZoom: newZoom,
      canvasOffset: {
        x: canvasOffset.x * (newZoom / canvasZoom),
        y: canvasOffset.y * (newZoom / canvasZoom),
      },
    });
  },
}));
