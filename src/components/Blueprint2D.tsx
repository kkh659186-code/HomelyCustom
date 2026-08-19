import React, { useRef, useState, useEffect } from "react";
import {
  PlacedItem,
  ProductItem,
  RoomSettings,
  RoomTheme,
  WallOpening,
  WallOrientation,
  OpeningType,
  FloorType,
  WallFinish,
} from "../types";
import { MOCK_PRODUCTS, POPULAR_COLOR_PALETTES, getProductById } from "../data/mockProducts";
import {
  RotateCw,
  Trash2,
  Copy,
  Compass,
  Palette,
  Check,
  DoorOpen,
  Move,
  Maximize2,
  Sparkles,
  ArrowUpDown,
  ArrowLeftRight,
  Layers,
  ArrowUp,
  ArrowDown,
  Anchor,
} from "lucide-react";
import { detectSurfaceBeneath } from "../utils/surfaceSnapping";

interface Blueprint2DProps {
  roomSettings: RoomSettings;
  onUpdateRoomSettings: (settings: Partial<RoomSettings>) => void;
  placedItems: PlacedItem[];
  selectedInstanceId: string | null;
  onSelectItem: (instanceId: string | null) => void;
  onUpdateItemPosition: (instanceId: string, x: number, y: number) => void;
  onUpdateItemRotation: (instanceId: string, rotation: number) => void;
  onUpdateItemColor?: (instanceId: string, colorHex: string, materialName?: string) => void;
  onRemoveItem: (instanceId: string) => void;
  onDuplicateItem?: (instanceId: string) => void;
  currentTheme: RoomTheme;
  onAddOpening?: (opening: Omit<WallOpening, "id">) => void;
  onUpdateOpening?: (id: string, patch: Partial<WallOpening>) => void;
  onRemoveOpening?: (id: string) => void;
  onSpawnProduct?: (productId: string, x?: number, y?: number) => void;
  onUpdateItemElevation?: (instanceId: string, z: number) => void;
  onSnapItemToSurface?: (instanceId: string) => void;
  onDropItemToFloor?: (instanceId: string) => void;
}

