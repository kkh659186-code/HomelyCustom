import { PlacedItem, ProductItem } from "../types";
import { getProductById } from "../data/mockProducts";

export interface SurfaceHostInfo {
  hostItem: PlacedItem;
  hostProduct: ProductItem;
  surfaceElevation: number; // in meters (height off floor to rest atop)
  surfaceDescription: string; // e.g. "Bed Mattress", "Table Top", "Sofa Cushion"
}

/**
 * Checks if target item naturally sits on top of furniture surfaces
 */
export function isElevatedItemType(product: ProductItem): boolean {
  const nameLow = (product.name || "").toLowerCase();
  const subLow = (product.subcategory || "").toLowerCase();
  const model = product.model3DType || "";

  return (
    model.includes("pillow") ||
    model.includes("mattress") ||
    model.includes("vase") ||
    model.includes("clock") ||
    model.includes("tv") ||
    model.includes("laptop") ||
    model.includes("lamp") ||
    model.includes("window") ||
    nameLow.includes("pillow") ||
    nameLow.includes("cushion") ||
    nameLow.includes("mattress") ||
    nameLow.includes("matteress") ||
    nameLow.includes("vase") ||
    nameLow.includes("tv") ||
    nameLow.includes("television") ||
    nameLow.includes("screen") ||
    nameLow.includes("monitor") ||
    nameLow.includes("lamp") ||
    nameLow.includes("clock") ||
    nameLow.includes("decor") ||
    nameLow.includes("tray") ||
    nameLow.includes("mug") ||
    nameLow.includes("book") ||
    subLow.includes("pillow") ||
    subLow.includes("cushion") ||
    subLow.includes("mattress") ||
    subLow.includes("lighting") ||
    subLow.includes("decor") ||
    subLow.includes("electronics")
  );
}

/**
 * Calculates the top surface elevation of a host furniture piece
 */
export function getHostSurfaceElevation(
  hostPlaced: PlacedItem,
  hostProduct: ProductItem,
  guestProduct?: ProductItem
): { elevation: number; description: string } {
  const model = hostProduct.model3DType || "";
  const nameLow = (hostProduct.name || "").toLowerCase();
  const hostBaseZ = hostPlaced.z || 0;
  const { height } = hostProduct.dimensions;

  // 1. Bed Frame / Platform Bed
  if (
    model.includes("bed") ||
    nameLow.includes("bed") ||
    hostProduct.subcategory === "Beds"
  ) {
    const guestModel = guestProduct?.model3DType || "";
    const guestName = (guestProduct?.name || "").toLowerCase();

    // If a mattress is placed on bed frame -> sits on slat platform (~0.20m)
    if (guestModel.includes("mattress") || guestName.includes("mattress") || guestName.includes("matteress")) {
      return {
        elevation: hostBaseZ + 0.2,
        description: "Bed Frame Slat Base",
      };
    }

    // Pillows or items on bed -> sits on top of mattress (~0.58m - 0.65m)
    return {
      elevation: hostBaseZ + Math.max(0.55, height * 0.62),
      description: "Bed Mattress Top",
    };
  }

  // 2. Mattress
  if (model.includes("mattress") || nameLow.includes("mattress") || nameLow.includes("matteress")) {
    return {
      elevation: hostBaseZ + height,
      description: "Plush Mattress Surface",
    };
  }

  // 3. Sofas & Armchairs
  if (
    model.includes("sofa") ||
    model.includes("armchair") ||
    nameLow.includes("sofa") ||
    nameLow.includes("couch") ||
    nameLow.includes("chair")
  ) {
    return {
      elevation: hostBaseZ + 0.42, // standard seat cushion height
      description: "Sofa Cushion Surface",
    };
  }

  // 4. Tables, Desks, Islands, Credenzas & Counters
  if (
    model.includes("table") ||
    model.includes("desk") ||
    model.includes("credenza") ||
    model.includes("island") ||
    model.includes("cabinets_lower") ||
    model.includes("nightstand") ||
    nameLow.includes("table") ||
    nameLow.includes("desk") ||
    nameLow.includes("credenza") ||
    nameLow.includes("counter") ||
    nameLow.includes("nightstand")
  ) {
    return {
      elevation: hostBaseZ + height,
      description: `${hostProduct.name.split(" ")[0]} Top Surface`,
    };
  }

  // Default fallback: top of bounding box
  return {
    elevation: hostBaseZ + height,
    description: `${hostProduct.name} Surface`,
  };
}

/**
 * Detects any furniture host directly beneath the given coordinates (x, y)
 */
