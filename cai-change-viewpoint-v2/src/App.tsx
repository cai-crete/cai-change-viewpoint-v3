import React, { useRef, useEffect, useState } from 'react';
import { Upload, Moon, Sun, Loader2, Search, Hand, MousePointer2, Compass, Book, Wand2, Sparkles, Trash2, Undo, Redo, Download, RotateCcw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ANALYSIS, IMAGE_GEN, ANALYSIS_FALLBACK, IMAGE_GEN_FALLBACK } from './constants';
import { useAppStore, type CanvasItem, type ViewType, type ConformanceReport } from './store/useAppStore';
import { useProtocol } from './hooks/useProtocol';

// --- Constants ---
const ANGLES = ['12:00', '1:30', '3:00', '04:30', '06:00', '07:30', '09:00', '10:30'];




// SVG-based Viewpoint Diagram Component
const SitePlanDiagram = ({ angle, lens, isAnalyzing, analysisStep, visibleV0Index }: { 
  angle: string, 
  lens: number, 
  isAnalyzing: boolean, 
  analysisStep: string, 
  visibleV0Index?: number | null 
}) => {
  // Mapping clock-face strings to degrees
  const angleMap: Record<string, number> = {
    '12:00': 0, '1:30': 45, '3:00': 90, '03:00': 90, '04:30': 135,
    '06:00': 180, '07:30': 225, '09:00': 270, '10:30': 315
  };

  const rotation = angleMap[angle] !== undefined ? angleMap[angle] : 180;
  const radius = 90; // Circular orbit radius
  const cx = 100;
  const cy = 100;

  // Calculate Camera Position on the orbit
  const rad = (rotation - 90) * (Math.PI / 180);
  const cameraX = cx + radius * Math.cos(rad);
  const cameraY = cy + radius * Math.sin(rad);

  return (
    <div className="w-full aspect-square relative flex items-center justify-center overflow-hidden transition-colors duration-300">
      {/* Central Building Representation */}
      <div className="absolute w-[80%] h-[80%] flex items-center justify-center z-0">
        <div className="relative w-[60%] h-[40%] bg-black dark:bg-white flex items-center justify-center z-0 overflow-hidden border border-white/50">
          {/* Diagonal Pattern Overlay */}
          <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,white_2px,white_4px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,black_2px,black_4px)]" />
        </div>
      </div>

      {/* Optical Orbit and Camera Tracker */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {/* Orbit Path (Dashed Circle) */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke="currentColor" strokeWidth="1"
          strokeDasharray="8 4"
          className="text-black/30 dark:text-white/30"
        />

        {/* Camera Visual Target (Dot) */}
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
};

// --- IndexedDB Persistence Utilities ---
const DB_NAME = 'cai-canvas-db';
const DB_VERSION = 1;
const STORE_CANVAS = 'canvasState';
const STATE_KEY = 'current';

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_CANVAS);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const dbSave = async (data: any) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CANVAS, 'readwrite');
    tx.objectStore(STORE_CANVAS).put(data, STATE_KEY);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
  } catch (e) { console.warn('[IndexedDB] Save failed:', e); }
};

const dbLoad = async (): Promise<any> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CANVAS, 'readonly');
    const result = await new Promise<any>((res, rej) => {
      const req = tx.objectStore(STORE_CANVAS).get(STATE_KEY);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return result;
  } catch (e) { console.warn('[IndexedDB] Load failed:', e); return null; }
};

// RELIABILITY: Wrap any promise with a 30s timeout
const withTimeout = <T,>(promise: Promise<T>, ms = 30000): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`API 응답 타임아웃: ${ms / 1000}초 초과`)), ms)
  );
  return Promise.race([promise, timeout]);
};

// RELIABILITY: Auto-resize images exceeding maxBytes using Canvas API
const resizeImageIfNeeded = (file: File, maxBytes = 10 * 1024 * 1024): Promise<string> =>
  new Promise((resolve, reject) => {
    if (file.size <= maxBytes) {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.sqrt(maxBytes / file.size);
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(img.naturalWidth * scale);
      canvas.height = Math.floor(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const tryQuality = (quality: number) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          if (blob.size <= maxBytes || quality <= 0.3) {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            tryQuality(Math.round((quality - 0.15) * 100) / 100);
          }
        }, 'image/jpeg', quality);
      };
      tryQuality(0.85);
    };
    img.onerror = reject;
    img.src = url;
  });

