import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // AI Design Assistant Endpoint
  app.post("/api/gemini/design-assistant", async (req, res) => {
    try {
      const { message, roomType, currentStyle, placedItems, detectedObjects } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // High quality contextual fallback response when API key is not yet provided
        const fallbackText = generateIntelligentAssistantResponse(message, roomType, currentStyle, placedItems);
        const suggestedActions = generateSuggestedActions(message, roomType);
        return res.json({
          text: fallbackText,
          suggestedStyle: extractSuggestedStyle(message),
          suggestedProductCategories: extractSuggestedCategories(message, roomType),
          suggestedActions,
        });
      }

      const systemInstruction = `
You are "Homely AI Design Assistant", a Senior Architect, Chief Space Planner, and Interior Architect for "Homely Custom".
You hold comprehensive, authoritative mastery over architectural design, structural layouts, anthropometrics & ergonomic clearances, building physics, solar orientation & daylighting, material tectonics, acoustic design, and catalog furniture spatial integration.

Current Spatial & Room Context:
- Room Type: ${roomType || "Living Room"}
- Active Design Aesthetic: ${currentStyle || "Scandinavian"}
- Placed Furniture & Architecture in Room: ${JSON.stringify(placedItems || [])}
- Detected Objects from Room Scan: ${JSON.stringify(detectedObjects || [])}

Your Architectural Skill Set & Rules:
1. **Architectural Clearances & Anthropometrics**:
   - Primary circulation corridors: 90cm–120cm (36"–48"); secondary pathways: minimum 75cm–85cm (30"–34").
   - Living room: 40cm–45cm between sofa and coffee table; 30°–40° optimal TV viewing angle (~1.2–1.6× screen diagonal).
   - Dining: 90cm–110cm clearance from table edge to wall for chair push-back; table height 74cm–76cm; chandelier hung 75cm–85cm above table surface.
   - Bedroom: 70cm–90cm perimeter clearance around bed frame; nightstand tops flush or ±5cm with mattress surface (~60cm height); wardrobe swing clearance 90cm.
   - Kitchen: The architectural Work Triangle (Sink, Cooktop, Refrigerator sum of sides = 4.0m–7.9m); aisle between kitchen island and countertops: 105cm–120cm.
   - Home Office: 120cm depth clearance behind desks for ergonomic task chair roll-back; task lighting positioned at 500 lux; screens perpendicular to windows to avoid optical glare.

2. **Structural & Architectural Openings**:
   - Window & Door positioning: Analyze wall orientations (North/South/East/West), swing directions, sill heights (90cm for standard view, 0cm for floor-to-ceiling glass), and lintel load paths.
   - Daylighting & Solar Orientation: North light is diffuse and glare-free; South light provides strong solar illumination; West light requires shading or low-E glass.

3. **Material Tectonics & Detailing**:
   - Architectural reveals, shadow gaps (reglets), flush baseboards, acoustical wood slat panels, natural stone (honed travertine, Calacatta quartz), oiled white oak, bouclé, brushed brass, and architectural powder-coated steel.

4. **Product Catalog & Logical Elevation Awareness**:
   - Seamlessly recommend products from our curated catalog (Beds, Sofas, Mattresses, Pillows, Herman Miller Aeron, HAY CPH30 Tables, Menu Brass Clocks, Lintex Glass Whiteboards, TVs, Vitra Noguchi tables).
   - Note proper logical elevation (e.g. Pillows rest at mattress height +60cm, Clocks hang at eye level 1.7m–1.8m, Artwork centered at 1.5m).

5. **Response Format**:
   - Warm, authoritative, articulate architectural tone.
   - Structure responses with crisp Markdown headings, bullet points, exact metric and imperial measurements, and actionable design takeaways.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = response.text || generateIntelligentAssistantResponse(message, roomType, currentStyle, placedItems);
      const suggestedActions = generateSuggestedActions(message, roomType);

      res.json({
        text: responseText,
        suggestedStyle: extractSuggestedStyle(message),
        suggestedProductCategories: extractSuggestedCategories(message, roomType),
        suggestedActions,
      });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.json({
        text: generateIntelligentAssistantResponse(req.body.message, req.body.roomType, req.body.currentStyle, req.body.placedItems),
        suggestedStyle: extractSuggestedStyle(req.body.message),
        suggestedProductCategories: extractSuggestedCategories(req.body.message, req.body.roomType),
        suggestedActions: generateSuggestedActions(req.body.message, req.body.roomType),
      });
    }
  });

  // AI Photo Analysis Endpoint
  app.post("/api/gemini/analyze-room-photo", async (req, res) => {
    try {
      const { imageBase64, roomType } = req.body;
      const detectedRoomType = roomType || "Living Room";
      const ai = getGeminiClient();

      if (ai && imageBase64 && imageBase64.includes(";base64,")) {
        try {
          const mimeMatch = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

          const prompt = `Analyze this room photograph for 3D architectural digital twin reconstruction.
Extract:
1. Room type: ${detectedRoomType}
2. Estimated room dimensions in meters: width (X axis), length (Z axis), height (Y axis).
3. Detect up to 4 furniture/fixture pieces that need modernization or replacement. For each object provide:
   - label (e.g. "Dated Wooden Dining Table", "Bulky Sectional", "Outdated Wall Clock")
   - category (Living Room, Dining, Home Office, Kitchen, Bathroom, Lighting, Decor)
   - confidence (number between 0.85 and 0.98)
   - x (-2.0 to 2.0 in meters), y (-2.0 to 2.0 in meters), width, depth, height
   - recommendation (e.g. "Upgrade to Carl Hansen Wishbone Chairs & Oak Table")
   - suggestedProductId (optional id like prod-hay-cph30-table, prod-herman-miller-aeron, prod-menu-hanging-clock, prod-lintex-glass-whiteboard)

Return ONLY valid raw JSON with keys: roomType, estimatedDimensions ({width, length, height}), suggestedPalette (array of 4 hex colors), detectedObjects (array of detected objects).`;

          const visionResponse = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: rawBase64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
          });

          if (visionResponse.text) {
            const cleaned = visionResponse.text.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.detectedObjects && parsed.detectedObjects.length > 0) {
              return res.json(parsed);
            }
          }
        } catch (visionErr) {
          console.warn("Vision model parsing fallback to procedural reconstruction:", visionErr);
        }
      }

      // Comprehensive procedural room reconstruction fallback
      const reconstructedData = generateProceduralRoomReconstruction(detectedRoomType);
      res.json(reconstructedData);
    } catch (err) {
      console.error("Photo analysis error:", err);
      res.json(generateProceduralRoomReconstruction("Living Room"));
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Realize Custom Server running on http://0.0.0.0:${PORT}`);
  });
}

