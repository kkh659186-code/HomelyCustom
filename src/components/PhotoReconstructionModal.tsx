import React, { useState, useRef } from "react";
import { DetectedObject, RoomSettings, RoomType } from "../types";
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  X,
  Scan,
  Zap,
  Trash2,
  ArrowRight,
  RefreshCw,
  ImageIcon,
  Eye,
  Sliders,
} from "lucide-react";

interface PhotoReconstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteReconstruction: (
    photoUrl: string,
    detectedObjects: DetectedObject[],
    roomType: RoomType,
    updatedDims?: { width: number; length: number; height: number }
  ) => void;
}

const SAMPLE_ROOM_PHOTOS = [
  {
    id: "sample-living",
    title: "1990s Dated Living Room",
    roomType: "Living Room" as RoomType,
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80",
    detected: [
      {
        id: "det-couch",
        label: "Old Oversized Floral Couch",
        category: "Living Room",
        confidence: 0.96,
        x: 0,
        y: 0.8,
        width: 2.3,
        depth: 1.0,
        height: 0.85,
        isRemoved: false,
        originalDescription: "Heavy fabric seating taking up 40% of room volume",
      },
      {
        id: "det-table",
        label: "Worn Oak Coffee Table",
        category: "Living Room",
        confidence: 0.91,
        x: 0,
        y: -0.1,
        width: 1.2,
        depth: 0.7,
        height: 0.42,
        isRemoved: false,
        originalDescription: "Scratched surface with bulky block legs",
      },
      {
        id: "det-clock",
        label: "Dated Wall Clock & Plaque",
        category: "Decor",
        confidence: 0.89,
        x: -2.2,
        y: 0.4,
        width: 0.35,
        depth: 0.08,
        height: 0.75,
        isRemoved: false,
        originalDescription: "Yellowed plastic analog clock on primary wall",
      },
    ],
  },
  {
    id: "sample-office",
    title: "Cluttered Home Office",
    roomType: "Home Office" as RoomType,
    url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=80",
    detected: [
      {
        id: "det-desk",
        label: "Particle Board Computer Desk",
        category: "Home Office",
        confidence: 0.95,
        x: 0,
        y: 0.5,
        width: 1.42,
        depth: 0.76,
        height: 0.77,
        isRemoved: false,
        originalDescription: "Sagging laminate surface with tangled cords",
      },
      {
        id: "det-chair",
        label: "Worn Swivel Task Chair",
        category: "Home Office",
        confidence: 0.93,
        x: 0,
        y: -0.4,
        width: 0.68,
        depth: 0.68,
        height: 1.05,
        isRemoved: false,
        originalDescription: "Peeling faux leather with poor lumbar support",
      },
      {
        id: "det-board",
        label: "Stained Wall Whiteboard",
        category: "Home Office",
        confidence: 0.91,
        x: 1.8,
        y: 0,
        width: 1.5,
        depth: 0.5,
        height: 1.96,
        isRemoved: false,
        originalDescription: "Permanent marker ghosting on dented aluminum board",
      },
    ],
  },
  {
    id: "sample-dining",
    title: "Dated Traditional Dining Space",
    roomType: "Dining" as RoomType,
    url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80",
    detected: [
      {
        id: "det-dining-table",
        label: "Bulky Dark Mahogany Dining Table",
        category: "Dining",
        confidence: 0.96,
        x: 0,
        y: 0,
        width: 2.0,
        depth: 0.9,
        height: 0.74,
        isRemoved: false,
        originalDescription: "Heavy turned legs and chipped varnish finish",
      },
      {
        id: "det-dining-chairs",
        label: "High-Back Spindle Dining Chairs",
        category: "Dining",
        confidence: 0.94,
        x: 0,
        y: 0.8,
        width: 0.55,
        depth: 0.51,
        height: 0.76,
        isRemoved: false,
        originalDescription: "Rigid un-ergonomic wooden chairs",
      },
      {
        id: "det-dining-clock",
        label: "Heavy Ornate Wall Clock",
        category: "Decor",
        confidence: 0.88,
        x: -2.0,
        y: 0,
        width: 0.48,
        depth: 0.06,
        height: 0.48,
        isRemoved: false,
        originalDescription: "Ticking pendulum clock dominating dining focal line",
      },
    ],
  },
];

