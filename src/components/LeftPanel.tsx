import React, { useState } from "react";
import {
  ProductItem,
  RoomSettings,
  RoomTheme,
  RoomType,
  FloorType,
  WallOpening,
  WallOrientation,
  OpeningType,
  SolarTimeSettings,
} from "../types";
import {
  MOCK_PRODUCTS,
  STYLE_THEMES,
  POPULAR_COLOR_PALETTES,
  getStoredCustomProducts,
  saveCustomProduct,
  deleteCustomProduct,
} from "../data/mockProducts";
import { DayNightLightingControls } from "./DayNightLightingControls";
import { AddCustomProductModal } from "./AddCustomProductModal";
import {
  Search,
  Plus,
  Camera,
  Check,
  ShieldCheck,
  Maximize2,
  Sparkles,
  Palette,
  DoorOpen,
  Trash2,
  Sliders,
  Layers,
  Sun,
  Moon,
  Info,
} from "lucide-react";

interface LeftPanelProps {
  roomSettings: RoomSettings;
  onUpdateRoomSettings: (settings: Partial<RoomSettings>) => void;
  onSpawnProduct: (productId: string, initialColor?: string) => void;
  currentTheme: RoomTheme;
  onThemeChange: (theme: RoomTheme) => void;
  onOpenPhotoModal: () => void;
  onOpenBuildModal: () => void;
  onAddOpening?: (opening: Omit<WallOpening, "id">) => void;
  onUpdateOpening?: (id: string, patch: Partial<WallOpening>) => void;
  onRemoveOpening?: (id: string) => void;
  isDigitalTwin: boolean;
  solarSettings: SolarTimeSettings;
  onUpdateSolarSettings: (settings: Partial<SolarTimeSettings>) => void;
  activeTab?: "catalog" | "openings" | "room_setup" | "lighting" | "styles";
  onActiveTabChange?: (tab: "catalog" | "openings" | "room_setup" | "lighting" | "styles") => void;
}

const DOOR_TEMPLATES = [
  {
    name: "Single Swing Door",
    type: "door" as OpeningType,
    width: 0.9,
    height: 2.1,
    elevation: 0,
    label: "Standard Interior Entry Door",
  },
  {
    name: "Double French Doors",
    type: "french_door" as OpeningType,
    width: 1.8,
    height: 2.2,
    elevation: 0,
    label: "Divided-Lite Glass French Doors",
  },
  {
    name: "Pocket Sliding Door",
    type: "sliding_door" as OpeningType,
    width: 1.2,
    height: 2.1,
    elevation: 0,
    label: "Recessed Minimal Pocket Door",
  },
  {
    name: "Modern Glass Pivot Door",
    type: "glass_pivot" as OpeningType,
    width: 1.3,
    height: 2.4,
    elevation: 0,
    label: "Full-Height Steel Frame Pivot Door",
  },
];

const WINDOW_TEMPLATES = [
  {
    name: "Panoramic Picture Window",
    type: "picture_window" as OpeningType,
    width: 2.4,
    height: 1.6,
    elevation: 0.7,
    label: "Expansive Fixed Daylight Glass",
  },
  {
    name: "Standard Casement Window",
    type: "casement_window" as OpeningType,
    width: 1.2,
    height: 1.4,
    elevation: 0.85,
    label: "Dual-Pane Venting Window",
  },
  {
    name: "Floor-to-Ceiling Balcony Slider",
    type: "balcony_sliding_window" as OpeningType,
    width: 2.8,
    height: 2.4,
    elevation: 0,
    label: "Full Height Patio Sliding Glass",
  },
  {
    name: "Clerestory Ribbon Window",
    type: "clerestory_window" as OpeningType,
    width: 2.0,
    height: 0.6,
    elevation: 2.0,
    label: "High Architectural Light Slat",
  },
];

