import React, { useState, useEffect } from "react";
import { CameraPreset, PlacedItem, RoomSettings, RoomTheme } from "../types";
import { MOCK_PRODUCTS } from "../data/mockProducts";
import {
  Camera,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  Layers,
  Eye,
  Compass,
  Maximize2,
  Share2,
} from "lucide-react";

export interface AngleRenderItem {
  id: CameraPreset;
  title: string;
  subtitle: string;
  iconName: "orbit" | "iso" | "top" | "eye";
  dataUrl?: string;
  resolution: string;
}

interface MultiAngleRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSettings: RoomSettings;
  placedItems: PlacedItem[];
  currentTheme: RoomTheme;
  captureAngleRenders: () => Promise<Record<CameraPreset, string>>;
}

export const MultiAngleRenderModal: React.FC<MultiAngleRenderModalProps> = ({
  isOpen,
  onClose,
  roomSettings,
  placedItems,
  currentTheme,
  captureAngleRenders,
}) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [renders, setRenders] = useState<Record<CameraPreset, string> | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<CameraPreset>("perspective");
  const [copiedAngle, setCopiedAngle] = useState<string | null>(null);
  const [downloadedAll, setDownloadedAll] = useState(false);
  const [resolutionMode, setResolutionMode] = useState<"1080p" | "2K">("1080p");
  const [includeSpecs, setIncludeSpecs] = useState(true);

  const angleConfigs: {
    id: CameraPreset;
    title: string;
    description: string;
    tag: string;
  }[] = [
    {
      id: "perspective",
      title: "Orbit Studio View",
      description: "Dynamic 45° perspective highlighting room volume, ambient lighting, and depth.",
      tag: "Perspective",
    },
    {
      id: "isometric",
      title: "Iso 45° Axonometric",
      description: "True parallel projection ideal for spatial flow, furniture clearances, and elevations.",
      tag: "Axonometric",
    },
    {
      id: "top_down",
      title: "Top-Down Plan",
      description: "Orthographic bird's-eye view showcasing layout distribution and architectural flow.",
      tag: "Orthographic",
    },
    {
      id: "walkthrough",
      title: "Eye-Level Walkthrough",
      description: "Human eye-level viewpoint (1.6m elevation) simulating physical presence.",
      tag: "First-Person",
    },
  ];

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    // Call the Three.js capture function to render all 4 camera presets
    captureAngleRenders()
      .then((data) => {
        if (isMounted) {
          setRenders(data);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error("Failed to capture 4-angle renders:", err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, captureAngleRenders]);

  if (!isOpen) return null;

  const handleDownloadSingle = (angle: CameraPreset, title: string) => {
    if (!renders || !renders[angle]) return;
    const link = document.createElement("a");
    const filename = `RealizeCustom_${roomSettings.type.replace(/\s+/g, "_")}_${angle}_${Date.now()}.png`;
    link.href = renders[angle];
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    if (!renders) return;
    setDownloadedAll(true);
    setTimeout(() => setDownloadedAll(false), 3000);

    angleConfigs.forEach((cfg, idx) => {
      setTimeout(() => {
        handleDownloadSingle(cfg.id, cfg.title);
      }, idx * 250);
    });
  };

  const handleCopyToClipboard = async (angle: CameraPreset) => {
    if (!renders || !renders[angle]) return;
    try {
      const response = await fetch(renders[angle]);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopiedAngle(angle);
      setTimeout(() => setCopiedAngle(null), 2000);
    } catch (e) {
      console.warn("Clipboard copy failed, downloading instead:", e);
      handleDownloadSingle(angle, angle);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2D2D2D] rounded-xl max-w-5xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-[#E5E5E5] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#2D2D2D] pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Multi-Angle 3D Render Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-600/15 text-indigo-400 border border-indigo-500/30">
                  4 Perspectives
                </span>
              </div>
              <p className="text-[11px] text-[#888]">
                Export professional lookbook captures of your custom layout in Orbit, Iso 45°, Top-Down, and Eye-Level.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              disabled={isGenerating || !renders}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              {downloadedAll ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Downloaded 4 Images</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All 4 Views</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#888] hover:text-white hover:bg-[#1A1A1A] rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-[#1A1A1A] flex items-center justify-center text-indigo-400">
                <Camera className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white">
                Rendering 4 Studio Camera Perspectives...
              </h3>
              <p className="text-[11px] text-[#888]">
                Capturing Orbit Studio, Iso 45°, Top-Down Blueprint, and Eye-Level Walkthrough.
              </p>
            </div>
          </div>
        )}

        {/* Content: 4-Angle Grid & Selected Detail View */}
        {!isGenerating && renders && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* 4 Angle Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {angleConfigs.map((cfg) => {
                const imgUrl = renders[cfg.id];
                const isSelected = selectedAngle === cfg.id;

                return (
                  <div
                    key={cfg.id}
                    onClick={() => setSelectedAngle(cfg.id)}
                    className={`cursor-pointer group bg-[#1A1A1A] rounded-lg border p-2 flex flex-col justify-between transition-all duration-150 ${
                      isSelected
                        ? "border-indigo-500 shadow-md shadow-indigo-600/10"
                        : "border-[#2D2D2D] hover:border-[#3D3D3D]"
                    }`}
                  >
                    <div>
                      {/* Image Frame */}
                      <div className="aspect-video bg-[#0F0F0F] rounded overflow-hidden relative border border-[#2D2D2D] group-hover:border-indigo-500/40 transition-colors">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={cfg.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-[#666]">
                            Rendering...
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 bg-[#0A0A0A]/90 text-[9px] font-bold text-white rounded border border-[#2D2D2D]">
                          {cfg.tag}
                        </span>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{cfg.title}</span>
                          {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px]">
                              <Check className="w-2 h-2" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#888] leading-tight mt-0.5 line-clamp-2">
                          {cfg.description}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-2.5 pt-2 border-t border-[#2D2D2D] flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(cfg.id, cfg.title);
                        }}
                        className="flex-1 py-1 px-2 bg-[#242424] hover:bg-indigo-600 hover:text-white text-[#888] text-[10px] font-semibold rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Save PNG</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyToClipboard(cfg.id);
                        }}
                        className="p-1 bg-[#242424] hover:bg-[#2D2D2D] text-[#888] hover:text-white rounded transition-colors"
                        title="Copy to Clipboard"
                      >
                        {copiedAngle === cfg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected High-Res Main Preview Showcase */}
            {selectedAngle && renders[selectedAngle] && (
              <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Full Preview: {angleConfigs.find((c) => c.id === selectedAngle)?.title}
                    </span>
                    <span className="text-[10px] text-[#666] font-mono">
                      1920 × 1080 Native WebGL
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyToClipboard(selectedAngle)}
                      className="px-2.5 py-1 bg-[#242424] hover:bg-[#2D2D2D] text-[#888] hover:text-white text-xs font-semibold rounded-lg border border-[#2D2D2D] flex items-center gap-1.5 transition-colors"
                    >
                      {copiedAngle === selectedAngle ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Image</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        handleDownloadSingle(
                          selectedAngle,
                          angleConfigs.find((c) => c.id === selectedAngle)?.title || "Render"
                        )
                      }
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download High-Res</span>
                    </button>
                  </div>
                </div>

                {/* Render Showcase Card */}
                <div className="relative rounded-lg overflow-hidden border border-[#2D2D2D] bg-[#0A0A0A] aspect-[16/9] max-h-[360px] flex items-center justify-center">
                  <img
                    src={renders[selectedAngle]}
                    alt={selectedAngle}
                    className="w-full h-full object-contain"
                  />

                  {/* Watermark Specs Tag */}
                  {includeSpecs && (
                    <div className="absolute bottom-3 left-3 bg-[#0A0A0A]/85 backdrop-blur-md border border-[#2D2D2D] px-3 py-1.5 rounded-lg text-xs space-y-0.5 text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-400">Realize Custom</span>
                        <span className="text-[#666]">•</span>
                        <span className="font-semibold">{roomSettings.type}</span>
                        <span className="text-[#666]">•</span>
                        <span className="text-[#888]">{currentTheme}</span>
                      </div>
                      <div className="text-[10px] text-[#888] font-mono">
                        {roomSettings.width}m × {roomSettings.length}m • {placedItems.length} Trade Items
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