const AVAILABLE_ROOM_TYPES: RoomType[] = [
  "Living Room",
  "Home Office",
  "Dining",
  "Kitchen",
  "Bedroom",
  "Bathroom",
];

export const PhotoReconstructionModal: React.FC<PhotoReconstructionModalProps> = ({
  isOpen,
  onClose,
  onCompleteReconstruction,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(SAMPLE_ROOM_PHOTOS[0].url);
  const [activeSample, setActiveSample] = useState<(typeof SAMPLE_ROOM_PHOTOS)[0] | null>(SAMPLE_ROOM_PHOTOS[0]);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType>("Living Room");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [detectedList, setDetectedList] = useState<DetectedObject[]>([]);
  const [estimatedDims, setEstimatedDims] = useState<{ width: number; length: number; height: number }>({
    width: 5.8,
    length: 6.6,
    height: 2.8,
  });
  const [isFinished, setIsFinished] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const steps = [
    "Analyzing architectural perspective & vanishing points...",
    "Extracting depth estimation & room perimeter bounds...",
    "Detecting furniture objects, fixtures & bounding boxes...",
    "Synthesizing editable 3D Digital Twin coordinates...",
  ];

  const handleStartProcessing = async () => {
    if (!selectedPhoto) return;
    setIsProcessing(true);
    setProcessingStep(0);
    setIsFinished(false);

    // Step progress animation
    const interval = setInterval(() => {
      setProcessingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 700);

    try {
      const response = await fetch("/api/gemini/analyze-room-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedPhoto,
          roomType: selectedRoomType,
        }),
      });

      const data = await response.json();
      clearInterval(interval);
      setIsProcessing(false);
      setIsFinished(true);

      if (data.detectedObjects && data.detectedObjects.length > 0) {
        setDetectedList(data.detectedObjects);
      } else if (activeSample) {
        setDetectedList(activeSample.detected);
      }

      if (data.estimatedDimensions) {
        setEstimatedDims(data.estimatedDimensions);
      }
    } catch (err) {
      console.error("Photo analysis error:", err);
      clearInterval(interval);
      setIsProcessing(false);
      setIsFinished(true);
      if (activeSample) {
        setDetectedList(activeSample.detected);
      }
    }
  };

  const handleApplyToCanvas = () => {
    if (!selectedPhoto) return;
    onCompleteReconstruction(selectedPhoto, detectedList, selectedRoomType, estimatedDims);
    onClose();
  };

  const toggleRemoveObject = (id: string) => {
    setDetectedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRemoved: !item.isRemoved } : item))
    );
  };

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPhoto(reader.result as string);
      setActiveSample(null);
      setIsFinished(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2D2D2D] rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[#E5E5E5]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D2D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Photo-to-3D Room Reconstruction
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400 font-semibold">
                  AI Computer Vision
                </span>
              </h2>
              <p className="text-[11px] text-[#888]">
                Upload any room photo to reconstruct an interactive 3D Digital Twin with detected furniture.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888] hover:text-white hover:bg-[#1A1A1A] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Select / Upload Photo */}
        {!isProcessing && !isFinished && (
          <div className="space-y-4">
            {/* Room Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
                Room Type Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_ROOM_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedRoomType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedRoomType === type
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2D2D2D]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample Photo Selection */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
                Select a sample photo or upload your own
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {SAMPLE_ROOM_PHOTOS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => {
                      setSelectedPhoto(sample.url);
                      setActiveSample(sample);
                      setSelectedRoomType(sample.roomType);
                    }}
                    className={`cursor-pointer rounded-lg border overflow-hidden p-1.5 transition-all ${
                      selectedPhoto === sample.url
                        ? "border-indigo-500 bg-indigo-600/10 shadow-md shadow-indigo-600/10 ring-1 ring-indigo-500"
                        : "border-[#2D2D2D] bg-[#1A1A1A] hover:border-[#3D3D3D]"
                    }`}
                  >
                    <div className="h-24 rounded bg-[#242424] overflow-hidden">
                      <img
                        src={sample.url}
                        alt={sample.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="mt-1.5">
                      <p className="text-[11px] font-semibold text-white truncate">{sample.title}</p>
                      <p className="text-[9px] text-[#888]">{sample.roomType}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Photo Drag & Drop Upload */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-600/15"
                  : selectedPhoto && !activeSample
                  ? "border-indigo-500/50 bg-[#1A1A1A]"
                  : "border-[#3D3D3D] hover:border-indigo-500 bg-[#1A1A1A]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomFileUpload}
                className="hidden"
              />
              
              {selectedPhoto && !activeSample ? (
                <div className="flex items-center justify-center gap-4">
                  <img
                    src={selectedPhoto}
                    alt="Uploaded Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-indigo-500/40"
                  />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Custom Photo Loaded
                    </p>
                    <p className="text-[11px] text-[#888]">Click or drop another file to replace</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <UploadCloud className="w-7 h-7 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">
                    Upload your room photo (Drag & Drop or Click)
                  </span>
                  <span className="text-[10px] text-[#666]">Supports JPG, PNG, HEIC up to 25MB</span>
                </div>
              )}
            </div>

            <button
              onClick={handleStartProcessing}
              disabled={!selectedPhoto}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate 3D Digital Twin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Processing Overlay */}
        {isProcessing && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-[#1A1A1A] flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-xs font-bold text-white">
                Synthesizing 3D Architectural Space
              </h3>
              <p className="text-[11px] text-indigo-400 font-mono">
                {steps[processingStep]}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Finished / Object Management */}
        {isFinished && (
          <div className="space-y-4">
            {/* Visual Photo & Detection Banner */}
            <div className="relative rounded-lg overflow-hidden border border-[#2D2D2D] bg-[#1A1A1A] h-40">
              {selectedPhoto && (
                <img
                  src={selectedPhoto}
                  alt="Scanned Room"
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent flex items-end p-3">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                      Spatial Dimensions
                    </span>
                    <p className="text-xs font-bold text-white">
                      {estimatedDims.width}m W × {estimatedDims.length}m L × {estimatedDims.height}m H
                    </p>
                  </div>
                  <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{detectedList.length} Objects Detected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detected Objects List with Replacement Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
                  Detected Existing Objects
                </span>
                <span className="text-[10px] text-[#666]">
                  Click erase to remove dated pieces from the 3D twin
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {detectedList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between text-xs ${
                      item.isRemoved
                        ? "bg-[#1A1A1A]/40 border-[#2D2D2D] opacity-50"
                        : "bg-[#1A1A1A] border-[#2D2D2D] hover:border-[#3D3D3D]"
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{item.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#242424] text-indigo-400 font-mono font-bold">
                          {(item.confidence * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888] truncate">
                        {item.recommendation || item.originalDescription || "Detected piece in space"}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleRemoveObject(item.id)}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                        item.isRemoved
                          ? "bg-[#242424] text-[#888] hover:text-white"
                          : "bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{item.isRemoved ? "Restore" : "Erase"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-[#2D2D2D]">
              <button
                onClick={() => setIsFinished(false)}
                className="py-2.5 px-4 bg-[#1A1A1A] hover:bg-[#242424] text-[#888] hover:text-white text-xs font-semibold rounded-lg border border-[#2D2D2D] transition-colors"
              >
                Scan Another Photo
              </button>
              <button
                onClick={handleApplyToCanvas}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Apply 3D Digital Twin to Canvas</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