const FLOOR_PRESETS: {
  type: FloorType;
  name: string;
  color: string;
  material: string;
  description: string;
  previewBg: string;
}[] = [
  {
    type: "Hardwood Oak",
    name: "Scandinavian Natural Oak",
    color: "#D0BBA2",
    material: "Solid White Oak Wide Plank",
    description: "Matte lacquered natural oak with warm woodgrain",
    previewBg: "linear-gradient(135deg, #c7a882 0%, #dbcbab 50%, #c4a47c 100%)",
  },
  {
    type: "Herringbone Walnut",
    name: "Luxury Herringbone Walnut",
    color: "#4A3525",
    material: "French Parquet Dark Walnut",
    description: "Classic 90° chevron herringbone parquet wood",
    previewBg: "linear-gradient(135deg, #3d2a1d 0%, #5a4130 50%, #3a2618 100%)",
  },
  {
    type: "Marble Bianco",
    name: "Bianco Carrara Marble",
    color: "#ECEEF0",
    material: "Honed Italian Marble Slab",
    description: "Veined white marble with subtle cool gray streaks",
    previewBg: "linear-gradient(135deg, #f0f0f2 0%, #d8dcde 50%, #eaebee 100%)",
  },
  {
    type: "Polished Concrete",
    name: "Microcement Industrial Screed",
    color: "#9E9E9E",
    material: "Seamless Polished Concrete",
    description: "Sleek architectural concrete screed with matte sheen",
    previewBg: "linear-gradient(135deg, #8c8c8c 0%, #a8a8a8 50%, #858585 100%)",
  },
  {
    type: "Terrazzo Stone",
    name: "Venetian Terrazzo Stone",
    color: "#D9D0C5",
    material: "Cast Composite Terrazzo",
    description: "Warm neutral terrazzo composite with fine aggregates",
    previewBg: "linear-gradient(135deg, #cfc5b6 0%, #e2dad0 50%, #c5b9a8 100%)",
  },
  {
    type: "Slate Tile",
    name: "Charcoal Basalt Slate",
    color: "#2C3038",
    material: "Large Format Matte Slate Tile",
    description: "Deep charcoal basalt stone with tactile split-face cleft",
    previewBg: "linear-gradient(135deg, #22262d 0%, #363b45 50%, #20242a 100%)",
  },
];

const WALL_FINISH_PRESETS: {
  finish: any;
  name: string;
  color: string;
  description: string;
  previewBg: string;
}[] = [
  {
    finish: "Smooth Chalk Plaster",
    name: "Smooth Chalk Plaster",
    color: "#F4F1EA",
    description: "Warm off-white breathable mineral plaster",
    previewBg: "#F4F1EA",
  },
  {
    finish: "Limewash Greige",
    name: "Limewash Greige",
    color: "#D9D2C7",
    description: "Textured artisan limewash paint with cloudy depth",
    previewBg: "#D9D2C7",
  },
  {
    finish: "Fluted Oak Paneling",
    name: "Fluted White Oak Acoustic",
    color: "#BFA588",
    description: "Architectural vertical ribbed acoustic slatted wood",
    previewBg: "repeating-linear-gradient(90deg, #A88F72, #A88F72 6px, #8A7256 6px, #8A7256 10px)",
  },
  {
    finish: "Exposed Brick",
    name: "Loft Exposed Brick",
    color: "#A05A44",
    description: "Reclaimed heritage red-brown masonry brick",
    previewBg: "#A05A44",
  },
  {
    finish: "Matte Charcoal",
    name: "Matte Charcoal Drama",
    color: "#25272B",
    description: "Deep moody velvety non-reflective charcoal",
    previewBg: "#25272B",
  },
  {
    finish: "Subway Tile",
    name: "Gloss Subway Ceramic",
    color: "#EAEAEA",
    description: "Beveled architectural ceramic tiles",
    previewBg: "#EAEAEA",
  },
];