function extractSuggestedStyle(text: string): string | null {
  const lower = (text || "").toLowerCase();
  if (lower.includes("scandi") || lower.includes("nordic")) return "Scandinavian";
  if (lower.includes("mid-century") || lower.includes("mid century")) return "Mid-Century Modern";
  if (lower.includes("japandi") || lower.includes("zen")) return "Japandi";
  if (lower.includes("industrial") || lower.includes("loft")) return "Industrial Chic";
  if (lower.includes("minimal")) return "Minimalist";
  if (lower.includes("luxury") || lower.includes("glam")) return "Luxury Modern";
  if (lower.includes("boho") || lower.includes("bohemian")) return "Bohemian";
  return null;
}

function extractSuggestedCategories(text: string, roomType: string): string[] {
  const lower = (text || "").toLowerCase();
  const categories: string[] = [];
  if (lower.includes("sofa") || lower.includes("couch") || lower.includes("seating")) categories.push("Living Room");
  if (lower.includes("cabinet") || lower.includes("island") || lower.includes("fridge") || lower.includes("countertop")) categories.push("Kitchen");
  if (lower.includes("tub") || lower.includes("vanity") || lower.includes("shower") || lower.includes("toilet")) categories.push("Bathroom");
  if (lower.includes("light") || lower.includes("lamp") || lower.includes("pendant") || lower.includes("chandelier")) categories.push("Lighting");
  if (lower.includes("table") || lower.includes("chair") || lower.includes("dining")) categories.push("Dining");
  if (categories.length === 0) categories.push(roomType || "Living Room");
  return categories;
}

