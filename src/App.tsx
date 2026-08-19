import React, { useState, useEffect, useRef } from "react";
import { LeftPanel } from "./components/LeftPanel";
import { CanvasViewport } from "./components/CanvasViewport";
import { RightPanel } from "./components/RightPanel";
import { PhotoReconstructionModal } from "./components/PhotoReconstructionModal";
import { BuildFromScratchModal } from "./components/BuildFromScratchModal";
import { CheckoutModal } from "./components/CheckoutModal";
import { MultiAngleRenderModal } from "./components/MultiAngleRenderModal";
import { HomelyLogo } from "./components/HomelyLogo";
import {
  PlacedItem,
  RoomSettings,
  RoomTheme,
  RoomType,
  ViewMode,
  DetectedObject,
  CameraPreset,
  WallOpening,
  SolarTimeSettings,
} from "./types";
import { ROOM_PRESETS, STYLE_THEMES, MOCK_PRODUCTS, getProductById } from "./data/mockProducts";
import {
  getLogicalDefaultElevation,
  detectSurfaceBeneath,
  isElevatedItemType,
  getHostSurfaceElevation,
} from "./utils/surfaceSnapping";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  ShoppingBag,
  Maximize2,
  Compass,
  Zap,
} from "lucide-react";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [currentTheme, setCurrentTheme] = useState<RoomTheme>("Scandinavian");

  // Initial Room State
  const initialPreset = ROOM_PRESETS["Living Room"];
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    type: "Living Room",
    width: initialPreset.settings.width,
    length: initialPreset.settings.length,
    height: initialPreset.settings.height,
    wallColor: initialPreset.settings.wallColor,
    floorType: initialPreset.settings.floorType,
    wallFinish: "Smooth Chalk Plaster",
    floorColor: initialPreset.settings.floorColor,
    openings: [
      {
        id: "win-1",
        wall: "north",
        position: 0.5,
        width: 2.4,
        height: 1.6,
        elevation: 0.7,
        type: "picture_window",
        label: "Panoramic Picture Window",
        frameColor: "#1F1F1F",
      },
      {
        id: "door-1",
        wall: "south",
        position: 0.75,
        width: 0.9,
        height: 2.1,
        elevation: 0,
        type: "door",
        label: "Main Entry Door",
        frameColor: "#1F1F1F",
      },
    ],
    plumbingOutlets: [],
  });

  // Placed Items on Floorplan
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(() =>
    initialPreset.sampleItems.map((item, idx) => ({
      ...item,
      instanceId: `inst-init-${idx}-${Date.now()}`,
    }))
  );
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // Digital Twin state from photo reconstruction
  const [isDigitalTwin, setIsDigitalTwin] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);

  // Modals state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [renderModalOpen, setRenderModalOpen] = useState(false);

  // Capture Hook Ref for 3D camera angles
  const captureHookRef = useRef<(() => Promise<Record<CameraPreset, string>>) | null>(null);

  // Sidebar visibility on compact screens
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftPanelTab, setLeftPanelTab] = useState<"catalog" | "openings" | "room_setup" | "lighting" | "styles">("catalog");

  // Day / Night & Solar Simulation State (Defaults to 7:48 PM Dusk like the screenshot)
  const [solarSettings, setSolarSettings] = useState<SolarTimeSettings>({
    hour: 19.8, // 7:48 PM Dusk as shown in attached reference
    season: "winter",
    isPlaying: false,
    speed: 1,
    latitude: 37.7,
    artificialLights: true,
  });

  const handleUpdateSolarSettings = (patch: Partial<SolarTimeSettings>) => {
    setSolarSettings((prev) => ({ ...prev, ...patch }));
  };

  const roomTypesList: RoomType[] = ["Living Room", "Home Office", "Dining Room", "Kitchen", "Bedroom", "Bathroom"];

  // Handle Room Type Change
  const handleUpdateRoomSettings = (newSettings: Partial<RoomSettings>) => {
    setRoomSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      // If room type changed, load its preset layout
      if (newSettings.type && newSettings.type !== prev.type && ROOM_PRESETS[newSettings.type]) {
        const preset = ROOM_PRESETS[newSettings.type];
        updated.width = preset.settings.width;
        updated.length = preset.settings.length;
        updated.height = preset.settings.height;
        updated.wallColor = preset.settings.wallColor;
        updated.floorType = preset.settings.floorType;
        updated.floorColor = preset.settings.floorColor;

        setPlacedItems(
          preset.sampleItems.map((item, idx) => ({
            ...item,
            instanceId: `inst-${newSettings.type}-${idx}-${Date.now()}`,
          }))
        );
        setSelectedInstanceId(null);
        setIsDigitalTwin(false);
        setDetectedObjects([]);
      }
      return updated;
    });
  };

  // Build Room From Scratch Handler
  const handleApplyCustomRoom = (
    settings: Partial<RoomSettings>,
    clearFurniture: boolean,
    seedDefaultOpenings: boolean
  ) => {
    const defaultOpenings: WallOpening[] = seedDefaultOpenings
      ? [
          {
            id: `win-${Date.now()}-1`,
            wall: "north",
            position: 0.5,
            width: Math.min(2.4, (settings.width || 5.0) * 0.5),
            height: 1.6,
            elevation: 0.7,
            type: "picture_window",
            label: "Panoramic Window",
            frameColor: "#1F1F1F",
          },
          {
            id: `door-${Date.now()}-2`,
            wall: "south",
            position: 0.75,
            width: 0.9,
            height: 2.1,
            elevation: 0,
            type: "door",
            label: "Main Entry Door",
            frameColor: "#1F1F1F",
          },
        ]
      : [];

    setRoomSettings((prev) => ({
      ...prev,
      ...settings,
      openings: defaultOpenings,
    }));

    if (clearFurniture) {
      setPlacedItems([]);
    } else if (settings.type && ROOM_PRESETS[settings.type]) {
      const preset = ROOM_PRESETS[settings.type];
      setPlacedItems(
        preset.sampleItems.map((item, idx) => ({
          ...item,
          instanceId: `inst-custom-${idx}-${Date.now()}`,
        }))
      );
    }

    setSelectedInstanceId(null);
    setIsDigitalTwin(false);
    setDetectedObjects([]);
  };

  // Add Wall Opening
  const handleAddOpening = (opening: Omit<WallOpening, "id">) => {
    const newOpening: WallOpening = {
      ...opening,
      id: `open-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setRoomSettings((prev) => ({
      ...prev,
      openings: [...prev.openings, newOpening],
    }));
  };

  // Update Wall Opening
  const handleUpdateOpening = (id: string, patch: Partial<WallOpening>) => {
    setRoomSettings((prev) => ({
      ...prev,
      openings: prev.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  };

  // Remove Wall Opening
  const handleRemoveOpening = (id: string) => {
    setRoomSettings((prev) => ({
      ...prev,
      openings: prev.openings.filter((o) => o.id !== id),
    }));
  };

  // Handle Theme Change
  const handleThemeChange = (newTheme: RoomTheme) => {
    setCurrentTheme(newTheme);
    const themeConfig = STYLE_THEMES[newTheme];
    if (themeConfig) {
      setRoomSettings((prev) => ({
        ...prev,
        wallColor: themeConfig.wallColor || prev.wallColor,
        floorType: themeConfig.floorType || prev.floorType,
        floorColor: themeConfig.floorColor || prev.floorColor,
      }));
    }
  };

  // Spawn a new Product into the Canvas with smart logical elevation
  const handleSpawnProduct = (
    productId: string,
    initialColor?: string,
    customX?: number,
    customY?: number
  ) => {
    const product = getProductById(productId);
    if (!product) return;

    // Use provided drop coords or slight random offset around room center
    const jitterX = customX !== undefined ? customX : (Math.random() - 0.5) * 0.8;
    const jitterY = customY !== undefined ? customY : (Math.random() - 0.5) * 0.8;

    const posX = Math.round(jitterX * 20) / 20;
    const posY = Math.round(jitterY * 20) / 20;

    // Calculate smart logical elevation (e.g. pillows sit on bed/sofa, vases on table, windows on wall)
    const { z } = getLogicalDefaultElevation(product, posX, posY, placedItems);

    const newInstance: PlacedItem = {
      instanceId: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      x: posX,
      y: posY,
      z: z,
      rotation: 0,
      colorOverride: initialColor || product.colorHex,
    };

    setPlacedItems((prev) => [...prev, newInstance]);
    setSelectedInstanceId(newInstance.instanceId);
  };

  // Update item position with optional surface elevation re-snapping
  const handleUpdateItemPosition = (
    instanceId: string,
    x: number,
    y: number,
    autoSnapElevation: boolean = false
  ) => {
    setPlacedItems((prev) => {
      const targetItem = prev.find((i) => i.instanceId === instanceId);
      if (!targetItem) return prev;

      const product = getProductById(targetItem.productId);
      let newZ = targetItem.z || 0;

      // If autoSnapElevation is requested or item is a surface-resting item (like pillow, mattress, vase)
      if (autoSnapElevation && product && isElevatedItemType(product)) {
        const hostBeneath = detectSurfaceBeneath(x, y, product, prev, instanceId);
        if (hostBeneath) {
          newZ = hostBeneath.surfaceElevation;
        } else {
          // If moved off the host to open floor and previous z was sitting on host
          if (newZ > 0.1 && (product.model3DType.includes("pillow") || product.name.toLowerCase().includes("pillow"))) {
            // Keep at comfortable elevation or drop to floor
          }
        }
      }

      return prev.map((item) =>
        item.instanceId === instanceId ? { ...item, x, y, z: newZ } : item
      );
    });
  };

  // Direct elevation adjustment (Lift up / Drop down)
  const handleUpdateItemElevation = (instanceId: string, z: number) => {
    const clampedZ = Math.max(0, Math.min(roomSettings.height || 3.0, Math.round(z * 100) / 100));
    setPlacedItems((prev) =>
      prev.map((item) => (item.instanceId === instanceId ? { ...item, z: clampedZ } : item))
    );
  };

  // One-click Snap item to the surface beneath (Bed, Table, Sofa, etc.)
  const handleSnapItemToSurface = (instanceId: string) => {
    setPlacedItems((prev) => {
      const target = prev.find((i) => i.instanceId === instanceId);
      if (!target) return prev;
      const prod = getProductById(target.productId);
      if (!prod) return prev;

      const host = detectSurfaceBeneath(target.x, target.y, prod, prev, instanceId);
      const targetZ = host ? host.surfaceElevation : 0.0;

      return prev.map((item) =>
        item.instanceId === instanceId ? { ...item, z: targetZ } : item
      );
    });
  };

  // One-click Drop item to floor (0.0m)
  const handleDropItemToFloor = (instanceId: string) => {
    setPlacedItems((prev) =>
      prev.map((item) => (item.instanceId === instanceId ? { ...item, z: 0 } : item))
    );
  };

  // Update item rotation
  const handleUpdateItemRotation = (instanceId: string, rotation: number) => {
    setPlacedItems((prev) =>
      prev.map((item) => (item.instanceId === instanceId ? { ...item, rotation } : item))
    );
  };

  // Update item color / material
  const handleUpdateItemColor = (instanceId: string, colorHex: string, materialName?: string) => {
    setPlacedItems((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId
          ? { ...item, colorOverride: colorHex, materialOverride: materialName }
          : item
      )
    );
  };

  // Remove item
  const handleRemoveItem = (instanceId: string) => {
    setPlacedItems((prev) => prev.filter((item) => item.instanceId !== instanceId));
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }
  };

  // Duplicate item
  const handleDuplicateItem = (instanceId: string) => {
    const original = placedItems.find((p) => p.instanceId === instanceId);
    if (!original) return;

    const duplicate: PlacedItem = {
      ...original,
      instanceId: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: Math.min(roomSettings.width / 2 - 0.3, original.x + 0.5),
      y: Math.min(roomSettings.length / 2 - 0.3, original.y + 0.5),
    };

    setPlacedItems((prev) => [...prev, duplicate]);
    setSelectedInstanceId(duplicate.instanceId);
  };

  // Reset to initial template
  const handleResetRoom = () => {
    const preset = ROOM_PRESETS[roomSettings.type] || ROOM_PRESETS["Living Room"];
    setPlacedItems(
      preset.sampleItems.map((item, idx) => ({
        ...item,
        instanceId: `inst-reset-${idx}-${Date.now()}`,
      }))
    );
    setSelectedInstanceId(null);
    setIsDigitalTwin(false);
    setDetectedObjects([]);
  };

  // Handle Photo-to-3D Completion
  const handleCompletePhotoReconstruction = (
    photoUrl: string,
    detected: DetectedObject[],
    roomType: RoomType,
    updatedDims?: { width: number; length: number; height: number }
  ) => {
    setIsDigitalTwin(true);
    setDetectedObjects(detected);
    if (updatedDims) {
      setRoomSettings((prev) => ({
        ...prev,
        type: roomType,
        width: updatedDims.width,
        length: updatedDims.length,
        height: updatedDims.height,
      }));
    }
    setViewMode("3d");
  };

  const handleRemoveDetectedObject = (id: string) => {
    setDetectedObjects((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isRemoved: true } : d))
    );
  };

  const handleClearAllDetected = () => {
    setDetectedObjects((prev) => prev.map((d) => ({ ...d, isRemoved: true })));
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0A0A0A] text-[#E5E5E5] overflow-hidden font-sans select-none antialiased">
      {/* Sophisticated Dark Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#2D2D2D] bg-[#121212] z-30 transition-colors">
        {/* Left Section: Brand & Room Navigation Bar */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="p-1.5 text-[#888] hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors"
            title={leftSidebarOpen ? "Collapse Left Panel" : "Expand Left Panel"}
          >
            {leftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* Logo & Brand */}
          <HomelyLogo className="w-9 h-9" />

          {/* Quick Room Type Switcher Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-[#1A1A1A] rounded-full p-1 border border-[#2D2D2D]">
            {roomTypesList.map((type) => (
              <button
                key={type}
                onClick={() => handleUpdateRoomSettings({ type })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  roomSettings.type === type
                    ? "bg-[#2D2D2D] text-white shadow-sm font-semibold"
                    : "text-[#888] hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </nav>

          {/* "+ Build from Scratch" Quick Header Button */}
          <button
            onClick={() => setBuildModalOpen(true)}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-900/60 to-indigo-700/60 hover:from-indigo-800 hover:to-indigo-600 border border-indigo-500/50 text-white rounded-full text-xs font-bold transition-all shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-300" />
            <span>+ Build Custom Space</span>
          </button>
        </div>

        {/* Center: Digital Twin Status / Active Room Info */}
        <div className="hidden lg:flex items-center gap-3">
          {isDigitalTwin ? (
            <div className="bg-[#121212]/80 backdrop-blur-md border border-[#2D2D2D] rounded-lg px-3.5 py-1.5 text-xs flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[#888]">Digital Twin Active:</span>
              <span className="font-semibold text-indigo-300">Room Photo 3D</span>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 text-[#888]">
              <span>Dimensions:</span>
              <span className="font-mono font-bold text-white">
                {roomSettings.width.toFixed(1)}m × {roomSettings.length.toFixed(1)}m ({(roomSettings.width * roomSettings.length).toFixed(1)}m²)
              </span>
            </div>
          )}
        </div>

        {/* Right Section: Viewport 2D/3D Mode & Checkout CTA */}
        <div className="flex items-center gap-3">
          {/* Viewport Mode Selector */}
          <div className="flex bg-[#1A1A1A] p-1 rounded-lg border border-[#2D2D2D]">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                viewMode === "2d"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[#888] hover:text-white"
              }`}
            >
              2D Plan
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                viewMode === "3d"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[#888] hover:text-white"
              }`}
            >
              3D View
            </button>
            <button
              onClick={() => setViewMode("walkthrough")}
              className={`hidden sm:inline px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                viewMode === "walkthrough"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[#888] hover:text-white"
              }`}
            >
              Walkthrough
            </button>
          </div>

          <div className="w-px h-6 bg-[#2D2D2D]"></div>

          {/* 1-Click Checkout CTA */}
          <button
            onClick={() => setCheckoutModalOpen(true)}
            disabled={placedItems.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Checkout</span>
            <span className="bg-black/30 px-1.5 py-0.2 rounded font-mono text-[10px]">
              {placedItems.length}
            </span>
          </button>

          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="p-1.5 text-[#888] hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors"
            title={rightSidebarOpen ? "Collapse Right Panel" : "Expand Right Panel"}
          >
            {rightSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main 3-Panel Work Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel: Catalog, Architecture Openings, Room Specs, Lighting, Styles */}
        {leftSidebarOpen && (
          <LeftPanel
            roomSettings={roomSettings}
            onUpdateRoomSettings={handleUpdateRoomSettings}
            onSpawnProduct={handleSpawnProduct}
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            onOpenPhotoModal={() => setPhotoModalOpen(true)}
            onOpenBuildModal={() => setBuildModalOpen(true)}
            onAddOpening={handleAddOpening}
            onUpdateOpening={handleUpdateOpening}
            onRemoveOpening={handleRemoveOpening}
            isDigitalTwin={isDigitalTwin}
            solarSettings={solarSettings}
            onUpdateSolarSettings={handleUpdateSolarSettings}
            activeTab={leftPanelTab}
            onActiveTabChange={setLeftPanelTab}
          />
        )}

        {/* Center Canvas Viewport */}
        <section className="flex-1 bg-[#0F0F0F] relative overflow-hidden flex flex-col">
          <CanvasViewport
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            roomSettings={roomSettings}
            onUpdateRoomSettings={handleUpdateRoomSettings}
            placedItems={placedItems}
            selectedInstanceId={selectedInstanceId}
            onSelectItem={setSelectedInstanceId}
            onUpdateItemPosition={handleUpdateItemPosition}
            onUpdateItemRotation={handleUpdateItemRotation}
            onUpdateItemColor={handleUpdateItemColor}
            onRemoveItem={handleRemoveItem}
            onDuplicateItem={handleDuplicateItem}
            onResetRoom={handleResetRoom}
            currentTheme={currentTheme}
            isDigitalTwin={isDigitalTwin}
            detectedObjects={detectedObjects}
            onRemoveDetectedObject={handleRemoveDetectedObject}
            onClearAllDetected={handleClearAllDetected}
            onOpenPhotoModal={() => setPhotoModalOpen(true)}
            onOpenRenderModal={() => setRenderModalOpen(true)}
            onOpenCheckout={() => setCheckoutModalOpen(true)}
            onRegisterCaptureHook={(fn) => {
              captureHookRef.current = fn;
            }}
            solarSettings={solarSettings}
            onUpdateSolarSettings={handleUpdateSolarSettings}
            onOpenLightingSection={() => {
              setLeftPanelTab("lighting");
              setLeftSidebarOpen(true);
            }}
            onAddOpening={handleAddOpening}
            onUpdateOpening={handleUpdateOpening}
            onRemoveOpening={handleRemoveOpening}
            onSpawnProduct={handleSpawnProduct}
            onUpdateItemElevation={handleUpdateItemElevation}
            onSnapItemToSurface={handleSnapItemToSurface}
            onDropItemToFloor={handleDropItemToFloor}
          />
        </section>

        {/* Right Panel: AI Assistant Chat & Shopping Cart */}
        {rightSidebarOpen && (
          <RightPanel
            roomSettings={roomSettings}
            placedItems={placedItems}
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            onSpawnProduct={handleSpawnProduct}
            onUpdateRoomSettings={handleUpdateRoomSettings}
            onRemoveItem={handleRemoveItem}
            onOpenCheckout={() => setCheckoutModalOpen(true)}
          />
        )}
      </main>

      {/* Build Room From Scratch Modal */}
      <BuildFromScratchModal
        isOpen={buildModalOpen}
        onClose={() => setBuildModalOpen(false)}
        onApplyCustomRoom={handleApplyCustomRoom}
      />

      {/* Photo-to-3D Reconstruction Modal */}
      <PhotoReconstructionModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onCompleteReconstruction={handleCompletePhotoReconstruction}
      />

      {/* 4-Angle Lookbook Render Studio Modal */}
      <MultiAngleRenderModal
        isOpen={renderModalOpen}
        onClose={() => setRenderModalOpen(false)}
        roomSettings={roomSettings}
        placedItems={placedItems}
        currentTheme={currentTheme}
        captureAngleRenders={async () => {
          if (captureHookRef.current) {
            return await captureHookRef.current();
          }
          return {
            perspective: "",
            isometric: "",
            top_down: "",
            walkthrough: "",
          };
        }}
      />

      {/* 1-Click Multi-Brand Consolidated Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        placedItems={placedItems}
      />
    </div>
  );
}