export const LeftPanel: React.FC<LeftPanelProps> = ({
  roomSettings,
  onUpdateRoomSettings,
  onSpawnProduct,
  currentTheme,
  onThemeChange,
  onOpenPhotoModal,
  onOpenBuildModal,
  onAddOpening,
  onUpdateOpening,
  onRemoveOpening,
  isDigitalTwin,
  solarSettings,
  onUpdateSolarSettings,
  activeTab: externalActiveTab,
  onActiveTabChange,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<"catalog" | "openings" | "room_setup" | "lighting" | "styles">("catalog");
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = (tab: "catalog" | "openings" | "room_setup" | "lighting" | "styles") => {
    if (onActiveTabChange) onActiveTabChange(tab);
    setInternalActiveTab(tab);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>("All");
  const [previewProduct, setPreviewProduct] = useState<ProductItem | null>(null);
  const [previewCustomColor, setPreviewCustomColor] = useState<string>("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [customProducts, setCustomProducts] = useState<ProductItem[]>(() => getStoredCustomProducts());

  const allAvailableProducts = [...customProducts, ...MOCK_PRODUCTS];

  const handleAddCustomProduct = (newProduct: ProductItem) => {
    saveCustomProduct(newProduct);
    const updated = getStoredCustomProducts();
    setCustomProducts(updated);
    // Automatically spawn it into room
    onSpawnProduct(newProduct.id);
  };

  const handleDeleteCustomProduct = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    deleteCustomProduct(productId);
    setCustomProducts(getStoredCustomProducts());
  };

  const categories = [
    "All",
    "Living Room",
    "Home Office",
    "Dining",
    "Kitchen",
    "Bedroom",
    "Bathroom",
    "Lighting",
    "Decor",
  ];

  const filteredProducts = allAvailableProducts.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.subcategory.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "All" || prod.category === selectedCategory;
    const matchesStyle = selectedStyleFilter === "All" || prod.style === selectedStyleFilter;

    return matchesSearch && matchesCategory && matchesStyle;
  });

  const roomTypes: RoomType[] = [
    "Living Room",
    "Home Office",
    "Dining Room",
    "Kitchen",
    "Bedroom",
    "Bathroom",
  ];

  const floorTypes: FloorType[] = [
    "Hardwood Oak",
    "Herringbone Walnut",
    "Marble Bianco",
    "Polished Concrete",
    "Terrazzo Stone",
    "Slate Tile",
  ];

  const handleAddTemplateOpening = (
    template: { name: string; type: OpeningType; width: number; height: number; elevation: number; label: string },
    wall: WallOrientation = "north"
  ) => {
    if (onAddOpening) {
      onAddOpening({
        wall,
        position: 0.5,
        width: template.width,
        height: template.height,
        elevation: template.elevation,
        type: template.type,
        label: template.name,
        frameColor: "#1C1C1C",
        isOpen: false,
      });
    } else {
      const newOpening: WallOpening = {
        id: `open-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        wall,
        position: 0.5,
        width: template.width,
        height: template.height,
        elevation: template.elevation,
        type: template.type,
        label: template.name,
        frameColor: "#1C1C1C",
        isOpen: false,
      };
      onUpdateRoomSettings({ openings: [...roomSettings.openings, newOpening] });
    }
  };

  const handleRemoveOpeningItem = (id: string) => {
    if (onRemoveOpening) {
      onRemoveOpening(id);
    } else {
      onUpdateRoomSettings({ openings: roomSettings.openings.filter((o) => o.id !== id) });
    }
  };

  const handleUpdateOpeningItem = (id: string, patch: Partial<WallOpening>) => {
    if (onUpdateOpening) {
      onUpdateOpening(id, patch);
    } else {
      onUpdateRoomSettings({
        openings: roomSettings.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      });
    }
  };

  return (
    <aside className="w-72 lg:w-80 h-full border-r border-[#2D2D2D] bg-[#121212] flex flex-col text-[#E5E5E5] select-none overflow-hidden z-20 transition-colors">
      {/* Tab Navigation Pill Bar */}
      <div className="p-2.5 border-b border-[#2D2D2D] space-y-2">
        <div className="grid grid-cols-5 gap-1 p-1 bg-[#1A1A1A] rounded-lg border border-[#2D2D2D] text-[11px] font-medium">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`py-1.5 rounded text-center transition-all ${
              activeTab === "catalog"
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-[#888] hover:text-white"
            }`}
            title="Furniture Catalog"
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveTab("openings")}
            className={`py-1.5 rounded text-center transition-all flex items-center justify-center gap-0.5 ${
              activeTab === "openings"
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-[#888] hover:text-white"
            }`}
            title="Doors & Windows"
          >
            <DoorOpen className="w-3 h-3" />
            <span className="hidden sm:inline">Doors</span>
          </button>
          <button
            onClick={() => setActiveTab("room_setup")}
            className={`py-1.5 rounded text-center transition-all ${
              activeTab === "room_setup"
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-[#888] hover:text-white"
            }`}
            title="Room Dimensions"
          >
            Room
          </button>
          <button
            onClick={() => setActiveTab("lighting")}
            className={`py-1.5 rounded text-center transition-all flex items-center justify-center gap-0.5 ${
              activeTab === "lighting"
                ? "bg-[#5B50F6] text-white font-semibold shadow-sm shadow-[#5B50F6]/30"
                : "text-[#888] hover:text-white"
            }`}
            title="Day/Night Sun & Lighting"
          >
            <Sun className="w-3 h-3 text-amber-300" />
            <span>Light</span>
          </button>
          <button
            onClick={() => setActiveTab("styles")}
            className={`py-1.5 rounded text-center transition-all ${
              activeTab === "styles"
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-[#888] hover:text-white"
            }`}
            title="Styles & Themes"
          >
            Styles
          </button>
        </div>

        {/* Search Bar on Catalog */}
        {activeTab === "catalog" && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
            <input
              type="text"
              placeholder="Search furniture, clocks, tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#666] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        )}
      </div>

      {/* TAB 1: 3D FURNITURE CATALOG */}
      {activeTab === "catalog" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Filter Pills */}
          <div className="px-3 py-2 border-b border-[#2D2D2D] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] bg-[#161616]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-[#1F1F1F] text-[#888] hover:text-white border border-[#2D2D2D]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Catalog Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
            {/* Build From Scratch Card Banner */}
            <div
              onClick={onOpenBuildModal}
              className="p-3 bg-gradient-to-r from-indigo-950/40 to-[#1A1A1A] border border-indigo-500/40 hover:border-indigo-400 rounded-xl cursor-pointer transition-all group shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Build from Scratch
                  </p>
                  <p className="text-[10px] text-[#888]">Custom dimensions & openings</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold">
                + New
              </span>
            </div>

            {/* Photo Reconstruction Card */}
            <div
              onClick={onOpenPhotoModal}
              className="p-2.5 bg-[#1A1A1A] border border-dashed border-[#3D3D3D] hover:border-indigo-500 rounded-lg text-center cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#888] group-hover:text-indigo-400">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Upload room photo to 3D reconstruct</span>
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-widest font-bold text-[#666] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span>Verified Catalog</span>
                <span className="text-indigo-400 font-mono font-bold">({filteredProducts.length})</span>
              </div>
              <button
                id="btn-insert-catalog-item-top"
                onClick={() => setIsAddProductModalOpen(true)}
                className="px-2 py-0.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                title="Insert New Item to Catalog"
              >
                <Plus className="w-3 h-3" />
                <span>Insert Item</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {filteredProducts.map((product) => {
                const isCustom = product.id.startsWith("custom-prod-");
                return (
                  <div
                    key={product.id}
                    draggable={true}
                    onClick={() => onSpawnProduct(product.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/homely-product",
                        JSON.stringify({ productId: product.id })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className={`bg-[#181818] border rounded-xl overflow-hidden flex flex-col justify-between group transition-all cursor-pointer hover:shadow-lg hover:shadow-indigo-950/40 relative ${
                      isCustom
                        ? "border-indigo-500/50 hover:border-indigo-400 shadow-sm"
                        : "border-[#2D2D2D] hover:border-indigo-500/60"
                    }`}
                  >
                    <div className="relative h-28 bg-[#202020] overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#0A0A0A]/85 backdrop-blur-sm text-[9px] font-semibold text-white rounded flex items-center gap-1">
                        {isCustom && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                        {product.brand}
                      </span>
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        {isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomProduct(e, product.id);
                            }}
                            className="p-1 bg-red-950/80 hover:bg-red-600 rounded text-red-300 hover:text-white text-[10px] transition-colors"
                            title="Delete custom item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewProduct(product);
                            setPreviewCustomColor(product.colorHex);
                          }}
                          className="p-1 bg-black/60 hover:bg-indigo-600 rounded text-white text-[10px] transition-colors"
                          title="Inspect Specs & Custom Finish"
                        >
                          <Palette className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                      <div>
                        <h4 className="text-[11px] font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-[9px] text-[#777] line-clamp-1">{product.subcategory}</p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#242424]">
                        <span className="text-xs font-bold text-white font-mono">
                          ${product.price.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSpawnProduct(product.id);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-colors"
                            title="Click or drag to place 3D item in room"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ======================================================== */}
            {/* BOTTOM ACTION: INSERT MORE ITEMS INTO CATALOG             */}
            {/* ======================================================== */}
            <div className="pt-2 pb-4 space-y-2 border-t border-[#242424]">
              <div
                id="btn-insert-catalog-item-bottom"
                onClick={() => setIsAddProductModalOpen(true)}
                className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-[#181818] to-[#1F1B2E] border border-dashed border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-950/60 cursor-pointer transition-all group flex flex-col justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                        <span>Insert More Items in Catalog</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-normal">
                          Custom 3D
                        </span>
                      </p>
                      <p className="text-[10px] text-[#888]">
                        Add custom furniture, exact dimensions, materials & prices
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm transition-colors whitespace-nowrap">
                    + Insert Item
                  </span>
                </div>
              </div>

              {/* Quick Template Inserter Chips */}
              <div className="px-1 flex items-center justify-between text-[9px] text-[#666]">
                <span>Can't find a piece? Create and insert it with 32+ 3D models</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ARCHITECTURAL OPENINGS (DOORS & WINDOWS) */}
      {activeTab === "openings" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <DoorOpen className="w-4 h-4 text-indigo-400" />
              <span>Doors & Windows Studio</span>
            </h3>
            <p className="text-[11px] text-[#888] mt-0.5">
              Add architectural doors and windows to any wall with custom widths, heights & placements.
            </p>
          </div>

          {/* Quick Add Doors */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-[#888] flex items-center justify-between">
              <span>Architectural Doors</span>
              <span className="text-[9px] text-indigo-400 font-mono">Drag to wall or Click</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DOOR_TEMPLATES.map((door) => (
                <div
                  key={door.name}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/homely-opening", JSON.stringify(door));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handleAddTemplateOpening(door, "south")}
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#2D2D2D] hover:border-indigo-500 text-left transition-all group cursor-grab active:cursor-grabbing hover:bg-[#1E1B4B]/20 relative"
                >
                  <p className="text-[11px] font-bold text-white group-hover:text-indigo-300 truncate">
                    {door.name}
                  </p>
                  <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                    {door.width}m W × {door.height}m H
                  </p>
                  <span className="text-[8px] text-[#666] group-hover:text-indigo-400/80 block mt-1">
                    ⠿ Drag to Wall
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add Windows */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-[#888] flex items-center justify-between">
              <span>Architectural Windows</span>
              <span className="text-[9px] text-indigo-400 font-mono">Drag to wall or Click</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {WINDOW_TEMPLATES.map((win) => (
                <div
                  key={win.name}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/homely-opening", JSON.stringify(win));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handleAddTemplateOpening(win, "north")}
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#2D2D2D] hover:border-indigo-500 text-left transition-all group cursor-grab active:cursor-grabbing hover:bg-[#1E1B4B]/20 relative"
                >
                  <p className="text-[11px] font-bold text-white group-hover:text-indigo-300 truncate">
                    {win.name}
                  </p>
                  <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                    {win.width}m W × {win.height}m H
                  </p>
                  <span className="text-[8px] text-[#666] group-hover:text-indigo-400/80 block mt-1">
                    ⠿ Drag to Wall
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Placed Openings Manager */}
          <div className="space-y-3 pt-2 border-t border-[#2D2D2D]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
                Active Wall Openings ({roomSettings.openings.length})
              </span>
              {roomSettings.openings.length > 0 && (
                <button
                  onClick={() => onUpdateRoomSettings({ openings: [] })}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {roomSettings.openings.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#181818] border border-[#2D2D2D] text-center text-[#888] text-xs">
                No doors or windows placed yet. Click above to add!
              </div>
            ) : (
              <div className="space-y-3">
                {roomSettings.openings.map((op, idx) => (
                  <div
                    key={op.id}
                    className="p-3 rounded-xl bg-[#181818] border border-[#2D2D2D] space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white text-xs">
                          {op.label || (op.type.includes("door") ? "Door" : "Window")}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveOpeningItem(op.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/30 transition-colors"
                        title="Remove opening"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Wall Selector */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#777] block">Wall Orientation</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(["north", "south", "east", "west"] as WallOrientation[]).map((w) => (
                          <button
                            key={w}
                            onClick={() => handleUpdateOpeningItem(op.id, { wall: w })}
                            className={`py-1 rounded text-[10px] uppercase font-bold transition-colors ${
                              op.wall === w
                                ? "bg-indigo-600 text-white"
                                : "bg-[#121212] text-[#888] hover:text-white border border-[#2D2D2D]"
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position along Wall Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#777]">Position on Wall:</span>
                        <span className="font-mono text-white font-bold">{Math.round(op.position * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={op.position}
                        onChange={(e) => handleUpdateOpeningItem(op.id, { position: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>

                    {/* Width & Height Sliders */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-[#777] block">Width ({op.width}m)</span>
                        <input
                          type="range"
                          min="0.6"
                          max="4.0"
                          step="0.1"
                          value={op.width}
                          onChange={(e) => handleUpdateOpeningItem(op.id, { width: parseFloat(e.target.value) })}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                      <div>
                        <span className="text-[#777] block">Height ({op.height}m)</span>
                        <input
                          type="range"
                          min="0.5"
                          max="3.0"
                          step="0.1"
                          value={op.height}
                          onChange={(e) => handleUpdateOpeningItem(op.id, { height: parseFloat(e.target.value) })}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ROOM SETUP & DIMENSIONS */}
      {activeTab === "room_setup" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Build from scratch button */}
          <button
            onClick={onOpenBuildModal}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 uppercase tracking-wider text-xs transition-all"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Build Room from Scratch</span>
          </button>

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
              Room Type
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {roomTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onUpdateRoomSettings({ type })}
                  className={`py-2 px-2.5 rounded-lg border text-left font-medium transition-colors ${
                    roomSettings.type === type
                      ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/40 font-bold"
                      : "bg-[#181818] text-[#888] hover:text-white border-[#2D2D2D]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Spatial Dimensions Input Fields */}
          <div className="space-y-2 bg-[#181818] p-3 rounded-xl border border-[#2D2D2D]">
            <div className="text-[10px] uppercase tracking-widest font-bold text-white flex items-center justify-between">
              <span>Spatial Dimensions</span>
              <span className="text-indigo-400 font-mono">
                {(roomSettings.width * roomSettings.length).toFixed(1)} m²
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#121212] p-2 rounded-lg border border-[#2D2D2D]">
                <span className="text-[9px] text-[#666] block uppercase tracking-wider">Width (X)</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    step="0.2"
                    min="2.5"
                    max="18.0"
                    value={roomSettings.width}
                    onChange={(e) => onUpdateRoomSettings({ width: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-xs text-[#666]">m</span>
                </div>
              </div>
              <div className="bg-[#121212] p-2 rounded-lg border border-[#2D2D2D]">
                <span className="text-[9px] text-[#666] block uppercase tracking-wider">Length (Y)</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    step="0.2"
                    min="2.5"
                    max="18.0"
                    value={roomSettings.length}
                    onChange={(e) => onUpdateRoomSettings({ length: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-xs text-[#666]">m</span>
                </div>
              </div>
              <div className="bg-[#121212] p-2 rounded-lg border border-[#2D2D2D]">
                <span className="text-[9px] text-[#666] block uppercase tracking-wider">Height (Z)</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    step="0.1"
                    min="2.2"
                    max="5.0"
                    value={roomSettings.height}
                    onChange={(e) => onUpdateRoomSettings({ height: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-xs text-[#666]">m</span>
                </div>
              </div>
            </div>
          </div>

          {/* DRAGGABLE FLOORING STUDIO */}
          <div className="space-y-2.5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-[#888] flex items-center justify-between">
              <span>Flooring Materials</span>
              <span className="text-[9px] text-indigo-400 font-mono">Drag to floor</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FLOOR_PRESETS.map((fl) => {
                const isCur = roomSettings.floorType === fl.type;
                return (
                  <div
                    key={fl.type}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/homely-floor",
                        JSON.stringify({
                          floorType: fl.type,
                          floorColor: fl.color,
                          name: fl.name,
                        })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() =>
                      onUpdateRoomSettings({
                        floorType: fl.type,
                        floorColor: fl.color,
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-grab active:cursor-grabbing group relative ${
                      isCur
                        ? "bg-indigo-600/15 text-indigo-300 border-indigo-500 ring-1 ring-indigo-500/40"
                        : "bg-[#181818] text-[#888] hover:text-white border-[#2D2D2D] hover:border-[#3D3D3D]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 shadow-sm shrink-0"
                        style={{ background: fl.previewBg }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white truncate group-hover:text-indigo-300">
                          {fl.name}
                        </p>
                        <p className="text-[9px] text-[#777] truncate">{fl.material}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#242424] text-[8px]">
                      <span className="text-[#666] group-hover:text-indigo-400">⠿ Drag to Floor</span>
                      {isCur && <Check className="w-3 h-3 text-indigo-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DRAGGABLE WALL FINISHES STUDIO */}
          <div className="space-y-2.5 pt-2 border-t border-[#242424]">
            <div className="text-[10px] uppercase tracking-widest font-bold text-[#888] flex items-center justify-between">
              <span>Wall Finishes & Colors</span>
              <span className="text-[9px] text-indigo-400 font-mono">Drag to wall</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {WALL_FINISH_PRESETS.map((wf) => {
                const isCur = roomSettings.wallFinish === wf.finish;
                return (
                  <div
                    key={wf.finish}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/homely-wall-material",
                        JSON.stringify({
                          finish: wf.finish,
                          color: wf.color,
                          name: wf.name,
                        })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() =>
                      onUpdateRoomSettings({
                        wallFinish: wf.finish,
                        wallColor: wf.color,
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-grab active:cursor-grabbing group relative ${
                      isCur
                        ? "bg-indigo-600/15 text-indigo-300 border-indigo-500 ring-1 ring-indigo-500/40"
                        : "bg-[#181818] text-[#888] hover:text-white border-[#2D2D2D] hover:border-[#3D3D3D]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 shadow-sm shrink-0"
                        style={{ background: wf.previewBg }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white truncate group-hover:text-indigo-300">
                          {wf.name}
                        </p>
                        <p className="text-[9px] text-[#777] truncate">{wf.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#242424] text-[8px]">
                      <span className="text-[#666] group-hover:text-indigo-400">⠿ Drag to Wall</span>
                      {isCur && <Check className="w-3 h-3 text-indigo-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUN & LIGHTING SIMULATION */}
      {activeTab === "lighting" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-300" /> 24H Solar & Lighting Studio
            </span>
            <span className="text-[10px] text-[#777] font-mono">Real-time Shaders</span>
          </div>

          {/* Embedded Day/Night Lighting Controls matching screenshot */}
          <DayNightLightingControls
            solarSettings={solarSettings}
            onChangeSolarSettings={onUpdateSolarSettings}
          />

          {/* Quick Context & Guide */}
          <div className="bg-[#181818] border border-[#2D2D2D] p-3 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Photometric Lighting</span>
            </div>
            <p className="text-[11px] text-[#888] leading-relaxed">
              Drag the timeline slider or pick time presets (Dawn, Noon, Dusk, Golden Hour) to evaluate natural sunlight casts, window refractions, and artificial warm lamps across your room.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: STYLE THEMES */}
      {activeTab === "styles" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          <div className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
            Curated Architectural Themes
          </div>
          {Object.entries(STYLE_THEMES).map(([themeName, config]) => {
            const isCur = currentTheme === themeName;
            return (
              <div
                key={themeName}
                onClick={() => onThemeChange(themeName as RoomTheme)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isCur
                    ? "bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/40"
                    : "bg-[#181818] border-[#2D2D2D] text-[#888] hover:text-white hover:border-[#3D3D3D]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{themeName}</span>
                  {isCur && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[10px] text-[#777] mt-1">{config.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Spec Detail Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#2D2D2D] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="relative h-44 rounded-xl overflow-hidden bg-[#181818]">
              <img src={previewProduct.image} alt={previewProduct.name} className="w-full h-full object-cover" />
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-[#0A0A0A]/90 text-white text-[10px] font-bold rounded">
                {previewProduct.brand}
              </span>
              <span
                className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border border-white/20 text-white"
                style={{ backgroundColor: previewCustomColor || previewProduct.colorHex }}
              >
                <span className="w-2 h-2 rounded-full border border-black/40 bg-white"></span>
                Selected Finish
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{previewProduct.name}</h3>
              <p className="text-xs text-[#888] mt-0.5">{previewProduct.material}</p>
            </div>

            {/* Custom Color Selector in Preview */}
            <div className="bg-[#181818] border border-[#2D2D2D] p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" /> Choose Color / Finish:
                </span>
                <span className="text-[10px] text-[#888]">
                  {POPULAR_COLOR_PALETTES.find(
                    (p) => p.hex.toLowerCase() === (previewCustomColor || previewProduct.colorHex).toLowerCase()
                  )?.name || "Custom"}
                </span>
              </div>

              <div className="grid grid-cols-8 gap-1.5">
                {POPULAR_COLOR_PALETTES.map((pal) => {
                  const isCur =
                    (previewCustomColor || previewProduct.colorHex).toLowerCase() ===
                    pal.hex.toLowerCase();
                  return (
                    <button
                      key={pal.name}
                      onClick={() => setPreviewCustomColor(pal.hex)}
                      className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 flex items-center justify-center ${
                        isCur ? "border-indigo-400 ring-2 ring-indigo-500/40 scale-110" : "border-[#3D3D3D]"
                      }`}
                      style={{ backgroundColor: pal.hex }}
                      title={`${pal.name} (${pal.materialType})`}
                    >
                      {isCur && <Check className="w-3 h-3 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={previewCustomColor || previewProduct.colorHex}
                  onChange={(e) => setPreviewCustomColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-[#2D2D2D] bg-transparent p-0"
                />
                <span className="text-[10px] text-[#888] font-mono">
                  Custom Hex: {previewCustomColor || previewProduct.colorHex}
                </span>
              </div>
            </div>

            <div className="bg-[#181818] border border-[#2D2D2D] p-3 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#666]">Dimensions:</span>
                <span className="font-mono text-[#E5E5E5]">
                  {Math.round(previewProduct.dimensions.width * 100)}W × {Math.round(previewProduct.dimensions.depth * 100)}D × {Math.round(previewProduct.dimensions.height * 100)}H cm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Style:</span>
                <span className="text-indigo-400 font-medium">{previewProduct.style}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Price Match:</span>
                <span className="font-bold text-emerald-400">${previewProduct.price.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setPreviewProduct(null);
                  setPreviewCustomColor("");
                }}
                className="flex-1 py-2 bg-[#181818] hover:bg-[#242424] text-[#888] hover:text-white text-xs font-semibold rounded-xl border border-[#2D2D2D]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSpawnProduct(previewProduct.id, previewCustomColor || previewProduct.colorHex);
                  setPreviewProduct(null);
                  setPreviewCustomColor("");
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20"
              >
                Place Custom Color
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Product Modal */}
      <AddCustomProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAddProduct={handleAddCustomProduct}
      />
    </aside>
  );
};
