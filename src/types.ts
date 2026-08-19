export type RoomType =
  | "Living Room"
  | "Kitchen"
  | "Bathroom"
  | "Bedroom"
  | "Dining Room"
  | "Dining"
  | "Home Office";

export type RoomTheme =
  | "Scandinavian"
  | "Mid-Century Modern"
  | "Japandi"
  | "Industrial Chic"
  | "Minimalist"
  | "Luxury Modern"
  | "Bohemian";

export type FloorType =
  | "Hardwood Oak"
  | "Marble Bianco"
  | "Polished Concrete"
  | "Herringbone Walnut"
  | "Slate Tile"
  | "Terrazzo Stone";

export type WallFinish =
  | "Smooth Chalk Plaster"
  | "Fluted Oak Paneling"
  | "Limewash Greige"
  | "Exposed Brick"
  | "Matte Charcoal"
  | "Subway Tile";

export interface Dimensions {
  width: number; // in meters (e.g. 2.2 for 220cm)
  depth: number; // in meters (e.g. 0.95)
  height: number; // in meters (e.g. 0.82)
}

export type Model3DType =
  | "sofa_sectional"
  | "sofa_curved"
  | "sofa_3seat"
  | "sofa"
  | "armchair"
  | "accent_chair"
  | "office_chair"
  | "dining_chair"
  | "wooden_chair"
  | "chair"
  | "counter_stool"
  | "coffee_table"
  | "dining_table"
  | "round_table"
  | "table_round"
  | "dining_table_round"
  | "wooden_table"
  | "table"
  | "office_desk"
  | "desk_executive"
  | "accent_table"
  | "conference_table"
  | "tv_smart"
  | "tv_oled"
  | "tv_wall"
  | "tv"
  | "tv_credenza"
  | "mattress_memory"
  | "mattress_hybrid"
  | "mattress"
  | "pillow_throw"
  | "pillow_sleeping"
  | "pillow_lumbar"
  | "pillow"
  | "window_casement"
  | "window_picture"
  | "window_floor"
  | "window"
  | "bookshelf"
  | "wardrobe"
  | "rug"
  | "hanging_clock"
  | "whiteboard"
  | "mirror_floor"
  | "decorative_vase"
  | "kitchen_island"
  | "kitchen_cabinets_lower"
  | "kitchen_cabinets_upper"
  | "refrigerator_french"
  | "range_oven"
  | "sink_undermount"
  | "freestanding_tub"
  | "vanity_double"
  | "toilet_wallhung"
  | "shower_glass"
  | "bed_king"
  | "wooden_bed"
  | "bed_platform"
  | "bed"
  | "nightstand"
  | "floor_lamp"
  | "pendant_light"
  | "ficus_plant"
  | (string & {});

export interface ProductItem {
  id: string;
  name: string;
  category: "Living Room" | "Kitchen" | "Bathroom" | "Bedroom" | "Dining" | "Lighting" | "Decor" | "Home Office" | "Electronics" | "Architectural" | (string & {});
  subcategory: string;
  brand: string;
  brandLogo?: string;
  price: number;
  originalPrice: number;
  dimensions: Dimensions;
  material: string;
  colorName: string;
  colorHex: string;
  rating: number;
  reviewsCount: number;
  image: string;
  model3DType: Model3DType;
  compatibleRooms: RoomType[];
  style: RoomTheme;
  features: string[];
  inStock: boolean;
  priceMatchVerified: boolean;
  competitorLowestPrice?: number;
  competitorStore?: string;
}

export interface PlacedItem {
  instanceId: string;
  productId: string;
  x: number; // meters from room center
  y: number; // meters (horizontal depth)
  z: number; // elevation off floor (meters)
  rotation: number; // 0 to 360 degrees
  colorOverride?: string;
  materialOverride?: string;
  customLabel?: string;
  isLocked?: boolean;
}

export interface DetectedObject {
  id: string;
  label: string;
  category: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  isRemoved: boolean;
  replacedWithProductId?: string;
  originalDescription?: string;
}

export type WallOrientation = "north" | "south" | "east" | "west";

export type OpeningType =
  | "door"
  | "double_door"
  | "sliding_door"
  | "pocket_door"
  | "french_door"
  | "glass_pivot"
  | "window"
  | "picture_window"
  | "casement_window"
  | "balcony_sliding_window"
  | "clerestory_window"
  | "archway";

export interface WallOpening {
  id: string;
  wall: WallOrientation;
  position: number; // 0.05 to 0.95 relative position along wall
  width: number; // in meters (e.g. 0.9, 1.8, 2.4)
  height: number; // in meters (e.g. 2.1 for door, 1.4 for window)
  elevation?: number; // sill elevation from floor in meters (0 for doors, 0.85 for windows)
  type: OpeningType;
  label?: string;
  frameColor?: string; // e.g. "#1C1C1C", "#8B5A2B", "#FFFFFF"
  isOpen?: boolean;
  swingDirection?: "inward_left" | "inward_right" | "outward_left" | "outward_right";
}

export interface PlumbingOutlet {
  id: string;
  type: "water_inlet" | "drain" | "gas" | "electrical";
  x: number;
  y: number;
  label: string;
}

export interface RoomSettings {
  type: RoomType;
  width: number; // meters (X axis)
  length: number; // meters (Y axis)
  height: number; // ceiling height meters (Z axis)
  wallColor: string;
  wallFinish: WallFinish;
  floorType: FloorType;
  floorColor: string;
  openings: WallOpening[];
  plumbingOutlets: PlumbingOutlet[];
}

export interface AIChatMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  suggestedActions?: {
    label: string;
    actionType: "apply_style" | "add_furniture" | "change_flooring" | "remove_detected" | "optimize_layout";
    payload: any;
  }[];
  recommendedProductIds?: string[];
}

export type ViewMode = "2d" | "3d" | "walkthrough";
export type CameraPreset = "perspective" | "isometric" | "top_down" | "walkthrough";

export interface SolarTimeSettings {
  hour: number; // 0 to 24 (e.g. 19.8 for 7:48 PM)
  season: "summer" | "spring" | "winter";
  isPlaying: boolean;
  speed: number; // 1, 2, 4
  latitude: number;
  artificialLights: boolean;
}

export interface CostCategoryBreakdown {
  category: string;
  amount: number;
  itemCount: number;
  percentage: number;
  color: string;
  items: {
    name: string;
    brand: string;
    price: number;
    quantity: number;
    total: number;
    unit: string;
    details?: string;
  }[];
}

export interface FinancialTimelinePhase {
  id: string;
  phaseName: string;
  estimatedWeek: string;
  cost: number;
  description: string;
  status: "scheduled" | "in_progress" | "completed";
}

export interface ShoppingCartItem {
  product: ProductItem;
  quantity: number;
  instances: string[]; // Placed instanceIds
  selectedColor?: string;
  selectedMaterial?: string;
}