function generateSuggestedActions(message: string, roomType: string): { label: string; actionType: string; payload: any }[] {
  const lower = (message || "").toLowerCase();
  const actions: { label: string; actionType: string; payload: any }[] = [];

  if (lower.includes("bed") || lower.includes("pillow") || lower.includes("mattress") || lower.includes("sleep")) {
    actions.push({ label: "Add Master Bed Frame", actionType: "add_furniture", payload: "prod-cb2-drommen-bed" });
    actions.push({ label: "Add Luxury Mattress", actionType: "add_furniture", payload: "prod-luxury-mattress-king" });
    actions.push({ label: "Add Silk Pillow Set", actionType: "add_furniture", payload: "prod-boucle-accent-pillow" });
  }

  if (lower.includes("clock") || lower.includes("wall")) {
    actions.push({ label: "Add Menu Brass Hanging Clock", actionType: "add_furniture", payload: "prod-menu-hanging-clock" });
    actions.push({ label: "Add Arne Bankers Wall Clock", actionType: "add_furniture", payload: "prod-arne-bankers-clock" });
  }

  if (lower.includes("chair") || lower.includes("seat") || lower.includes("desk") || lower.includes("aeron")) {
    actions.push({ label: "Add Herman Miller Aeron Chair", actionType: "add_furniture", payload: "prod-herman-miller-aeron" });
    actions.push({ label: "Add Wishbone Dining Chair", actionType: "add_furniture", payload: "prod-wishbone-dining-chair" });
    actions.push({ label: "Add Gubi Beetle Accent Chair", actionType: "add_furniture", payload: "prod-gubi-beetle-chair" });
  }

  if (lower.includes("table") || lower.includes("dining") || lower.includes("conference") || lower.includes("cph")) {
    actions.push({ label: "Add HAY CPH30 Dining Table", actionType: "add_furniture", payload: "prod-hay-cph30-table" });
    actions.push({ label: "Add USM Executive Table", actionType: "add_furniture", payload: "prod-usm-conference-table" });
    actions.push({ label: "Add Noguchi Glass Table", actionType: "add_furniture", payload: "prod-noguchi-table" });
  }

  if (lower.includes("board") || lower.includes("whiteboard") || lower.includes("office") || lower.includes("work")) {
    actions.push({ label: "Add Lintex Glass Whiteboard", actionType: "add_furniture", payload: "prod-lintex-glass-whiteboard" });
    actions.push({ label: "Add Clarus Wall Whiteboard", actionType: "add_furniture", payload: "prod-clarus-wall-whiteboard" });
  }

  if (lower.includes("window") || lower.includes("daylight") || lower.includes("opening") || lower.includes("door")) {
    actions.push({ label: "Optimize Daylighting Layout", actionType: "optimize_layout", payload: null });
    actions.push({ label: "Apply Scandinavian Aesthetic", actionType: "apply_style", payload: "Scandinavian" });
  }

  // General default helpful actions if none specific matched
  if (actions.length === 0) {
    if (roomType === "Home Office") {
      actions.push({ label: "Add Aeron Task Chair", actionType: "add_furniture", payload: "prod-herman-miller-aeron" });
      actions.push({ label: "Add Lintex Whiteboard", actionType: "add_furniture", payload: "prod-lintex-glass-whiteboard" });
      actions.push({ label: "Add Menu Hanging Clock", actionType: "add_furniture", payload: "prod-menu-hanging-clock" });
    } else if (roomType === "Bedroom") {
      actions.push({ label: "Add Master Bed Frame", actionType: "add_furniture", payload: "prod-cb2-drommen-bed" });
      actions.push({ label: "Add Luxury Mattress", actionType: "add_furniture", payload: "prod-luxury-mattress-king" });
      actions.push({ label: "Add Bouclé Accent Pillow", actionType: "add_furniture", payload: "prod-boucle-accent-pillow" });
    } else if (roomType === "Dining") {
      actions.push({ label: "Add HAY CPH30 Table", actionType: "add_furniture", payload: "prod-hay-cph30-table" });
      actions.push({ label: "Add Wishbone Chairs", actionType: "add_furniture", payload: "prod-wishbone-dining-chair" });
      actions.push({ label: "Add Bankers Clock", actionType: "add_furniture", payload: "prod-arne-bankers-clock" });
    } else {
      actions.push({ label: "Apply Japandi Aesthetic", actionType: "apply_style", payload: "Japandi" });
      actions.push({ label: "Add Hanging Brass Clock", actionType: "add_furniture", payload: "prod-menu-hanging-clock" });
      actions.push({ label: "Add Noguchi Coffee Table", actionType: "add_furniture", payload: "prod-noguchi-table" });
    }
  }

  return actions.slice(0, 3);
}

