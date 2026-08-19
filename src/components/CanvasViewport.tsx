import React, { useState } from "react";
import { Blueprint2D } from "./Blueprint2D";
import { ThreeCanvas3D } from "./ThreeCanvas3D";
import {
  PlacedItem,
  RoomSettings,
  RoomTheme,
  ViewMode,
  CameraPreset,
  DetectedObject,
  SolarTimeSettings,
} from "../types";
import {
  Box,
  Compass,
  Sparkles,
  Camera,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Sun,
  Moon,
  Footprints,
} from "lucide-react";

interface CanvasViewportProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  roomSettings: RoomSettings;
  onUpdateRoomSettings?: (settings: Partial<RoomSettings>) => void;
  placedItems: PlacedItem[];
  selectedInstanceId: string | null;
  onSelectItem: (instanceId: string | null) => void;
  onUpdateItemPosition: (instanceId: string, x: number, y: number) => void;
  onUpdateItemRotation: (instanceId: string, rotation: number) => void;
  onUpdateItemColor?: (instanceId: string, colorHex: string, materialName?: string) => void;
  onRemoveItem: (instanceId: string) => void;
  onDuplicateItem?: (instanceId: string) => void;
  onResetRoom: () => void;
  currentTheme: RoomTheme;
  isDigitalTwin: boolean;
  detectedObjects: DetectedObject[];
  onRemoveDetectedObject: (id: string) => void;
  onClearAllDetected: () => void;
  onOpenPhotoModal: () => void;
  onOpenRenderModal: () => void;
  onOpenCheckout?: () => void;
  onRegisterCaptureHook?: (fn: () => Promise<Record<CameraPreset, string>>) => void;
  solarSettings: SolarTimeSettings;
  onUpdateSolarSettings: (settings: Partial<SolarTimeSettings>) => void;
  onOpenLightingSection?: () => void;
  onAddOpening?: (opening: any) => void;
  onUpdateOpening?: (id: string, patch: any) => void;
  onRemoveOpening?: (id: string) => void;
  onSpawnProduct?: (productId: string, x?: number, y?: number) => void;
  onUpdateItemElevation?: (instanceId: string, z: number) => void;
  onSnapItemToSurface?: (instanceId: string) => void;
  onDropItemToFloor?: (instanceId: string) => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  viewMode,
  onViewModeChange,
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
  onResetRoom,
  currentTheme,
  isDigitalTwin,
  detectedObjects,
  onRemoveDetectedObject,
  onClearAllDetected,
  onOpenPhotoModal,
  onOpenRenderModal,
  onRegisterCaptureHook,
  solarSettings,
  onUpdateSolarSettings,
  onOpenLightingSection,
  onAddOpening,
  onUpdateOpening,
  onRemoveOpening,
  onSpawnProduct,
  onUpdateItemElevation,
  onSnapItemToSurface,
  onDropItemToFloor,
}) => {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("perspective");
  const [snapshotToast, setSnapshotToast] = useState(false);

  const activeDetectedCount = detectedObjects.filter((d) => !d.isRemoved).length;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0F0F0F] overflow-hidden select-none">
      {/* Views & Canvas Navigation Toolbar */}
      <div className="h-12 px-4 bg-[#121212] border-b border-[#2D2D2D] flex items-center justify-between z-30 transition-colors">
        {/* Left: 2D / 3D / Walkthrough Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#1A1A1A] p-1 rounded-xl border border-[#2D2D2D]">
          {/* 2D Blueprint */}
          <button
            onClick={() => onViewModeChange("2d")}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "2d"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-[#888] hover:text-white"
            }`}
            title="2D CAD Blueprint & Floor Plan"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>2D Blueprint</span>
          </button>

          {/* 3D Spatial Orbit */}
          <button
            onClick={() => {
              onViewModeChange("3d");
              if (cameraPreset === "walkthrough") setCameraPreset("perspective");
            }}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "3d"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-[#888] hover:text-white"
            }`}
            title="3D Spatial WebGL Orbit & Furnishings"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D View</span>
          </button>

          {/* First-Person Walkthrough */}
          <button
            onClick={() => {
              onViewModeChange("walkthrough");
              setCameraPreset("walkthrough");
            }}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "walkthrough"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-[#888] hover:text-white"
            }`}
            title="Eye-Level Interior Walkthrough"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Walkthrough</span>
          </button>
        </div>

        {/* Center: 3D Camera Angles & Day/Night Toggle (When in 3D Mode) */}
        {viewMode === "3d" && (
          <div className="flex items-center gap-2">
            {/* Camera Presets */}
            <div className="hidden md:flex items-center gap-1 bg-[#1A1A1A] p-0.5 rounded-lg border border-[#2D2D2D]">
              <button
                onClick={() => setCameraPreset("perspective")}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  cameraPreset === "perspective"
                    ? "bg-indigo-600/25 text-indigo-300 font-bold"
                    : "text-[#888] hover:text-white"
                }`}
              >
                Orbit
              </button>
              <button
                onClick={() => setCameraPreset("isometric")}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  cameraPreset === "isometric"
                    ? "bg-indigo-600/25 text-indigo-300 font-bold"
                    : "text-[#888] hover:text-white"
                }`}
              >
                Iso 45°
              </button>
              <button
                onClick={() => setCameraPreset("top_down")}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  cameraPreset === "top_down"
                    ? "bg-indigo-600/25 text-indigo-300 font-bold"
                    : "text-[#888] hover:text-white"
                }`}
              >
                Top-Down
              </button>
            </div>

            {/* Sun & Lighting Section Trigger Button */}
            <button
              onClick={() => onOpenLightingSection?.()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-[#2D2D2D] bg-[#1A1A1A] text-[#AAA] hover:text-white hover:border-[#5B50F6] hover:bg-[#1E1F29] transition-all"
              title="Open Day/Night Sun & Lighting Studio in Panel"
            >
              {solarSettings.hour >= 6 && solarSettings.hour <= 19 ? (
                <Sun className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#8C8BFF]" />
              )}
              <span>Sun & Lighting</span>
            </button>
          </div>
        )}

        {/* Right Actions: Multi-Angle Lookbook Render, Photo Scan, Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRenderModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            title="Save Room Image Lookbook (Top-Down, Eye-Level, Iso 45, Orbit)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save 4-Angle Renders</span>
          </button>

          <button
            onClick={onOpenPhotoModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Photo-to-3D</span>
          </button>

          <button
            onClick={onResetRoom}
            className="p-1.5 text-[#888] hover:text-white hover:bg-[#1A1A1A] rounded-lg border border-[#2D2D2D] transition-colors"
            title="Reset Room"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detected Objects Bar from Photo Scanner */}
      {isDigitalTwin && activeDetectedCount > 0 && (
        <div className="bg-[#121212] border-b border-[#2D2D2D] px-4 py-2 flex items-center justify-between text-xs text-white z-20">
          <div className="flex items-center gap-2.5 overflow-x-auto py-0.5">
            <span className="flex items-center gap-1 font-semibold text-indigo-400 whitespace-nowrap text-[11px]">
              <Sparkles className="w-3 h-3" /> Photo Objects ({activeDetectedCount}):
            </span>
            {detectedObjects
              .filter((d) => !d.isRemoved)
              .map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#2D2D2D] px-2 py-0.5 rounded text-[11px] text-[#E5E5E5]"
                >
                  <span>{d.label}</span>
                  <span className="text-[9px] text-[#666] font-mono">{(d.confidence * 100).toFixed(0)}%</span>
                  <button
                    onClick={() => onRemoveDetectedObject(d.id)}
                    className="p-0.5 text-[#888] hover:text-red-400 rounded transition-colors"
                    title="Erase from 3D"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
          </div>
          <button
            onClick={onClearAllDetected}
            className="ml-3 px-2 py-0.5 bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 rounded text-[10px] font-medium whitespace-nowrap transition-colors"
          >
            Clear Old Furniture
          </button>
        </div>
      )}

      {/* Main Canvas Viewport Area */}
      <div className="flex-1 relative w-full h-full sophisticated-grid-bg overflow-hidden">
        {viewMode === "2d" ? (
          <Blueprint2D
            roomSettings={roomSettings}
            onUpdateRoomSettings={onUpdateRoomSettings || (() => {})}
            placedItems={placedItems}
            selectedInstanceId={selectedInstanceId}
            onSelectItem={onSelectItem}
            onUpdateItemPosition={onUpdateItemPosition}
            onUpdateItemRotation={onUpdateItemRotation}
            onUpdateItemColor={onUpdateItemColor}
            onRemoveItem={onRemoveItem}
            onDuplicateItem={onDuplicateItem}
            currentTheme={currentTheme}
            onAddOpening={onAddOpening}
            onUpdateOpening={onUpdateOpening}
            onRemoveOpening={onRemoveOpening}
            onSpawnProduct={onSpawnProduct}
            onUpdateItemElevation={onUpdateItemElevation}
            onSnapItemToSurface={onSnapItemToSurface}
            onDropItemToFloor={onDropItemToFloor}
          />
        ) : (
          /* 3D WebGL Canvas with Day/Night Simulation */
          <div className="relative w-full h-full">
            <ThreeCanvas3D
              roomSettings={roomSettings}
              placedItems={placedItems}
              selectedInstanceId={selectedInstanceId}
              onSelectItem={onSelectItem}
              onUpdateItemPosition={onUpdateItemPosition}
              onUpdateItemRotation={onUpdateItemRotation}
              onUpdateItemColor={onUpdateItemColor}
              onRemoveItem={onRemoveItem}
              onDuplicateItem={onDuplicateItem}
              currentTheme={currentTheme}
              cameraPreset={viewMode === "walkthrough" ? "walkthrough" : cameraPreset}
              onCameraPresetChange={setCameraPreset}
              isDigitalTwin={isDigitalTwin}
              solarSettings={solarSettings}
              onRegisterCaptureHook={onRegisterCaptureHook}
              onSpawnProduct={onSpawnProduct}
              onUpdateRoomSettings={onUpdateRoomSettings}
              onAddOpening={onAddOpening}
              onUpdateItemElevation={onUpdateItemElevation}
              onSnapItemToSurface={onSnapItemToSurface}
              onDropItemToFloor={onDropItemToFloor}
            />

            {/* Walkthrough Guide Badge */}
            {viewMode === "walkthrough" && (
              <div className="absolute top-4 left-4 z-30 bg-[#121212]/90 backdrop-blur-md border border-[#2D2D2D] rounded-xl px-3.5 py-2 text-xs text-white shadow-xl flex items-center gap-2">
                <Footprints className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="font-bold">Eye-Level Walkthrough</span>
                  <p className="text-[10px] text-[#888]">Drag mouse to look around room interior at 1.65m height</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Alert */}
      {snapshotToast && (
        <div className="absolute top-14 right-6 z-40 bg-[#121212] text-white px-3.5 py-2 rounded-lg shadow-xl border border-[#2D2D2D] flex items-center gap-2 text-xs font-medium backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>High-Resolution Snapshot saved</span>
        </div>
      )}
    </div>
  );
};
