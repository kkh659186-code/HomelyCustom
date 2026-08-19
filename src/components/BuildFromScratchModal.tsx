import React, { useState } from "react";
import { RoomSettings, RoomType, FloorType, WallFinish, WallOpening } from "../types";
import {
  Maximize2,
  Box,
  Layers,
  Sparkles,
  X,
  Check,
  Compass,
  Square,
  Home,
  Sliders,
  DoorOpen,
  Plus,
  Trash2,
} from "lucide-react";

interface BuildFromScratchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCustomRoom: (
    settings: Partial<RoomSettings>,
    clearFurniture: boolean,
    seedDefaultOpenings: boolean
  ) => void;
}

const DIMENSION_PRESETS = [
  {
    name: "Compact Studio / Office",
    type: "Home Office" as RoomType,
    width: 3.8,
    length: 4.5,
    height: 2.7,
    description: "17.1 m² (184 sq ft) — Great for modern work spaces & studios",
  },
  {
    name: "Standard Living Room",
    type: "Living Room" as RoomType,
    width: 5.4,
    length: 6.2,
    height: 2.8,
    description: "33.5 m² (360 sq ft) — Perfect for sofas, credenza & coffee tables",
  },
  {
    name: "Open-Plan Living & Dining",
    type: "Living Room" as RoomType,
    width: 7.2,
    length: 8.5,
    height: 3.0,
    description: "61.2 m² (658 sq ft) — Expansive luxury great room",
  },
  {
    name: "Master Suite",
    type: "Bedroom" as RoomType,
    width: 4.8,
    length: 5.6,
    height: 2.8,
    description: "26.9 m² (289 sq ft) — Accommodates king bed & lounge seating",
  },
  {
    name: "Chef Kitchen",
    type: "Kitchen" as RoomType,
    width: 4.2,
    length: 5.8,
    height: 2.8,
    description: "24.4 m² (262 sq ft) — Ideal for large islands & range cooking",
  },
  {
    name: "Formal Dining Hall",
    type: "Dining Room" as RoomType,
    width: 4.5,
    length: 6.0,
    height: 2.9,
    description: "27.0 m² (290 sq ft) — Seats 8-12 person dining table",
  },
];

const ROOM_TYPES: RoomType[] = [
  "Living Room",
  "Home Office",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Bathroom",
];

const FLOOR_FINISHES: { name: FloorType; hex: string; desc: string }[] = [
  { name: "Hardwood Oak", hex: "#D4B996", desc: "Warm Scandinavian white oak planks" },
  { name: "Herringbone Walnut", hex: "#7A5338", desc: "Refined dark walnut parquet pattern" },
  { name: "Marble Bianco", hex: "#EAE7DF", desc: "Polished Italian white Carrara stone" },
  { name: "Polished Concrete", hex: "#A8A59F", desc: "Industrial seamless matte architectural finish" },
  { name: "Terrazzo Stone", hex: "#D9D2C7", desc: "Speckled Venetian composite aggregate" },
  { name: "Slate Tile", hex: "#4A4D52", desc: "Deep charcoal textured natural stone" },
];

const WALL_FINISHES: { name: WallFinish; hex: string; desc: string }[] = [
  { name: "Smooth Chalk Plaster", hex: "#F5F3ED", desc: "Minimalist soft chalk off-white" },
  { name: "Limewash Greige", hex: "#E3DFD5", desc: "Textured mineral wash with subtle depth" },
  { name: "Fluted Oak Paneling", hex: "#9E7B56", desc: "Vertical acoustic timber acoustic slats" },
  { name: "Matte Charcoal", hex: "#2B2D30", desc: "Sophisticated dramatic dark accent tone" },
  { name: "Exposed Brick", hex: "#A05844", desc: "Reclaimed rustic masonry facade" },
  { name: "Subway Tile", hex: "#F7F7F7", desc: "Crisp glazed ceramic grid" },
];