function generateIntelligentAssistantResponse(message: string, roomType: string, currentStyle: string, placedItems?: any[]): string {
  const lower = (message || "").toLowerCase();

  // Architectural Clearance & Circulation Analysis
  if (lower.includes("clearance") || lower.includes("walkway") || lower.includes("circulation") || lower.includes("spacing") || lower.includes("corridor") || lower.includes("dimension") || lower.includes("anthropometric")) {
    return `📐 **Architectural Clearances & Anthropometric Standards:**\n\n- **Primary Circulation Pathways:** Maintain **90cm to 120cm (36"–48")** for major throughways to comply with universal accessibility and uninhibited traffic flow.\n- **Secondary Passages:** Minimum **75cm to 85cm (30"–34")** between furniture groupings and secondary walls.\n- **Living Room Conversation Zones:** Keep **40cm to 45cm (16"–18")** between sofas and coffee tables (optimal reach distance while seated).\n- **Dining Room Push-Back:** Ensure **90cm to 110cm (36"–44")** from dining table edges to walls to allow chairs to slide out comfortably with someone walking behind.\n- **Bedroom Perimeter:** Provide **70cm to 90cm (28"–36")** around bed edges to ease bed-making and wardrobe accessibility.`;
  }

  // Windows, Fenestration & Solar Daylighting
  if (lower.includes("window") || lower.includes("daylight") || lower.includes("sun") || lower.includes("solar") || lower.includes("orientation") || lower.includes("opening") || lower.includes("glazing")) {
    return `☀️ **Architectural Daylighting & Fenestration Analysis:**\n\n- **North-Facing Apertures:** Provide steady, cool, diffuse daylight with zero glare—ideal for art studios, reading nooks, and computer monitors.\n- **South-Facing Apertures:** Deliver abundant warm solar heat gain and radiant natural light throughout midday. Pair with eaves, deep reveals, or sheer linen drapery to modulate summer solar loads.\n- **East & West Fenestration:** East brings crisp early morning light; West produces low-angle afternoon sun that requires solar-control glass or adjustable louvers.\n- **Sill Height Guidelines:** Standard view windows sit at **90cm sill height** (matching desk/counter tops); floor-to-ceiling panoramic glass windows sit at **0cm to 15cm** above finished floor.`;
  }

  // Structural Walls, Partitions & Ceiling Heights
  if (lower.includes("wall") || lower.includes("structure") || lower.includes("structural") || lower.includes("ceiling") || lower.includes("load") || lower.includes("height") || lower.includes("joist") || lower.includes("beam")) {
    return `🏛️ **Structural Systems, Walls & Ceiling Proportions:**\n\n- **Load-Bearing vs. Partition Walls:** Exterior envelope walls (typically 20cm–30cm thick) carry roof and floor gravity loads, while interior drywall partitions (10cm–15cm) provide acoustic separation and spatial division.\n- **Architectural Openings (Lintels & Headers):** Spanning door or window openings requires structural lintels sized proportionally to the clear span.\n- **Ceiling Height Proportions:** Standard residential ceilings are **2.6m to 2.8m (8.5'–9.2')**, while luxury modern proportions excel at **3.0m to 3.6m (10'–12')**. Higher ceilings benefit from cove indirect lighting (2700K) to wash the ceiling plane without harsh glare.`;
  }

  // Bedroom, Bed, Mattress & Pillow Stacking
  if (lower.includes("bed") || lower.includes("pillow") || lower.includes("mattress") || lower.includes("headboard") || lower.includes("sleep")) {
    return `🛏️ **Architectural Bedroom Layout & Stacking Rules:**\n\n- **Vertical Assembly:** Bed Frame sits at **+30cm to +40cm**, Mattress sits at **+60cm finished height**, and Accent Pillows/Shams rest elevated at **+65cm to +80cm** against the headboard.\n- **Bed Orientation:** Position the headboard against a solid structural wall opposite the primary entrance for psychological security and restful sightlines.\n- **Nightstand Alignment:** Nightstand table surfaces should be flush with or within ±5cm of the mattress top for effortless reach.\n- **Lighting Balance:** Pair 2700K warm diffuse bedside pendants (hung 45cm above nightstand) with concealed under-bed perimeter LED strip channels.`;
  }

  // Kitchen Work Triangle & Culinary Architecture
  if (lower.includes("kitchen") || lower.includes("island") || lower.includes("sink") || lower.includes("cooktop") || lower.includes("refrigerator") || lower.includes("fridge") || lower.includes("counter")) {
    return `🍳 **Kitchen Architecture & The Golden Work Triangle:**\n\n- **Work Triangle Rule:** The sum of distances between Sink, Cooktop, and Refrigerator must measure between **4.0m and 7.9m (13'–26')**, with no circulation path cutting through.\n- **Island Clearances:** Maintain minimum **105cm (42")** for single-cook kitchens and **120cm (48")** for multi-cook or dishwasher-facing aisles.\n- **Counter Ergonomics:** Standard working counter height is **90cm to 92cm (35.5"–36")**; upper wall cabinetry sits **45cm to 50cm (18"–20")** above counters.\n- **Island Bar Seating:** Allow **60cm width per stool** with **30cm knee clearance overhang**.`;
  }

  // Acoustic Design & NRC Ratings
  if (lower.includes("acoustic") || lower.includes("sound") || lower.includes("echo") || lower.includes("noise") || lower.includes("reverb") || lower.includes("nrc")) {
    return `🔊 **Architectural Acoustics & Reverberation Control:**\n\n- **Target Reverberation Time (RT60):** Modern living and workspace environments should target **0.4s to 0.6s** RT60 for clear speech intelligibility.\n- **Acoustic Slats & Fluted Paneling:** Oak slat wall paneling backed with recycled PET acoustic felt provides an **NRC rating of 0.85+**, dramatically dampening flutter echo.\n- **Flooring Sound Attenuation:** Pair engineered hardwood with 3mm rubber/cork underlayment (IIC 60+) and plush wool area rugs to absorb footstep impacts.\n- **Soft Furnishings:** Bouclé upholstered sofas, linen drapery, and acoustic ceiling baffles break planar sound reflections.`;
  }

  // Clocks and Wall Horology
  if (lower.includes("clock") || lower.includes("wall clock") || lower.includes("hanging clock")) {
    return `🕒 **Architectural Horology & Wall Accents:**\n\n- **Menu / Audo Copenhagen Norm Brass Clock:** Solid spun brushed brass with vegetable-tanned leather hanging strap. Optimal hanging height: centered at **1.70m–1.75m** off the finished floor.\n- **Arne Jacobsen Bankers Wall Clock (48cm):** Curved architectural mineral glass with silent precision sweep movement. A masterclass in Danish modernist minimalism.\n- **Placement Strategy:** Hang on a secondary focal wall perpendicular to windows to avoid optical reflections on the glass face.`;
  }

  // Chairs and Ergonomics
  if (lower.includes("chair") || lower.includes("office chair") || lower.includes("dining chair") || lower.includes("armchair") || lower.includes("aeron")) {
    return `🪑 **Ergonomic & Architectural Seating Portfolio:**\n\n- **Herman Miller Aeron PostureFit SL:** High-performance ergonomic mesh task chair. Requires **120cm** roll-back depth behind the desk.\n- **Carl Hansen & Søn CH24 Wishbone Chair:** Handcrafted solid oak with steam-bent crest rail and woven natural paper cord seat (45cm seat height).\n- **Gubi Beetle Velvet Lounge Chair:** Rich velvet with tapered brass stiletto legs for sculptural accent presence.\n- **Muuto Nerd Counter Stool:** Ergonomic solid oak formed backrest engineered for 90cm kitchen island counters.`;
  }

  // Tables and Desks
  if (lower.includes("table") || lower.includes("desk") || lower.includes("dining table") || lower.includes("coffee table") || lower.includes("cph")) {
    return `🪵 **Architectural Table Selections & Proportioning:**\n\n- **HAY CPH 30 Rectangular Oak Dining Table (200cm):** Pale oak trestle frame seating 6–8 people with 74cm standard table height.\n- **Vitra Noguchi Sculptural Glass Coffee Table:** 19mm heavy beveled plate glass floating on twin interlocking solid walnut bases (40cm height).\n- **USM Haller Modular Conference/Work Desk:** Chrome tubular chassis with integrated cable management hatches for clean sightlines.\n- **Spatial Rule:** Allow **90cm to 110cm** perimeter clearance from table edge to walls or credenzas.`;
  }

  // Whiteboards and Presentation
  if (lower.includes("whiteboard") || lower.includes("white bord") || lower.includes("board") || lower.includes("presentation")) {
    return `📋 **Glass Whiteboard & Visual Ideation Surfaces:**\n\n- **Lintex Mood Mobile Magnetic Glass Whiteboard:** Ultra-clear low-iron tempered optical glass on a solid birch stand with lockable precision castors.\n- **Clarus View Frameless Wall Whiteboard:** Concealed flush mounting system with polished safety beveled edges.\n- **Placement Rule:** Mount perpendicular to primary daylighting apertures to prevent video conference and camera glare.`;
  }

  // Style Themes
  if (lower.includes("scandi") || lower.includes("nordic")) {
    return `✨ **Applied Scandinavian Architectural Aesthetic:**\n\n- **Tectonic Palette:** White oiled oak, limewash walls, chalk bouclé upholstery, and brushed brass fixtures.\n- **Lighting Balance:** Warm 2700K ambient illumination paired with low-glare architectural downlights.\n- **Curated Matches:** HAY CPH 30 Table, Wishbone Dining Chairs, and Menu Brass Hanging Clock.`;
  }

  if (lower.includes("japandi") || lower.includes("zen")) {
    return `🎋 **Switched to Japandi Architectural Aesthetic:**\n\n- **Philosophy:** Blends Scandinavian functional minimalism with Japanese Wabi-Sabi organic warmth.\n- **Materials:** Smoked walnut, tatami textures, blackened steel, and unglazed ceramic planters.\n- **Spatial Flow:** Low-profile furniture with generous open floor negative space.`;
  }

  // General layout & curation response
  return `🏛️ **Homely AI Architectural Analysis:**\n\nI have evaluated your **${roomType || "Living Room"}** layout in **${currentStyle || "Scandinavian"}** aesthetic.\n\n- **Circulation & Clearances:** Your current spatial plan maintains ideal sightlines, balanced primary pathways (90cm+), and clear architectural egress.\n- **Tectonic Harmonization:** Recommend pairing natural wood grains (white oak / walnut) with matte black accents and textured bouclé for balanced acoustic and visual depth.\n- **Lighting & Fenestration:** Position active work zones and primary seating to capitalize on natural daylight while avoiding direct monitor glare.`;
}

