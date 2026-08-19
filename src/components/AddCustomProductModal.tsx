import React, { useState } from "react";
import {
  ProductItem,
  RoomTheme,
  Model3DType,
  RoomType,
} from "../types";
import { POPULAR_COLOR_PALETTES } from "../data/mockProducts";
import {
  X,
  Plus,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  Tag,
  DollarSign,
  Box,
  Layers,
  Palette,
  Ruler,
} from "lucide-react";

interface AddCustomProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: ProductItem) => void;
}

interface TemplatePreset {
  name: string;
  category: ProductItem["category"];
  subcategory: string;
  brand: string;
  price: number;
  originalPrice: number;
  dimensions: { width: number; depth: number; height: number };
  material: string;
  colorName: string;
  colorHex: string;
  model3DType: Model3DType;
  style: RoomTheme;
  image: string;
  features: string[];
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    name: "Custom Cloud Bouclé Sofa",
    category: "Living Room",
    subcategory: "Sofas & Sectionals",
    brand: "Studio Artisans",
    price: 2850,
    originalPrice: 3200,
    dimensions: { width: 2.3, depth: 1.05, height: 0.78 },
    material: "Textured Cream Bouclé",
    colorName: "Cream Bouclé",
    colorHex: "#F3EDE2",
    model3DType: "sofa_sectional",
    style: "Scandinavian",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80",
    features: ["Deep lounge seating", "High-density foam", "Stain-resistant fabric"],
  },
  {
    name: "Solid French Walnut Dining Table",
    category: "Dining",
    subcategory: "Dining Tables",
    brand: "Maison Bois",
    price: 1950,
    originalPrice: 2400,
    dimensions: { width: 2.1, depth: 0.95, height: 0.76 },
    material: "Solid Dark Walnut",
    colorName: "Walnut Wood",
    colorHex: "#4A3525",
    model3DType: "dining_table",
    style: "Mid-Century Modern",
    image: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=600&auto=format&fit=crop&q=80",
    features: ["Solid FSC walnut", "Chamfered edge profile", "Seats 6-8 people"],
  },
  {
    name: "Acoustic Fluted Executive Desk",
    category: "Home Office",
    subcategory: "Desks",
    brand: "Nordic Atelier",
    price: 1420,
    originalPrice: 1750,
    dimensions: { width: 1.6, depth: 0.75, height: 0.75 },
    material: "White Oak & Matte Steel",
    colorName: "Natural Oak",
    colorHex: "#C5A880",
    model3DType: "office_desk",
    style: "Japandi",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&auto=format&fit=crop&q=80",
    features: ["Concealed cable routing", "Soft-close drawer", "Fluted pedestal leg"],
  },
  {
    name: "Sculptural Lounge Armchair",
    category: "Living Room",
    subcategory: "Armchairs",
    brand: "Form & Craft",
    price: 980,
    originalPrice: 1200,
    dimensions: { width: 0.88, depth: 0.85, height: 0.8 },
    material: "Italian Saddle Leather",
    colorName: "Cognac Leather",
    colorHex: "#8A4D24",
    model3DType: "armchair",
    style: "Luxury Modern",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80",
    features: ["360° smooth swivel", "Top-grain semi-aniline leather", "Memory foam core"],
  },
  {
    name: "Architectural Travertine Coffee Table",
    category: "Living Room",
    subcategory: "Coffee Tables",
    brand: "Stone Studio",
    price: 1150,
    originalPrice: 1400,
    dimensions: { width: 1.2, depth: 0.7, height: 0.38 },
    material: "Honed Roman Travertine",
    colorName: "Warm Greige",
    colorHex: "#D6CEBF",
    model3DType: "coffee_table",
    style: "Minimalist",
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&auto=format&fit=crop&q=80",
    features: ["Natural porous travertine stone", "Honed matte sealant", "Geometric block plinths"],
  },
  {
    name: "Minimalist King Platform Bed",
    category: "Bedroom",
    subcategory: "Beds",
    brand: "Koto Sleep",
    price: 2200,
    originalPrice: 2600,
    dimensions: { width: 2.05, depth: 2.15, height: 0.95 },
    material: "Upholstered Bouclé & Solid Oak",
    colorName: "Cream Bouclé",
    colorHex: "#F3EDE2",
    model3DType: "bed_king",
    style: "Japandi",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=80",
    features: ["Integrated floating nightstands support", "Solid pine slats", "Padded backrest"],
  },
];