export const Blueprint2D: React.FC<Blueprint2DProps> = ({
  roomSettings,
  onUpdateRoomSettings,
  placedItems,
  selectedInstanceId,
  onSelectItem,
  onUpdateItemPosition,
  onUpdateItemRotation,
  onUpdateItemColor,
  onRemoveItem,
  onDuplicateItem,
  currentTheme,
  onAddOpening,
  onUpdateOpening,
  onRemoveOpening,
  onSpawnProduct,
  onUpdateItemElevation,
  onSnapItemToSurface,
  onDropItemToFloor,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction States
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isRotatingItem, setIsRotatingItem] = useState(false);
  const [dragStartCoords, setDragStartCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [itemInitialPos, setItemInitialPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Interactive Wall Dragging (Resizing Room by Dragging Walls or Corners)
  const [wallDragState, setWallDragState] = useState<{
    isDragging: boolean;
    wall: "north" | "south" | "east" | "west" | "nw" | "ne" | "se" | "sw" | null;
    startMouse: { x: number; y: number };
    startW: number;
    startL: number;
  }>({
    isDragging: false,
    wall: null,
    startMouse: { x: 0, y: 0 },
    startW: roomSettings.width,
    startL: roomSettings.length,
  });

  // Interactive Placed Door / Window Dragging along Walls
  const [openingDragState, setOpeningDragState] = useState<{
    isDragging: boolean;
    openingId: string | null;
    currentWall: WallOrientation;
    currentPos: number;
  }>({
    isDragging: false,
    openingId: null,
    currentWall: "south",
    currentPos: 0.5,
  });
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);

  // External Drag-and-Drop Previews
  const [dropHoverState, setDropHoverState] = useState<{
    isOverCanvas: boolean;
    targetType: "floor" | "wall" | "opening" | "furniture" | null;
    wall?: WallOrientation;
    wallPos?: number;
    label?: string;
    coords?: { x: number; y: number };
    openingTemplate?: any;
    floorData?: any;
    wallData?: any;
  }>({
    isOverCanvas: false,
    targetType: null,
  });

  // Action toast notification
  const [actionToast, setActionToast] = useState<{ text: string; icon?: string } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActionToast({ text });
    toastTimeoutRef.current = setTimeout(() => setActionToast(null), 2400);
  };

  // Pixels per meter scale
  const SCALE = 70; // 1 meter = 70 SVG units

  const { width: roomW, length: roomL } = roomSettings;
  const roomPixelW = roomW * SCALE;
  const roomPixelL = roomL * SCALE;

  // ViewBox bounds centered at (0, 0)
  const pad = 140;
  const viewBoxW = Math.max(roomPixelW + pad * 2, 600);
  const viewBoxH = Math.max(roomPixelL + pad * 2, 500);
  const minX = -viewBoxW / 2;
  const minY = -viewBoxH / 2;

  const selectedItem = placedItems.find((p) => p.instanceId === selectedInstanceId);
  const selectedProduct = selectedItem ? MOCK_PRODUCTS.find((p) => p.id === selectedItem.productId) : null;
  const selectedOpening = roomSettings.openings?.find((op) => op.id === selectedOpeningId);

  // Coordinate Conversion: Screen to World Meters
  const getPointerWorldCoords = (e: React.MouseEvent | React.DragEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * viewBoxW + minX;
    const svgY = ((e.clientY - rect.top) / rect.height) * viewBoxH + minY;
    return {
      x: svgX / SCALE,
      y: svgY / SCALE,
    };
  };

  // ----------------------------------------------------
  // ITEM DRAG & ROTATE HANDLERS
  // ----------------------------------------------------
  const handlePointerDownItem = (e: React.MouseEvent, instanceId: string) => {
    e.stopPropagation();
    onSelectItem(instanceId);
    setSelectedOpeningId(null);

    const placed = placedItems.find((p) => p.instanceId === instanceId);
    if (!placed) return;

    const coords = getPointerWorldCoords(e);
    setIsDraggingItem(true);
    setDragStartCoords(coords);
    setItemInitialPos({ x: placed.x, y: placed.y });
  };

  const handlePointerDownRotateHandle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotatingItem(true);
  };

  // ----------------------------------------------------
  // WALL DRAG & RESIZE HANDLERS
  // ----------------------------------------------------
  const handleStartWallDrag = (
    e: React.MouseEvent,
    wall: "north" | "south" | "east" | "west" | "nw" | "ne" | "se" | "sw"
  ) => {
    e.stopPropagation();
    const coords = getPointerWorldCoords(e);
    setWallDragState({
      isDragging: true,
      wall,
      startMouse: coords,
      startW: roomSettings.width,
      startL: roomSettings.length,
    });
  };

  // ----------------------------------------------------
  // PLACED OPENING (DOOR/WINDOW) DRAG HANDLERS
  // ----------------------------------------------------
  const handleStartOpeningDrag = (e: React.MouseEvent, opening: WallOpening) => {
    e.stopPropagation();
    setSelectedOpeningId(opening.id);
    onSelectItem(null);
    setOpeningDragState({
      isDragging: true,
      openingId: opening.id,
      currentWall: opening.wall,
      currentPos: opening.position,
    });
  };

  // ----------------------------------------------------
  // GENERAL MOUSE MOVE (Items, Walls, Openings)
  // ----------------------------------------------------
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getPointerWorldCoords(e);

    // 1. Dragging placed furniture item
    if (isDraggingItem && selectedInstanceId) {
      const deltaX = coords.x - dragStartCoords.x;
      const deltaY = coords.y - dragStartCoords.y;

      let newX = itemInitialPos.x + deltaX;
      let newY = itemInitialPos.y + deltaY;

      if (snapToGrid) {
        newX = Math.round(newX * 10) / 10;
        newY = Math.round(newY * 10) / 10;
      }

      const clampX = Math.max(-roomW / 2 + 0.2, Math.min(roomW / 2 - 0.2, newX));
      const clampY = Math.max(-roomL / 2 + 0.2, Math.min(roomL / 2 - 0.2, newY));

      onUpdateItemPosition(selectedInstanceId, clampX, clampY);
    }
    // 2. Rotating placed furniture item
    else if (isRotatingItem && selectedItem) {
      const dx = coords.x - selectedItem.x;
      const dy = coords.y - selectedItem.y;
      let angleRad = Math.atan2(dy, dx);
      let angleDeg = Math.round((angleRad * 180) / Math.PI) + 90;
      if (angleDeg < 0) angleDeg += 360;

      if (snapToGrid) {
        angleDeg = Math.round(angleDeg / 15) * 15;
      }

      onUpdateItemRotation(selectedItem.instanceId, angleDeg % 360);
    }
    // 3. Dragging Wall edges to resize room
    else if (wallDragState.isDragging && wallDragState.wall) {
      const deltaX = coords.x - wallDragState.startMouse.x;
      const deltaY = coords.y - wallDragState.startMouse.y;
      const wall = wallDragState.wall;

      let newW = wallDragState.startW;
      let newL = wallDragState.startL;

      if (wall === "north") {
        newL = wallDragState.startL - deltaY * 2;
      } else if (wall === "south") {
        newL = wallDragState.startL + deltaY * 2;
      } else if (wall === "east") {
        newW = wallDragState.startW + deltaX * 2;
      } else if (wall === "west") {
        newW = wallDragState.startW - deltaX * 2;
      } else if (wall === "ne") {
        newW = wallDragState.startW + deltaX * 2;
        newL = wallDragState.startL - deltaY * 2;
      } else if (wall === "se") {
        newW = wallDragState.startW + deltaX * 2;
        newL = wallDragState.startL + deltaY * 2;
      } else if (wall === "sw") {
        newW = wallDragState.startW - deltaX * 2;
        newL = wallDragState.startL + deltaY * 2;
      } else if (wall === "nw") {
        newW = wallDragState.startW - deltaX * 2;
        newL = wallDragState.startL - deltaY * 2;
      }

      if (snapToGrid) {
        newW = Math.round(newW * 10) / 10;
        newL = Math.round(newL * 10) / 10;
      }

      const clampedW = Math.max(2.5, Math.min(18.0, Number(newW.toFixed(1))));
      const clampedL = Math.max(2.5, Math.min(18.0, Number(newL.toFixed(1))));

      if (clampedW !== roomSettings.width || clampedL !== roomSettings.length) {
        onUpdateRoomSettings({ width: clampedW, length: clampedL });
      }
    }
    // 4. Dragging placed Door / Window along walls or between walls
    else if (openingDragState.isDragging && openingDragState.openingId && onUpdateOpening) {
      // Calculate closest wall to cursor
      const distNorth = Math.abs(coords.y - -roomL / 2);
      const distSouth = Math.abs(coords.y - roomL / 2);
      const distWest = Math.abs(coords.x - -roomW / 2);
      const distEast = Math.abs(coords.x - roomW / 2);

      const minDist = Math.min(distNorth, distSouth, distWest, distEast);
      let targetWall: WallOrientation = "south";
      let posFraction = 0.5;

      if (minDist === distNorth) {
        targetWall = "north";
        posFraction = (coords.x - -roomW / 2) / roomW;
      } else if (minDist === distSouth) {
        targetWall = "south";
        posFraction = (coords.x - -roomW / 2) / roomW;
      } else if (minDist === distWest) {
        targetWall = "west";
        posFraction = (coords.y - -roomL / 2) / roomL;
      } else {
        targetWall = "east";
        posFraction = (coords.y - -roomL / 2) / roomL;
      }

      if (snapToGrid) {
        posFraction = Math.round(posFraction * 20) / 20; // 5% increments
      }
      posFraction = Math.max(0.1, Math.min(0.9, posFraction));

      setOpeningDragState((prev) => ({
        ...prev,
        currentWall: targetWall,
        currentPos: posFraction,
      }));

      onUpdateOpening(openingDragState.openingId, {
        wall: targetWall,
        position: posFraction,
      });
    }
  };

  const handleMouseUp = () => {
    if (wallDragState.isDragging) {
      showToast(`Room Wall Updated: ${roomSettings.width}m × ${roomSettings.length}m`);
    }
    if (openingDragState.isDragging && openingDragState.openingId) {
      showToast(`Door Relocated on ${openingDragState.currentWall.toUpperCase()} Wall`);
    }

    setIsDraggingItem(false);
    setIsRotatingItem(false);
    setWallDragState({
      isDragging: false,
      wall: null,
      startMouse: { x: 0, y: 0 },
      startW: roomSettings.width,
      startL: roomSettings.length,
    });
    setOpeningDragState((prev) => ({ ...prev, isDragging: false }));
  };

  // ----------------------------------------------------
  // HTML5 DRAG AND DROP HANDLERS (From Sidebar onto Canvas)
  // ----------------------------------------------------
  const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    const coords = getPointerWorldCoords(e);
    const inFloorX = coords.x >= -roomW / 2 && coords.x <= roomW / 2;
    const inFloorY = coords.y >= -roomL / 2 && coords.y <= roomL / 2;

    // Detect wall proximity
    const distNorth = Math.abs(coords.y - -roomL / 2);
    const distSouth = Math.abs(coords.y - roomL / 2);
    const distWest = Math.abs(coords.x - -roomW / 2);
    const distEast = Math.abs(coords.x - roomW / 2);
    const minDist = Math.min(distNorth, distSouth, distWest, distEast);

    let targetWall: WallOrientation = "south";
    let wallPos = 0.5;

    if (minDist === distNorth) {
      targetWall = "north";
      wallPos = (coords.x - -roomW / 2) / roomW;
    } else if (minDist === distSouth) {
      targetWall = "south";
      wallPos = (coords.x - -roomW / 2) / roomW;
    } else if (minDist === distWest) {
      targetWall = "west";
      wallPos = (coords.y - -roomL / 2) / roomL;
    } else {
      targetWall = "east";
      wallPos = (coords.y - -roomL / 2) / roomL;
    }

    wallPos = Math.max(0.1, Math.min(0.9, Math.round(wallPos * 20) / 20));

    // Try reading types if set
    setDropHoverState((prev) => ({
      ...prev,
      isOverCanvas: true,
      wall: targetWall,
      wallPos,
      coords,
    }));
  };

  const handleDragLeave = () => {
    setDropHoverState({
      isOverCanvas: false,
      targetType: null,
    });
  };

  const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    const coords = getPointerWorldCoords(e);

    // 1. Check Floor Drop
    const floorDataStr = e.dataTransfer.getData("application/homely-floor");
    if (floorDataStr) {
      try {
        const data = JSON.parse(floorDataStr);
        onUpdateRoomSettings({
          floorType: data.floorType as FloorType,
          floorColor: data.floorColor || roomSettings.floorColor,
        });
        showToast(`✨ Applied Flooring: ${data.name || data.floorType}`);
        setDropHoverState({ isOverCanvas: false, targetType: null });
        return;
      } catch (err) {
        console.error("Floor drop error", err);
      }
    }

    // 2. Check Door / Window Opening Drop
    const openingDataStr = e.dataTransfer.getData("application/homely-opening");
    if (openingDataStr && onAddOpening) {
      try {
        const data = JSON.parse(openingDataStr);

        // Find closest wall
        const distNorth = Math.abs(coords.y - -roomL / 2);
        const distSouth = Math.abs(coords.y - roomL / 2);
        const distWest = Math.abs(coords.x - -roomW / 2);
        const distEast = Math.abs(coords.x - roomW / 2);
        const minDist = Math.min(distNorth, distSouth, distWest, distEast);

        let targetWall: WallOrientation = "south";
        let wallPos = 0.5;

        if (minDist === distNorth) {
          targetWall = "north";
          wallPos = (coords.x - -roomW / 2) / roomW;
        } else if (minDist === distSouth) {
          targetWall = "south";
          wallPos = (coords.x - -roomW / 2) / roomW;
        } else if (minDist === distWest) {
          targetWall = "west";
          wallPos = (coords.y - -roomL / 2) / roomL;
        } else {
          targetWall = "east";
          wallPos = (coords.y - -roomL / 2) / roomL;
        }

        wallPos = Math.max(0.1, Math.min(0.9, Math.round(wallPos * 20) / 20));

        onAddOpening({
          wall: targetWall,
          position: wallPos,
          width: data.width || 0.9,
          height: data.height || 2.1,
          elevation: data.elevation || 0,
          type: data.type || "door",
          label: data.name || "Architectural Opening",
          swingDirection: "inward_left",
        });

        showToast(`🚪 Added ${data.name || "Door"} to ${targetWall.toUpperCase()} Wall`);
        setDropHoverState({ isOverCanvas: false, targetType: null });
        return;
      } catch (err) {
        console.error("Opening drop error", err);
      }
    }

    // 3. Check Wall Material / Color Drop
    const wallDataStr = e.dataTransfer.getData("application/homely-wall-material");
    if (wallDataStr) {
      try {
        const data = JSON.parse(wallDataStr);
        onUpdateRoomSettings({
          wallFinish: data.finish as WallFinish,
          wallColor: data.color || roomSettings.wallColor,
        });
        showToast(`🧱 Wall Finish Applied: ${data.name || data.finish}`);
        setDropHoverState({ isOverCanvas: false, targetType: null });
        return;
      } catch (err) {
        console.error("Wall finish drop error", err);
      }
    }

    // 4. Check Product Drop
    const productDataStr = e.dataTransfer.getData("application/homely-product");
    if (productDataStr && onSpawnProduct) {
      try {
        const data = JSON.parse(productDataStr);
        const clampX = Math.max(-roomW / 2 + 0.3, Math.min(roomW / 2 - 0.3, coords.x));
        const clampY = Math.max(-roomL / 2 + 0.3, Math.min(roomL / 2 - 0.3, coords.y));
        onSpawnProduct(data.productId, clampX, clampY);
        showToast(`🛋️ Placed item in room`);
        setDropHoverState({ isOverCanvas: false, targetType: null });
        return;
      } catch (err) {
        console.error("Product drop error", err);
      }
    }

    setDropHoverState({ isOverCanvas: false, targetType: null });
  };

  const wallThick = 14;

  return (
    <div
      className="relative w-full h-full bg-[#0A0A0A] select-none overflow-hidden flex items-center justify-center"
      onMouseUp={handleMouseUp}
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#121212]/95 text-[#E5E5E5] px-3.5 py-2 rounded-xl backdrop-blur-md border border-[#2D2D2D] shadow-xl text-xs">
        <div className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-white">2D Blueprint CAD</span>
        </div>
        <div className="h-4 w-px bg-[#2D2D2D]"></div>
        <label className="flex items-center gap-1.5 cursor-pointer text-[#888] hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
            className="rounded border-[#2D2D2D] text-indigo-600 focus:ring-0 bg-[#1A1A1A]"
          />
          <span className="font-medium">10cm Grid Snap</span>
        </label>
        <div className="h-4 w-px bg-[#2D2D2D]"></div>
        <div className="text-[11px] text-indigo-300 font-mono flex items-center gap-1">
          <span>
            {roomW.toFixed(2)}m × {roomL.toFixed(2)}m
          </span>
          <span className="text-[#666]">({(roomW * roomL).toFixed(1)} m²)</span>
        </div>
      </div>

      {/* Drag & Drop Instruction Hint Badge */}
      <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-2 bg-[#141414]/90 border border-[#282828] px-3 py-1.5 rounded-lg text-[11px] text-[#888] backdrop-blur-md pointer-events-none">
        <Layers className="w-3.5 h-3.5 text-indigo-400" />
        <span>Drag walls to resize • Drag & drop doors & floors anywhere</span>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${viewBoxW} ${viewBoxH}`}
        className={`w-full h-full ${
          wallDragState.isDragging
            ? "cursor-grabbing"
            : isDraggingItem
            ? "cursor-grabbing"
            : "cursor-default"
        }`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          onSelectItem(null);
          setSelectedOpeningId(null);
        }}
      >
        <defs>
          {/* Blueprint Grid */}
          <pattern id="minorGrid" width={SCALE * 0.2} height={SCALE * 0.2} patternUnits="userSpaceOnUse">
            <path d={`M ${SCALE * 0.2} 0 L 0 0 0 ${SCALE * 0.2}`} fill="none" stroke="#171717" strokeWidth="0.5" />
          </pattern>
          <pattern id="majorGrid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
            <rect width={SCALE} height={SCALE} fill="url(#minorGrid)" />
            <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#222222" strokeWidth="1" />
          </pattern>

          {/* Diagonal Wall Hatch */}
          <pattern id="wallHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#383838" strokeWidth="2" />
          </pattern>
          <pattern id="wallHatchActive" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#6366F1" strokeWidth="2.5" />
          </pattern>

          {/* Floor Finish Patterns */}
          <pattern id="floorWoodPlanks" width="60" height="15" patternUnits="userSpaceOnUse">
            <rect width="60" height="15" fill={roomSettings.floorColor || "#D0BBA2"} fillOpacity="0.18" />
            <line x1="0" y1="0" x2="60" y2="0" stroke="#C5A880" strokeWidth="0.5" strokeOpacity="0.3" />
            <line x1="60" y1="0" x2="60" y2="15" stroke="#C5A880" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* Global Grid Background */}
        <rect x={minX} y={minY} width={viewBoxW} height={viewBoxH} fill="#0A0A0A" />
        <rect x={minX} y={minY} width={viewBoxW} height={viewBoxH} fill="url(#majorGrid)" />

        {/* ======================================================== */}
        {/* ROOM FLOOR AREA (Interactive Drop Target for Flooring)   */}
        {/* ======================================================== */}
        <g id="floor-drop-zone">
          <rect
            x={-roomPixelW / 2}
            y={-roomPixelL / 2}
            width={roomPixelW}
            height={roomPixelL}
            fill="#121212"
            stroke={dropHoverState.isOverCanvas ? "#6366F1" : "#2E2E2E"}
            strokeWidth={dropHoverState.isOverCanvas ? "2.5" : "1.5"}
            strokeDasharray={dropHoverState.isOverCanvas ? "6 6" : "none"}
            className="transition-colors"
          />

          {/* Floor Texture Pattern Overlay */}
          <rect
            x={-roomPixelW / 2}
            y={-roomPixelL / 2}
            width={roomPixelW}
            height={roomPixelL}
            fill="url(#floorWoodPlanks)"
            className="pointer-events-none"
          />

          {/* Center Floor Spec & Name Tag */}
          <g
            transform="translate(0, 0)"
            className="pointer-events-none select-none opacity-40 hover:opacity-100 transition-opacity"
          >
            <text x="0" y="-8" fill="#AAAAAA" fontSize="13" textAnchor="middle" fontWeight="bold">
              {roomSettings.type.toUpperCase()}
            </text>
            <text x="0" y="8" fill="#6366F1" fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
              {roomSettings.floorType} • {(roomW * roomL).toFixed(1)} m²
            </text>
            <text x="0" y="22" fill="#666666" fontSize="9" textAnchor="middle">
              (Drop floor swatches here)
            </text>
          </g>
        </g>

        {/* ======================================================== */}
        {/* WALLS & INTERACTIVE WALL DRAG HANDLES (Resize Room)      */}
        {/* ======================================================== */}
        <g id="walls-interactive-group">
          {/* North Wall (Top) */}
          <rect
            x={-roomPixelW / 2 - wallThick}
            y={-roomPixelL / 2 - wallThick}
            width={roomPixelW + wallThick * 2}
            height={wallThick}
            fill={wallDragState.wall === "north" ? "url(#wallHatchActive)" : "url(#wallHatch)"}
            stroke={wallDragState.wall === "north" ? "#6366F1" : "#383838"}
            strokeWidth="1.5"
          />
          {/* North Wall Drag Handle Bar */}
          <rect
            x={-roomPixelW / 2}
            y={-roomPixelL / 2 - wallThick - 8}
            width={roomPixelW}
            height={wallThick + 12}
            fill="transparent"
            className="cursor-ns-resize hover:fill-indigo-500/20 transition-colors"
            onMouseDown={(e) => handleStartWallDrag(e, "north")}
          />

          {/* South Wall (Bottom) */}
          <rect
            x={-roomPixelW / 2 - wallThick}
            y={roomPixelL / 2}
            width={roomPixelW + wallThick * 2}
            height={wallThick}
            fill={wallDragState.wall === "south" ? "url(#wallHatchActive)" : "url(#wallHatch)"}
            stroke={wallDragState.wall === "south" ? "#6366F1" : "#383838"}
            strokeWidth="1.5"
          />
          {/* South Wall Drag Handle Bar */}
          <rect
            x={-roomPixelW / 2}
            y={roomPixelL / 2 - 4}
            width={roomPixelW}
            height={wallThick + 12}
            fill="transparent"
            className="cursor-ns-resize hover:fill-indigo-500/20 transition-colors"
            onMouseDown={(e) => handleStartWallDrag(e, "south")}
          />

          {/* West Wall (Left) */}
          <rect
            x={-roomPixelW / 2 - wallThick}
            y={-roomPixelL / 2}
            width={wallThick}
            height={roomPixelL}
            fill={wallDragState.wall === "west" ? "url(#wallHatchActive)" : "url(#wallHatch)"}
            stroke={wallDragState.wall === "west" ? "#6366F1" : "#383838"}
            strokeWidth="1.5"
          />
          {/* West Wall Drag Handle Bar */}
          <rect
            x={-roomPixelW / 2 - wallThick - 8}
            y={-roomPixelL / 2}
            width={wallThick + 12}
            height={roomPixelL}
            fill="transparent"
            className="cursor-ew-resize hover:fill-indigo-500/20 transition-colors"
            onMouseDown={(e) => handleStartWallDrag(e, "west")}
          />

          {/* East Wall (Right) */}
          <rect
            x={roomPixelW / 2}
            y={-roomPixelL / 2}
            width={wallThick}
            height={roomPixelL}
            fill={wallDragState.wall === "east" ? "url(#wallHatchActive)" : "url(#wallHatch)"}
            stroke={wallDragState.wall === "east" ? "#6366F1" : "#383838"}
            strokeWidth="1.5"
          />
          {/* East Wall Drag Handle Bar */}
          <rect
            x={roomPixelW / 2 - 4}
            y={-roomPixelL / 2}
            width={wallThick + 12}
            height={roomPixelL}
            fill="transparent"
            className="cursor-ew-resize hover:fill-indigo-500/20 transition-colors"
            onMouseDown={(e) => handleStartWallDrag(e, "east")}
          />

          {/* 4 Corner Resize Nodes (NW, NE, SE, SW) */}
          {[
            { id: "nw", x: -roomPixelW / 2 - wallThick / 2, y: -roomPixelL / 2 - wallThick / 2, cursor: "cursor-nwse-resize" },
            { id: "ne", x: roomPixelW / 2 + wallThick / 2, y: -roomPixelL / 2 - wallThick / 2, cursor: "cursor-nesw-resize" },
            { id: "se", x: roomPixelW / 2 + wallThick / 2, y: roomPixelL / 2 + wallThick / 2, cursor: "cursor-nwse-resize" },
            { id: "sw", x: -roomPixelW / 2 - wallThick / 2, y: roomPixelL / 2 + wallThick / 2, cursor: "cursor-nesw-resize" },
          ].map((corner) => (
            <g key={corner.id} transform={`translate(${corner.x}, ${corner.y})`}>
              <circle
                cx="0"
                cy="0"
                r="7"
                fill="#1E1B4B"
                stroke="#6366F1"
                strokeWidth="2"
                className={`${corner.cursor} hover:scale-130 transition-transform`}
                onMouseDown={(e) => handleStartWallDrag(e, corner.id as any)}
              />
            </g>
          ))}

          {/* ======================================================== */}
          {/* DYNAMIC WALL OPENINGS (Doors & Windows)                  */}
          {/* ======================================================== */}
          {roomSettings.openings &&
            roomSettings.openings.map((op) => {
              const isDoor = op.type.includes("door") || op.type === "archway";
              const isDouble = op.type === "double_door" || op.type === "french_door";
              const isSliding = op.type === "sliding_door" || op.type === "balcony_sliding_window";
              const opPixelW = op.width * SCALE;
              const isSelected = op.id === selectedOpeningId;
              const isDraggingThis = openingDragState.isDragging && openingDragState.openingId === op.id;

              let tx = 0;
              let ty = 0;
              let rot = 0;

              if (op.wall === "north") {
                tx = -roomPixelW / 2 + op.position * roomPixelW;
                ty = -roomPixelL / 2 - wallThick / 2;
                rot = 0;
              } else if (op.wall === "south") {
                tx = -roomPixelW / 2 + op.position * roomPixelW;
                ty = roomPixelL / 2 + wallThick / 2;
                rot = 180;
              } else if (op.wall === "west") {
                tx = -roomPixelW / 2 - wallThick / 2;
                ty = -roomPixelL / 2 + op.position * roomPixelL;
                rot = -90;
              } else if (op.wall === "east") {
                tx = roomPixelW / 2 + wallThick / 2;
                ty = -roomPixelL / 2 + op.position * roomPixelL;
                rot = 90;
              }

              return (
                <g
                  key={op.id}
                  transform={`translate(${tx}, ${ty}) rotate(${rot})`}
                  onMouseDown={(e) => handleStartOpeningDrag(e, op)}
                  className="cursor-grab active:cursor-grabbing group"
                >
                  {/* Wall Opening Cutout */}
                  <rect
                    x={-opPixelW / 2}
                    y={-wallThick / 2 - 3}
                    width={opPixelW}
                    height={wallThick + 6}
                    fill="#0A0A0A"
                  />

                  {/* Selection & Drag Halo */}
                  {isSelected && (
                    <rect
                      x={-opPixelW / 2 - 4}
                      y={-wallThick / 2 - 7}
                      width={opPixelW + 8}
                      height={wallThick + 14}
                      fill="none"
                      stroke="#818CF8"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {isDoor ? (
                    /* Architectural Door Symbol */
                    <g>
                      {isDouble ? (
                        /* Double / French Door */
                        <>
                          <line
                            x1={-opPixelW / 2}
                            y1={0}
                            x2={-opPixelW / 2}
                            y2={-opPixelW / 2}
                            stroke="#818CF8"
                            strokeWidth="2.5"
                          />
                          <path
                            d={`M ${-opPixelW / 2} ${-opPixelW / 2} A ${opPixelW / 2} ${opPixelW / 2} 0 0 1 0 0`}
                            fill="none"
                            stroke="#818CF8"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />
                          <line
                            x1={opPixelW / 2}
                            y1={0}
                            x2={opPixelW / 2}
                            y2={-opPixelW / 2}
                            stroke="#818CF8"
                            strokeWidth="2.5"
                          />
                          <path
                            d={`M ${opPixelW / 2} ${-opPixelW / 2} A ${opPixelW / 2} ${opPixelW / 2} 0 0 0 0 0`}
                            fill="none"
                            stroke="#818CF8"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />
                        </>
                      ) : isSliding ? (
                        /* Sliding Pocket Door */
                        <>
                          <line
                            x1={-opPixelW / 2}
                            y1={-2}
                            x2={opPixelW / 2}
                            y2={-2}
                            stroke="#818CF8"
                            strokeWidth="3"
                          />
                          <line
                            x1={-opPixelW / 2}
                            y1={2}
                            x2={0}
                            y2={2}
                            stroke="#A5B4FC"
                            strokeWidth="2"
                          />
                        </>
                      ) : (
                        /* Single Swing Door */
                        <>
                          <line
                            x1={-opPixelW / 2}
                            y1={0}
                            x2={-opPixelW / 2}
                            y2={-opPixelW}
                            stroke={isSelected ? "#C7D2FE" : "#818CF8"}
                            strokeWidth="2.5"
                          />
                          <path
                            d={`M ${-opPixelW / 2} ${-opPixelW} A ${opPixelW} ${opPixelW} 0 0 1 ${opPixelW / 2} 0`}
                            fill="none"
                            stroke={isSelected ? "#C7D2FE" : "#818CF8"}
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                          />
                        </>
                      )}
                      <text
                        x="0"
                        y={rot === 180 ? 20 : -14}
                        fill={isSelected ? "#FFFFFF" : "#A5B4FC"}
                        fontSize="9"
                        textAnchor="middle"
                        fontWeight="bold"
                        className="select-none font-mono"
                      >
                        {(op.label || "DOOR").toUpperCase()} ({op.width}m)
                      </text>
                    </g>
                  ) : (
                    /* Architectural Window Symbol */
                    <g>
                      <line
                        x1={-opPixelW / 2}
                        y1={-wallThick / 2}
                        x2={opPixelW / 2}
                        y2={-wallThick / 2}
                        stroke="#38BDF8"
                        strokeWidth="2"
                      />
                      <line
                        x1={-opPixelW / 2}
                        y1={wallThick / 2}
                        x2={opPixelW / 2}
                        y2={wallThick / 2}
                        stroke="#38BDF8"
                        strokeWidth="2"
                      />
                      <line
                        x1={-opPixelW / 2}
                        y1={0}
                        x2={opPixelW / 2}
                        y2={0}
                        stroke="#7DD3FC"
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y={rot === 180 ? 20 : -14}
                        fill="#38BDF8"
                        fontSize="9"
                        textAnchor="middle"
                        fontWeight="bold"
                        className="select-none font-mono"
                      >
                        {(op.label || "WINDOW").toUpperCase()} ({op.width}m)
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
        </g>

        {/* ======================================================== */}
        {/* ROOM OUTER DIMENSIONS & CAD RESIZE CALLOUTS              */}
        {/* ======================================================== */}
        {/* Top Horizontal Dimension (North) */}
        <g transform={`translate(0, ${-roomPixelL / 2 - 42})`}>
          <line x1={-roomPixelW / 2} y1="0" x2={roomPixelW / 2} y2="0" stroke="#555555" strokeWidth="1.5" />
          <line x1={-roomPixelW / 2} y1="-8" x2={-roomPixelW / 2} y2="8" stroke="#555555" strokeWidth="1.5" />
          <line x1={roomPixelW / 2} y1="-8" x2={roomPixelW / 2} y2="8" stroke="#555555" strokeWidth="1.5" />
          <rect x="-35" y="-10" width="70" height="20" rx="4" fill="#181818" stroke="#333333" />
          <text x="0" y="4" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
            {roomW.toFixed(2)} m
          </text>
        </g>

        {/* Left Vertical Dimension (West) */}
        <g transform={`translate(${-roomPixelW / 2 - 42}, 0)`}>
          <line x1="0" y1={-roomPixelL / 2} x2="0" y2={roomPixelL / 2} stroke="#555555" strokeWidth="1.5" />
          <line x1="-8" y1={-roomPixelL / 2} x2="8" y2={-roomPixelL / 2} stroke="#555555" strokeWidth="1.5" />
          <line x1="-8" y1={roomPixelL / 2} x2="8" y2={roomPixelL / 2} stroke="#555555" strokeWidth="1.5" />
          <rect x="-35" y="-10" width="70" height="20" rx="4" fill="#181818" stroke="#333333" />
          <text x="0" y="4" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
            {roomL.toFixed(2)} m
          </text>
        </g>

        {/* ======================================================== */}
        {/* PLACED FURNITURE ITEMS                                   */}
        {/* ======================================================== */}
        {placedItems.map((placed) => {
          const product = getProductById(placed.productId);
          if (!product) return null;

          const isSelected = placed.instanceId === selectedInstanceId;
          const pixelX = placed.x * SCALE;
          const pixelY = placed.y * SCALE;
          const itemPixelW = product.dimensions.width * SCALE;
          const itemPixelD = product.dimensions.depth * SCALE;

          return (
            <g
              key={placed.instanceId}
              transform={`translate(${pixelX}, ${pixelY}) rotate(${placed.rotation})`}
              onMouseDown={(e) => handlePointerDownItem(e, placed.instanceId)}
              className="cursor-move group"
            >
              {/* Item Floor Outline Block */}
              <rect
                x={-itemPixelW / 2}
                y={-itemPixelD / 2}
                width={itemPixelW}
                height={itemPixelD}
                rx={product.model3DType === "freestanding_tub" || product.model3DType === "rug" ? 8 : 4}
                fill={isSelected ? "#1E1B4B" : "#1A1A1A"}
                stroke={isSelected ? "#6366F1" : "#333333"}
                strokeWidth={isSelected ? 2.5 : 1}
                className="transition-colors"
              />

              {/* Color swatch accent bar on 2D item */}
              <rect
                x={-itemPixelW / 2 + 3}
                y={-itemPixelD / 2 + 3}
                width={Math.min(itemPixelW - 6, 14)}
                height={3.5}
                rx={1.5}
                fill={placed.colorOverride || product.colorHex}
                className="pointer-events-none"
              />

              {/* Item Label & Dimensions */}
              <text
                x="0"
                y="-2"
                fill={isSelected ? "#FFFFFF" : "#CCCCCC"}
                fontSize={Math.max(8, Math.min(11, itemPixelW * 0.11))}
                textAnchor="middle"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {product.name.split(" ")[0]}
              </text>
              <text
                x="0"
                y="10"
                fill={isSelected ? "#818CF8" : "#777777"}
                fontSize={Math.max(7, Math.min(9, itemPixelW * 0.09))}
                textAnchor="middle"
                className="pointer-events-none select-none font-mono"
              >
                {(product.dimensions.width * 100).toFixed(0)}×{(product.dimensions.depth * 100).toFixed(0)}cm
              </text>

              {/* Selected Gizmo Ring & Rotate Handle */}
              {isSelected && (
                <g className="pointer-events-auto">
                  <rect
                    x={-itemPixelW / 2 - 6}
                    y={-itemPixelD / 2 - 6}
                    width={itemPixelW + 12}
                    height={itemPixelD + 12}
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  <line
                    x1="0"
                    y1={-itemPixelD / 2 - 6}
                    x2="0"
                    y2={-itemPixelD / 2 - 24}
                    stroke="#6366F1"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="0"
                    cy={-itemPixelD / 2 - 24}
                    r="8"
                    fill="#6366F1"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    onMouseDown={handlePointerDownRotateHandle}
                    className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Opening (Door/Window) Toolbar when clicked */}
      {selectedOpening && onUpdateOpening && onRemoveOpening && (
        <div className="absolute bottom-5 left-5 z-30 bg-[#141414] text-white p-3 rounded-xl border border-[#2D2D2D] shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 min-w-[260px]">
          <div className="flex items-center justify-between border-b border-[#242424] pb-2">
            <div className="flex items-center gap-1.5">
              <DoorOpen className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs font-bold text-white">{selectedOpening.label || "Door / Window"}</p>
                <p className="text-[10px] text-indigo-300 font-mono">
                  Wall: {selectedOpening.wall.toUpperCase()} • Pos: {(selectedOpening.position * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onRemoveOpening(selectedOpening.id);
                setSelectedOpeningId(null);
                showToast("Opening removed");
              }}
              className="p-1 text-[#888] hover:text-red-400 hover:bg-[#202020] rounded-lg transition-colors"
              title="Remove Opening"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-[#888]">
              <span>Width: {selectedOpening.width}m</span>
              <div className="flex items-center gap-1">
                {[0.9, 1.2, 1.8, 2.4].map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateOpening(selectedOpening.id, { width: w })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      selectedOpening.width === w
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-[#202020] text-[#888] hover:text-white"
                    }`}
                  >
                    {w}m
                  </button>
                ))}
              </div>
            </div>

            {/* Wall Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[#888]">Attach to Wall:</span>
              <div className="flex items-center gap-1">
                {(["north", "south", "east", "west"] as WallOrientation[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateOpening(selectedOpening.id, { wall: w })}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      selectedOpening.wall === w
                        ? "bg-indigo-600 text-white"
                        : "bg-[#202020] text-[#888] hover:text-white"
                    }`}
                  >
                    {w[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Selected Furniture Inspector */}
      {selectedItem && selectedProduct && (
        <div className="absolute bottom-5 right-5 z-20 bg-[#141414] text-[#E5E5E5] p-3 rounded-xl shadow-2xl border border-[#2D2D2D] backdrop-blur-xl flex flex-col gap-2.5 min-w-[250px]">
          <div className="flex items-center justify-between border-b border-[#242424] pb-2">
            <div>
              <p className="text-xs font-bold text-white truncate max-w-[170px]">{selectedProduct.name}</p>
              <p className="text-[10px] text-indigo-400 font-medium">{selectedProduct.brand}</p>
            </div>
            <div className="flex items-center gap-1">
              {onDuplicateItem && (
                <button
                  onClick={() => onDuplicateItem(selectedItem.instanceId)}
                  className="p-1 text-[#888] hover:text-white hover:bg-[#202020] rounded-lg transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onRemoveItem(selectedItem.instanceId)}
                className="p-1 text-[#888] hover:text-red-400 hover:bg-[#202020] rounded-lg transition-colors"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-[#1A1A1A] p-1.5 rounded-lg border border-[#282828]">
              <span className="text-[#666] block">Position (X, Y)</span>
              <span className="font-mono font-semibold text-white">
                {selectedItem.x.toFixed(2)}m, {selectedItem.y.toFixed(2)}m
              </span>
            </div>
            <div className="bg-[#1A1A1A] p-1.5 rounded-lg border border-[#282828]">
              <span className="text-[#666] block">Elevation (Z)</span>
              <span className="font-mono font-semibold text-indigo-400">
                +{Math.round((selectedItem.z || 0) * 100)}cm
              </span>
            </div>
          </div>

          {/* Elevation Surface Controls */}
          {(() => {
            const detectedHost = detectSurfaceBeneath(
              selectedItem.x,
              selectedItem.y,
              selectedProduct,
              placedItems,
              selectedItem.instanceId
            );
            const itemZ = selectedItem.z || 0;

            return (
              <div className="space-y-1.5 border-t border-[#242424] pt-2">
                <div className="flex items-center justify-between text-[11px] text-[#888]">
                  <span className="flex items-center gap-1 font-medium text-white">
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" /> Height & Surface
                  </span>
                  {detectedHost && onSnapItemToSurface && (
                    <button
                      onClick={() => {
                        onSnapItemToSurface(selectedItem.instanceId);
                        showToast(`✨ Snapped to ${detectedHost.surfaceDescription}`);
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px] transition-colors"
                    >
                      Snap to Surface
                    </button>
                  )}
                </div>

                {onUpdateItemElevation && (
                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    <button
                      onClick={() => onUpdateItemElevation(selectedItem.instanceId, Math.min(roomSettings.height || 3, itemZ + 0.1))}
                      className="py-0.5 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[#CCC] hover:text-white rounded border border-[#2D2D2D] flex items-center justify-center gap-0.5"
                      title="Lift +10cm"
                    >
                      <ArrowUp className="w-2.5 h-2.5 text-indigo-400" /> +10cm
                    </button>
                    <button
                      onClick={() => onUpdateItemElevation(selectedItem.instanceId, Math.min(roomSettings.height || 3, itemZ + 0.25))}
                      className="py-0.5 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[#CCC] hover:text-white rounded border border-[#2D2D2D] flex items-center justify-center gap-0.5"
                      title="Lift +25cm"
                    >
                      <ArrowUp className="w-2.5 h-2.5 text-indigo-400" /> +25cm
                    </button>
                    <button
                      onClick={() => onUpdateItemElevation(selectedItem.instanceId, Math.max(0, itemZ - 0.1))}
                      className="py-0.5 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[#CCC] hover:text-white rounded border border-[#2D2D2D] flex items-center justify-center gap-0.5"
                      title="Drop -10cm"
                    >
                      <ArrowDown className="w-2.5 h-2.5 text-amber-400" /> -10cm
                    </button>
                    <button
                      onClick={() => {
                        if (onDropItemToFloor) {
                          onDropItemToFloor(selectedItem.instanceId);
                          showToast("Dropped to Floor (0cm)");
                        } else {
                          onUpdateItemElevation(selectedItem.instanceId, 0);
                        }
                      }}
                      className="py-0.5 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[#CCC] hover:text-white rounded border border-[#2D2D2D] flex items-center justify-center gap-0.5"
                      title="Snap to floor"
                    >
                      <Anchor className="w-2.5 h-2.5 text-[#888]" /> Floor
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Color & Material Customizer in 2D */}
          {onUpdateItemColor && (
            <div className="space-y-1.5 border-t border-[#242424] pt-2">
              <div className="flex items-center justify-between text-[11px] text-[#888]">
                <span className="flex items-center gap-1 font-medium text-white">
                  <Palette className="w-3 h-3 text-indigo-400" /> Color & Finish
                </span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: selectedItem.colorOverride || selectedProduct.colorHex }}
                />
              </div>

              {/* Swatch Quick Grid */}
              <div className="grid grid-cols-8 gap-1">
                {POPULAR_COLOR_PALETTES.map((pal) => {
                  const isCur =
                    (selectedItem.colorOverride || selectedProduct.colorHex).toLowerCase() ===
                    pal.hex.toLowerCase();
                  return (
                    <button
                      key={pal.name}
                      onClick={() => onUpdateItemColor(selectedItem.instanceId, pal.hex, pal.name)}
                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-115 flex items-center justify-center ${
                        isCur ? "border-indigo-400 ring-2 ring-indigo-500/40 scale-110" : "border-[#3D3D3D]"
                      }`}
                      style={{ backgroundColor: pal.hex }}
                      title={`${pal.name} (${pal.materialType})`}
                    >
                      {isCur && <Check className="w-2.5 h-2.5 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 pt-1">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                onClick={() => onUpdateItemRotation(selectedItem.instanceId, deg)}
                className={`flex-1 py-1 text-[10px] font-mono rounded-lg font-medium transition-colors ${
                  selectedItem.rotation === deg ? "bg-indigo-600 text-white" : "bg-[#1A1A1A] hover:bg-[#242424] text-[#888]"
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Toast Alert */}
      {actionToast && (
        <div className="absolute top-16 right-4 z-40 bg-[#121212]/95 border border-[#333333] text-white px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{actionToast.text}</span>
        </div>
      )}
    </div>
  );
};