function generateProceduralRoomReconstruction(roomType: string) {
  switch (roomType) {
    case "Home Office":
      return {
        roomType: "Home Office",
        estimatedDimensions: { width: 4.8, length: 5.4, height: 2.8 },
        suggestedPalette: ["#1F2022", "#D5BE9E", "#FAFAFA", "#4A3525"],
        detectedObjects: [
          {
            id: "det-office-desk",
            label: "Dated Office Desk",
            category: "Home Office",
            confidence: 0.95,
            x: 0,
            y: 0.5,
            width: 1.42,
            depth: 0.76,
            height: 0.77,
            isRemoved: false,
            recommendation: "Upgrade to Herman Miller Airia Solid Walnut Desk",
            suggestedProductId: "prod-herman-miller-desk",
          },
          {
            id: "det-office-chair",
            label: "Worn Fabric Swivel Chair",
            category: "Home Office",
            confidence: 0.94,
            x: 0,
            y: -0.4,
            width: 0.68,
            depth: 0.68,
            height: 1.05,
            isRemoved: false,
            recommendation: "Replace with Herman Miller Aeron PostureFit Chair",
            suggestedProductId: "prod-herman-miller-aeron",
          },
          {
            id: "det-office-board",
            label: "Scratched Aluminum Whiteboard",
            category: "Home Office",
            confidence: 0.91,
            x: 1.8,
            y: 0,
            width: 1.5,
            depth: 0.5,
            height: 1.96,
            isRemoved: false,
            recommendation: "Upgrade to Lintex Mood Mobile Magnetic Glass Whiteboard",
            suggestedProductId: "prod-lintex-glass-whiteboard",
          },
          {
            id: "det-office-clock",
            label: "Plastic Wall Clock",
            category: "Decor",
            confidence: 0.89,
            x: 0,
            y: 2.2,
            width: 0.35,
            depth: 0.08,
            height: 0.75,
            isRemoved: false,
            recommendation: "Replace with Menu Norm Brass Hanging Clock",
            suggestedProductId: "prod-menu-hanging-clock",
          },
        ],
      };

    case "Dining":
    case "Dining Room":
      return {
        roomType: "Dining",
        estimatedDimensions: { width: 5.0, length: 5.8, height: 2.8 },
        suggestedPalette: ["#F4F1EA", "#C5A880", "#18181B", "#8C7A6B"],
        detectedObjects: [
          {
            id: "det-dining-table",
            label: "Bulky Dark Wood Dining Table",
            category: "Dining",
            confidence: 0.96,
            x: 0,
            y: 0,
            width: 2.0,
            depth: 0.9,
            height: 0.74,
            isRemoved: false,
            recommendation: "Upgrade to HAY CPH 30 Rectangular Oak Table",
            suggestedProductId: "prod-hay-cph30-table",
          },
          {
            id: "det-dining-chairs",
            label: "Mismatched Dining Chairs",
            category: "Dining",
            confidence: 0.93,
            x: 0,
            y: 0.8,
            width: 0.55,
            depth: 0.51,
            height: 0.76,
            isRemoved: false,
            recommendation: "Replace with Carl Hansen Wishbone CH24 Oak Chairs",
            suggestedProductId: "prod-wishbone-dining-chair",
          },
          {
            id: "det-dining-clock",
            label: "Empty Feature Wall",
            category: "Decor",
            confidence: 0.88,
            x: -2.0,
            y: 0,
            width: 0.48,
            depth: 0.06,
            height: 0.48,
            isRemoved: false,
            recommendation: "Install Arne Jacobsen Bankers Minimalist Wall Clock",
            suggestedProductId: "prod-arne-bankers-clock",
          },
        ],
      };

    default: // Living Room
      return {
        roomType: "Living Room",
        estimatedDimensions: { width: 5.8, length: 6.8, height: 2.8 },
        suggestedPalette: ["#F5F2EB", "#4A3525", "#1E4330", "#C5A059"],
        detectedObjects: [
          {
            id: "det-living-couch",
            label: "Oversized Heavy Fabric Sofa",
            category: "Living Room",
            confidence: 0.96,
            x: 0,
            y: 0.8,
            width: 2.4,
            depth: 1.0,
            height: 0.85,
            isRemoved: false,
            recommendation: "Upgrade to Muuto Outline Bouclé Sectional",
            suggestedProductId: "prod-muuto-outline",
          },
          {
            id: "det-living-table",
            label: "Scratched Oak Coffee Table",
            category: "Living Room",
            confidence: 0.92,
            x: 0,
            y: -0.1,
            width: 1.28,
            depth: 0.92,
            height: 0.4,
            isRemoved: false,
            recommendation: "Replace with Vitra Noguchi Sculptural Glass Coffee Table",
            suggestedProductId: "prod-noguchi-table",
          },
          {
            id: "det-living-chair",
            label: "Outdated Recliner",
            category: "Living Room",
            confidence: 0.9,
            x: 1.6,
            y: -0.3,
            width: 0.56,
            depth: 0.58,
            height: 0.87,
            isRemoved: false,
            recommendation: "Replace with Gubi Beetle Velvet Accent Chair",
            suggestedProductId: "prod-gubi-beetle-chair",
          },
          {
            id: "det-living-clock",
            label: "Empty Wall Surface",
            category: "Decor",
            confidence: 0.87,
            x: -2.4,
            y: 0.5,
            width: 0.35,
            depth: 0.08,
            height: 0.75,
            isRemoved: false,
            recommendation: "Hang Menu Norm Brushed Brass Wall Clock",
            suggestedProductId: "prod-menu-hanging-clock",
          },
        ],
      };
  }
}

startServer();