const CURATED_IMAGE_OPTIONS = [
  { label: "Bouclé Sofa", url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80" },
  { label: "Leather Armchair", url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80" },
  { label: "Modern Dining Table", url: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=600&auto=format&fit=crop&q=80" },
  { label: "Office Desk", url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&auto=format&fit=crop&q=80" },
  { label: "Stone Coffee Table", url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&auto=format&fit=crop&q=80" },
  { label: "King Bed", url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=80" },
  { label: "Accent Chair", url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&auto=format&fit=crop&q=80" },
  { label: "Minimalist Light", url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80" },
  { label: "Botanical Plant", url: "https://images.unsplash.com/photo-1545241047-6083a3684587?w=600&auto=format&fit=crop&q=80" },
  { label: "Wood Credenza", url: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&auto=format&fit=crop&q=80" },
];

const MODEL_3D_OPTIONS: { type: Model3DType; label: string; group: string }[] = [
  { type: "sofa_sectional", label: "Sectional Sofa", group: "Seating" },
  { type: "sofa_curved", label: "Curved Sofa", group: "Seating" },
  { type: "armchair", label: "Lounge Armchair", group: "Seating" },
  { type: "accent_chair", label: "Accent Chair", group: "Seating" },
  { type: "office_chair", label: "Ergonomic Office Chair", group: "Seating" },
  { type: "dining_chair", label: "Dining Chair", group: "Seating" },
  { type: "counter_stool", label: "Counter Stool", group: "Seating" },
  { type: "coffee_table", label: "Coffee Table", group: "Tables" },
  { type: "dining_table", label: "Dining Table", group: "Tables" },
  { type: "office_desk", label: "Office Desk", group: "Tables" },
  { type: "desk_executive", label: "Executive Desk", group: "Tables" },
  { type: "accent_table", label: "Side / End Table", group: "Tables" },
  { type: "conference_table", label: "Conference Table", group: "Tables" },
  { type: "bed_king", label: "King Platform Bed", group: "Bedroom" },
  { type: "nightstand", label: "Bedside Nightstand", group: "Bedroom" },
  { type: "tv_credenza", label: "TV Credenza / Media Console", group: "Storage" },
  { type: "kitchen_island", label: "Kitchen Island", group: "Kitchen & Bath" },
  { type: "kitchen_cabinets_lower", label: "Kitchen Lower Cabinets", group: "Kitchen & Bath" },
  { type: "kitchen_cabinets_upper", label: "Kitchen Upper Cabinets", group: "Kitchen & Bath" },
  { type: "refrigerator_french", label: "French Door Refrigerator", group: "Kitchen & Bath" },
  { type: "range_oven", label: "Cooktop Range & Oven", group: "Kitchen & Bath" },
  { type: "sink_undermount", label: "Undermount Sink & Faucet", group: "Kitchen & Bath" },
  { type: "freestanding_tub", label: "Freestanding Soaking Tub", group: "Kitchen & Bath" },
  { type: "vanity_double", label: "Double Bathroom Vanity", group: "Kitchen & Bath" },
  { type: "toilet_wallhung", label: "Wall-Hung Toilet", group: "Kitchen & Bath" },
  { type: "shower_glass", label: "Glass Enclosed Shower", group: "Kitchen & Bath" },
  { type: "floor_lamp", label: "Architectural Floor Lamp", group: "Lighting & Decor" },
  { type: "pendant_light", label: "Ceiling Pendant Light", group: "Lighting & Decor" },
  { type: "ficus_plant", label: "Fiddle Leaf / Olive Plant", group: "Lighting & Decor" },
  { type: "rug", label: "Textured Area Rug", group: "Lighting & Decor" },
  { type: "hanging_clock", label: "Minimalist Wall Clock", group: "Lighting & Decor" },
  { type: "whiteboard", label: "Magnetic Glass Whiteboard", group: "Office & Decor" },
];

export const AddCustomProductModal: React.FC<AddCustomProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("Custom Design");
  const [category, setCategory] = useState<ProductItem["category"]>("Living Room");
  const [subcategory, setSubcategory] = useState("Sofas & Loungers");
  const [price, setPrice] = useState<number>(1299);
  const [originalPrice, setOriginalPrice] = useState<number>(1499);
  const [widthM, setWidthM] = useState<number>(1.8);
  const [depthM, setDepthM] = useState<number>(0.9);
  const [heightM, setHeightM] = useState<number>(0.8);
  const [material, setMaterial] = useState("Warm Bouclé Fabric");
  const [colorName, setColorName] = useState("Cream Bouclé");
  const [colorHex, setColorHex] = useState("#F3EDE2");
  const [model3DType, setModel3DType] = useState<Model3DType>("sofa_sectional");
  const [style, setStyle] = useState<RoomTheme>("Scandinavian");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80");
  const [featuresText, setFeaturesText] = useState("Custom dimensions, Premium craftsmanship, Local manufacture");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleApplyPreset = (preset: TemplatePreset) => {
    setName(preset.name);
    setBrand(preset.brand);
    setCategory(preset.category);
    setSubcategory(preset.subcategory);
    setPrice(preset.price);
    setOriginalPrice(preset.originalPrice);
    setWidthM(preset.dimensions.width);
    setDepthM(preset.dimensions.depth);
    setHeightM(preset.dimensions.height);
    setMaterial(preset.material);
    setColorName(preset.colorName);
    setColorHex(preset.colorHex);
    setModel3DType(preset.model3DType);
    setStyle(preset.style);
    setImageUrl(preset.image);
    setFeaturesText(preset.features.join(", "));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a product title");
      return;
    }
    if (price <= 0) {
      setErrorMsg("Please enter a valid price");
      return;
    }
    if (widthM <= 0 || depthM <= 0 || heightM <= 0) {
      setErrorMsg("Dimensions must be greater than zero");
      return;
    }

    const featuresArray = featuresText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const compatibleRooms: RoomType[] = [
      category === "Dining"
        ? "Dining Room"
        : (category as RoomType),
    ];

    const newProduct: ProductItem = {
      id: `custom-prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      category,
      subcategory: subcategory.trim() || category,
      brand: brand.trim() || "Custom Design",
      price: Math.round(price),
      originalPrice: Math.round(originalPrice || price * 1.15),
      dimensions: {
        width: Math.round(widthM * 100) / 100,
        depth: Math.round(depthM * 100) / 100,
        height: Math.round(heightM * 100) / 100,
      },
      material: material.trim() || "Custom Material",
      colorName: colorName.trim() || "Custom Color",
      colorHex: colorHex || "#EAE5D9",
      rating: 5.0,
      reviewsCount: 1,
      image: imageUrl.trim() || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80",
      model3DType,
      compatibleRooms,
      style,
      features: featuresArray.length > 0 ? featuresArray : ["Custom configured product", "Accurate 3D dimensions"],
      inStock: true,
      priceMatchVerified: true,
    };

    onAddProduct(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        id="add-custom-product-modal"
        className="bg-[#141414] border border-[#2D2D2D] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Insert New Item to Catalog</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                  Custom 3D Product
                </span>
              </h2>
              <p className="text-xs text-[#888]">
                Define custom furniture dimensions, 3D archetype, finishes & pricing for immediate use in 2D/3D rooms.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#777] hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Bar */}
        <div className="px-6 py-3 bg-[#1A1A1A] border-b border-[#262626] overflow-x-auto no-scrollbar flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#666] whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Quick Template Presets:
          </span>
          {TEMPLATE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-xs px-2.5 py-1 rounded-md bg-[#242424] hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-[#333] text-[#CCC] hover:text-white whitespace-nowrap transition-all"
            >
              + {p.name.replace("Custom ", "")}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: General & Specs */}
            <div className="space-y-4">
              {/* Product Title */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  Product Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nordic Minimalist Solid Oak Credenza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none transition-colors"
                />
              </div>

              {/* Brand & Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Muuto, Custom"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sofas, Desks"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Category & Style */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Living Room">Living Room</option>
                    <option value="Dining">Dining</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Home Office">Home Office</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Bathroom">Bathroom</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Decor">Decor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Design Theme / Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as any)}
                    className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Scandinavian">Scandinavian</option>
                    <option value="Mid-Century Modern">Mid-Century Modern</option>
                    <option value="Japandi">Japandi</option>
                    <option value="Industrial Chic">Industrial Chic</option>
                    <option value="Minimalist">Minimalist</option>
                    <option value="Luxury Modern">Luxury Modern</option>
                    <option value="Bohemian">Bohemian</option>
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Retail Price ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-[#1C1C1C] border border-[#333] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5 text-[#888]">
                    List / MSRP Price ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-[#AAA] font-mono focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-indigo-400" />
                    Dimensions (Meters / Centimeters)
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {Math.round(widthM * 100)} × {Math.round(depthM * 100)} × {Math.round(heightM * 100)} cm
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-[#777] block mb-1">Width (m)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      max="10"
                      value={widthM}
                      onChange={(e) => setWidthM(Number(e.target.value))}
                      className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777] block mb-1">Depth (m)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      max="10"
                      value={depthM}
                      onChange={(e) => setDepthM(Number(e.target.value))}
                      className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777] block mb-1">Height (m)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="10"
                      value={heightM}
                      onChange={(e) => setHeightM(Number(e.target.value))}
                      className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Model, Color & Image */}
            <div className="space-y-4">
              {/* 3D Archetype Selector */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-indigo-400" />
                    3D Model Archetype
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {MODEL_3D_OPTIONS.find((m) => m.type === model3DType)?.label}
                  </span>
                </label>
                <select
                  value={model3DType}
                  onChange={(e) => setModel3DType(e.target.value as Model3DType)}
                  className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                >
                  {MODEL_3D_OPTIONS.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      [{opt.group}] {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material & Color */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  Primary Material & Color Name
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Material (e.g. Bouclé)"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Color Name (e.g. Warm Greige)"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                {/* Swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {POPULAR_COLOR_PALETTES.slice(0, 10).map((pal) => (
                    <button
                      key={pal.name}
                      type="button"
                      onClick={() => {
                        setColorHex(pal.hex);
                        setColorName(pal.name);
                      }}
                      className={`w-6 h-6 rounded-md border transition-transform ${
                        colorHex.toLowerCase() === pal.hex.toLowerCase()
                          ? "ring-2 ring-indigo-500 scale-110 border-white"
                          : "border-white/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: pal.hex }}
                      title={`${pal.name} (${pal.hex})`}
                    />
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-[#777] font-mono">{colorHex}</span>
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-6 h-6 rounded border border-[#333] cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Product Image Selection */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Product Image
                  </span>
                  <label className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1 font-semibold">
                    <Upload className="w-3 h-3" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </label>

                {/* Image Presets */}
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {CURATED_IMAGE_OPTIONS.map((imgOpt) => (
                    <button
                      key={imgOpt.label}
                      type="button"
                      onClick={() => setImageUrl(imgOpt.url)}
                      className={`relative h-12 rounded-lg overflow-hidden border transition-all ${
                        imageUrl === imgOpt.url
                          ? "ring-2 ring-indigo-500 border-white"
                          : "border-[#333] opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={imgOpt.url} alt={imgOpt.label} className="w-full h-full object-cover" />
                      {imageUrl === imgOpt.url && (
                        <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <input
                  type="url"
                  placeholder="Or paste custom image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#555]"
                />
              </div>

              {/* Features / Highlights */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Key Features (comma-separated tags)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FSC Solid Wood, Modular, Stain-Resistant"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#333] focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#555]"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-[#222] overflow-hidden shrink-0 border border-[#333]">
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#555]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30">
                  {brand || "Custom"} • {category}
                </span>
                <h4 className="text-sm font-bold text-white mt-1">
                  {name || "Untitled Custom Product"}
                </h4>
                <p className="text-xs text-[#888]">
                  {Math.round(widthM * 100)} × {Math.round(depthM * 100)} × {Math.round(heightM * 100)} cm • {material} ({colorName})
                </p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-base font-bold text-white">${price.toLocaleString()}</span>
              {originalPrice > price && (
                <span className="block text-xs text-[#777] line-through">${originalPrice.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#888] hover:text-white bg-[#222] hover:bg-[#2A2A2A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Item into Catalog</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