export default function App() {
  // --- Zustand Store ---
  const {
    canvasItems, setCanvasItems,
    selectedItemId, setSelectedItemId,
    isGenerating, setIsGenerating,
    isDraggingItem, setIsDraggingItem,
    isResizingItem, setIsResizingItem,
    isDraggingPan, setIsDraggingPan,
    selectedView, setSelectedView,
    birdEyeDirection, setBirdEyeDirection,
    eyeLevelDirection, setEyeLevelDirection,
    frontAltitude, setFrontAltitude,
    rightSideDirection, setRightSideDirection,
    rightSideAltitude, setRightSideAltitude,
    analysisReport, setAnalysisReport,
    analyzedOpticalParams, setAnalyzedOpticalParams,
    isAnalyzing, setIsAnalyzing,
    analysisStep, setAnalysisStep,
    theme, toggleTheme,
    isRightPanelOpen, setIsRightPanelOpen,
    openLibraryItemId, setOpenLibraryItemId,
    canvasZoom, setCanvasZoom,
    canvasOffset, setCanvasOffset,
    focusMode, setFocusMode,
    canvasMode, setCanvasMode,
    historyStates, setHistoryStates,
    futureStates, setFutureStates,
    handleUndo, handleRedo,
    appScale, setAppScale,
    dbLoaded, setDbLoaded,
    zoomStep,
  } = useAppStore();

  // Runtime protocol fetch (docs/references → public/protocols/)
  const { content: protocolContent, complianceCheck: protocolComplianceCheck } = useProtocol(selectedView);

  // Generation elapsed time (seconds) — resets when isGenerating turns false
  const [generatingElapsed, setGeneratingElapsed] = useState(0);
  useEffect(() => {
    if (!isGenerating) { setGeneratingElapsed(0); return; }
    const t = setInterval(() => setGeneratingElapsed((s: number) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isGenerating]);

  // Drag & Resize Refs (Ref 기반 — stale closure 방지)
  const isDraggingItemRef = useRef(false);
  const isResizingItemRef = useRef(false);
  const isDraggingPanRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, itemX: 0, itemY: 0 });
  const resizeCornerRef = useRef({ dx: 1, dy: 1 });
  const preDragStateRef = useRef<CanvasItem[] | null>(null);

  // Touch State Refs
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number, y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLElement>(null); // V54: Absolute ref for canvas section


  // --- Effects ---
  // Synchronize selected item's parameters to UI panels, and reset on deselect
  useEffect(() => {
    if (!selectedItemId) {
      setAnalyzedOpticalParams(null);
      setAnalysisReport(null);
      setSelectedView(null);
      setRightSideDirection('03:00');
      return;
    }
    const item = canvasItems.find(i => i.id === selectedItemId);
    if (item && item.parameters) {
      setAnalyzedOpticalParams(item.parameters.analyzedOpticalParams || null);
      setAnalysisReport(item.parameters.analysisReport || null);
      // Auto-determine rightSideDirection from analyzed angle
      const angle = item.parameters.analyzedOpticalParams?.angle;
      if (angle === '04:30') setRightSideDirection('03:00');
      else if (angle === '07:30') setRightSideDirection('09:00');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

  useEffect(() => {
    // Determine the scale based on a reference resolution (e.g., 1440x900 or 1920x1080)
    const updateScale = () => {
      const baseWidth = 1440;
      const baseHeight = 900;
      const widthRatio = window.innerWidth / baseWidth;
      const heightRatio = window.innerHeight / baseHeight;
      // Scale to fit within the viewport (maintains aspect ratio, leaves letterboxing if window is not 16:10)
      const scale = Math.min(widthRatio, heightRatio);
      setAppScale(scale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // --- IndexedDB Auto-Load on Mount ---
  useEffect(() => {
    dbLoad().then((saved) => {
      if (saved) {
        if (Array.isArray(saved.canvasItems)) setCanvasItems(saved.canvasItems);
        if (typeof saved.canvasZoom === 'number') setCanvasZoom(saved.canvasZoom);
        if (saved.canvasOffset) setCanvasOffset(saved.canvasOffset);
        console.log('%c[IndexedDB] Canvas state restored successfully.', 'color: #047857; font-weight: bold;');
      }
      setDbLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- IndexedDB Auto-Save on Change ---
  useEffect(() => {
    if (!dbLoaded) return; // Don't save until initial load is done
    const timer = setTimeout(() => {
      dbSave({ canvasItems, canvasZoom, canvasOffset });
      console.log('%c[IndexedDB] Canvas state auto-saved.', 'color: #1d4ed8;');
    }, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [canvasItems, canvasZoom, canvasOffset, dbLoaded]);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- Handlers ---



  const handleFocus = () => {
    if (canvasItems.length === 0) {
      setCanvasZoom(100);
      setCanvasOffset({ x: 0, y: 0 });
      return;
    }

    if (focusMode === 'all') {
      // Fit All
      const minX = Math.min(...canvasItems.map(i => i.x));
      const minY = Math.min(...canvasItems.map(i => i.y));
      const maxX = Math.max(...canvasItems.map(i => i.x + i.width));
      const maxY = Math.max(...canvasItems.map(i => i.y + i.height));
      
      const width = maxX - minX;
      const height = maxY - minY;
      const cx = minX + width / 2;
      const cy = minY + height / 2;
      
      const padding = 100;
      // V54: Panel is overlay so viewport = full window width
      const sectionW = window.innerWidth;
      const sectionH = window.innerHeight;
      
      const scaleX = (sectionW - padding) / width;
      const scaleY = (sectionH - padding) / height;
      const scale = Math.min(scaleX, scaleY, 1) * 100; // max zoom 100%
      
      setCanvasZoom(Math.max(scale, 10)); // min zoom 10
      setCanvasOffset({ 
        x: -cx * (scale / 100), 
        y: -cy * (scale / 100) 
      });
      setFocusMode('target');
    } else {
      // Focus Target (selected or last)
      const targetItem = selectedItemId 
        ? canvasItems.find(i => i.id === selectedItemId) 
        : canvasItems[canvasItems.length - 1];
        
      if (targetItem) {
        const cx = targetItem.x + targetItem.width / 2;
        const cy = targetItem.y + targetItem.height / 2;
        
        setCanvasZoom(100);
        setCanvasOffset({ 
          x: -cx, 
          y: -cy 
        });
      }
      setFocusMode('all');
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Web Zoom (No Ctrl needed as per user request for Miro-style)
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.1;
    setCanvasZoom(prev => Math.min(Math.max(prev + zoomFactor, 10), 150));
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const scale = canvasZoom / 100;
    
    // V55: Use ABSOLUTE screen center as the fixed origin.
    // This is the most robust way to ensure selection calibration 
    // matches the visual center of the fullscreen canvas.
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    return {
      x: (clientX - cx - canvasOffset.x) / scale,
      y: (clientY - cy - canvasOffset.y) / scale
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const isUIInteraction = (e.target as HTMLElement).closest('.pointer-events-auto');
    if (isUIInteraction) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (canvasMode === 'pan') {
      // In Pan mode, clicking ANYTHING (including images) leads to Panning.
      isDraggingPanRef.current = true;
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // --- Select Mode ---

    // 1. Check Resize Handles first (if an item is selected)
    if (selectedItemId) {
      const item = canvasItems.find(i => i.id === selectedItemId);
      if (item) {
        const scale = canvasZoom / 100;
        const hitRadius = 15 / scale;

        // 4 corner definitions: position + resize direction multipliers
        const corners = [
          { x: item.x,              y: item.y,               dx: -1, dy: -1, cursor: 'nwse-resize' }, // top-left
          { x: item.x + item.width, y: item.y,               dx:  1, dy: -1, cursor: 'nesw-resize' }, // top-right
          { x: item.x,              y: item.y + item.height, dx: -1, dy:  1, cursor: 'nesw-resize' }, // bottom-left
          { x: item.x + item.width, y: item.y + item.height, dx:  1, dy:  1, cursor: 'nwse-resize' }, // bottom-right
        ];

        for (const corner of corners) {
          const dist = Math.hypot(coords.x - corner.x, coords.y - corner.y);
          if (dist < hitRadius) {
            isResizingItemRef.current = true;
            setIsResizingItem(true);
            resizeCornerRef.current = { dx: corner.dx, dy: corner.dy };
            resizeStartRef.current = { x: coords.x, y: coords.y, width: item.width, height: item.height, itemX: item.x, itemY: item.y };
            preDragStateRef.current = canvasItems;
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    // 2. Check Image Click for Selection/Drag
    const clickedItem = [...canvasItems].reverse().find(item => 
      coords.x >= item.x && coords.x <= item.x + item.width &&
      coords.y >= item.y && coords.y <= item.y + item.height
    );

    if (clickedItem) {
      setSelectedItemId(clickedItem.id);
      isDraggingItemRef.current = true;
      setIsDraggingItem(true);
      dragOffsetRef.current = { x: coords.x - clickedItem.x, y: coords.y - clickedItem.y };
      preDragStateRef.current = canvasItems;
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // 3. Background click in Select Mode → Panning
    setSelectedItemId(null);
    setOpenLibraryItemId(null); // V81: Close library on background click
    isDraggingPanRef.current = true;
    setIsDraggingPan(true);
    dragStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (isDraggingPanRef.current) {
      setCanvasOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    } else if (isDraggingItemRef.current && selectedItemId) {
      setCanvasItems(prev => prev.map(item => 
        item.id === selectedItemId 
          ? { ...item, x: coords.x - dragOffsetRef.current.x, y: coords.y - dragOffsetRef.current.y }
          : item
      ));
    } else if (isResizingItemRef.current && selectedItemId) {
      const dx = coords.x - resizeStartRef.current.x;
      const dy = coords.y - resizeStartRef.current.y;
      const aspect = resizeStartRef.current.width / resizeStartRef.current.height;

      setCanvasItems(prev => prev.map(item => {
        if (item.id !== selectedItemId) return item;

        // Width changes: right corner → expand right, left corner → expand left (flip sign)
        const rawDeltaW = dx * resizeCornerRef.current.dx;
        const newWidth = Math.max(resizeStartRef.current.width + rawDeltaW, 50);
        const newHeight = newWidth / aspect;

        // Position: left corners move x; top corners move y
        const newX = resizeCornerRef.current.dx === -1
          ? resizeStartRef.current.itemX + (resizeStartRef.current.width - newWidth)
          : resizeStartRef.current.itemX;
        const newY = resizeCornerRef.current.dy === -1
          ? resizeStartRef.current.itemY + (resizeStartRef.current.height - newHeight)
          : resizeStartRef.current.itemY;

        return { ...item, x: newX, y: newY, width: newWidth, height: newHeight };
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasDraggingItem = isDraggingItemRef.current;
    const wasResizing = isResizingItemRef.current;
    isDraggingPanRef.current = false;
    isDraggingItemRef.current = false;
    isResizingItemRef.current = false;
    setIsDraggingPan(false);
    setIsDraggingItem(false);
    setIsResizingItem(false);
    // Commit drag/resize to history if position actually changed
    if ((wasDraggingItem || wasResizing) && preDragStateRef.current) {
      const before = preDragStateRef.current;
      setCanvasItems(current => {
        const changed = current.some((item, i) =>
          before[i]?.x !== item.x || before[i]?.y !== item.y ||
          before[i]?.width !== item.width || before[i]?.height !== item.height
        );
        if (changed) {
          setHistoryStates(h => [...h, before]);
          setFutureStates([]);
        }
        return current;
      });
      preDragStateRef.current = null;
    }
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  // --- Tablet Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      lastTouchDist.current = dist;
      lastTouchCenter.current = { x: center.x - canvasOffset.x, y: center.y - canvasOffset.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // 1. Pinch Zoom
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      if (lastTouchDist.current !== null) {
        const delta = (dist - lastTouchDist.current) * 0.5;
        setCanvasZoom(prev => Math.min(Math.max(prev + delta, 10), 150));
      }
      lastTouchDist.current = dist;

      // 2. Two-Finger Pan (Absolute screen coordinates for smoothness)
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      if (lastTouchCenter.current !== null) {
        setCanvasOffset({
          x: center.x - lastTouchCenter.current.x,
          y: center.y - lastTouchCenter.current.y
        });
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // SECURITY: Validate file type and size before processing
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('지원하지 않는 파일 형식입니다. JPEG, PNG, WebP 파일만 업로드할 수 있습니다.');
        e.target.value = '';
        return;
      }
      const base64Image = await resizeImageIfNeeded(file);

      // Load image to get dimensions for initial canvas item
      const img = new Image();
      img.onload = () => {
        const newItemId = `item-${Date.now()}`;
        // Calculate Y position: Place below the bottom-most item if exists
        let newY = -img.height / 2;
        let newX = -img.width / 2;

        if (canvasItems.length > 0) {
          const bottomMostItem = canvasItems.reduce((prev, current) =>
            (prev.y + prev.height > current.y + current.height) ? prev : current
          );
          newY = bottomMostItem.y + bottomMostItem.height + 40;
          newX = bottomMostItem.x; // Align with the bottom-most item's X
        }

        const newItem: CanvasItem = {
          id: newItemId,
          type: 'upload',
          src: base64Image,
          x: newX,
          y: newY,
          width: img.width,
          height: img.height,
          motherId: newItemId, // V74: acts as its own mother
          parameters: null // V74: filled post-analysis
        };

        setHistoryStates(prevH => [...prevH, canvasItems]);
        setFutureStates([]);
        setCanvasItems(prev => [...prev, newItem]);
        setSelectedItemId(newItemId);
      };
      img.src = base64Image;
    }
  };

  const analyzeViewpoint = async (base64Image: string, itemId?: string) => {
    setIsAnalyzing(true);
    setAnalysisStep('analyzing');
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      // PHASE 1 Step 3: Image Pre-Processing (사용자 비노출)
      let analysisImageBase64 = base64Image;
      try {
        const regenBase64Data = base64Image.split(',')[1];
        const regenMimeType = base64Image.split(';')[0].split(':')[1];
        const regenResult = await ai.models.generateContent({
          model: IMAGE_GEN,
          contents: {
            parts: [
              { inlineData: { data: regenBase64Data, mimeType: regenMimeType } },
              { text: `## TASK: Image Pre-Processing\n- Action: Reproduce this architectural image exactly as-is.\n- Output: A pixel-perfect copy with identical composition, lighting, materials, and geometry.\n- Constraint: No modifications of any kind.` },
            ],
          },
        });
        const regenParts = regenResult.candidates?.[0]?.content?.parts || [];
        const regenImagePart = regenParts.find((p: any) => p.inlineData);
        if (regenImagePart?.inlineData) {
          analysisImageBase64 = `data:${regenImagePart.inlineData.mimeType};base64,${regenImagePart.inlineData.data}`;
        }
      } catch (regenErr) {
        console.warn('[Pre-Processing] Failed, using original:', regenErr);
      }

      // PHASE 1 Step 4: Basic Viewpoint Analysis — #.정보분석샘플 포맷 출력
      const analysisPrompt = `
# SYSTEM: Architectural Analysis Engine (Protocol A — #.정보분석샘플)

## Angle Classification Rules (Clock-Face)
Building main facade = 06:00 (Front).
1. Center = FRONT face-on → \`06:00\`
2. Center = RIGHT face-on → \`3:00\`
3. Center = LEFT face-on → \`09:00\`
4. Center = REAR face-on → \`12:00\`
5. Left = FRONT && Right = RIGHT → \`04:30\`
6. Left = LEFT && Right = FRONT → \`07:30\`
7. Left = RIGHT && Right = REAR → \`1:30\`
8. Left = REAR && Right = LEFT → \`10:30\`

## Output Format
Return ALL fields as valid JSON:

\`\`\`json
{
  "visual_reasoning": "Identify visible facades, then match to angle rule.",
  "angle": "One of: 12:00, 1:30, 3:00, 04:30, 06:00, 07:30, 09:00, 10:30",
  "section1_optical": {
    "viewpoint": "Camera viewpoint description (e.g. 하이 앵글 코너 뷰 (부분 조감도))",
    "azimuth": "Direction in clock-face format (e.g. 04:30 방향 (건물 정면 06:00 기준))",
    "altitude": "Estimated camera altitude (e.g. 100m ~ 150m (교차로 상공))",
    "perspective": "Perspective type (e.g. 2점 투시 (수직선 평행 유지))",
    "sensor": "Estimated sensor format (e.g. 중형 포맷 (Medium Format))",
    "focal_length": "Estimated focal length (e.g. 45mm ~ 50mm (표준 화각))",
    "lighting": "Lighting & weather (e.g. 확산광 (Overcast), 옅은 안개)",
    "contrast": "Contrast level (e.g. 낮음 (부드러운 그림자))"
  },
  "section2_geometric": {
    "skin": "Facade system (e.g. 이중 외피 구조 (Double-skin facade))",
    "inner": "Inner facade (e.g. 평활형 유리 커튼월 (Glass Curtain Wall))",
    "outer": "Outer facade (e.g. 유체역학적 3D 곡선 패턴의 수평 파라메트릭 루버)",
    "mass": "Basic mass (e.g. 견고한 직육면체 매스 (Solid Glass Box))",
    "base_1f": "Ground floor (e.g. 필로티 구조, 독립 노출 기둥 배치)",
    "mid_body": "Mid-level (e.g. 코너부 V자 형태 오픈 발코니 (보이드 공간))",
    "roof": "Roof (e.g. 평지붕, 중앙 기계설비(MEP) 박스, 루버 연장형 파라펫)"
  },
  "section3_conceptual": {
    "design_algorithm": "Design methodology (e.g. 파라메트릭 디자인 (Parametricism))",
    "color_palette": "Primary color palette (e.g. 무채색 (밝은 회색), 투명 (유리))",
    "form_motif": "Form motif (e.g. 무형의 에너지 (바람, 파동, 데이터 흐름))",
    "form_contrast": "Form contrast (e.g. 도심의 직교 체계 ↔ 파사드의 유기적 곡선)",
    "mood_contrast": "Mood contrast (e.g. 하이테크/미래지향적 특성 ↔ 시각적 우아함)"
  }
}
\`\`\`
      `;

      const base64Data = analysisImageBase64.split(',')[1];
      const mimeType = analysisImageBase64.split(';')[0].split(':')[1];

      const runAnalysis = async (modelName: string) => {
        const result = await withTimeout(ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: analysisPrompt },
            ],
          },
        }));

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0];
        if (!jsonStr) throw new Error("No JSON returned from model");

        const data = JSON.parse(jsonStr);

        // Developer Console — #.정보분석샘플 3-section log
        console.log('%c========================================================', 'color: #1d4ed8; font-weight: bold;');
        console.log('%c[DEVELOPER LOG] CHANGE VIEWPOINT — #.정보분석샘플', 'color: #1d4ed8; font-weight: bold; font-size: 14px;');
        console.log('%c섹션 1. 광학 및 시점 파라미터:', 'color: #047857; font-weight: bold;');
        console.dir(data.section1_optical);
        console.log('%c섹션 2. 기하학 및 공간 구조 명세:', 'color: #7c3aed; font-weight: bold;');
        console.dir(data.section2_geometric);
        console.log('%c섹션 3. 개념 및 시각적 속성:', 'color: #b45309; font-weight: bold;');
        console.dir(data.section3_conceptual);
        console.log('%c========================================================', 'color: #1d4ed8; font-weight: bold;');

        const analyzedOpt = {
          angle: data.angle || '06:00',
          altitude: data.section1_optical?.altitude || 'N/A',
          lens: data.section1_optical?.focal_length || 'N/A',
        };
        setAnalyzedOpticalParams(analyzedOpt);

        const newAnalysisReport = {
          section1: data.section1_optical || {},
          section2: data.section2_geometric || {},
          section3: data.section3_conceptual || {},
        };
        setAnalysisReport(newAnalysisReport);

        const newParams = {
          analyzedOpticalParams: analyzedOpt,
          analysisReport: newAnalysisReport,
        };

        setCanvasItems(prev => prev.map(item => {
          if (item.id === itemId) return { ...item, parameters: newParams };
          if (item.motherId === itemId && item.parameters) {
            return { ...item, parameters: { ...item.parameters, analysisReport: newAnalysisReport } };
          }
          return item;
        }));

        return true;
      };

      try {
        await runAnalysis(ANALYSIS);
      } catch (primaryError) {
        console.warn(`Primary model (${ANALYSIS}) failed, retrying with fallback...`, primaryError);
        const success = await runAnalysis(ANALYSIS_FALLBACK);
        if (!success) throw new Error("Fallback failed");
      }

    } catch (err) {
      console.warn("Analysis failed completely, using defaults", err);
      alert("분석 API 호출이 실패하거나 할당량(Quota)을 초과했습니다. 기본값으로 세팅됩니다.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // ---
  // PHASE 4: CONFORMANCE CHECK — 프로토콜 기준 출력 이미지 정합성 검증
  // ---
  const verifyConformance = async (
    genItemId: string,
    genBase64: string,
    genMimeType: string,
    complianceCheckSection: string,
    analysisCtx: string,
    viewType: ViewType,
  ) => {
    if (!complianceCheckSection) return;
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const verifyPrompt = `You are an architectural conformance evaluator.
Review the generated architectural image against the COMPLIANCE CHECK criteria below.

${complianceCheckSection}

ANALYSIS CONTEXT:
${analysisCtx}

Evaluate each Post-generation checklist item ([ ] items under "Post-generation") against the generated image.
Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "overallResult": "PASS",
  "items": [
    { "check": "<exact checklist item text>", "result": "PASS", "note": "<one sentence>" }
  ]
}
overallResult must be "PASS" if all items pass, "FAIL" if any item fails, "PARTIAL" if mixed.
result per item must be "PASS", "FAIL", or "PARTIAL".`;

      const response = await ai.models.generateContent({
        model: ANALYSIS,
        contents: {
          parts: [
            { inlineData: { data: genBase64, mimeType: genMimeType } },
            { text: verifyPrompt },
          ],
        },
      });

      const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in conformance response');

      const parsed = JSON.parse(jsonMatch[0]);
      const report: ConformanceReport = {
        viewType,
        overallResult: parsed.overallResult || 'PARTIAL',
        items: Array.isArray(parsed.items) ? parsed.items : [],
        sessionDate: new Date().toISOString().split('T')[0],
      };

      setCanvasItems(prev => prev.map(item =>
        item.id === genItemId
          ? { ...item, parameters: { ...item.parameters, conformanceReport: report } }
          : item
      ));
    } catch (err) {
      console.warn('[Phase 4] Conformance check failed:', err);
    }
  };

  // ---
  // PHASE 3: VIEWPOINT CONFIGURATION — 뷰 선택 기반 이미지 생성
  // ---
  const handleGenerate = async () => {
    const sourceItem = selectedItemId
      ? canvasItems.find(item => item.id === selectedItemId)
      : (canvasItems.length > 0 ? canvasItems[0] : null);

    if (!sourceItem) {
      alert("Please upload at least one image first.");
      return;
    }
    if (!selectedView) {
      alert("뷰 타입을 선택해주세요 (아이레벨투시뷰 / 정면뷰 / 탑뷰).");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const trueSource = (sourceItem.type === 'generated' && sourceItem.motherId)
        ? canvasItems.find(i => i.id === sourceItem.motherId)
        : sourceItem;
      const report = trueSource?.parameters?.analysisReport;

      // Build #.정보분석샘플 context block
      const buildAnalysisContext = () => {
        if (!report) return '## ANALYSIS CONTEXT\n(No analysis data — infer from source image.)';
        const s1 = report.section1 || {};
        const s2 = report.section2 || {};
        const s3 = report.section3 || {};
        return `## ANALYSIS CONTEXT (From Phase 1 — #.정보분석샘플)

### 섹션 1. 광학 및 시점 파라미터 (Optical & Viewpoint Data)
| 변수 (Variable) | 구조화 데이터 (Value) |
| :--- | :--- |
| **촬영 시점 (Viewpoint)** | ${s1.viewpoint || 'N/A'} |
| **방위각 (Azimuth)** | ${s1.azimuth || 'N/A'} |
| **촬영 고도 (Altitude)** | ${s1.altitude || 'N/A'} |
| **투시 왜곡 (Perspective)** | ${s1.perspective || 'N/A'} |
| **센서 포맷 (Sensor)** | ${s1.sensor || 'N/A'} |
| **초점 거리 (Focal Length)** | ${s1.focal_length || 'N/A'} |
| **광원 및 날씨 (Lighting)** | ${s1.lighting || 'N/A'} |
| **대비 강도 (Contrast)** | ${s1.contrast || 'N/A'} |

### 섹션 2. 기하학 및 공간 구조 명세 (Geometric & Spatial Specifications)
| 시스템 분류 | 구조 및 형태 사양 |
| :--- | :--- |
| **외피 시스템 (Skin)** | ${s2.skin || 'N/A'} |
| **내부 파사드 (Inner)** | ${s2.inner || 'N/A'} |
| **외부 파사드 (Outer)** | ${s2.outer || 'N/A'} |
| **기본 매스 (Mass)** | ${s2.mass || 'N/A'} |
| **하층부 (1F Base)** | ${s2.base_1f || 'N/A'} |
| **중층부 (Mid Body)** | ${s2.mid_body || 'N/A'} |
| **상층부 (Roof)** | ${s2.roof || 'N/A'} |

### 섹션 3. 개념 및 시각적 속성 (Conceptual & Visual Attributes)
| 속성 분류 | 데이터 지표 |
| :--- | :--- |
| **디자인 알고리즘** | ${s3.design_algorithm || 'N/A'} |
| **주조색 (Color Palette)** | ${s3.color_palette || 'N/A'} |
| **형태 모티브 (Motif)** | ${s3.form_motif || 'N/A'} |
| **형태적 대비 (Form)** | ${s3.form_contrast || 'N/A'} |
| **감성적 대비 (Mood)** | ${s3.mood_contrast || 'N/A'} |`;
      };

      const analysisContext = buildAnalysisContext();

      // View-specific prompt
      let finalPrompt = '';

      if (selectedView === 'eyeLevel') {
        finalPrompt = `# GOAL
* Generate a precise "Eye-Level Corner View" of the architecture presented in the source image.
* Treat the building in the image as a completed, constructed reality.
* Change the angle of view to this specific new perspective without altering the building's original geometry, materials, or style.
* Render the simulation strictly by resetting the **Angle of View** and the **Optical Environment**.

# Photographer's workflow
**Manual Entry: Capturing a Dynamic Eye-Level Corner View**
This professional technique utilizes a **two-point perspective** to maximize a building's sense of form, volume, and depth.

**Method:**
1. **Positioning:** Place the camera at ground level, maintaining a standard **eye-level height (approx. 1.5 - 1.8 meters)**. Frame the shot from a corner, allowing two facades of the building to recede into the frame.
2. **Photographic Focus:** Capture the interplay between the building's primary surfaces and its structural rhythm. Concentrate on how the light models the **volumetric mass** and reveals the **texture of the main facade materials**. Use fenestration patterns to create a sense of scale and repetition.
3. **Lighting:** Shoot under the **soft, even, diffused light of an overcast day**. This neutral lighting avoids harsh shadows that can obscure architectural forms.
4. **Lens and Perspective Control:** Use a **wide-angle lens (e.g., 24-35mm)** to create a sense of presence with a **tilt-shift lens**. All vertical lines must be rendered perfectly straight.

# Specification: Eye-Level Corner View
* **Shooting Intent**: Naturally expresses the building's three-dimensionality and surrounding context with perfect vertical distortion control.
* **Camera**: Sony A7R V (61MP High Resolution)
* **Lens**: Canon TS-E 24mm f/3.5L II (Tilt-Shift Lens, using adapter)
* **Aperture**: f/11
* **ISO**: 100
* **Shutter Speed**: 1/125 sec
* **Other Equipment**: Sturdy Tripod

---

## Camera Settings for This Render
* **View Direction**: ${eyeLevelDirection} (${eyeLevelDirection === '04:30' ? 'Front-Right Corner' : 'Front-Left Corner'})
* **Altitude**: 1.6m (Eye Level)
* **Lens**: 24-32mm (Wide Tilt-Shift)
* **Perspective**: 2-Point Perspective

${analysisContext}

[GENERATE IMAGE NOW]`;

      } else if (selectedView === 'front') {
        finalPrompt = `# GOAL
* Generate a precise "Front Elevation View" of the architecture presented in the source image.
* Treat the building in the image as a completed, constructed reality.
* Change the angle of view to this specific new perspective without altering the building's original geometry, materials, or style.
* Render the simulation strictly by resetting the **Angle of View** and the **Optical Environment**.

# PHOTOGRAPHER'S WORKFLOW
**Manual Entry: Capturing a Distortion-Free Elevation (Front) View**
This professional technique creates a perfectly flat, perspective-corrected representation of a building's facade.

**Method:**
1. **Positioning:** Place the camera directly facing the facade, ensuring the camera's sensor plane is perfectly parallel to the building's surface.
2. **Photographic Focus:** Document the formal composition of the facade — proportion, rhythm of modular elements, and pure materiality. Represent the architect's two-dimensional design intent with absolute clarity.
3. **Lighting:** Shoot under the soft, even, diffused light of an overcast day to render textures and colors accurately without shadows.
4. **Lens and Perspective Control:** Use a tilt-shift lens — non-negotiable for this shot. Renders all vertical and horizontal lines perfectly parallel to the frame.

# SPECIFICATION: FRONT ELEVATION VIEW
* **Shooting Intent:** Records the architect's design intent accurately like a 2D drawing. Minimizes perspective to emphasize proportion and rhythm.
* **Camera:** Sony A7R V
* **Lens:** Canon TS-E 50mm f/2.8L MACRO (Standard angle Tilt-Shift Lens)
* **Aperture:** f/11
* **ISO:** 100
* **Shutter Speed:** 1/125 sec
* **Other Equipment:** Tripod

---

## Camera Settings for This Render
* **View Direction**: 06:00 (Direct Front)
* **Altitude**: ${frontAltitude}m
* **Lens**: 50mm (Standard Tilt-Shift)
* **Perspective**: 1-Point Perspective

${analysisContext}

[GENERATE IMAGE NOW]`;

      } else if (selectedView === 'top') {
        finalPrompt = `# GOAL
* Generate a precise "Orthographic TOP View" of the architecture presented in the source image.
* Treat the building in the image as a completed, constructed reality.
* Change the angle of view to this specific new perspective without altering the building's original geometry, materials, or style.
* Render the simulation strictly by resetting the **Angle of View** and the **Optical Environment**.

# Photographer's workflow
**Manual Entry: Capturing the Orthographic Top View**
This professional technique creates a perfectly flat, non-perspective, two-dimensional image of a building's roof — a plan view.

**Method:**
1. **Positioning:** Place the camera (drone) at sufficient altitude, positioned directly and vertically above the center of the building.
2. **Photographic Focus:** Capture the **graphic composition of the roof plane** — overall footprint, geometric relationship between forms and voids, and patterns created by roofing materials.
3. **Lighting:** Shoot under the **soft, even, diffused light of an overcast day** to eliminate all shadows and document pure geometry with maximum clarity.
4. **Technique and Perspective Control:** True **orthographic projection** — all perspective eliminated. Frame in a **1:1 square aspect ratio**.

# Specification: Top View
* **Shooting Intent**: Shows the roof plan configuration accurately without distortion.
* **Camera**: DJI Mavic 3 Pro Cine (Drone)
* **Lens**: 24mm Hasselblad Camera (Main Wide-angle Camera)
* **Aperture**: f/8
* **ISO**: 100
* **Shutter Speed**: 1/250 sec
* **Other Equipment**: Vertical Descent Shooting Mode

---

## Camera Settings for This Render
* **View Direction**: 06:00 (Nadir / Straight Down)
* **Altitude**: 300m
* **Lens**: 24mm
* **Perspective**: Orthographic Projection (True Top-Down)

${analysisContext}

[GENERATE IMAGE NOW]`;

      } else if (selectedView === 'rightSide') {
        finalPrompt = `**# GOAL**
* 이미지 속 건축물의 "측면뷰{side view}"를 생성하세요.
* 이미지 속의 건축물은 완료된 준공작입니다.
* 기하학적 형태와 자재의 변경 없이 오직 **시점(Angle of View)**과 **광학적 환경**만을 재설정하여 렌더링하십시오.

**# CONTEXT**
* **입력 데이터 위상:** 입력 이미지는 수정 가능한 스케치가 아닌, 불변의 물리적 좌표값으로 취급됩니다.
* **작동 원칙:** 생성(Generation)이 아닌 **시뮬레이션(Simulation)**입니다. 환각(Hallucination)을 엄격히 배제하고, 원본의 구조적 데이터를 새로운 카메라 좌표로 투영(Projection)하십시오.
* **핵심 제약:** 기하학(Geometry), 비례(Proportion), 구조적 디테일(Structural Detail)은 "변경 불가능한 상수"입니다.

**# RULE**
* 정면을 선행 인식한 후에 지정된 시계 방향 각도에 따른 측면 뷰 이미지를 생성합니다.
* **03:00 입력 시:** 건축물의 **우측면 뷰(Right Side View)**를 타겟팅하여 생성합니다.
* **09:00 입력 시:** 건축물의 **좌측면 뷰(Left Side View)**를 타겟팅하여 생성합니다.

**# ROLE**
건축 사진가 (Architectural Simulation Engine & Virtual Photographer)
나는 현실 세계의 건축물을 디지털 트윈 환경에서 새로운 각도로 기록하는 전문가입니다.

**# ACTION PROTOCOL (Blended Execution)**

**## Step 1. 존재론적 고정 (Ontological Locking)**
**[분석 및 명령 통합]**
원본 이미지를 스캔하여 건축물의 3D 좌표를 고정하십시오.
* **Action:** 입력된 이미지를 '변경 불가능한 청사진'으로 선언합니다.
* **Execution Command:**
  > "Target is a completed structure. LOCK all geometric vertices and material coordinates. DO NOT modify architectural form."

**## Step 2. 방향 인식 및 가상 카메라 재배치 (Directional Recognition & Optical Targeting)**
**### Photographer's workflow**
**Manual Entry: Capturing a Distortion-Free Elevation View (Side)**
This professional technique is used to create a perfectly flat, perspective-corrected representation of a building's facade, applicable to side views.

**Method:**
1. **Angle Recognition & Positioning:** 원본 이미지의 앵글을 분석하여 정면을 특정하고, 입력된 RULE(03:00 또는 09:00)에 따라 타겟 측면을 결정합니다. 이후 카메라를 해당 측면과 완벽하게 평행하도록(sensor plane is perfectly parallel to the building's surface) 배치합니다.
2. **Photographic Focus:** The objective is to document the **formal composition** of the facade. Concentrate on the building's **sense of proportion, the rhythm of its modular elements (like windows or panels), and its pure materiality**. The goal is to represent the architect's two-dimensional design intent with absolute clarity.
3. **Lighting:** As a standard professional practice, shoot under the **soft, even, diffused light of an overcast day**. This neutral lighting is chosen to render textures and colors accurately without shadows that could obscure the facade's details or flatness.
4. **Lens and Perspective Control:** The use of a **tilt-shift lens is non-negotiable** for this type of shot. It allows for precise composition while keeping the camera level, thus rendering all vertical and horizontal lines perfectly parallel to the frame. A **telephoto lens** can also be used from a distance to further compress perspective.

**### Specification: Side Elevation View**
* **Shooting Intent:** Records the architect's design intent accurately and objectively like a 2D drawing. Minimizes perspective to emphasize the proportion and rhythm of the facade.
* **Camera:** Sony A7R V
* **Lens:** Canon TS-E 50mm f/2.8L MACRO (Standard angle Tilt-Shift Lens)
* **Aperture:** f/11
* **ISO:** 100
* **Shutter Speed:** 1/125 sec
* **Other Equipment:** Tripod

---

## TRANSFORMATION DIRECTIVE
* **SOURCE**: Original image — [${analyzedOpticalParams?.angle ?? 'N/A'} position, altitude ${analyzedOpticalParams?.altitude ?? 'N/A'}]
* **TARGET**: ${rightSideDirection} — Flat Side Elevation (측면 입면도)
* ⚠️ **DO NOT return or replicate the source image.** Generate a COMPLETELY NEW view.
* **건물(Geometry/Materials)은 불변 상수**, **카메라 위치·각도는 완전히 재배치** 대상입니다.
* 타겟 측면 파사드가 원본에서 일부 미노출된 경우, 가시적 구조·재료·비례 데이터로 추론하여 완성하십시오.

## Camera Settings for This Render
* **View Direction**: ${rightSideDirection}
  * \`03:00\` = **Right Side Elevation** (우측면 입면도)
  * \`09:00\` = **Left Side Elevation** (좌측면 입면도)
* **Altitude**: ${rightSideAltitude}m
* **Lens**: 50mm (Standard Tilt-Shift)
* **Perspective**: ZERO PERSPECTIVE DISTORTION — Tilt-Shift Flat Elevation
  * All vertical lines → perfectly VERTICAL in frame
  * All horizontal lines → perfectly HORIZONTAL in frame
  * NO vanishing points. NO three-point perspective.
  * Camera sensor plane PERFECTLY PARALLEL to the target side facade.

${analysisContext}

[GENERATE IMAGE NOW]`;

      } else if (selectedView === 'birdEye') {
        finalPrompt = `# GOAL
* Generate a precise "Bird's-eye Perspective View" of the architecture presented in the source image.
* Treat the building in the image as a completed, constructed reality.
* Change the angle of view to this specific new perspective without altering the building's original geometry, materials, or style.
* Render the simulation strictly by resetting the **Angle of View** and the **Optical Environment**.

# **Photographer's workflow**
A professional drone photography technique for creating a dynamic and hyper-realistic **Bird's-eye Perspective view** of a building, showcasing its roof plane and facades with a natural sense of depth and scale.

This method requires positioning a drone at a **high altitude** and angling the camera downward (typically between **45 to 60 degrees**) relative to the ground. Using a **wide-angle to standard focal length (e.g., 24mm to 35mm)** introduces natural perspective distortion (vanishing points), allowing the building to recede realistically into its surrounding context and emphasizing its three-dimensional volume.

Shoot under **crisp, clear daylight or golden hour lighting** with strong directional sunlight. This lighting is essential to cast defined, natural shadows that carve out the architectural geometry, creating a highly tactile, hyper-realistic atmosphere with rich contrast and deep spatial awareness.

The final image should be rendered in **ultra-high resolution** using High Dynamic Range (HDR) techniques to ensure absolute sharpness and photorealistic detail across both brilliant highlights and deep shadows. Frame the composition in a **16:9 or 4:3 aspect ratio** to provide a cinematic, immersive view of the architecture beautifully anchored within its environment.

# Specification: Bird's-eye Perspective View
* **Shooting Intent**: Uses a drone to capture a hyper-realistic, three-dimensional view of the building integrated within its context. Uses natural perspective to emphasize architectural scale and depth, creating an immersive, true-to-life visual experience.
* **Camera**: DJI Mavic 3 Pro Cine (Drone)
* **Lens**: 24mm Hasselblad Camera (Wide-angle to capture context and natural perspective distortion)
* **Aperture**: f/8 (For maximum edge-to-edge sharpness and deep depth of field)
* **ISO**: 100
* **Shutter Speed**: 1/500 sec (To ensure absolute stability and crisp details from the air)
* **Other Equipment**: Auto Exposure Bracketing (AEB) for hyper-realistic HDR processing and precise GPS hovering.
---

{
  "prompt": {
    "goal": [
      "Generate a precise \\"Bird's-eye Perspective View\\" of the architecture presented in the source image.",
      "Treat the building in the image as a completed, constructed reality.",
      "Change the angle of view to this specific new perspective without altering the building's original geometry, materials, or style.",
      "Render the simulation strictly by resetting the Angle of View and the Optical Environment."
    ],
    "photographers_workflow": {
      "description": "A professional drone photography technique for creating a dynamic and hyper-realistic Bird's-eye Perspective view of a building, showcasing its roof plane and facades with a natural sense of depth and scale.",
      "method": {
        "positioning_and_perspective": "This method requires positioning a drone at a high altitude and angling the camera downward (typically between 45 to 60 degrees) relative to the ground. Using a wide-angle to standard focal length (e.g., 24mm to 35mm) introduces natural perspective distortion (vanishing points), allowing the building to recede realistically into its surrounding context and emphasizing its three-dimensional volume.",
        "lighting": "Shoot under crisp, clear daylight or golden hour lighting with strong directional sunlight. This lighting is essential to cast defined, natural shadows that carve out the architectural geometry, creating a highly tactile, hyper-realistic atmosphere with rich contrast and deep spatial awareness.",
        "rendering_and_composition": "The final image should be rendered in ultra-high resolution using High Dynamic Range (HDR) techniques to ensure absolute sharpness and photorealistic detail across both brilliant highlights and deep shadows. Frame the composition in a 16:9 or 4:3 aspect ratio to provide a cinematic, immersive view of the architecture beautifully anchored within its environment."
      }
    },
    "specification": {
      "view_type": "Bird's-eye Perspective View",
      "details": {
        "shooting_intent": "Uses a drone to capture a hyper-realistic, three-dimensional view of the building integrated within its context. Uses natural perspective to emphasize architectural scale and depth, creating an immersive, true-to-life visual experience.",
        "camera": "DJI Mavic 3 Pro Cine (Drone)",
        "lens": "24mm Hasselblad Camera (Wide-angle to capture context and natural perspective distortion)",
        "aperture": "f/8 (For maximum edge-to-edge sharpness and deep depth of field)",
        "iso": 100,
        "shutter_speed": "1/500 sec (To ensure absolute stability and crisp details from the air)",
        "other_equipment": "Auto Exposure Bracketing (AEB) for hyper-realistic HDR processing and precise GPS hovering."
      }
    }
  }
}

---

## Camera Settings for This Render
* **View Direction**: ${birdEyeDirection} (${birdEyeDirection === '04:30' ? 'Front-Right' : 'Front-Left'})
* **Altitude**: High Drone Altitude (45–60° Downward Angle)
* **Lens**: 24mm (Wide-angle Hasselblad)
* **Perspective**: Two-Point Perspective (Bird's-eye)

${analysisContext}

[GENERATE IMAGE NOW]`;
      }

      // Protocol override: if runtime protocol is loaded, replace hardcoded prompt
      // keeping only the dynamic camera settings appended at the end.
      if (protocolContent) {
        const viewCameraSettings: Partial<Record<ViewType, string>> = {
          eyeLevel: `## Camera Settings for This Render
* **View Direction**: ${eyeLevelDirection} (${eyeLevelDirection === '04:30' ? 'Front-Right Corner' : 'Front-Left Corner'})
* **Altitude**: 1.6m (Eye Level)
* **Lens**: 24-32mm (Wide Tilt-Shift)
* **Perspective**: 2-Point Perspective`,
          front: `## Camera Settings for This Render
* **View Direction**: 06:00 (Direct Front)
* **Altitude**: ${frontAltitude}m
* **Lens**: 50mm (Standard Tilt-Shift)
* **Perspective**: 1-Point Perspective`,
          top: `## Camera Settings for This Render
* **View Direction**: 06:00 (Nadir / Straight Down)
* **Altitude**: 300m
* **Lens**: 24mm
* **Perspective**: Orthographic Projection (True Top-Down)`,
          rightSide: `## TRANSFORMATION DIRECTIVE
* **SOURCE**: Original image — [${analyzedOpticalParams?.angle ?? 'N/A'} position, altitude ${analyzedOpticalParams?.altitude ?? 'N/A'}]
* **TARGET**: ${rightSideDirection} — Flat Side Elevation (측면 입면도)
* ⚠️ DO NOT return or replicate the source image. Generate a COMPLETELY NEW view.
* 건물(Geometry/Materials)은 불변 상수. 카메라 위치·각도는 완전히 재배치 대상.
* 타겟 측면 파사드가 원본에서 미노출 시, 가시적 구조·재료·비례 데이터로 추론·완성.

## Camera Settings for This Render
* **View Direction**: ${rightSideDirection}
  * \`03:00\` = **Right Side Elevation** (우측면 입면도)
  * \`09:00\` = **Left Side Elevation** (좌측면 입면도)
* **Altitude**: ${rightSideAltitude}m
* **Lens**: 50mm (Standard Tilt-Shift)
* **Perspective**: ZERO PERSPECTIVE DISTORTION — Tilt-Shift Flat Elevation
  * All vertical lines → perfectly VERTICAL in frame
  * All horizontal lines → perfectly HORIZONTAL in frame
  * NO vanishing points. NO three-point perspective.
  * Camera sensor plane PERFECTLY PARALLEL to the target side facade.`,
          birdEye: `## Camera Settings for This Render
* **View Direction**: ${birdEyeDirection} (${birdEyeDirection === '04:30' ? 'Front-Right' : 'Front-Left'})
* **Altitude**: High Drone Altitude (45–60° Downward Angle)
* **Lens**: 24mm (Wide-angle Hasselblad)
* **Perspective**: Two-Point Perspective (Bird's-eye)`,
        };
        finalPrompt = `${protocolContent}

---

${viewCameraSettings[selectedView] ?? ''}

${analysisContext}

[GENERATE IMAGE NOW]`;
      }

      // RELIABILITY: Protocol injection guard — prevent empty prompt reaching API
      if (!finalPrompt || !finalPrompt.trim()) {
        alert('프롬프트가 생성되지 않았습니다. 뷰 타입을 확인하거나 페이지를 새로고침하세요.');
        setIsGenerating(false);
        return;
      }

      let actualImageSrc = sourceItem.src;
      if (sourceItem.type === 'generated' && sourceItem.motherId) {
        const motherItem = canvasItems.find(i => i.id === sourceItem.motherId);
        if (motherItem) actualImageSrc = motherItem.src;
      }

      const base64Data = actualImageSrc.split(',')[1];
      const mimeType = actualImageSrc.split(';')[0].split(':')[1];

      const runGeneration = async (modelName: string) => {
        const parts: any[] = [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: finalPrompt },
        ];

        const response = await withTimeout(ai.models.generateContent({
          model: modelName,
          contents: { parts },
        }), 60_000); // image generation: 60s (longer than analysis)

        let foundImage = false;
        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const generatedSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              const img = new Image();
              img.onload = () => {
                const newGenItem: CanvasItem = {
                  id: `gen-${Date.now()}`,
                  type: 'generated',
                  src: generatedSrc,
                  x: sourceItem.x + sourceItem.width + 40,
                  y: sourceItem.y,
                  width: (img.width / img.height) * sourceItem.height,
                  height: sourceItem.height,
                  motherId: sourceItem.motherId || sourceItem.id,
                  parameters: {
                    analyzedOpticalParams: analyzedOpticalParams,
                    analysisReport: trueSource?.parameters?.analysisReport || null,
                  }
                };
                setCanvasItems(prev => {
                  setHistoryStates(prevH => [...prevH, prev]);
                  setFutureStates([]);
                  let currentX = sourceItem.x + sourceItem.width + 12;
                  let currentY = sourceItem.y;
                  let hasOverlap = true;
                  while (hasOverlap) {
                    hasOverlap = false;
                    for (const item of prev) {
                      if (
                        currentX < item.x + item.width &&
                        currentX + newGenItem.width > item.x &&
                        currentY < item.y + item.height &&
                        currentY + newGenItem.height > item.y
                      ) {
                        currentX = item.x + item.width + 12;
                        hasOverlap = true;
                        break;
                      }
                    }
                  }
                  newGenItem.x = currentX;
                  newGenItem.y = currentY;
                  return [...prev, newGenItem];
                });
                setSelectedItemId(newGenItem.id);
                // Phase 4: auto conformance check (non-blocking)
                if (protocolComplianceCheck && selectedView) {
                  verifyConformance(
                    newGenItem.id,
                    part.inlineData!.data!,
                    part.inlineData!.mimeType!,
                    protocolComplianceCheck,
                    analysisContext,
                    selectedView,
                  );
                }
              };
              img.src = generatedSrc;
              foundImage = true;
              break;
            }
          }
        }
        return foundImage;
      };

      try {
        const success = await runGeneration(IMAGE_GEN);
        if (!success) throw new Error("Text returned instead of image");
      } catch (primaryError) {
        console.warn(`Primary model (${IMAGE_GEN}) failed, retrying with fallback...`, primaryError);
        const success = await runGeneration(IMAGE_GEN_FALLBACK);
        if (!success) {
          alert("Failed to generate image with both primary and fallback models.");
        }
      }

    } catch (error) {
      console.error("Generation Error:", error);
      alert("An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="h-[100dvh] w-full flex flex-col bg-white dark:bg-black text-black dark:text-white font-sans transition-colors duration-300 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-hidden">
      {/* HEADER */}
      <header className="h-16 shrink-0 flex justify-between items-center px-4 border-b border-black/10 dark:border-white/10 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <span className="text-[1.575rem] font-display font-bold tracking-[0.0125em] uppercase leading-tight pt-1">C</span>
          <span className="text-[1.575rem] font-display font-bold tracking-[0.0125em] uppercase leading-tight pt-1">CHANGE VIEWPOINT V2</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs leading-normal tracking-wide uppercase">
          <button onClick={toggleTheme} className="hover:opacity-60 transition-opacity">
            {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex flex-1 min-h-0 w-full flex-col landscape:flex-row overflow-hidden relative">
        
        <section 
          ref={canvasRef as React.RefObject<HTMLElement>}
          className={`flex-1 min-w-0 relative bg-[#fcfcfc] dark:bg-[#050505] overflow-hidden flex items-center justify-center transition-colors duration-300 select-none touch-none
            ${canvasMode === 'pan' 
              ? (isDraggingPan ? 'cursor-grabbing' : 'cursor-grab') 
              : (isDraggingItem ? 'cursor-move' : 'cursor-default')
            }`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDragStart={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >

          <div className={`
            absolute left-[12px] top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1
            bg-white/90 border border-black/50 shadow-xl dark:bg-black/90 dark:border-white/50 pointer-events-auto
            transition-all duration-300 rounded-full py-2 w-11 backdrop-blur-sm
          `}>
            {/* 1. 도구 모드 (Select / Pan) */}
            <button 
              onClick={() => setCanvasMode('select')}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${canvasMode === 'select' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Select Mode"
            >
              <MousePointer2 size={18} />
            </button>
            <button 
              onClick={() => {
                setCanvasMode('pan');
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${canvasMode === 'pan' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Pan Mode"
            >
              <Hand size={18} />
            </button>

            {/* V75: Undo / Redo Buttons */}
            <div className="w-6 h-[1px] bg-black/10 dark:bg-white/10 my-1" />
            <button
              onClick={handleUndo}
              disabled={historyStates.length === 0}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${historyStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Undo"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={futureStates.length === 0}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${futureStates.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Redo"
            >
              <Redo size={18} />
            </button>
          </div>

          {/* V71: Dynamic Horizontal Control Bar (Upload + Zoom + Compass) */}
          <div 
            className={`
              absolute bottom-[12px] z-30 flex items-center
              bg-white/90 border border-black/50 shadow-xl dark:bg-black/90 dark:border-white/50 pointer-events-auto
              transition-all duration-500 ease-in-out rounded-full overflow-hidden h-11 backdrop-blur-sm
            `}
            style={{
              left: isRightPanelOpen ? '50%' : 'calc(100% - 12px)',
              transform: isRightPanelOpen ? 'translateX(-50%)' : 'translateX(-100%)',
              whiteSpace: 'nowrap'
            }}
          >
            {/* 1. 이미지 업로드 버튼 */}
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

            {/* 2. 돋보기 / 초기화 */}
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

            {/* 3. 줌 컨트롤 */}
            <div className="flex px-1 select-none items-center">
              <button onClick={() => zoomStep(-1)} className="w-10 h-full flex items-center justify-center font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Zoom Out">−</button>
              <div className="min-w-[60px] h-full flex items-center justify-center font-mono text-sm px-1 font-bold">{Math.round(canvasZoom)}%</div>
              <button onClick={() => zoomStep(1)} className="w-10 h-full flex items-center justify-center font-mono text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Zoom In">+</button>
            </div>

            <div className="w-[1px] h-7 bg-black/10 dark:bg-white/10" />

            {/* 4. 나침반 (패널 토글) */}
            <div className="flex px-1">
              <button 
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className={`w-10 h-9 flex items-center justify-center transition-colors ${
                  isRightPanelOpen 
                    ? 'bg-black text-white dark:bg-white dark:text-black rounded-full' 
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="Toggle Panel"
              >
                <Compass size={18} />
              </button>
            </div>
          </div>

          {/* Infinite Composite Grid Background (Dynamic size based on zoom) */}
          <div 
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(128,128,128,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(128,128,128,0.1) 1px, transparent 1px),
                linear-gradient(to right, rgba(128,128,128,0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(128,128,128,0.2) 1px, transparent 1px)
              `,
              backgroundSize: `
                ${12 * (canvasZoom / 100)}px ${12 * (canvasZoom / 100)}px,
                ${12 * (canvasZoom / 100)}px ${12 * (canvasZoom / 100)}px,
                ${60 * (canvasZoom / 100)}px ${60 * (canvasZoom / 100)}px,
                ${60 * (canvasZoom / 100)}px ${60 * (canvasZoom / 100)}px
              `,
              backgroundPosition: `
                calc(50% + ${canvasOffset.x}px) calc(50% + ${canvasOffset.y}px),
                calc(50% + ${canvasOffset.x}px) calc(50% + ${canvasOffset.y}px),
                calc(50% + ${canvasOffset.x}px) calc(50% + ${canvasOffset.y}px),
                calc(50% + ${canvasOffset.x}px) calc(50% + ${canvasOffset.y}px)
              `
            }}
          />

          {/* Transform Wrapper */}
          <div 
            style={{ 
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom / 100})`,
              transformOrigin: 'center center',
              willChange: 'transform'
            }}
            className="w-full h-full flex items-center justify-center relative touch-none pointer-events-none z-10"
          >
            {/* Render Canvas Items (V56: Standardized Center-Origin Rendering) */}
            {canvasItems.map((item) => (
              <div 
                key={item.id}
                style={{ 
                  position: 'absolute',
                  // V56 Fix: Align item 0,0 with screen center (50%) to match getCanvasCoords math
                  left: `calc(50% + ${item.x}px)`,
                  top: `calc(50% + ${item.y}px)`,
                  width: item.width,
                  height: item.height,
                  zIndex: selectedItemId === item.id ? 20 : 10,
                  // Disable pointer events on items during PAN mode to allow background panning
                  pointerEvents: canvasMode === 'pan' ? 'none' : 'auto'
                }}
              >
                <img 
                  src={item.src} 
                  alt={item.id} 
                  className="w-full h-full object-contain pointer-events-none shadow-xl border border-black/5 dark:border-white/5"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
                
                {/* Selection Overlay (Blue Border & Circle Handles) */}
                {selectedItemId === item.id && (
                  <div 
                    className="absolute -inset-[1px] pointer-events-none border-[#1d4ed8] z-[30]"
                    style={{ 
                      // 1.2pt ≈ 1.6px
                      borderWidth: `${1.6 / (canvasZoom / 100)}px`
                    }}
                  >
                    {/* V80/V81: Floating Control Bar for All Images */}
                    <div 
                      className={`absolute flex items-center bg-white/70 dark:bg-black/70 backdrop-blur-md z-[40] divide-x divide-black/10 dark:divide-white/10 rounded-2xl shadow-sm ${canvasMode === 'pan' ? 'pointer-events-none' : 'pointer-events-auto'}`}
                      style={{
                        top: `-${48 / (canvasZoom / 100)}px`, // 36px height + 12px padding scaled inversely
                        right: 0,
                        height: `${36 / (canvasZoom / 100)}px`,
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {item.type === 'upload' && (
                        /* V32: Re-analyze button for uploaded images only */
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
                        /* V82: Add Download button for generated images */
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
                        onClick={() => {
                          setHistoryStates(prevH => [...prevH, canvasItems]);
                          setFutureStates([]);
                          setCanvasItems(prev => prev.filter(i => i.id !== item.id && i.motherId !== item.id));
                          setSelectedItemId(null);
                        }}
                        className="flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 rounded-r-2xl"
                        style={{ width: `${40 / (canvasZoom / 100)}px`, height: '100%' }}
                        title="삭제"
                      >
                        <Trash2 size={12 / (canvasZoom / 100)} />
                      </button>
                    </div>

                    {/* Item-bound Library Artboard — #.정보분석샘플 */}
                    {openLibraryItemId === item.id && (() => {
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
                                    {[['촬영 시점', s1.viewpoint], ['방위각', s1.azimuth], ['촬영 고도', s1.altitude], ['투시 왜곡', s1.perspective], ['센서 포맷', s1.sensor], ['초점 거리', s1.focal_length], ['광원 및 날씨', s1.lighting], ['대비 강도', s1.contrast]].map(([k, v]) => (
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
                                    {[['외피 시스템', s2.skin], ['내부 파사드', s2.inner], ['외부 파사드', s2.outer], ['기본 매스', s2.mass], ['하층부 1F', s2.base_1f], ['중층부', s2.mid_body], ['상층부 Roof', s2.roof]].map(([k, v]) => (
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
                                    {[['디자인 알고리즘', s3.design_algorithm], ['주조색', s3.color_palette], ['형태 모티브', s3.form_motif], ['형태적 대비', s3.form_contrast], ['감성적 대비', s3.mood_contrast]].map(([k, v]) => (
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

                          {/* Section 4 — Conformance Report (generated items only) */}
                          {item.type === 'generated' && (() => {
                            const cr = item.parameters?.conformanceReport;
                            const resultColor = cr?.overallResult === 'PASS'
                              ? 'text-green-600 dark:text-green-400'
                              : cr?.overallResult === 'FAIL'
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-yellow-500 dark:text-yellow-400';
                            return (
                              <div className="border-t border-black/10 dark:border-white/10 pt-4">
                                <div className="font-mono font-bold uppercase tracking-widest opacity-60 mb-2" style={{ fontSize: `${9 * scale}px` }}>
                                  섹션 4. 정합성 검토 (Conformance Check)
                                </div>
                                {cr ? (
                                  <>
                                    <div className={`font-mono font-bold uppercase tracking-widest mb-3 ${resultColor}`} style={{ fontSize: `${11 * scale}px` }}>
                                      {cr.overallResult} — {cr.viewType} / {cr.sessionDate}
                                    </div>
                                    <table className="w-full border-collapse">
                                      <tbody>
                                        {cr.items.map((ci, idx) => (
                                          <tr key={idx} className="border-b border-black/5 dark:border-white/5">
                                            <td className="py-1 pr-2 align-top" style={{ width: `${16 * scale}px` }}>
                                              <span className={`font-mono font-bold ${ci.result === 'PASS' ? 'text-green-500' : ci.result === 'FAIL' ? 'text-red-500' : 'text-yellow-500'}`}>
                                                {ci.result === 'PASS' ? '✓' : ci.result === 'FAIL' ? '✗' : '△'}
                                              </span>
                                            </td>
                                            <td className="py-1">
                                              <div className="font-mono opacity-70">{ci.check}</div>
                                              {ci.note && <div className="font-mono opacity-40 mt-0.5">{ci.note}</div>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </>
                                ) : (
                                  <div className="font-mono opacity-40 uppercase tracking-widest" style={{ fontSize: `${9 * scale}px` }}>
                                    Conformance Check In Progress...
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ); })()}

                    {isGenerating && selectedItemId === item.id && (item.motherId === item.id || !item.motherId) && (
                      <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md pointer-events-auto">
                        <Loader2 className="animate-spin text-black w-12 h-12" />
                      </div>
                    )}
                    {/* Corner Handles (Scale Invariant Circles, 4-corner resizable) */}
                    {[
                      { top: true,    left: true,  cursor: 'nwse-resize' }, // top-left
                      { top: true,    right: true, cursor: 'nesw-resize' }, // top-right
                      { bottom: true, left: true,  cursor: 'nesw-resize' }, // bottom-left
                      { bottom: true, right: true, cursor: 'nwse-resize' }, // bottom-right
                    ].map((pos, idx) => {
                      const s = 1 / (canvasZoom / 100);
                      const size = 12 * s;
                      const style: any = {
                        width: size,
                        height: size,
                        borderWidth: 1.6 * s,
                        position: 'absolute',
                        backgroundColor: 'white',
                        borderColor: '#808080',
                        borderRadius: '999px',
                        top: pos.top ? -size / 2 : 'auto',
                        bottom: pos.bottom ? -size / 2 : 'auto',
                        left: pos.left ? -size / 2 : 'auto',
                        right: pos.right ? -size / 2 : 'auto',
                        pointerEvents: 'auto',
                        cursor: pos.cursor,
                      };
                      return <div key={idx} style={style} />;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Loading Overlay Deleted in V82 */}
        </section>

        {/* RIGHT SIDEBAR WRAPPER (V55: More compact, absolute fixed center) */}
        <div className="absolute top-0 right-0 h-full z-50 pointer-events-none flex justify-end p-[12px]">
          <div className={`
            relative h-full transition-all duration-500 ease-in-out flex items-center
            ${isRightPanelOpen ? 'w-[284px]' : 'w-0'}
          `}>
            {/* FLOATING PANEL - V59: Target Transparency (10% / 90% opacity) */}
            <div className={`w-full h-full overflow-hidden transition-all duration-500 ${isRightPanelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <aside 
                className="h-full w-[284px] rounded-[20px] flex flex-col overflow-hidden pointer-events-auto border border-black/50 shadow-xl dark:border-white/50 bg-white/90 dark:bg-black/90 backdrop-blur-sm"
              >
                {/* Sidebar Content Wrapper */}
                <div className={`flex flex-col h-full overflow-hidden transition-opacity duration-200 ${isRightPanelOpen ? 'opacity-100 delay-150' : 'opacity-0'}`}>

                  {/* V25: Dot Navigation Removed */}
                  <div className="pt-1.5 pb-0" />

                  <div className="flex flex-col gap-4 p-5 flex-1 min-h-0">
                    {/* Viewpoint Diagram */}
                    <div className="flex flex-col">
                      <div className="font-mono text-xs font-bold tracking-wide uppercase mb-3 opacity-70">Viewpoint</div>
                      <SitePlanDiagram
                        angle={
                          selectedView === 'birdEye' ? birdEyeDirection :
                          selectedView === 'eyeLevel' ? eyeLevelDirection :
                          selectedView === 'rightSide' ? rightSideDirection :
                          '06:00'
                        }
                        lens={selectedView === 'top' ? 24 : selectedView === 'front' || selectedView === 'rightSide' ? 50 : 24}
                        isAnalyzing={isAnalyzing}
                        analysisStep={analysisStep}
                        visibleV0Index={null}
                      />
                    </div>

                    {/* Analysis Result Summary — always visible */}
                    <div className="flex flex-col gap-1 font-mono text-[10px] opacity-60 border-t border-black/10 dark:border-white/10 pt-3">
                      <div className="font-bold uppercase tracking-widest mb-1 opacity-100">Analysis</div>
                      <div className="flex justify-between"><span>Angle</span><span className="font-bold">{analyzedOpticalParams?.angle ?? 'none'}</span></div>
                      <div className="flex justify-between"><span>Altitude</span><span className="font-bold truncate ml-2 text-right">{analyzedOpticalParams?.altitude ?? 'none'}</span></div>
                      <div className="flex justify-between"><span>Lens</span><span className="font-bold truncate ml-2 text-right">{analyzedOpticalParams?.lens ?? 'none'}</span></div>
                    </div>

                    {/* View Selection — always visible, internal scroll */}
                    <div className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 pt-3 overflow-y-auto [&::-webkit-scrollbar]:hidden flex-1 min-h-0">
                      <div className="font-mono text-xs font-bold tracking-wide uppercase opacity-70 mb-1">View</div>
                      {(['birdEye', 'eyeLevel', 'front', 'rightSide', 'top'] as ViewType[]).map((v) => {
                        const label = v === 'birdEye' ? "Bird's eye view" : v === 'eyeLevel' ? 'Perspective view' : v === 'front' ? 'Front View' : v === 'rightSide' ? 'Right / Left View' : 'Top view';
                        return (
                          <button
                            key={v}
                            onClick={() => setSelectedView(v)}
                            className={`w-full py-1.5 font-mono text-xs tracking-wide uppercase border transition-all ${selectedView === v ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black' : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'}`}
                          >
                            {label}
                          </button>
                        );
                      })}

                      {/* Sub-options */}
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
                      {selectedView === 'top' && (
                        <div className="font-mono text-[10px] opacity-50 text-center mt-1">06:00 / 300m / 24mm</div>
                      )}
                    </div>
                  </div>

                {/* BOTTOM ACTION */}
                <div className="p-5 mt-auto">
                  {(() => {
                    const selItem = canvasItems.find(i => i.id === selectedItemId);
                    if (!selItem) return null;
                    if (selItem.parameters?.analyzedOpticalParams || selItem.type === 'generated') {
                      return (
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating || !selectedView}
                          className="relative w-full border border-black dark:border-white py-2 font-display tracking-widest uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className={`block transition-opacity ${isGenerating ? 'opacity-0' : 'opacity-100'}`}>Generate</span>
                          {isGenerating && (
                            <span className="absolute inset-0 flex items-center justify-center gap-1.5">
                              <Loader2 size={18} className="animate-spin" />
                              <span className="text-[10px] font-mono tabular-nums">{generatingElapsed}s</span>
                            </span>
                          )}
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={() => analyzeViewpoint(selItem.src, selItem.id)}
                        disabled={isAnalyzing}
                        className="w-full border border-black dark:border-white py-2 font-display tracking-widest uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-30"
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analysis'}
                      </button>
                    );
                  })()}
                  <p className="font-mono text-[9px] opacity-40 text-center mt-4 tracking-tighter">
                    © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