export function detectSurfaceBeneath(
  itemX: number,
  itemY: number,
  guestProduct: ProductItem,
  allPlacedItems: PlacedItem[],
  ignoreInstanceId?: string
): SurfaceHostInfo | null {
  let highestHost: SurfaceHostInfo | null = null;
  let maxElevation = -1;

  for (const placed of allPlacedItems) {
    if (placed.instanceId === ignoreInstanceId) continue;

    const hostProd = getProductById(placed.productId);
    if (!hostProd) continue;

    // Check if host can support objects
    const hostModel = hostProd.model3DType || "";
    const hostName = (hostProd.name || "").toLowerCase();
    const isSupport =
      hostModel.includes("bed") ||
      hostModel.includes("mattress") ||
      hostModel.includes("table") ||
      hostModel.includes("desk") ||
      hostModel.includes("sofa") ||
      hostModel.includes("armchair") ||
      hostModel.includes("credenza") ||
      hostModel.includes("island") ||
      hostModel.includes("cabinets_lower") ||
      hostModel.includes("nightstand") ||
      hostName.includes("bed") ||
      hostName.includes("mattress") ||
      hostName.includes("matteress") ||
      hostName.includes("table") ||
      hostName.includes("desk") ||
      hostName.includes("sofa") ||
      hostName.includes("couch") ||
      hostName.includes("credenza") ||
      hostName.includes("nightstand");

    if (!isSupport) continue;

    // Bounding check taking into account rotation if any
    const hW = hostProd.dimensions.width;
    const hD = hostProd.dimensions.depth;
    const halfW = hW / 2 + 0.12; // slight tolerance margin
    const halfD = hD / 2 + 0.12;

    const dx = Math.abs(itemX - placed.x);
    const dy = Math.abs(itemY - placed.y);

    if (dx <= halfW && dy <= halfD) {
      const { elevation, description } = getHostSurfaceElevation(placed, hostProd, guestProduct);
      if (elevation > maxElevation) {
        maxElevation = elevation;
        highestHost = {
          hostItem: placed,
          hostProduct: hostProd,
          surfaceElevation: Math.round(elevation * 100) / 100,
          surfaceDescription: description,
        };
      }
    }
  }

  return highestHost;
}

/**
 * Determines the logical initial elevation when spawning or placing an item
 */
export function getLogicalDefaultElevation(
  product: ProductItem,
  x: number,
  y: number,
  allPlacedItems: PlacedItem[],
  ignoreInstanceId?: string
): { z: number; hostInfo: SurfaceHostInfo | null } {
  const model = product.model3DType || "";
  const nameLow = (product.name || "").toLowerCase();

  // 1. Check if there's an existing host surface underneath
  const hostBeneath = detectSurfaceBeneath(x, y, product, allPlacedItems, ignoreInstanceId);
  if (hostBeneath) {
    return {
      z: hostBeneath.surfaceElevation,
      hostInfo: hostBeneath,
    };
  }

  // 2. Wall-hanging objects (without host underneath)
  if (model.includes("hanging_clock") || nameLow.includes("clock") || nameLow.includes("wall art") || nameLow.includes("mirror_wall")) {
    return { z: 1.65, hostInfo: null }; // eye-level wall mount
  }

  // 3. Windows (sill level)
  if (model.includes("window") || nameLow.includes("window")) {
    return { z: 0.85, hostInfo: null };
  }

  // 4. Pendant lights (suspended near ceiling)
  if (model.includes("pendant_light") || nameLow.includes("pendant")) {
    return { z: 2.2, hostInfo: null };
  }

  // 5. Throw Pillows / Cushions (if placed without bed under cursor, check if there's any bed in the room to snap or default resting)
  if (model.includes("pillow") || nameLow.includes("pillow") || nameLow.includes("cushion")) {
    // If there's a bed in the room, default elevation to ~0.58m so it's ready at bed height
    const anyBed = allPlacedItems.find((p) => {
      const pr = getProductById(p.productId);
      return pr && (pr.model3DType.includes("bed") || pr.name.toLowerCase().includes("bed"));
    });
    if (anyBed) {
      return { z: 0.58, hostInfo: null };
    }
    return { z: 0.42, hostInfo: null };
  }

  // 6. Mattress (if spawned standalone without bed under cursor)
  if (model.includes("mattress") || nameLow.includes("mattress") || nameLow.includes("matteress")) {
    const anyBed = allPlacedItems.find((p) => {
      const pr = getProductById(p.productId);
      return pr && (pr.model3DType.includes("bed") || pr.name.toLowerCase().includes("bed"));
    });
    if (anyBed) {
      return { z: 0.2, hostInfo: null };
    }
  }

  // 7. Ground items
  return { z: 0.0, hostInfo: null };
}