export const BuildFromScratchModal: React.FC<BuildFromScratchModalProps> = ({
  isOpen,
  onClose,
  onApplyCustomRoom,
}) => {
  const [selectedType, setSelectedType] = useState<RoomType>("Living Room");
  const [width, setWidth] = useState<number>(5.5);
  const [length, setLength] = useState<number>(6.5);
  const [height, setHeight] = useState<number>(2.8);

  const [selectedFloor, setSelectedFloor] = useState<FloorType>("Hardwood Oak");
  const [floorColor, setFloorColor] = useState<string>("#D4B996");

  const [selectedWall, setSelectedWall] = useState<WallFinish>("Smooth Chalk Plaster");
  const [wallColor, setWallColor] = useState<string>("#F5F3ED");

  const [clearFurniture, setClearFurniture] = useState<boolean>(true);
  const [includeDoorsWindows, setIncludeDoorsWindows] = useState<boolean>(true);

  if (!isOpen) return null;

  // Calculated Spatial Metrics
  const floorAreaM2 = width * length;
  const floorAreaSqFt = floorAreaM2 * 10.7639;
  const volumeM3 = floorAreaM2 * height;
  const perimeterM = (width + length) * 2;

  const handleApplyPreset = (preset: (typeof DIMENSION_PRESETS)[0]) => {
    setSelectedType(preset.type);
    setWidth(preset.width);
    setLength(preset.length);
    setHeight(preset.height);
  };

  const handleCreateRoom = () => {
    onApplyCustomRoom(
      {
        type: selectedType,
        width: Math.round(width * 10) / 10,
        length: Math.round(length * 10) / 10,
        height: Math.round(height * 10) / 10,
        floorType: selectedFloor,
        floorColor,
        wallFinish: selectedWall,
        wallColor,
      },
      clearFurniture,
      includeDoorsWindows
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2D2D2D] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto text-[#E5E5E5] select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D2D] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-600/30">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Build Room from Scratch
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30">
                  Custom Architecture
                </span>
              </h2>
              <p className="text-xs text-[#888]">
                Define exact custom room dimensions, architectural materials, and start designing your unique layout.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#888] hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Quick Presets Bar */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-[#888] flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Popular Architectural Dimension Presets</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DIMENSION_PRESETS.map((p) => {
              const isMatch = width === p.width && length === p.length;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isMatch
                      ? "bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/50"
                      : "bg-[#181818] border-[#2D2D2D] text-[#AAA] hover:border-[#3D3D3D] hover:text-white"
                  }`}
                >
                  <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-indigo-400 font-mono font-medium mt-0.5">
                    {p.width}m × {p.length}m ({(p.width * p.length).toFixed(1)} m²)
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Room Type Selector */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-[#888] flex items-center gap-1.5">
            <Home className="w-3 h-3 text-indigo-400" />
            <span>Room Classification</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROOM_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedType === type
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-[#181818] text-[#888] hover:text-white border border-[#2D2D2D]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Custom Dimension Sliders & Numeric Inputs */}
        <div className="bg-[#181818] border border-[#2D2D2D] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Exact Spatial Measurements</span>
            </span>
            <span className="text-[10px] text-[#888] font-mono">Precision: 0.1m</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Width Slider */}
            <div className="space-y-1.5 bg-[#121212] p-3 rounded-lg border border-[#2D2D2D]">
              <div className="flex justify-between text-xs">
                <span className="text-[#888]">Width (X-Axis):</span>
                <span className="font-mono font-bold text-white">{width.toFixed(1)} m ({(width * 3.28084).toFixed(1)} ft)</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="16.0"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#666] font-mono">
                <span>2.5m</span>
                <span>16.0m</span>
              </div>
            </div>

            {/* Length Slider */}
            <div className="space-y-1.5 bg-[#121212] p-3 rounded-lg border border-[#2D2D2D]">
              <div className="flex justify-between text-xs">
                <span className="text-[#888]">Length (Y-Axis):</span>
                <span className="font-mono font-bold text-white">{length.toFixed(1)} m ({(length * 3.28084).toFixed(1)} ft)</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="18.0"
                step="0.1"
                value={length}
                onChange={(e) => setLength(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#666] font-mono">
                <span>2.5m</span>
                <span>18.0m</span>
              </div>
            </div>

            {/* Height Slider */}
            <div className="space-y-1.5 bg-[#121212] p-3 rounded-lg border border-[#2D2D2D]">
              <div className="flex justify-between text-xs">
                <span className="text-[#888]">Ceiling Height:</span>
                <span className="font-mono font-bold text-white">{height.toFixed(1)} m ({(height * 3.28084).toFixed(1)} ft)</span>
              </div>
              <input
                type="range"
                min="2.2"
                max="5.0"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#666] font-mono">
                <span>2.2m (Standard)</span>
                <span>5.0m (Double Height)</span>
              </div>
            </div>
          </div>

          {/* Live Metric Readout Cards */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2D2D2D] text-center">
              <span className="text-[9px] text-[#888] uppercase block">Floor Area</span>
              <span className="text-xs font-bold text-white font-mono">{floorAreaM2.toFixed(1)} m²</span>
            </div>
            <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2D2D2D] text-center">
              <span className="text-[9px] text-[#888] uppercase block">Square Feet</span>
              <span className="text-xs font-bold text-white font-mono">{Math.round(floorAreaSqFt)} sq ft</span>
            </div>
            <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2D2D2D] text-center">
              <span className="text-[9px] text-[#888] uppercase block">Room Volume</span>
              <span className="text-xs font-bold text-white font-mono">{volumeM3.toFixed(1)} m³</span>
            </div>
            <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2D2D2D] text-center">
              <span className="text-[9px] text-[#888] uppercase block">Perimeter</span>
              <span className="text-xs font-bold text-white font-mono">{perimeterM.toFixed(1)} m</span>
            </div>
          </div>
        </div>

        {/* 4. Floor & Wall Finishes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Floor Finish */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#888] block">
              Floor Material & Texture
            </span>
            <div className="space-y-1.5">
              {FLOOR_FINISHES.map((fl) => (
                <button
                  key={fl.name}
                  type="button"
                  onClick={() => {
                    setSelectedFloor(fl.name);
                    setFloorColor(fl.hex);
                  }}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                    selectedFloor === fl.name
                      ? "bg-indigo-600/15 border-indigo-500 text-white"
                      : "bg-[#181818] border-[#2D2D2D] text-[#AAA] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/30 flex-shrink-0"
                      style={{ backgroundColor: fl.hex }}
                    ></span>
                    <div>
                      <p className="text-xs font-semibold">{fl.name}</p>
                      <p className="text-[10px] text-[#777]">{fl.desc}</p>
                    </div>
                  </div>
                  {selectedFloor === fl.name && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Wall Finish */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#888] block">
              Wall Surface & Treatment
            </span>
            <div className="space-y-1.5">
              {WALL_FINISHES.map((wl) => (
                <button
                  key={wl.name}
                  type="button"
                  onClick={() => {
                    setSelectedWall(wl.name);
                    setWallColor(wl.hex);
                  }}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                    selectedWall === wl.name
                      ? "bg-indigo-600/15 border-indigo-500 text-white"
                      : "bg-[#181818] border-[#2D2D2D] text-[#AAA] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/30 flex-shrink-0"
                      style={{ backgroundColor: wl.hex }}
                    ></span>
                    <div>
                      <p className="text-xs font-semibold">{wl.name}</p>
                      <p className="text-[10px] text-[#777]">{wl.desc}</p>
                    </div>
                  </div>
                  {selectedWall === wl.name && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Custom Startup Setup Options */}
        <div className="bg-[#181818] border border-[#2D2D2D] p-3.5 rounded-xl space-y-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#888] block">
            Workspace Configuration
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#121212] border border-[#2D2D2D] cursor-pointer hover:border-[#3D3D3D]">
              <input
                type="checkbox"
                checked={clearFurniture}
                onChange={(e) => setClearFurniture(e.target.checked)}
                className="w-4 h-4 rounded border-[#3D3D3D] text-indigo-600 focus:ring-0 bg-[#1A1A1A]"
              />
              <div>
                <p className="font-semibold text-white">Start with Clean Slate</p>
                <p className="text-[10px] text-[#777]">Empty floor ready for custom furniture</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#121212] border border-[#2D2D2D] cursor-pointer hover:border-[#3D3D3D]">
              <input
                type="checkbox"
                checked={includeDoorsWindows}
                onChange={(e) => setIncludeDoorsWindows(e.target.checked)}
                className="w-4 h-4 rounded border-[#3D3D3D] text-indigo-600 focus:ring-0 bg-[#1A1A1A]"
              />
              <div>
                <p className="font-semibold text-white">Add Entrance Door & Window</p>
                <p className="text-[10px] text-[#777]">Can be repositioned or customized anytime</p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#2D2D2D]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#181818] hover:bg-[#242424] text-[#888] hover:text-white text-xs font-semibold rounded-xl border border-[#2D2D2D] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRoom}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Custom Space ({width.toFixed(1)}m × {length.toFixed(1)}m)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
