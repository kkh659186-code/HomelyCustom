import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PlacedItem, ProductItem, RoomSettings, RoomTheme, CameraPreset, SolarTimeSettings } from "../types";
import { MOCK_PRODUCTS, STYLE_THEMES, POPULAR_COLOR_PALETTES, getProductById } from "../data/mockProducts";
import { Maximize2, RotateCw, Eye, Move, Trash2, Layers, Check, Palette, Sparkles, Sun, Copy, CheckCircle2, ArrowUp, ArrowDown, ArrowUpDown, Anchor } from "lucide-react";
import { detectSurfaceBeneath, isElevatedItemType } from "../utils/surfaceSnapping";

interface ThreeCanvas3DProps {
  roomSettings: RoomSettings;
  placedItems: PlacedItem[];
  selectedInstanceId: string | null;
  onSelectItem: (instanceId: string | null) => void;
  onUpdateItemPosition: (instanceId: string, x: number, y: number) => void;
  onUpdateItemRotation: (instanceId: string, rotation: number) => void;
  onUpdateItemColor?: (instanceId: string, colorHex: string, materialName?: string) => void;
  onRemoveItem: (instanceId: string) => void;
  onDuplicateItem?: (instanceId: string) => void;
  currentTheme: RoomTheme;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  isDigitalTwin: boolean;
  solarSettings?: SolarTimeSettings;
  onRegisterCaptureHook?: (fn: () => Promise<Record<CameraPreset, string>>) => void;
  onSpawnProduct?: (productId: string, x?: number, y?: number) => void;
  onUpdateRoomSettings?: (settings: Partial<RoomSettings>) => void;
  onAddOpening?: (opening: any) => void;
  onUpdateItemElevation?: (instanceId: string, z: number) => void;
  onSnapItemToSurface?: (instanceId: string) => void;
  onDropItemToFloor?: (instanceId: string) => void;
}

export const ThreeCanvas3D: React.FC<ThreeCanvas3DProps> = ({
  roomSettings,
  placedItems,
  selectedInstanceId,
  onSelectItem,
  onUpdateItemPosition,
  onUpdateItemRotation,
  onUpdateItemColor,
  onRemoveItem,
  onDuplicateItem,
  currentTheme,
  cameraPreset,
  isDigitalTwin,
  solarSettings,
  onRegisterCaptureHook,
  onSpawnProduct,
  onUpdateRoomSettings,
  onAddOpening,
  onUpdateItemElevation,
  onSnapItemToSurface,
  onDropItemToFloor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshesGroupRef = useRef<THREE.Group | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const selectedMeshBoxRef = useRef<THREE.BoxHelper | null>(null);
  const dropHelperRef = useRef<THREE.Group | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const interiorLightsGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const dragOffsetRef = useRef(new THREE.Vector3());
  const activeDraggedInstanceRef = useRef<string | null>(null);

  // Orbit controls state
  const orbitStateRef = useRef({
    isOrbiting: false,
    isPanning: false,
    prevMouseX: 0,
    prevMouseY: 0,
    theta: Math.PI / 4, // Azimuth angle
    phi: Math.PI / 3.2, // Polar angle
    radius: 10,
    target: new THREE.Vector3(0, 0.8, 0),
  });

  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; brand: string; dims: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [is3DDraggingOver, setIs3DDraggingOver] = useState(false);

  const show3DToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const selectedItem = placedItems.find((p) => p.instanceId === selectedInstanceId);
  const selectedProduct = selectedItem ? getProductById(selectedItem.productId) : null;

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f0f);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(6, 6, 8);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xfffaed, 0xdfe2e8, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff8ea, 1.4);
    sunLight.position.set(7, 12, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -8;
    sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 8;
    sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const softFill = new THREE.DirectionalLight(0xebefff, 0.4);
    softFill.position.set(-6, 8, -6);
    scene.add(softFill);

    // Interior Accent Warm Lighting (PointLights)
    const interiorGroup = new THREE.Group();
    const ceilingWarmLight1 = new THREE.PointLight(0xffdfa4, 1.2, 10, 1.5);
    ceilingWarmLight1.position.set(0, 2.6, 0);
    interiorGroup.add(ceilingWarmLight1);

    const ceilingWarmLight2 = new THREE.PointLight(0xffeedd, 0.8, 8, 1.8);
    ceilingWarmLight2.position.set(-2, 2.4, -1.5);
    interiorGroup.add(ceilingWarmLight2);

    interiorGroup.visible = false;
    scene.add(interiorGroup);
    interiorLightsGroupRef.current = interiorGroup;

    // 5. Room & Meshes Groups
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    roomGroupRef.current = roomGroup;

    const meshesGroup = new THREE.Group();
    scene.add(meshesGroup);
    meshesGroupRef.current = meshesGroup;

    // 6. Selection Box
    const boxHelper = new THREE.BoxHelper(new THREE.Mesh(), 0x3b82f6);
    boxHelper.visible = false;
    scene.add(boxHelper);
    selectedMeshBoxRef.current = boxHelper;

    // 7. 3D Drop Target Ghost Indicator Ring
    const dropGroup = new THREE.Group();
    const dropRingGeo = new THREE.RingGeometry(0.32, 0.42, 36);
    dropRingGeo.rotateX(-Math.PI / 2);
    const dropRingMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const dropRingMesh = new THREE.Mesh(dropRingGeo, dropRingMat);
    dropGroup.add(dropRingMesh);

    const dropCenterGeo = new THREE.CircleGeometry(0.14, 24);
    dropCenterGeo.rotateX(-Math.PI / 2);
    const dropCenterMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    const dropCenterMesh = new THREE.Mesh(dropCenterGeo, dropCenterMat);
    dropCenterMesh.position.y = 0.005;
    dropGroup.add(dropCenterMesh);

    // Subtle crosshair lines
    const crossMat = new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.8 });
    const crossLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.55, 0.006, 0),
      new THREE.Vector3(0.55, 0.006, 0),
    ]);
    const crossLine1 = new THREE.Line(crossLineGeo, crossMat);
    dropGroup.add(crossLine1);

    const crossLineGeo2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.006, -0.55),
      new THREE.Vector3(0, 0.006, 0.55),
    ]);
    const crossLine2 = new THREE.Line(crossLineGeo2, crossMat);
    dropGroup.add(crossLine2);

    dropGroup.position.set(0, 0.015, 0);
    dropGroup.visible = false;
    scene.add(dropGroup);
    dropHelperRef.current = dropGroup;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Camera based on Presets
  useEffect(() => {
    if (!cameraRef.current) return;
    const orbit = orbitStateRef.current;
    const roomLen = Math.max(roomSettings.width, roomSettings.length);

    if (cameraPreset === "isometric") {
      orbit.theta = Math.PI / 4;
      orbit.phi = Math.PI / 3.4;
      orbit.radius = roomLen * 1.5;
    } else if (cameraPreset === "top_down") {
      orbit.theta = 0;
      orbit.phi = 0.05; // almost straight down
      orbit.radius = roomLen * 1.4;
    } else if (cameraPreset === "walkthrough") {
      orbit.theta = Math.PI / 3;
      orbit.phi = Math.PI / 2.1; // eye level
      orbit.radius = roomLen * 0.9;
    } else {
      // Perspective default
      orbit.theta = Math.PI / 4.2;
      orbit.phi = Math.PI / 3.1;
      orbit.radius = roomLen * 1.35;
    }
    updateCameraPosition();
  }, [cameraPreset, roomSettings.width, roomSettings.length]);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const orbit = orbitStateRef.current;
    const x = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    const y = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
    const z = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    cameraRef.current.position.set(x, Math.max(0.4, y), z);
    cameraRef.current.lookAt(orbit.target);
  };

  // Dynamic 4D Solar Simulation & Day/Night Lighting
  useEffect(() => {
    if (!sunLightRef.current || !ambientLightRef.current || !hemiLightRef.current || !sceneRef.current) return;
    const settings = solarSettings || {
      hour: 12,
      season: "summer",
      isPlaying: false,
      speed: 1,
      latitude: 37.7,
      artificialLights: false,
    };

    const { hour, season, artificialLights } = settings;
    const isDay = hour >= 5.8 && hour <= 19.4;
    const seasonScale = season === "summer" ? 1.25 : season === "winter" ? 0.75 : 1.0;

    if (isDay) {
      const sunAngle = ((hour - 5.8) / 13.6) * Math.PI; // 0 to PI
      const sunElev = Math.sin(sunAngle) * 14 * seasonScale;
      const sunX = Math.cos(sunAngle) * 13;
      const sunZ = -Math.sin(sunAngle) * 9 + 1.5;

      sunLightRef.current.position.set(sunX, Math.max(1.0, sunElev), sunZ);
      sunLightRef.current.intensity = Math.max(0.3, Math.sin(sunAngle) * 1.7);

      // Color Kelvin transition
      if (hour < 7.2) {
        // Sunrise Rose/Amber
        sunLightRef.current.color.setHex(0xffaa5e);
        ambientLightRef.current.color.setHex(0xffddb8);
        ambientLightRef.current.intensity = 0.55;
        sceneRef.current.background = new THREE.Color(0x191419);
      } else if (hour > 17.2) {
        // Sunset Golden Hour
        sunLightRef.current.color.setHex(0xff8c3b);
        ambientLightRef.current.color.setHex(0xffc599);
        ambientLightRef.current.intensity = 0.5;
        sceneRef.current.background = new THREE.Color(0x1a1215);
      } else {
        // Bright daylight
        sunLightRef.current.color.setHex(0xfff8ea);
        ambientLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current.intensity = 0.78;
        sceneRef.current.background = new THREE.Color(0x0f0f0f);
      }
    } else {
      // Night (Moonlight)
      sunLightRef.current.position.set(4, 9, 4);
      sunLightRef.current.intensity = 0.08;
      sunLightRef.current.color.setHex(0x384a6b); // cool moonlight
      ambientLightRef.current.color.setHex(0x182030);
      ambientLightRef.current.intensity = 0.28;
      sceneRef.current.background = new THREE.Color(0x07080d);
    }

    // Artificial interior lights (turn on automatically at night or when toggled)
    if (interiorLightsGroupRef.current) {
      const shouldTurnOn = artificialLights || !isDay;
      interiorLightsGroupRef.current.visible = shouldTurnOn;
    }
  }, [solarSettings]);

  // Register multi-angle capture function for Lookbook export
  useEffect(() => {
    if (!onRegisterCaptureHook) return;

    const captureAll = async (): Promise<Record<CameraPreset, string>> => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return {
          perspective: "",
          isometric: "",
          top_down: "",
          walkthrough: "",
        };
      }

      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const orbit = orbitStateRef.current;

      // Hide selection helper box during export capture
      const wasBoxVisible = selectedMeshBoxRef.current?.visible;
      if (selectedMeshBoxRef.current) selectedMeshBoxRef.current.visible = false;

      // Save initial camera state
      const origTheta = orbit.theta;
      const origPhi = orbit.phi;
      const origRadius = orbit.radius;
      const origTarget = orbit.target.clone();
      const origPos = camera.position.clone();

      const roomLen = Math.max(roomSettings.width, roomSettings.length);

      const captureForPreset = (preset: CameraPreset): string => {
        if (preset === "isometric") {
          orbit.theta = Math.PI / 4;
          orbit.phi = Math.PI / 3.4;
          orbit.radius = roomLen * 1.5;
        } else if (preset === "top_down") {
          orbit.theta = 0;
          orbit.phi = 0.05;
          orbit.radius = roomLen * 1.4;
        } else if (preset === "walkthrough") {
          orbit.theta = Math.PI / 3;
          orbit.phi = Math.PI / 2.1;
          orbit.radius = roomLen * 0.9;
        } else {
          // perspective orbit
          orbit.theta = Math.PI / 4.2;
          orbit.phi = Math.PI / 3.1;
          orbit.radius = roomLen * 1.35;
        }

        const x = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
        const y = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
        const z = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
        camera.position.set(x, Math.max(0.4, y), z);
        camera.lookAt(orbit.target);

        renderer.render(scene, camera);
        return renderer.domElement.toDataURL("image/png");
      };

      const results: Record<CameraPreset, string> = {
        perspective: captureForPreset("perspective"),
        isometric: captureForPreset("isometric"),
        top_down: captureForPreset("top_down"),
        walkthrough: captureForPreset("walkthrough"),
      };

      // Restore camera state
      orbit.theta = origTheta;
      orbit.phi = origPhi;
      orbit.radius = origRadius;
      orbit.target.copy(origTarget);
      camera.position.copy(origPos);
      camera.lookAt(orbit.target);

      if (selectedMeshBoxRef.current && wasBoxVisible) {
        selectedMeshBoxRef.current.visible = true;
      }
      renderer.render(scene, camera);

      return results;
    };

    onRegisterCaptureHook(captureAll);
  }, [onRegisterCaptureHook, roomSettings.width, roomSettings.length]);

  // Re-build Room Geometry (Walls, Floor, Baseboards)
  useEffect(() => {
    if (!roomGroupRef.current) return;
    const group = roomGroupRef.current;
    // Clear existing
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const { width, length, height, wallColor, floorColor, floorType } = roomSettings;
    const halfW = width / 2;
    const halfL = length / 2;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(width, length, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(floorColor || "#D0BBA2"),
      roughness: floorType === "Marble Bianco" ? 0.15 : floorType === "Polished Concrete" ? 0.35 : 0.65,
      metalness: floorType === "Marble Bianco" ? 0.1 : 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // Floor Sub-Plinth / Foundation
    const plinthGeo = new THREE.BoxGeometry(width + 0.1, 0.15, length + 0.1);
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0xdedad2, roughness: 0.9 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.075;
    group.add(plinth);

    // Grid on floor for architectural precision
    const grid = new THREE.GridHelper(Math.max(width, length) * 1.1, Math.round(Math.max(width, length) * 2), 0x3b82f6, 0xd0c9bd);
    grid.position.y = 0.002;
    group.add(grid);

    // Walls (North, West back walls rendered solid; South & East open/lowered for unobstructed 3D viewing!)
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wallColor || "#F4F1EA"),
      roughness: 0.85,
      side: THREE.DoubleSide,
    });

    const wallThickness = 0.12;

    // North Wall (Back)
    const northWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const northWall = new THREE.Mesh(northWallGeo, wallMat);
    northWall.position.set(0, height / 2, -halfL - wallThickness / 2);
    northWall.receiveShadow = true;
    northWall.castShadow = true;
    group.add(northWall);

    // Baseboard North
    const baseboardGeo = new THREE.BoxGeometry(width, 0.1, 0.02);
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const bbNorth = new THREE.Mesh(baseboardGeo, baseboardMat);
    bbNorth.position.set(0, 0.05, -halfL + 0.01);
    group.add(bbNorth);

    // West Wall (Left)
    const westWallGeo = new THREE.BoxGeometry(wallThickness, height, length);
    const westWall = new THREE.Mesh(westWallGeo, wallMat);
    westWall.position.set(-halfW - wallThickness / 2, height / 2, 0);
    westWall.receiveShadow = true;
    westWall.castShadow = true;
    group.add(westWall);

    // Baseboard West
    const bbWestGeo = new THREE.BoxGeometry(0.02, 0.1, length);
    const bbWest = new THREE.Mesh(bbWestGeo, baseboardMat);
    bbWest.position.set(-halfW + 0.01, 0.05, 0);
    group.add(bbWest);

    // Subtle lowered half-height architectural boundary walls for South & East (0.35m height) so you never block the view!
    const southCutWallGeo = new THREE.BoxGeometry(width, 0.35, wallThickness);
    const southCutWall = new THREE.Mesh(southCutWallGeo, wallMat);
    southCutWall.position.set(0, 0.175, halfL + wallThickness / 2);
    group.add(southCutWall);

    const eastCutWallGeo = new THREE.BoxGeometry(wallThickness, 0.35, length);
    const eastCutWall = new THREE.Mesh(eastCutWallGeo, wallMat);
    eastCutWall.position.set(halfW + wallThickness / 2, 0.175, 0);
    group.add(eastCutWall);

    // 3D Architectural Openings (Doors & Windows)
    if (roomSettings.openings) {
      roomSettings.openings.forEach((op) => {
        const openingGroup = new THREE.Group();
        const isDoor = op.type.includes("door") || op.type === "archway";
        const isFrench = op.type === "french_door" || op.type === "double_door";
        const isSliding = op.type === "sliding_door" || op.type === "balcony_sliding_window";
        const elevation = op.elevation !== undefined ? op.elevation : isDoor ? 0 : 0.8;
        const opW = op.width;
        const opH = op.height;

        let posX = 0;
        let posZ = 0;
        let rotY = 0;

        if (op.wall === "north") {
          posX = -halfW + op.position * width;
          posZ = -halfL + 0.025;
          rotY = 0;
        } else if (op.wall === "south") {
          posX = -halfW + op.position * width;
          posZ = halfL - 0.025;
          rotY = Math.PI;
        } else if (op.wall === "west") {
          posX = -halfW + 0.025;
          posZ = -halfL + op.position * length;
          rotY = Math.PI / 2;
        } else if (op.wall === "east") {
          posX = halfW - 0.025;
          posZ = -halfL + op.position * length;
          rotY = -Math.PI / 2;
        }

        openingGroup.position.set(posX, elevation + opH / 2, posZ);
        openingGroup.rotation.y = rotY;

        // Frame Material
        const frameColor = op.frameColor || "#1F1F1F";
        const frameMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(frameColor),
          roughness: 0.35,
          metalness: 0.2,
        });

        // Frame Outer Border
        const frameThick = 0.06;
        const frameDepth = 0.09;

        // Top Frame Jamb
        const topJambGeo = new THREE.BoxGeometry(opW, frameThick, frameDepth);
        const topJamb = new THREE.Mesh(topJambGeo, frameMat);
        topJamb.position.set(0, opH / 2 - frameThick / 2, 0);
        openingGroup.add(topJamb);

        // Left Frame Jamb
        const leftJambGeo = new THREE.BoxGeometry(frameThick, opH, frameDepth);
        const leftJamb = new THREE.Mesh(leftJambGeo, frameMat);
        leftJamb.position.set(-opW / 2 + frameThick / 2, 0, 0);
        openingGroup.add(leftJamb);

        // Right Frame Jamb
        const rightJambGeo = new THREE.BoxGeometry(frameThick, opH, frameDepth);
        const rightJamb = new THREE.Mesh(rightJambGeo, frameMat);
        rightJamb.position.set(opW / 2 - frameThick / 2, 0, 0);
        openingGroup.add(rightJamb);

        if (isDoor) {
          // Bottom threshold
          const thresholdGeo = new THREE.BoxGeometry(opW, 0.02, frameDepth + 0.02);
          const threshold = new THREE.Mesh(thresholdGeo, frameMat);
          threshold.position.set(0, -opH / 2 + 0.01, 0);
          openingGroup.add(threshold);

          if (isFrench) {
            // Double French Door Panes
            const leafW = (opW - frameThick * 3) / 2;
            const leafH = opH - frameThick - 0.03;

            [-1, 1].forEach((side) => {
              const leafGroup = new THREE.Group();
              const leafFrame = new THREE.Mesh(
                new THREE.BoxGeometry(leafW, leafH, 0.035),
                new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 })
              );
              leafGroup.add(leafFrame);

              // Glass Inset
              const leafGlass = new THREE.Mesh(
                new THREE.PlaneGeometry(leafW * 0.75, leafH * 0.75),
                new THREE.MeshPhysicalMaterial({
                  color: 0xd6eeff,
                  transparent: true,
                  opacity: 0.5,
                  roughness: 0.1,
                  transmission: 0.8,
                })
              );
              leafGlass.position.z = 0.018;
              leafGroup.add(leafGlass);

              // Handle
              const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.012, 0.18, 12),
                new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 })
              );
              handle.position.set(-side * (leafW / 2 - 0.05), 0, 0.03);
              leafGroup.add(handle);

              leafGroup.position.set(side * (leafW / 2 + frameThick / 4), 0, 0);
              openingGroup.add(leafGroup);
            });
          } else {
            // Single Door Leaf
            const leafW = opW - frameThick * 2;
            const leafH = opH - frameThick - 0.02;

            const doorLeafMat = new THREE.MeshStandardMaterial({
              color: 0x2e2722,
              roughness: 0.6,
            });
            const doorLeaf = new THREE.Mesh(
              new THREE.BoxGeometry(leafW, leafH, 0.04),
              doorLeafMat
            );
            doorLeaf.position.set(0, -0.01, 0);
            openingGroup.add(doorLeaf);

            // Metallic Lever Handle & Rose
            const handleMat = new THREE.MeshStandardMaterial({
              color: 0xd4af37,
              metalness: 0.85,
              roughness: 0.2,
            });
            const rose = new THREE.Mesh(
              new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16),
              handleMat
            );
            rose.rotation.x = Math.PI / 2;
            rose.position.set(leafW / 2 - 0.08, -0.05, 0.025);
            openingGroup.add(rose);

            const lever = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 0.018, 0.015),
              handleMat
            );
            lever.position.set(leafW / 2 - 0.12, -0.05, 0.045);
            openingGroup.add(lever);
          }
        } else {
          // Window Sill (bottom ledge)
          const sillGeo = new THREE.BoxGeometry(opW + 0.1, 0.04, frameDepth + 0.08);
          const sillMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
          const sill = new THREE.Mesh(sillGeo, sillMat);
          sill.position.set(0, -opH / 2 - 0.01, 0.02);
          openingGroup.add(sill);

          // Window Glass Pane
          const glassGeo = new THREE.PlaneGeometry(opW - frameThick * 2, opH - frameThick * 2);
          const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xe0f2fe,
            transparent: true,
            opacity: 0.4,
            roughness: 0.08,
            transmission: 0.85,
            ior: 1.5,
          });
          const glassMesh = new THREE.Mesh(glassGeo, glassMat);
          glassMesh.position.set(0, 0, 0.01);
          openingGroup.add(glassMesh);

          // Center Vertical Mullion
          if (opW > 1.4) {
            const mullionGeo = new THREE.BoxGeometry(0.03, opH - frameThick * 2, 0.04);
            const mullion = new THREE.Mesh(mullionGeo, frameMat);
            mullion.position.set(0, 0, 0.015);
            openingGroup.add(mullion);
          }
        }

        group.add(openingGroup);
      });
    }
  }, [roomSettings]);

  // Re-build Placed 3D Furniture Meshes
  useEffect(() => {
    if (!meshesGroupRef.current) return;
    const group = meshesGroupRef.current;
    // Clear old meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    placedItems.forEach((placed) => {
      const product = getProductById(placed.productId);
      if (!product) return;

      const itemGroup = create3DFurnitureMesh(product, placed);
      itemGroup.userData = {
        instanceId: placed.instanceId,
        productId: placed.productId,
        productName: product.name,
        brand: product.brand,
        dimensions: `${product.dimensions.width * 100}W × ${product.dimensions.depth * 100}D × ${product.dimensions.height * 100}H cm`,
      };
      itemGroup.position.set(placed.x, placed.z || 0, placed.y);
      itemGroup.rotation.y = THREE.MathUtils.degToRad(-placed.rotation); // convert 2D rotation to 3D Y-axis
      group.add(itemGroup);
    });

    // Update selection helper box
    updateSelectionBox();
  }, [placedItems, selectedInstanceId]);

  const updateSelectionBox = () => {
    if (!selectedMeshBoxRef.current || !meshesGroupRef.current) return;
    if (!selectedInstanceId) {
      selectedMeshBoxRef.current.visible = false;
      return;
    }

    const selectedMesh = meshesGroupRef.current.children.find(
      (child) => child.userData?.instanceId === selectedInstanceId
    );

    if (selectedMesh) {
      selectedMeshBoxRef.current.setFromObject(selectedMesh);
      selectedMeshBoxRef.current.visible = true;
    } else {
      selectedMeshBoxRef.current.visible = false;
    }
  };

  // Helper to generate bespoke 3D meshes based on product type
  const create3DFurnitureMesh = (product: ProductItem, placed: PlacedItem): THREE.Group => {
    const group = new THREE.Group();
    const { width, depth, height } = product.dimensions;
    const mainColor = placed.colorOverride || product.colorHex;

    const mainMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(mainColor),
      roughness: 0.65,
      metalness: 0.05,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentTheme === "Scandinavian" ? 0xd5be9e : 0x5c4228),
      roughness: 0.7,
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1f2022,
      metalness: 0.85,
      roughness: 0.25,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.3,
    });

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf2efea,
      roughness: 0.2,
      metalness: 0.1,
    });

    switch (product.model3DType) {
      case "sofa_sectional": {
        // Sectional Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth * 0.65), mainMat);
        base.position.y = 0.18;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Chaise Extension (Left)
        const chaise = new THREE.Mesh(new THREE.BoxGeometry(width * 0.4, 0.2, depth), mainMat);
        chaise.position.set(-width * 0.3, 0.18, depth * 0.17);
        chaise.castShadow = true;
        group.add(chaise);

        // Backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.6, 0.18), mainMat);
        back.position.set(0, height * 0.5, -depth * 0.24);
        back.castShadow = true;
        group.add(back);

        // Soft Seat Cushions
        const seat1 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.14, depth * 0.6), mainMat);
        seat1.position.set(width * 0.3, 0.32, 0);
        group.add(seat1);

        const seat2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.14, depth * 0.6), mainMat);
        seat2.position.set(0, 0.32, 0);
        group.add(seat2);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.12, 12);
        const legOffsets = [
          [-width * 0.46, -depth * 0.25],
          [width * 0.46, -depth * 0.25],
          [-width * 0.46, depth * 0.6],
          [-width * 0.12, depth * 0.6],
          [width * 0.46, depth * 0.25],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, woodMat);
          leg.position.set(lx, 0.06, lz);
          group.add(leg);
        });
        break;
      }

      case "armchair": {
        // Eames Style Lounge Chair
        const shellBase = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.1, depth * 0.8), woodMat);
        shellBase.position.y = 0.24;
        shellBase.castShadow = true;
        group.add(shellBase);

        const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.14, depth * 0.75), mainMat);
        seatCushion.position.set(0, 0.34, 0);
        group.add(seatCushion);

        const backShell = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, height * 0.6, 0.08), woodMat);
        backShell.position.set(0, height * 0.58, -depth * 0.3);
        backShell.rotation.x = -0.15;
        backShell.castShadow = true;
        group.add(backShell);

        const backCushion = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, height * 0.52, 0.12), mainMat);
        backCushion.position.set(0, height * 0.58, -depth * 0.25);
        backCushion.rotation.x = -0.15;
        group.add(backCushion);

        // Ottoman
        const ottoman = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.14, depth * 0.55), mainMat);
        ottoman.position.set(0, 0.25, depth * 0.75);
        group.add(ottoman);

        // Swivel Star Legs
        const centerPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18), metalMat);
        centerPost.position.y = 0.1;
        group.add(centerPost);
        break;
      }

      case "coffee_table": {
        // Travertine Monolith Slab
        const topSlab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, depth), marbleMat);
        topSlab.position.y = height - 0.03;
        topSlab.castShadow = true;
        topSlab.receiveShadow = true;
        group.add(topSlab);

        // Dual Cylinder Pedestal Pillars
        const pillarGeo = new THREE.CylinderGeometry(depth * 0.25, depth * 0.25, height - 0.06, 24);
        const p1 = new THREE.Mesh(pillarGeo, marbleMat);
        p1.position.set(-width * 0.28, (height - 0.06) / 2, 0);
        p1.castShadow = true;
        group.add(p1);

        const p2 = new THREE.Mesh(pillarGeo, marbleMat);
        p2.position.set(width * 0.28, (height - 0.06) / 2, 0);
        p2.castShadow = true;
        group.add(p2);
        break;
      }

      case "tv_credenza": {
        // Cabinet Box
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.8, depth), woodMat);
        cabinet.position.y = height * 0.45;
        cabinet.castShadow = true;
        group.add(cabinet);

        // Brass Fluted Accents / Door lines
        const handle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2), brassMat);
        handle1.position.set(-width * 0.15, height * 0.45, depth / 2 + 0.01);
        group.add(handle1);

        const handle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2), brassMat);
        handle2.position.set(width * 0.15, height * 0.45, depth / 2 + 0.01);
        group.add(handle2);

        // Recessed Base
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.08, depth * 0.85), metalMat);
        plinth.position.y = 0.04;
        group.add(plinth);
        break;
      }

      case "kitchen_island": {
        // Waterfall Island Countertop
        const islandTop = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), marbleMat);
        islandTop.position.y = height - 0.04;
        islandTop.castShadow = true;
        group.add(islandTop);

        // Waterfall Side Left
        const waterfallL = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, depth), marbleMat);
        waterfallL.position.set(-width / 2 + 0.04, height / 2, 0);
        group.add(waterfallL);

        // Waterfall Side Right
        const waterfallR = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, depth), marbleMat);
        waterfallR.position.set(width / 2 - 0.04, height / 2, 0);
        group.add(waterfallR);

        // Inner Cabinets
        const innerCabinet = new THREE.Mesh(new THREE.BoxGeometry(width - 0.25, height - 0.12, depth * 0.75), mainMat);
        innerCabinet.position.set(0, (height - 0.12) / 2, -depth * 0.08);
        innerCabinet.castShadow = true;
        group.add(innerCabinet);
        break;
      }

      case "kitchen_cabinets_lower": {
        const lowerRun = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.05, depth), woodMat);
        lowerRun.position.y = (height - 0.05) / 2;
        lowerRun.castShadow = true;
        group.add(lowerRun);

        const counter = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.05, depth + 0.04), marbleMat);
        counter.position.y = height - 0.025;
        group.add(counter);
        break;
      }

      case "kitchen_cabinets_upper": {
        const upperRun = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), woodMat);
        upperRun.position.y = height / 2;
        upperRun.castShadow = true;
        group.add(upperRun);

        // Smoked Glass Doors
        const glassDoor = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.95, height * 0.85),
          new THREE.MeshPhysicalMaterial({ color: 0x4a433d, transparent: true, opacity: 0.7, roughness: 0.1 })
        );
        glassDoor.position.set(0, height / 2, depth / 2 + 0.01);
        group.add(glassDoor);
        break;
      }

      case "refrigerator_french": {
        // Main Refrigerator Body
        const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), metalMat);
        fridgeBody.position.y = height / 2;
        fridgeBody.castShadow = true;
        group.add(fridgeBody);

        // French Door Divider Line
        const divider = new THREE.Mesh(new THREE.BoxGeometry(0.01, height * 0.6, 0.01), brassMat);
        divider.position.set(0, height * 0.65, depth / 2 + 0.008);
        group.add(divider);

        // Vertical Bar Handles
        const hL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, height * 0.4), brassMat);
        hL.position.set(-0.06, height * 0.65, depth / 2 + 0.04);
        group.add(hL);

        const hR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, height * 0.4), brassMat);
        hR.position.set(0.06, height * 0.65, depth / 2 + 0.04);
        group.add(hR);
        break;
      }

      case "freestanding_tub": {
        // Smooth Oval Bathtub Geometry
        const tubOuter = new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.45, width * 0.38, height, 32),
          new THREE.MeshStandardMaterial({ color: 0xfaf9f6, roughness: 0.2 })
        );
        tubOuter.scale.set(1.2, 1, 0.75);
        tubOuter.position.y = height / 2;
        tubOuter.castShadow = true;
        group.add(tubOuter);

        // Chrome Floor-Mounted Faucet Column
        const faucetPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, height * 1.3), brassMat);
        faucetPole.position.set(width * 0.48, height * 0.65, 0);
        group.add(faucetPole);
        break;
      }

      case "vanity_double": {
        const vanityCabinet = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.8, depth), woodMat);
        vanityCabinet.position.y = height * 0.45;
        vanityCabinet.castShadow = true;
        group.add(vanityCabinet);

        const vanityMarble = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.06, depth + 0.02), marbleMat);
        vanityMarble.position.y = height * 0.85 + 0.03;
        group.add(vanityMarble);

        // Dual Undermount Sinks (Visual indicator)
        [-width * 0.25, width * 0.25].forEach((sx) => {
          const sinkHole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }));
          sinkHole.position.set(sx, height * 0.85 + 0.04, 0);
          group.add(sinkHole);

          const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25), brassMat);
          faucet.position.set(sx, height * 0.85 + 0.16, -depth * 0.3);
          group.add(faucet);
        });
        break;
      }

      case "toilet_wallhung": {
        const toiletBowl = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.6, depth * 0.8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }));
        toiletBowl.position.set(0, height * 0.45, 0);
        toiletBowl.castShadow = true;
        group.add(toiletBowl);
        break;
      }

      case "shower_glass": {
        const glassWall = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, 0.02),
          new THREE.MeshPhysicalMaterial({ color: 0xe6f4ff, transparent: true, opacity: 0.35, roughness: 0.1, transmission: 0.85 })
        );
        glassWall.position.set(0, height / 2, 0);
        group.add(glassWall);

        // Black Frame Border
        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.04, height, 0.04), metalMat);
        frameL.position.set(-width / 2, height / 2, 0);
        group.add(frameL);

        const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.04, height, 0.04), metalMat);
        frameR.position.set(width / 2, height / 2, 0);
        group.add(frameR);
        break;
      }

      case "bed_king":
      case "bed_platform":
      case "wooden_bed": {
        // Architectural Solid Wood Bed Frame with Mattress & Pillows
        const isPlatform = product.model3DType === "bed_platform" || (product.name || "").toLowerCase().includes("platform");
        const platformThickness = isPlatform ? 0.12 : 0.22;
        const platformWidth = isPlatform ? width * 1.15 : width * 1.05;
        const platformDepth = isPlatform ? depth * 1.1 : depth * 1.02;

        // Platform Wood Base
        const platform = new THREE.Mesh(new THREE.BoxGeometry(platformWidth, platformThickness, platformDepth), woodMat);
        platform.position.set(0, platformThickness / 2, 0);
        platform.castShadow = true;
        group.add(platform);

        // Bed Legs (if standard/wooden bed)
        if (!isPlatform) {
          [-width * 0.48, width * 0.48].forEach((lx) => {
            [-depth * 0.48, depth * 0.48].forEach((lz) => {
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.15), woodMat);
              leg.position.set(lx, -0.075 + platformThickness / 2, lz);
              leg.castShadow = true;
              group.add(leg);
            });
          });
        }

        // Mattress & Duvet Inset
        const matH = height * 0.35;
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, matH, depth * 0.92), mainMat);
        mattress.position.set(0, platformThickness + matH / 2, -depth * 0.02);
        mattress.castShadow = true;
        group.add(mattress);

        // Folded Duvet / Comforter End
        const duvet = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.96, matH * 0.5, depth * 0.55),
          new THREE.MeshStandardMaterial({ color: 0xeeece8, roughness: 0.85 })
        );
        duvet.position.set(0, platformThickness + matH * 0.8, depth * 0.18);
        duvet.castShadow = true;
        group.add(duvet);

        // Headboard
        const headboardH = height;
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(platformWidth, headboardH, 0.12), woodMat);
        headboard.position.set(0, headboardH / 2, -platformDepth / 2 + 0.06);
        headboard.castShadow = true;
        group.add(headboard);

        // Dual Fluffy Sleeping Pillows
        [-width * 0.26, width * 0.26].forEach((px) => {
          const pillow = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.36, 0.12, 0.42),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
          );
          pillow.position.set(px, platformThickness + matH + 0.06, -depth * 0.28);
          pillow.rotation.x = -0.15;
          pillow.castShadow = true;
          group.add(pillow);
        });
        break;
      }

      case "rug": {
        const rugMesh = new THREE.Mesh(
          new THREE.BoxGeometry(width, 0.015, depth),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(mainColor), roughness: 0.95 })
        );
        rugMesh.position.set(0, 0.008, 0);
        rugMesh.receiveShadow = true;
        group.add(rugMesh);
        break;
      }

      case "floor_lamp": {
        const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), metalMat);
        lampBase.position.y = 0.015;
        group.add(lampBase);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, height * 0.85), metalMat);
        pole.position.y = height * 0.45;
        group.add(pole);

        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.32, 0.35, 24, 1, true),
          new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.4, side: THREE.DoubleSide })
        );
        shade.position.y = height * 0.85;
        group.add(shade);

        // Warm Point Light inside lamp
        const lampLight = new THREE.PointLight(0xfff1dc, 1.2, 5);
        lampLight.position.y = height * 0.85;
        group.add(lampLight);
        break;
      }

      case "pendant_light": {
        // Bubble Saucer Shade
        const saucer = new THREE.Mesh(
          new THREE.SphereGeometry(width * 0.4, 32, 16),
          new THREE.MeshStandardMaterial({ color: 0xfffcf5, roughness: 0.2, emissive: 0xfffaed, emissiveIntensity: 0.3 })
        );
        saucer.scale.set(1, 0.4, 1);
        saucer.position.y = 0;
        group.add(saucer);

        // Suspension cord
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.8), metalMat);
        cord.position.y = 0.4;
        group.add(cord);

        const pendantLight = new THREE.PointLight(0xfffaea, 1.5, 6);
        pendantLight.position.y = -0.1;
        group.add(pendantLight);
        break;
      }

      case "hanging_clock": {
        // Wall Hanging Clock with Leather Strap or Concealed Mount
        const clockRadius = Math.min(width, height) * 0.45;
        const clockGroup = new THREE.Group();
        clockGroup.position.y = 1.7; // Wall eye-level hanging height

        // Hanging Strap & Anchor
        const strapGeo = new THREE.BoxGeometry(0.02, 0.4, 0.01);
        const strapMat = new THREE.MeshStandardMaterial({ color: 0x6e4324, roughness: 0.8 });
        const strap = new THREE.Mesh(strapGeo, strapMat);
        strap.position.set(0, clockRadius + 0.2, 0);
        clockGroup.add(strap);

        const anchorPeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 16), brassMat);
        anchorPeg.rotation.x = Math.PI / 2;
        anchorPeg.position.set(0, clockRadius + 0.38, 0.015);
        clockGroup.add(anchorPeg);

        // Outer Bezel Rim
        const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(clockRadius, clockRadius, 0.03, 32), brassMat);
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.castShadow = true;
        clockGroup.add(rimMesh);

        // Dial Face
        const dialMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.3 });
        const dialMesh = new THREE.Mesh(new THREE.CylinderGeometry(clockRadius * 0.94, clockRadius * 0.94, 0.032, 32), dialMat);
        dialMesh.rotation.x = Math.PI / 2;
        clockGroup.add(dialMesh);

        // Hour & Minute Hands (Set at aesthetic 10:10)
        const handMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
        const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.012, clockRadius * 0.5, 0.005), handMat);
        hourHand.position.set(-clockRadius * 0.18, clockRadius * 0.18, 0.02);
        hourHand.rotation.z = Math.PI / 3.5;
        clockGroup.add(hourHand);

        const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.008, clockRadius * 0.75, 0.005), handMat);
        minuteHand.position.set(clockRadius * 0.22, clockRadius * 0.24, 0.022);
        minuteHand.rotation.z = -Math.PI / 4;
        clockGroup.add(minuteHand);

        // Center Pin
        const centerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 16), brassMat);
        centerPin.rotation.x = Math.PI / 2;
        centerPin.position.set(0, 0, 0.025);
        clockGroup.add(centerPin);

        group.add(clockGroup);
        break;
      }

      case "office_chair": {
        // Ergonomic Aeron Task Chair
        // 5-Star Base
        const starBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16), metalMat);
        starBase.position.y = 0.08;
        group.add(starBase);

        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const legArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, width * 0.42), metalMat);
          legArm.position.set(Math.sin(angle) * width * 0.22, 0.07, Math.cos(angle) * width * 0.22);
          legArm.rotation.y = angle;
          group.add(legArm);

          // Caster Wheel
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), metalMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(Math.sin(angle) * width * 0.38, 0.03, Math.cos(angle) * width * 0.38);
          group.add(wheel);
        }

        // Center Gas Lift Cylinder
        const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.3, 16), metalMat);
        piston.position.y = 0.25;
        group.add(piston);

        // Contoured Seat Pan
        const seatPan = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 0.08, depth * 0.72), mainMat);
        seatPan.position.set(0, 0.45, 0);
        seatPan.castShadow = true;
        group.add(seatPan);

        // Breathable Curved Mesh Backrest
        const backRest = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, height * 0.52, 0.06), mainMat);
        backRest.position.set(0, 0.76, -depth * 0.3);
        backRest.rotation.x = -0.12;
        backRest.castShadow = true;
        group.add(backRest);

        // Lumbar Support Pad
        const lumbar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, 0.12, 0.04), metalMat);
        lumbar.position.set(0, 0.65, -depth * 0.33);
        group.add(lumbar);

        // 3D Adjustable Armrests
        [-width * 0.38, width * 0.38].forEach((ax) => {
          const armStalk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.04), metalMat);
          armStalk.position.set(ax, 0.56, -0.02);
          group.add(armStalk);

          const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.24), mainMat);
          armPad.position.set(ax, 0.68, -0.02);
          group.add(armPad);
        });
        break;
      }

      case "dining_chair": {
        // Scandinavian Wishbone Dining Chair
        const seatHeight = 0.45;
        // Woven Cord Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.05, depth * 0.8), mainMat);
        seat.position.set(0, seatHeight, 0);
        seat.castShadow = true;
        group.add(seat);

        // 4 Solid Wood Tapered Legs
        const legOffsets = [
          [-width * 0.38, -depth * 0.35],
          [width * 0.38, -depth * 0.35],
          [-width * 0.38, depth * 0.35],
          [width * 0.38, depth * 0.35],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, seatHeight, 12), woodMat);
          leg.position.set(lx, seatHeight / 2, lz);
          leg.castShadow = true;
          group.add(leg);
        });

        // Steam-Bent Wishbone Crest Rail / Backrest
        const crest = new THREE.Mesh(
          new THREE.TorusGeometry(width * 0.42, 0.02, 12, 24, Math.PI),
          woodMat
        );
        crest.rotation.x = Math.PI / 2;
        crest.rotation.z = Math.PI;
        crest.position.set(0, height * 0.82, -depth * 0.08);
        crest.castShadow = true;
        group.add(crest);

        // Y-Spine / Wishbone Center Support
        const ySupport = new THREE.Mesh(new THREE.BoxGeometry(0.04, height * 0.35, 0.02), woodMat);
        ySupport.position.set(0, seatHeight + 0.16, -depth * 0.36);
        group.add(ySupport);
        break;
      }

      case "accent_chair": {
        // Modern Club / Velvet Lounge Chair
        const seat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.12, depth * 0.8), mainMat);
        seat.position.set(0, 0.38, 0);
        seat.castShadow = true;
        group.add(seat);

        const curvedBack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, height * 0.55, 0.1), mainMat);
        curvedBack.position.set(0, 0.65, -depth * 0.32);
        curvedBack.rotation.x = -0.1;
        curvedBack.castShadow = true;
        group.add(curvedBack);

        // Tapered Brass Legs
        const legOffsets = [
          [-width * 0.36, -depth * 0.34],
          [width * 0.36, -depth * 0.34],
          [-width * 0.36, depth * 0.34],
          [width * 0.36, depth * 0.34],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.01, 0.36, 12), brassMat);
          leg.position.set(lx, 0.18, lz);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case "counter_stool": {
        // Tall Island Bar Stool
        const seatY = 0.65;
        const stoolSeat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.05, depth * 0.8), woodMat);
        stoolSeat.position.set(0, seatY, 0);
        stoolSeat.castShadow = true;
        group.add(stoolSeat);

        const lowBack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.15, 0.04), woodMat);
        lowBack.position.set(0, seatY + 0.1, -depth * 0.35);
        group.add(lowBack);

        // Stool Legs
        const stoolLegs = [
          [-width * 0.36, -depth * 0.36],
          [width * 0.36, -depth * 0.36],
          [-width * 0.36, depth * 0.36],
          [width * 0.36, depth * 0.36],
        ];
        stoolLegs.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, seatY, 12), woodMat);
          leg.position.set(lx, seatY / 2, lz);
          group.add(leg);
        });

        // Footrest Bar Ring
        const footrest = new THREE.Mesh(new THREE.TorusGeometry(width * 0.35, 0.012, 12, 24), metalMat);
        footrest.rotation.x = Math.PI / 2;
        footrest.position.set(0, 0.25, 0);
        group.add(footrest);
        break;
      }

      case "dining_table": {
        // HAY CPH 30 Rectangular Dining Table
        const topThick = 0.05;
        const top = new THREE.Mesh(new THREE.BoxGeometry(width, topThick, depth), woodMat);
        top.position.set(0, height - topThick / 2, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Angled Solid Oak Legs
        const legGeo = new THREE.BoxGeometry(0.06, height - topThick, 0.06);
        const legOffsets = [
          [-width * 0.44, -depth * 0.4],
          [width * 0.44, -depth * 0.4],
          [-width * 0.44, depth * 0.4],
          [width * 0.44, depth * 0.4],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, woodMat);
          leg.position.set(lx, (height - topThick) / 2, lz);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case "office_desk": {
        // Modern Executive Writing Desk
        const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, depth), woodMat);
        top.position.set(0, height - 0.02, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Secondary Elevated Tier / Monitor Riser
        const riser = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 0.06, depth * 0.3), woodMat);
        riser.position.set(0, height + 0.04, -depth * 0.32);
        group.add(riser);

        // Steel Frame Sled Legs
        [-width * 0.46, width * 0.46].forEach((lx) => {
          const legPostL = new THREE.Mesh(new THREE.BoxGeometry(0.04, height, depth * 0.9), metalMat);
          legPostL.position.set(lx, height / 2, 0);
          legPostL.castShadow = true;
          group.add(legPostL);
        });

        // Modesty / Cable Panel
        const panel = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, height * 0.4, 0.02), metalMat);
        panel.position.set(0, height * 0.65, -depth * 0.4);
        group.add(panel);
        break;
      }

      case "accent_table": {
        // Noguchi Sculptural Glass & Walnut Accent Table
        const glassTop = new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.45, width * 0.48, 0.025, 32),
          new THREE.MeshPhysicalMaterial({ color: 0xebf4fa, transparent: true, opacity: 0.6, roughness: 0.05, transmission: 0.9 })
        );
        glassTop.scale.set(1.2, 1, 0.85);
        glassTop.position.set(0, height - 0.015, 0);
        glassTop.castShadow = true;
        glassTop.receiveShadow = true;
        group.add(glassTop);

        // Sculptural Interlocking Organic Base
        const base1 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.55, height * 0.8, 0.08), woodMat);
        base1.position.set(-width * 0.1, height * 0.4, 0);
        base1.rotation.set(0.3, 0.5, 0.2);
        base1.castShadow = true;
        group.add(base1);

        const base2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.55, height * 0.8, 0.08), woodMat);
        base2.position.set(width * 0.1, height * 0.4, 0);
        base2.rotation.set(-0.3, -0.5, -0.2);
        base2.castShadow = true;
        group.add(base2);
        break;
      }

      case "conference_table": {
        // Large USM Haller Conference Table
        const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, depth), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }));
        top.position.set(0, height - 0.025, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Center Power & Media Grommet
        const grommet = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.01, 0.15), metalMat);
        grommet.position.set(0, height + 0.005, 0);
        group.add(grommet);

        // Chrome Cylindrical Tubular Legs
        const legGeo = new THREE.CylinderGeometry(0.035, 0.035, height - 0.05, 20);
        const legOffsets = [
          [-width * 0.45, -depth * 0.4],
          [width * 0.45, -depth * 0.4],
          [-width * 0.45, depth * 0.4],
          [width * 0.45, depth * 0.4],
          [0, -depth * 0.4],
          [0, depth * 0.4],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, metalMat);
          leg.position.set(lx, (height - 0.05) / 2, lz);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case "whiteboard": {
        // Lintex Mood Glass Mobile Magnetic Whiteboard
        const frameW = width;
        const frameH = height * 0.75;

        // Base Stand with Castors
        const standBase = new THREE.Mesh(new THREE.BoxGeometry(frameW * 0.9, 0.08, depth), woodMat);
        standBase.position.set(0, 0.06, 0);
        standBase.castShadow = true;
        group.add(standBase);

        // 4 Precision Wheels
        const wheelOffsets = [
          [-frameW * 0.4, -depth * 0.4],
          [frameW * 0.4, -depth * 0.4],
          [-frameW * 0.4, depth * 0.4],
          [frameW * 0.4, depth * 0.4],
        ];
        wheelOffsets.forEach(([wx, wz]) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), metalMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.03, wz);
          group.add(wheel);
        });

        // Vertical Frame Supports
        [-frameW * 0.46, frameW * 0.46].forEach((fx) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, height * 0.9, 0.04), woodMat);
          post.position.set(fx, height * 0.48, 0);
          post.castShadow = true;
          group.add(post);
        });

        // Pure Optical White Magnetic Glass Surface
        const boardMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.08,
          metalness: 0.1,
        });
        const board = new THREE.Mesh(new THREE.BoxGeometry(frameW * 0.88, frameH, 0.025), boardMat);
        board.position.set(0, height * 0.58, 0);
        board.castShadow = true;
        group.add(board);

        // Thin Sleek Metal Frame Border
        const borderGeo = new THREE.BoxGeometry(frameW * 0.9, frameH + 0.02, 0.03);
        const borderMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3 });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.set(0, height * 0.58, -0.005);
        group.add(border);

        // Magnetic Marker & Eraser Tray
        const tray = new THREE.Mesh(new THREE.BoxGeometry(frameW * 0.6, 0.02, 0.08), woodMat);
        tray.position.set(0, height * 0.58 - frameH / 2 - 0.015, 0.04);
        group.add(tray);

        // Marker Pens on Tray
        [-0.1, 0, 0.1].forEach((px, idx) => {
          const penMat = new THREE.MeshStandardMaterial({
            color: idx === 0 ? 0x111111 : idx === 1 ? 0x2563eb : 0xdc2626,
            roughness: 0.4,
          });
          const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 10), penMat);
          pen.rotation.z = Math.PI / 2;
          pen.position.set(px, height * 0.58 - frameH / 2 + 0.005, 0.04);
          group.add(pen);
        });
        break;
      }

      case "ficus_plant": {
        // Ceramic Fluted Planter
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.45, 24), new THREE.MeshStandardMaterial({ color: 0xf0ece1, roughness: 0.8 }));
        pot.position.y = 0.225;
        pot.castShadow = true;
        group.add(pot);

        // Trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, height * 0.7), woodMat);
        trunk.position.y = height * 0.45;
        group.add(trunk);

        // Foliage Leaves
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x3e5e3b, roughness: 0.6 });
        for (let i = 0; i < 7; i++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), leafMat);
          leaf.scale.set(1.4, 0.3, 1.1);
          leaf.position.set(
            (Math.sin(i * 1.1) * width) / 3,
            0.55 + i * 0.12,
            (Math.cos(i * 1.1) * depth) / 3
          );
          leaf.rotation.set(0.2, i * 0.8, 0.3);
          leaf.castShadow = true;
          group.add(leaf);
        }
        break;
      }

      case "round_table":
      case "table_round":
      case "dining_table_round": {
        // Sculptural Round Pedestal Dining Table
        const rad = Math.min(width, depth) / 2;
        const top = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.045, 36), woodMat);
        top.position.y = height - 0.0225;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Fluted Pedestal Column
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.22, rad * 0.32, height - 0.08, 32), woodMat);
        pedestal.position.y = (height - 0.08) / 2 + 0.04;
        pedestal.castShadow = true;
        group.add(pedestal);

        // Heavy Base Disk with Beveled Edge
        const baseDisk = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.65, rad * 0.7, 0.04, 36), woodMat);
        baseDisk.position.y = 0.02;
        baseDisk.castShadow = true;
        group.add(baseDisk);
        break;
      }

      case "wooden_table":
      case "table": {
        // Solid Craft Timber Table
        const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, depth), woodMat);
        top.position.y = height - 0.025;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Apron stretchers under top
        const apronLong = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.06, 0.03), woodMat);
        apronLong.position.set(0, height - 0.06, -depth * 0.38);
        group.add(apronLong);
        const apronLong2 = apronLong.clone();
        apronLong2.position.z = depth * 0.38;
        group.add(apronLong2);

        // 4 Solid Sturdy Square Tapered Legs
        const legOffsets = [
          [-width * 0.42, -depth * 0.4],
          [width * 0.42, -depth * 0.4],
          [-width * 0.42, depth * 0.4],
          [width * 0.42, depth * 0.4],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.065, height - 0.05, 0.065), woodMat);
          leg.position.set(lx, (height - 0.05) / 2, lz);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case "wooden_chair":
      case "chair": {
        // Classic Solid Wood Dining & Desk Chair
        const seatY = 0.45;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.045, depth * 0.8), woodMat);
        seat.position.set(0, seatY, 0);
        seat.castShadow = true;
        group.add(seat);

        // 4 Solid Turned Legs with H-Stretcher
        const legOffsets = [
          [-width * 0.36, -depth * 0.34],
          [width * 0.36, -depth * 0.34],
          [-width * 0.36, depth * 0.34],
          [width * 0.36, depth * 0.34],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.014, seatY, 16), woodMat);
          leg.position.set(lx, seatY / 2, lz);
          leg.castShadow = true;
          group.add(leg);
        });

        // Curved Ergonomic Backrest with 3 Spindles
        const crest = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.1, 0.035), woodMat);
        crest.position.set(0, height * 0.88, -depth * 0.35);
        crest.castShadow = true;
        group.add(crest);

        [-width * 0.25, 0, width * 0.25].forEach((sx) => {
          const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, height * 0.42), woodMat);
          spindle.position.set(sx, seatY + height * 0.21, -depth * 0.35);
          group.add(spindle);
        });
        break;
      }

      case "wooden_bed":
      case "bed_platform":
      case "bed": {
        // Solid Platform Wood Bed
        const frame = new THREE.Mesh(new THREE.BoxGeometry(width * 1.05, 0.2, depth * 1.03), woodMat);
        frame.position.set(0, 0.12, 0);
        frame.castShadow = true;
        group.add(frame);

        // 4 Low Platform Corner Legs
        [
          [-width * 0.48, -depth * 0.48],
          [width * 0.48, -depth * 0.48],
          [-width * 0.48, depth * 0.48],
          [width * 0.48, depth * 0.48],
        ].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), woodMat);
          leg.position.set(lx, 0.06, lz);
          group.add(leg);
        });

        // Slatted / Wood Headboard
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(width * 1.05, height * 0.9, 0.08), woodMat);
        headboard.position.set(0, height * 0.5, -depth * 0.48);
        headboard.castShadow = true;
        group.add(headboard);

        // Thick Layered Mattress
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.26, depth * 0.92), mainMat);
        mattress.position.set(0, 0.35, -depth * 0.02);
        mattress.castShadow = true;
        group.add(mattress);

        // Folded Duvet Accent Blanket
        const duvet = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.08, depth * 0.5), mainMat);
        duvet.position.set(0, 0.49, depth * 0.2);
        group.add(duvet);

        // Dual Fluffy Pillows
        [-width * 0.24, width * 0.24].forEach((px) => {
          const pillow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, 0.12, depth * 0.22), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }));
          pillow.position.set(px, 0.52, -depth * 0.32);
          group.add(pillow);
        });
        break;
      }

      case "nightstand": {
        // 2-Drawer Minimalist Nightstand
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.8, depth), woodMat);
        body.position.y = height * 0.5;
        body.castShadow = true;
        group.add(body);

        // Brass Pull Handles
        [-height * 0.12, height * 0.15].forEach((hy) => {
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, width * 0.3), brassMat);
          handle.rotation.z = Math.PI / 2;
          handle.position.set(0, height * 0.5 + hy, depth / 2 + 0.015);
          group.add(handle);
        });

        // 4 Slender Legs
        const legOffsets = [
          [-width * 0.42, -depth * 0.42],
          [width * 0.42, -depth * 0.42],
          [-width * 0.42, depth * 0.42],
          [width * 0.42, depth * 0.42],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, height * 0.2), metalMat);
          leg.position.set(lx, height * 0.1, lz);
          group.add(leg);
        });
        break;
      }

      case "sofa_3seat":
      case "sofa": {
        // Modern Tailored 3-Seater Sofa
        const seatY = 0.22;
        const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, depth * 0.9), mainMat);
        base.position.y = seatY / 2 + 0.06;
        base.castShadow = true;
        group.add(base);

        // 3 Distinct Seat Cushions
        const cushionW = (width * 0.88) / 3;
        for (let i = -1; i <= 1; i++) {
          const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(cushionW * 0.96, 0.14, depth * 0.65), mainMat);
          seatCushion.position.set(i * cushionW, seatY + 0.08, depth * 0.06);
          seatCushion.castShadow = true;
          group.add(seatCushion);

          // 3 Backrest Pillows
          const backPillow = new THREE.Mesh(new THREE.BoxGeometry(cushionW * 0.96, height * 0.5, 0.14), mainMat);
          backPillow.position.set(i * cushionW, height * 0.58, -depth * 0.26);
          backPillow.rotation.x = -0.12;
          backPillow.castShadow = true;
          group.add(backPillow);
        }

        // Backrest Frame
        const backFrame = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.62, 0.14), mainMat);
        backFrame.position.set(0, height * 0.52, -depth * 0.38);
        backFrame.castShadow = true;
        group.add(backFrame);

        // Left & Right Armrests
        [-width * 0.46, width * 0.46].forEach((ax) => {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(width * 0.08, height * 0.48, depth * 0.9), mainMat);
          arm.position.set(ax, height * 0.38, 0);
          arm.castShadow = true;
          group.add(arm);
        });

        // 4 Solid Oak Tapered Legs
        const legOffsets = [
          [-width * 0.45, -depth * 0.38],
          [width * 0.45, -depth * 0.38],
          [-width * 0.45, depth * 0.38],
          [width * 0.45, depth * 0.38],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.14, 12), woodMat);
          leg.position.set(lx, 0.07, lz);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case "tv_smart":
      case "tv_oled":
      case "tv_wall":
      case "tv": {
        // High-End OLED / Frame TV with Stand
        const screenW = width;
        const screenH = height * 0.88;
        const screenThick = 0.03;

        // Outer Bezel Frame (Teak Wood or Black Titanium)
        const frame = new THREE.Mesh(new THREE.BoxGeometry(screenW, screenH, screenThick), woodMat);
        frame.position.set(0, height * 0.54, 0);
        frame.castShadow = true;
        group.add(frame);

        // Reflective / Glowing OLED Display Screen
        const screenMat = new THREE.MeshStandardMaterial({
          color: 0x08090a,
          roughness: 0.1,
          metalness: 0.85,
        });
        const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(screenW * 0.96, screenH * 0.94), screenMat);
        screenMesh.position.set(0, height * 0.54, screenThick / 2 + 0.002);
        group.add(screenMesh);

        // Ambient Power Indicator LED
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), ledMat);
        led.position.set(0, height * 0.54 - screenH / 2 + 0.015, screenThick / 2 + 0.004);
        group.add(led);

        // Back Electronic Housing Box
        const backHousing = new THREE.Mesh(new THREE.BoxGeometry(screenW * 0.5, screenH * 0.5, 0.05), metalMat);
        backHousing.position.set(0, height * 0.54, -screenThick / 2 - 0.025);
        group.add(backHousing);

        // Studio Easel / Metal Pedestal Stand
        const standPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, height * 0.35, 0.04), metalMat);
        standPillar.position.set(0, height * 0.18, -0.02);
        standPillar.castShadow = true;
        group.add(standPillar);

        const standBase = new THREE.Mesh(new THREE.BoxGeometry(screenW * 0.45, 0.02, depth * 0.65), metalMat);
        standBase.position.set(0, 0.01, 0);
        standBase.castShadow = true;
        group.add(standBase);
        break;
      }

      case "mattress_memory":
      case "mattress_hybrid":
      case "mattress": {
        // High-Quality Multi-Layer Tufted Mattress
        const coreH = height * 0.8;
        const mainCore = new THREE.Mesh(new THREE.BoxGeometry(width, coreH, depth), mainMat);
        mainCore.position.set(0, coreH / 2, 0);
        mainCore.castShadow = true;
        group.add(mainCore);

        // Plush Pillow-Top Quilted Layer
        const topLayer = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.98, height * 0.2, depth * 0.98),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
        );
        topLayer.position.set(0, coreH + height * 0.1, 0);
        topLayer.castShadow = true;
        group.add(topLayer);

        // Quilted Tuft Accent Ribs
        for (let i = -2; i <= 2; i++) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.015, 0.04), new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.9 }));
          rib.position.set(0, height + 0.005, (i * depth) / 5.5);
          group.add(rib);
        }

        // Taped Border Piping
        const pipingMat = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.5 });
        const pipeTop = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, 0.02, depth * 1.01), pipingMat);
        pipeTop.position.set(0, coreH, 0);
        group.add(pipeTop);
        break;
      }

      case "pillow_throw":
      case "pillow_sleeping":
      case "pillow_lumbar":
      case "pillow": {
        // Fluffy 3D Soft Pillow / Cushion
        const pillowMesh = new THREE.Mesh(
          new THREE.SphereGeometry(Math.min(width, depth) * 0.48, 24, 16),
          mainMat
        );
        pillowMesh.scale.set(width / Math.min(width, depth), height * 1.8, depth / Math.min(width, depth));
        pillowMesh.position.set(0, height / 2, 0);
        pillowMesh.rotation.x = 0.15;
        pillowMesh.castShadow = true;
        group.add(pillowMesh);

        // Seam Piping Rim
        const seam = new THREE.Mesh(new THREE.TorusGeometry(width * 0.44, 0.012, 12, 32), brassMat);
        seam.rotation.x = Math.PI / 2;
        seam.position.set(0, height / 2, 0);
        group.add(seam);
        break;
      }

      case "window_casement":
      case "window_picture":
      case "window_floor":
      case "window": {
        // Architectural 3D Window Frame & Double Glazing
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.4 });
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xdff1fa,
          transparent: true,
          opacity: 0.35,
          roughness: 0.05,
          metalness: 0.1,
          transmission: 0.9,
          ior: 1.52,
        });

        // Outer Structural Window Frame
        const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), frameMat);
        outerFrame.position.set(0, height / 2, 0);
        outerFrame.castShadow = true;
        group.add(outerFrame);

        // Clear Glazing Glass Pane
        const glassPane = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, height * 0.92, 0.02), glassMat);
        glassPane.position.set(0, height / 2, 0);
        group.add(glassPane);

        // Center Vertical Mullion
        const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, height * 0.92, depth * 0.6), frameMat);
        vMullion.position.set(0, height / 2, 0);
        group.add(vMullion);

        // Center Horizontal Transom Bar
        const hMullion = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.04, depth * 0.6), frameMat);
        hMullion.position.set(0, height * 0.6, 0);
        group.add(hMullion);

        // Exterior Bottom Window Sill Ledge
        const sill = new THREE.Mesh(new THREE.BoxGeometry(width * 1.08, 0.05, depth * 1.6), frameMat);
        sill.position.set(0, 0.025, 0.03);
        sill.castShadow = true;
        group.add(sill);
        break;
      }

      case "sofa_curved": {
        // Organic Curved Bouclé Sofa
        const base = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.45, width * 0.48, 0.25, 32, 1, false, 0, Math.PI), mainMat);
        base.rotation.y = Math.PI;
        base.scale.set(1.1, 1, 0.65);
        base.position.set(0, 0.2, 0);
        base.castShadow = true;
        group.add(base);

        const curvedBack = new THREE.Mesh(new THREE.TorusGeometry(width * 0.42, 0.18, 16, 32, Math.PI), mainMat);
        curvedBack.rotation.x = Math.PI / 2;
        curvedBack.rotation.z = Math.PI;
        curvedBack.position.set(0, height * 0.55, -depth * 0.1);
        curvedBack.castShadow = true;
        group.add(curvedBack);
        break;
      }

      case "desk_executive": {
        // Luxury Double Pedestal Executive Desk
        const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, depth), woodMat);
        top.position.set(0, height - 0.025, 0);
        top.castShadow = true;
        group.add(top);

        // Left & Right Drawer Pedestals
        [-width * 0.35, width * 0.35].forEach((px) => {
          const pedestal = new THREE.Mesh(new THREE.BoxGeometry(width * 0.26, height - 0.1, depth * 0.85), woodMat);
          pedestal.position.set(px, (height - 0.1) / 2, 0);
          pedestal.castShadow = true;
          group.add(pedestal);

          // Brass Pull Handles
          for (let dy = -0.15; dy <= 0.15; dy += 0.15) {
            const h = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12), brassMat);
            h.rotation.z = Math.PI / 2;
            h.position.set(px, height * 0.45 + dy, depth * 0.43);
            group.add(h);
          }
        });

        // Modesty Panel
        const panel = new THREE.Mesh(new THREE.BoxGeometry(width * 0.44, height * 0.6, 0.02), woodMat);
        panel.position.set(0, height * 0.45, -depth * 0.38);
        group.add(panel);
        break;
      }

      case "range_oven": {
        // Professional Stainless Steel Cooktop & Oven Range
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.95, depth), metalMat);
        body.position.y = height * 0.48;
        body.castShadow = true;
        group.add(body);

        // Dark Tinted Oven Window
        const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, height * 0.45, 0.02), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 }));
        windowMesh.position.set(0, height * 0.4, depth / 2 + 0.01);
        group.add(windowMesh);

        // Oven Door Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, width * 0.7), metalMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(0, height * 0.68, depth / 2 + 0.04);
        group.add(handle);

        // 4 Cast Iron Cooktop Grates
        const grateMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
        [-width * 0.22, width * 0.22].forEach((gx) => {
          [-depth * 0.22, depth * 0.22].forEach((gz) => {
            const grate = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), grateMat);
            grate.position.set(gx, height + 0.01, gz);
            group.add(grate);
          });
        });
        break;
      }

      case "sink_undermount": {
        // Quartz Basin Counter with Polished Faucet
        const counter = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, depth), marbleMat);
        counter.position.y = height - 0.03;
        counter.castShadow = true;
        group.add(counter);

        // Recessed Basin Look
        const basin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.02, depth * 0.55), metalMat);
        basin.position.set(0, height - 0.01, 0);
        group.add(basin);

        // Arched Gooseneck Faucet
        const neck = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 12, 24, Math.PI), brassMat);
        neck.rotation.y = Math.PI / 2;
        neck.position.set(0, height + 0.22, -depth * 0.25);
        group.add(neck);
        break;
      }

      case "bookshelf":
      case "wardrobe": {
        // High Tall Storage Unit
        const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), woodMat);
        shell.position.y = height / 2;
        shell.castShadow = true;
        group.add(shell);

        // Fluted Vertical Lines
        for (let i = -2; i <= 2; i++) {
          const flute = new THREE.Mesh(new THREE.BoxGeometry(0.01, height * 0.85, 0.01), brassMat);
          flute.position.set((i * width) / 5.5, height / 2, depth / 2 + 0.005);
          group.add(flute);
        }
        break;
      }

      case "mirror_floor": {
        // Arched Full-Length Standing Mirror
        const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.04), brassMat);
        frame.position.y = height / 2;
        frame.castShadow = true;
        group.add(frame);

        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.9, height * 0.92),
          new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05 })
        );
        glass.position.set(0, height / 2, 0.022);
        group.add(glass);
        break;
      }

      case "decorative_vase": {
        // Sculptural Terracotta Vase
        const vase = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.35, width * 0.2, height * 0.85, 24), mainMat);
        vase.position.y = height * 0.425;
        vase.castShadow = true;
        group.add(vase);
        break;
      }

      default: {
        // Smart Name-Based Semantic Archetype Inference for Custom Products
        const nameLow = (product.name || "").toLowerCase();
        const subLow = (product.subcategory || "").toLowerCase();
        const catLow = (product.category || "").toLowerCase();

        if (nameLow.includes("tv") || nameLow.includes("television") || nameLow.includes("screen") || nameLow.includes("oled") || subLow.includes("tv") || catLow.includes("electronics")) {
          // Smart 3D TV Screen
          const screenW = width;
          const screenH = height * 0.88;
          const frame = new THREE.Mesh(new THREE.BoxGeometry(screenW, screenH, 0.03), woodMat);
          frame.position.set(0, height * 0.54, 0);
          frame.castShadow = true;
          group.add(frame);

          const screenMat = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.1, metalness: 0.85 });
          const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(screenW * 0.96, screenH * 0.94), screenMat);
          screenMesh.position.set(0, height * 0.54, 0.017);
          group.add(screenMesh);

          const standPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, height * 0.35, 0.04), metalMat);
          standPillar.position.set(0, height * 0.18, -0.02);
          group.add(standPillar);

          const standBase = new THREE.Mesh(new THREE.BoxGeometry(screenW * 0.45, 0.02, depth * 0.65), metalMat);
          standBase.position.set(0, 0.01, 0);
          group.add(standBase);
        } else if (nameLow.includes("mattress") || nameLow.includes("matteress") || subLow.includes("mattress")) {
          // 3D Mattress Mesh
          const coreH = height * 0.8;
          const mainCore = new THREE.Mesh(new THREE.BoxGeometry(width, coreH, depth), mainMat);
          mainCore.position.set(0, coreH / 2, 0);
          mainCore.castShadow = true;
          group.add(mainCore);

          const topLayer = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, height * 0.2, depth * 0.98), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }));
          topLayer.position.set(0, coreH + height * 0.1, 0);
          group.add(topLayer);
        } else if (nameLow.includes("pillow") || nameLow.includes("cushion") || subLow.includes("pillow") || subLow.includes("cushion")) {
          // 3D Fluffy Pillow Mesh
          const pillowMesh = new THREE.Mesh(new THREE.SphereGeometry(Math.min(width, depth) * 0.48, 24, 16), mainMat);
          pillowMesh.scale.set(width / Math.min(width, depth), height * 1.8, depth / Math.min(width, depth));
          pillowMesh.position.set(0, height / 2, 0);
          pillowMesh.rotation.x = 0.15;
          pillowMesh.castShadow = true;
          group.add(pillowMesh);
        } else if (nameLow.includes("window") || nameLow.includes("glazing") || subLow.includes("window") || catLow.includes("window")) {
          // 3D Architectural Window
          const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.4 });
          const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xdff1fa, transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0.9 });
          const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), frameMat);
          outerFrame.position.set(0, height / 2, 0);
          group.add(outerFrame);

          const glassPane = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, height * 0.92, 0.02), glassMat);
          glassPane.position.set(0, height / 2, 0);
          group.add(glassPane);
        } else if (nameLow.includes("round") && (nameLow.includes("table") || subLow.includes("table"))) {
          // Round Pedestal Table
          const rad = Math.min(width, depth) / 2;
          const top = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.045, 36), woodMat);
          top.position.y = height - 0.0225;
          top.castShadow = true;
          top.receiveShadow = true;
          group.add(top);

          const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.25, rad * 0.32, height - 0.08, 24), woodMat);
          pedestal.position.y = (height - 0.08) / 2 + 0.04;
          pedestal.castShadow = true;
          group.add(pedestal);

          const baseDisk = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.65, rad * 0.7, 0.04, 32), woodMat);
          baseDisk.position.y = 0.02;
          group.add(baseDisk);
        } else if (nameLow.includes("bed") || subLow.includes("bed") || catLow.includes("bedroom")) {
          // Wooden / Platform Bed
          const frame = new THREE.Mesh(new THREE.BoxGeometry(width * 1.05, 0.2, depth * 1.03), woodMat);
          frame.position.set(0, 0.12, 0);
          frame.castShadow = true;
          group.add(frame);

          const headboard = new THREE.Mesh(new THREE.BoxGeometry(width * 1.05, height * 0.9, 0.08), woodMat);
          headboard.position.set(0, height * 0.5, -depth * 0.48);
          headboard.castShadow = true;
          group.add(headboard);

          const mattress = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.26, depth * 0.92), mainMat);
          mattress.position.set(0, 0.35, -depth * 0.02);
          mattress.castShadow = true;
          group.add(mattress);

          const duvet = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.08, depth * 0.5), mainMat);
          duvet.position.set(0, 0.49, depth * 0.2);
          group.add(duvet);

          [-width * 0.24, width * 0.24].forEach((px) => {
            const pillow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, 0.12, depth * 0.22), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }));
            pillow.position.set(px, 0.52, -depth * 0.32);
            group.add(pillow);
          });
        } else if (nameLow.includes("chair") || nameLow.includes("seat") || nameLow.includes("stool") || subLow.includes("chair")) {
          // Solid Wood / Upholstered Chair
          const seatY = Math.min(0.48, height * 0.55);
          const seat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.05, depth * 0.8), mainMat);
          seat.position.set(0, seatY, 0);
          seat.castShadow = true;
          group.add(seat);

          const backrest = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, height * 0.45, 0.05), woodMat);
          backrest.position.set(0, height * 0.72, -depth * 0.35);
          backrest.castShadow = true;
          group.add(backrest);

          const legOffsets = [
            [-width * 0.36, -depth * 0.34],
            [width * 0.36, -depth * 0.34],
            [-width * 0.36, depth * 0.34],
            [width * 0.36, depth * 0.34],
          ];
          legOffsets.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, seatY, 14), woodMat);
            leg.position.set(lx, seatY / 2, lz);
            leg.castShadow = true;
            group.add(leg);
          });
        } else if (nameLow.includes("table") || nameLow.includes("desk") || subLow.includes("table") || subLow.includes("desk")) {
          // Timber Table / Desk
          const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, depth), woodMat);
          top.position.set(0, height - 0.0225, 0);
          top.castShadow = true;
          top.receiveShadow = true;
          group.add(top);

          const legOffsets = [
            [-width * 0.44, -depth * 0.42],
            [width * 0.44, -depth * 0.42],
            [-width * 0.44, depth * 0.42],
            [width * 0.44, depth * 0.42],
          ];
          legOffsets.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.055, height - 0.045, 0.055), woodMat);
            leg.position.set(lx, (height - 0.045) / 2, lz);
            leg.castShadow = true;
            group.add(leg);
          });
        } else if (nameLow.includes("sofa") || nameLow.includes("couch") || nameLow.includes("sectional") || subLow.includes("sofa")) {
          // Comfortable Modern Sofa
          const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, depth * 0.85), mainMat);
          base.position.y = 0.2;
          base.castShadow = true;
          group.add(base);

          const back = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.6, 0.18), mainMat);
          back.position.set(0, height * 0.52, -depth * 0.35);
          back.castShadow = true;
          group.add(back);

          [-width * 0.46, width * 0.46].forEach((ax) => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, height * 0.48, depth * 0.85), mainMat);
            arm.position.set(ax, height * 0.38, 0);
            arm.castShadow = true;
            group.add(arm);
          });
        } else {
          // Elegant Architectural Block
          const fallback = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mainMat);
          fallback.position.y = height / 2;
          fallback.castShadow = true;
          fallback.receiveShadow = true;
          group.add(fallback);
        }
        break;
      }
    }

    return group;
  };

  // ----------------------------------------------------
  // HTML5 Drag & Drop Handlers from Catalog onto 3D Scene
  // ----------------------------------------------------
  const get3DWorldCoordsFromEvent = (e: React.DragEvent | React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current) return { x: 0, z: 0 };
    const rect = container.getBoundingClientRect();
    const mX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(mX, mY), cameraRef.current);
    const intersect = new THREE.Vector3();
    if (ray.ray.intersectPlane(dragPlaneRef.current, intersect)) {
      const clampX = Math.max(-roomSettings.width / 2 + 0.3, Math.min(roomSettings.width / 2 - 0.3, intersect.x));
      const clampZ = Math.max(-roomSettings.length / 2 + 0.3, Math.min(roomSettings.length / 2 - 0.3, intersect.z));
      return { x: clampX, z: clampZ };
    }
    return { x: 0, z: 0 };
  };

  const handle3DDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const coords = get3DWorldCoordsFromEvent(e);
    if (dropHelperRef.current) {
      dropHelperRef.current.position.set(coords.x, 0.02, coords.z);
      dropHelperRef.current.visible = true;
    }
    if (!is3DDraggingOver) {
      setIs3DDraggingOver(true);
    }
  };

  const handle3DDragLeave = () => {
    if (dropHelperRef.current) {
      dropHelperRef.current.visible = false;
    }
    setIs3DDraggingOver(false);
  };

  const handle3DDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIs3DDraggingOver(false);
    if (dropHelperRef.current) {
      dropHelperRef.current.visible = false;
    }
    const coords = get3DWorldCoordsFromEvent(e);

    // 1. Check Product Drop
    const productDataStr = e.dataTransfer.getData("application/homely-product");
    if (productDataStr && onSpawnProduct) {
      try {
        const data = JSON.parse(productDataStr);
        onSpawnProduct(data.productId, coords.x, coords.z);
        const prod = getProductById(data.productId);
        show3DToast(`🛋️ Placed "${prod?.name || "Custom Item"}" in 3D room`);
        return;
      } catch (err) {
        console.error("3D Product drop error", err);
      }
    }

    // 2. Check Floor Material Drop
    const floorDataStr = e.dataTransfer.getData("application/homely-floor");
    if (floorDataStr && onUpdateRoomSettings) {
      try {
        const data = JSON.parse(floorDataStr);
        onUpdateRoomSettings({
          floorType: data.floorType,
          floorColor: data.floorColor || roomSettings.floorColor,
        });
        show3DToast(`✨ Applied Flooring: ${data.name || data.floorType}`);
        return;
      } catch (err) {
        console.error("3D Floor drop error", err);
      }
    }

    // 3. Check Wall Material Drop
    const wallDataStr = e.dataTransfer.getData("application/homely-wall-material");
    if (wallDataStr && onUpdateRoomSettings) {
      try {
        const data = JSON.parse(wallDataStr);
        onUpdateRoomSettings({
          wallFinish: data.finish,
          wallColor: data.color || roomSettings.wallColor,
        });
        show3DToast(`🧱 Wall Finish Applied: ${data.name || data.finish}`);
        return;
      } catch (err) {
        console.error("3D Wall drop error", err);
      }
    }

    // 4. Check Door / Window Opening Drop
    const openingDataStr = e.dataTransfer.getData("application/homely-opening");
    if (openingDataStr && onAddOpening) {
      try {
        const data = JSON.parse(openingDataStr);
        const roomW = roomSettings.width;
        const roomL = roomSettings.length;
        const distNorth = Math.abs(coords.z - -roomL / 2);
        const distSouth = Math.abs(coords.z - roomL / 2);
        const distWest = Math.abs(coords.x - -roomW / 2);
        const distEast = Math.abs(coords.x - roomW / 2);
        const minDist = Math.min(distNorth, distSouth, distWest, distEast);

        let targetWall = "south";
        let wallPos = 0.5;

        if (minDist === distNorth) {
          targetWall = "north";
          wallPos = (coords.x - -roomW / 2) / roomW;
        } else if (minDist === distSouth) {
          targetWall = "south";
          wallPos = (coords.x - -roomW / 2) / roomW;
        } else if (minDist === distWest) {
          targetWall = "west";
          wallPos = (coords.z - -roomL / 2) / roomL;
        } else {
          targetWall = "east";
          wallPos = (coords.z - -roomL / 2) / roomL;
        }

        wallPos = Math.max(0.1, Math.min(0.9, Math.round(wallPos * 20) / 20));

        onAddOpening({
          id: `op-${Date.now()}`,
          wall: targetWall,
          position: wallPos,
          width: data.width || 0.9,
          height: data.height || 2.1,
          elevation: data.elevation || 0,
          type: data.type || "door",
          label: data.name || "Architectural Opening",
          swingDirection: "inward_left",
        });

        show3DToast(`🚪 Added ${data.name || "Door"} to ${targetWall.toUpperCase()} Wall`);
        return;
      } catch (err) {
        console.error("3D Opening drop error", err);
      }
    }
  };

  // Mouse Interaction: Click to Select, Drag to Move, Orbit / Pan View
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    orbitStateRef.current.prevMouseX = e.clientX;
    orbitStateRef.current.prevMouseY = e.clientY;

    if (e.button === 0) {
      // Left click: Raycast against furniture meshes
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(meshesGroupRef.current?.children || [], true);

      if (intersects.length > 0) {
        // Find top-level instance group
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && hitObj.parent !== meshesGroupRef.current) {
          hitObj = hitObj.parent;
        }

        if (hitObj && hitObj.userData?.instanceId) {
          const instId = hitObj.userData.instanceId;
          onSelectItem(instId);
          isDraggingRef.current = true;
          activeDraggedInstanceRef.current = instId;
          container.style.cursor = "grabbing";

          // Set the horizontal drag plane at the exact object height
          dragPlaneRef.current.constant = -(hitObj.position.y);

          // Calculate drag intersection point
          const intersectionPoint = new THREE.Vector3();
          raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectionPoint);
          dragOffsetRef.current.copy(hitObj.position).sub(intersectionPoint);
          return;
        }
      } else {
        // Clicked on empty floor -> Deselect and allow orbit rotation
        onSelectItem(null);
        orbitStateRef.current.isOrbiting = true;
      }
    } else if (e.button === 1 || e.button === 2) {
      // Middle or right click -> Pan
      orbitStateRef.current.isPanning = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Handle Item Dragging
    if (isDraggingRef.current && activeDraggedInstanceRef.current) {
      container.style.cursor = "grabbing";
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersectionPoint = new THREE.Vector3();
      if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectionPoint)) {
        const newX = Math.round((intersectionPoint.x + dragOffsetRef.current.x) * 20) / 20;
        const newY = Math.round((intersectionPoint.z + dragOffsetRef.current.z) * 20) / 20;

        // Clamp inside room boundaries
        const clampX = Math.max(-roomSettings.width / 2 + 0.3, Math.min(roomSettings.width / 2 - 0.3, newX));
        const clampY = Math.max(-roomSettings.length / 2 + 0.3, Math.min(roomSettings.length / 2 - 0.3, newY));

        onUpdateItemPosition(activeDraggedInstanceRef.current, clampX, clampY, true);

        // Auto surface snapping while dragging elevated items (e.g. pillow, mattress, lamp, vase, laptop)
        const draggedPlaced = placedItems.find((p) => p.instanceId === activeDraggedInstanceRef.current);
        if (draggedPlaced && onUpdateItemElevation) {
          const draggedProd = getProductById(draggedPlaced.productId);
          if (draggedProd && isElevatedItemType(draggedProd)) {
            const hostBeneath = detectSurfaceBeneath(
              clampX,
              clampY,
              draggedProd,
              placedItems,
              activeDraggedInstanceRef.current
            );
            if (hostBeneath) {
              onUpdateItemElevation(activeDraggedInstanceRef.current, hostBeneath.surfaceElevation);
            }
          }
        }
      }
      return;
    }

    // Handle Camera Orbit
    if (orbitStateRef.current.isOrbiting) {
      const deltaX = e.clientX - orbitStateRef.current.prevMouseX;
      const deltaY = e.clientY - orbitStateRef.current.prevMouseY;

      orbitStateRef.current.theta -= deltaX * 0.008;
      orbitStateRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2.05, orbitStateRef.current.phi - deltaY * 0.008));

      orbitStateRef.current.prevMouseX = e.clientX;
      orbitStateRef.current.prevMouseY = e.clientY;
      updateCameraPosition();
      return;
    }

    // Handle Camera Pan
    if (orbitStateRef.current.isPanning) {
      const deltaX = e.clientX - orbitStateRef.current.prevMouseX;
      const deltaY = e.clientY - orbitStateRef.current.prevMouseY;

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraRef.current.quaternion);

      orbitStateRef.current.target.addScaledVector(right, -deltaX * 0.01);
      orbitStateRef.current.target.addScaledVector(up, deltaY * 0.01);

      orbitStateRef.current.prevMouseX = e.clientX;
      orbitStateRef.current.prevMouseY = e.clientY;
      updateCameraPosition();
      return;
    }

    // Hover tooltip
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(meshesGroupRef.current?.children || [], true);
    if (intersects.length > 0) {
      let hitObj: THREE.Object3D | null = intersects[0].object;
      while (hitObj && hitObj.parent !== meshesGroupRef.current) {
        hitObj = hitObj.parent;
      }
      if (hitObj && hitObj.userData?.productName) {
        setHoveredInfo({
          name: hitObj.userData.productName,
          brand: hitObj.userData.brand,
          dims: hitObj.userData.dimensions,
        });
        container.style.cursor = "pointer";
        return;
      }
    }
    setHoveredInfo(null);
    container.style.cursor = "default";
  };

  const handleMouseUp = () => {
    if (containerRef.current) {
      containerRef.current.style.cursor = "default";
    }
    isDraggingRef.current = false;
    activeDraggedInstanceRef.current = null;
    orbitStateRef.current.isOrbiting = false;
    orbitStateRef.current.isPanning = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.003;
    orbitStateRef.current.radius = Math.max(3, Math.min(25, orbitStateRef.current.radius + e.deltaY * zoomSpeed));
    updateCameraPosition();
  };

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={handle3DDragOver}
      onDragLeave={handle3DDragLeave}
      onDrop={handle3DDrop}
    >
      {/* Three.js Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* 3D Drag Over Visual Prompt */}
      {is3DDraggingOver && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 bg-indigo-600/90 text-white text-xs font-semibold rounded-full backdrop-blur-md shadow-2xl border border-indigo-400/50 flex items-center gap-2 animate-bounce">
          <Move className="w-3.5 h-3.5" />
          <span>Release to place item at 3D cursor position</span>
        </div>
      )}

      {/* Toast Notification for 3D Actions */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 bg-[#121212]/95 text-white text-xs font-medium rounded-xl backdrop-blur-md border border-[#333] shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Digital Twin Active Indicator Pill */}
      {isDigitalTwin && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#121212]/90 border border-[#2D2D2D] text-white rounded-lg text-xs font-semibold backdrop-blur-md shadow-lg">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Digital Twin Active</span>
        </div>
      )}

      {/* Hover Object Information Tooltip */}
      {hoveredInfo && !isDraggingRef.current && (
        <div className="absolute bottom-6 left-6 z-20 pointer-events-none bg-[#121212]/90 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-md border border-[#2D2D2D] shadow-xl flex flex-col gap-0.5 animate-fadeIn">
          <span className="font-semibold text-white">{hoveredInfo.name}</span>
          <div className="flex items-center gap-2 text-[#888] text-[11px]">
            <span className="text-indigo-400 font-medium">{hoveredInfo.brand}</span>
            <span>•</span>
            <span className="text-[#E5E5E5] font-mono">{hoveredInfo.dims}</span>
          </div>
        </div>
      )}

      {/* Floating 3D Gizmo Controls when Item is Selected */}
      {selectedItem && selectedProduct && (() => {
        const detectedHost = detectSurfaceBeneath(
          selectedItem.x,
          selectedItem.y,
          selectedProduct,
          placedItems,
          selectedItem.instanceId
        );
        const itemZ = selectedItem.z || 0;

        return (
          <div className="absolute top-4 right-4 z-20 bg-[#121212] text-[#E5E5E5] p-3 rounded-xl shadow-2xl border border-[#2D2D2D] backdrop-blur-lg flex flex-col gap-3 min-w-[260px] max-w-[290px]">
            <div className="flex items-center justify-between border-b border-[#2D2D2D] pb-2">
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[160px]">{selectedProduct.name}</p>
                <p className="text-[11px] text-indigo-400 font-medium">{selectedProduct.brand}</p>
              </div>
              <div className="flex items-center gap-1">
                {onDuplicateItem && (
                  <button
                    onClick={() => {
                      onDuplicateItem(selectedItem.instanceId);
                      show3DToast(`Duplicated "${selectedProduct.name}"`);
                    }}
                    className="p-1 text-[#888] hover:text-indigo-400 hover:bg-[#1A1A1A] rounded transition-colors"
                    title="Duplicate item"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onRemoveItem(selectedItem.instanceId)}
                  className="p-1 text-[#888] hover:text-red-400 hover:bg-[#1A1A1A] rounded transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Vertical Elevation & Surface Stacking */}
            <div className="space-y-2 border-b border-[#2D2D2D] pb-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#888]">
                <span className="flex items-center gap-1 font-medium text-white">
                  <ArrowUpDown className="w-3 h-3 text-indigo-400" /> Vertical Elevation
                </span>
                <span className="font-mono text-indigo-400 font-bold text-xs">
                  +{Math.round(itemZ * 100)} cm
                </span>
              </div>

              {/* Surface host indicator & snap */}
              <div className="p-1.5 rounded-lg bg-[#181818] border border-[#2A2A2A] text-[10px] flex items-center justify-between gap-1.5">
                {detectedHost ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate" title={`Over: ${detectedHost.surfaceDescription}`}>
                      Over: {detectedHost.surfaceDescription} (+{Math.round(detectedHost.surfaceElevation * 100)}cm)
                    </span>
                  </div>
                ) : itemZ > 0.05 ? (
                  <div className="flex items-center gap-1.5 text-indigo-300 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="truncate">Elevated (+{Math.round(itemZ * 100)}cm)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[#888] truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#555] shrink-0" />
                    <span className="truncate">Rested on Floor (0cm)</span>
                  </div>
                )}

                {detectedHost && onSnapItemToSurface && (
                  <button
                    onClick={() => {
                      onSnapItemToSurface(selectedItem.instanceId);
                      show3DToast(`✨ Snapped to ${detectedHost.surfaceDescription}`);
                    }}
                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px] whitespace-nowrap transition-all shadow-sm shrink-0"
                    title="Snap to exact top surface"
                  >
                    Snap
                  </button>
                )}
              </div>

              {/* Quick Lift / Drop Buttons */}
              {onUpdateItemElevation && (
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => {
                      const newZ = Math.min(roomSettings.height || 3.0, itemZ + 0.1);
                      onUpdateItemElevation(selectedItem.instanceId, newZ);
                    }}
                    className="py-1 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[10px] rounded font-semibold text-[#CCC] hover:text-white border border-[#2D2D2D] flex items-center justify-center gap-0.5 transition-colors"
                    title="Lift up +10cm"
                  >
                    <ArrowUp className="w-2.5 h-2.5 text-indigo-400" /> +10cm
                  </button>
                  <button
                    onClick={() => {
                      const newZ = Math.min(roomSettings.height || 3.0, itemZ + 0.25);
                      onUpdateItemElevation(selectedItem.instanceId, newZ);
                    }}
                    className="py-1 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[10px] rounded font-semibold text-[#CCC] hover:text-white border border-[#2D2D2D] flex items-center justify-center gap-0.5 transition-colors"
                    title="Lift up +25cm"
                  >
                    <ArrowUp className="w-2.5 h-2.5 text-indigo-400" /> +25cm
                  </button>
                  <button
                    onClick={() => {
                      const newZ = Math.max(0, itemZ - 0.1);
                      onUpdateItemElevation(selectedItem.instanceId, newZ);
                    }}
                    className="py-1 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[10px] rounded font-semibold text-[#CCC] hover:text-white border border-[#2D2D2D] flex items-center justify-center gap-0.5 transition-colors"
                    title="Drop down -10cm"
                  >
                    <ArrowDown className="w-2.5 h-2.5 text-amber-400" /> -10cm
                  </button>
                  <button
                    onClick={() => {
                      if (onDropItemToFloor) {
                        onDropItemToFloor(selectedItem.instanceId);
                        show3DToast("Dropped to Ground Floor (0cm)");
                      } else {
                        onUpdateItemElevation(selectedItem.instanceId, 0);
                      }
                    }}
                    className="py-1 px-1 bg-[#1A1A1A] hover:bg-[#242424] text-[10px] rounded font-semibold text-[#CCC] hover:text-white border border-[#2D2D2D] flex items-center justify-center gap-0.5 transition-colors"
                    title="Snap to floor (0cm)"
                  >
                    <Anchor className="w-2.5 h-2.5 text-[#888]" /> Floor
                  </button>
                </div>
              )}

              {/* Elevation Range Slider */}
              {onUpdateItemElevation && (
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="0"
                    max={roomSettings.height || 3.0}
                    step="0.02"
                    value={itemZ}
                    onChange={(e) => onUpdateItemElevation(selectedItem.instanceId, Number(e.target.value))}
                    className="w-full h-1 bg-[#2D2D2D] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[9px] text-[#666] font-mono">
                    <span>Floor (0.0m)</span>
                    <span>1.5m</span>
                    <span>{(roomSettings.height || 3.0).toFixed(1)}m</span>
                  </div>
                </div>
              )}
            </div>

            {/* Color & Material Customizer */}
            {onUpdateItemColor && (
              <div className="space-y-1.5 border-b border-[#2D2D2D] pb-2">
                <div className="flex items-center justify-between text-[11px] text-[#888]">
                  <span className="flex items-center gap-1 font-medium text-white">
                    <Palette className="w-3 h-3 text-indigo-400" /> Color & Finish
                  </span>
                  <span
                    className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: selectedItem.colorOverride || selectedProduct.colorHex }}
                  />
                </div>

                {/* Swatch Quick Grid */}
                <div className="grid grid-cols-8 gap-1">
                  {POPULAR_COLOR_PALETTES.map((pal) => {
                    const isCur =
                      (selectedItem.colorOverride || selectedProduct.colorHex).toLowerCase() ===
                      pal.hex.toLowerCase();
                    return (
                      <button
                        key={pal.name}
                        onClick={() => onUpdateItemColor(selectedItem.instanceId, pal.hex, pal.name)}
                        className={`w-5 h-5 rounded-full border transition-transform hover:scale-115 flex items-center justify-center ${
                          isCur ? "border-indigo-400 ring-2 ring-indigo-500/40 scale-110" : "border-[#3D3D3D]"
                        }`}
                        style={{ backgroundColor: pal.hex }}
                        title={`${pal.name} (${pal.materialType})`}
                      >
                        {isCur && <Check className="w-2.5 h-2.5 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="color"
                    value={selectedItem.colorOverride || selectedProduct.colorHex}
                    onChange={(e) => onUpdateItemColor(selectedItem.instanceId, e.target.value, "Custom Color")}
                    className="w-5 h-5 rounded cursor-pointer border border-[#2D2D2D] bg-transparent p-0"
                  />
                  <span className="text-[10px] text-[#888] font-mono">
                    Custom: {selectedItem.colorOverride || selectedProduct.colorHex}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Rotation Buttons & Slider */}
            <div className="space-y-1.5 border-b border-[#2D2D2D] pb-2">
              <div className="flex items-center justify-between text-[11px] text-[#888]">
                <span className="flex items-center gap-1 font-medium">
                  <RotateCw className="w-3 h-3 text-indigo-400" /> Rotation
                </span>
                <span className="font-mono text-indigo-400 font-semibold">{selectedItem.rotation}°</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateItemRotation(selectedItem.instanceId, (selectedItem.rotation - 45 + 360) % 360)}
                  className="flex-1 py-1 px-2 bg-[#1A1A1A] hover:bg-[#242424] text-[11px] rounded font-medium text-[#888] hover:text-white border border-[#2D2D2D] transition-colors"
                >
                  -45°
                </button>
                <button
                  onClick={() => onUpdateItemRotation(selectedItem.instanceId, (selectedItem.rotation + 45) % 360)}
                  className="flex-1 py-1 px-2 bg-[#1A1A1A] hover:bg-[#242424] text-[11px] rounded font-medium text-[#888] hover:text-white border border-[#2D2D2D] transition-colors"
                >
                  +45°
                </button>
                <button
                  onClick={() => onUpdateItemRotation(selectedItem.instanceId, (selectedItem.rotation + 90) % 360)}
                  className="flex-1 py-1 px-2 bg-[#1A1A1A] hover:bg-[#242424] text-[11px] rounded font-medium text-[#888] hover:text-white border border-[#2D2D2D] transition-colors"
                >
                  +90°
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={selectedItem.rotation}
                onChange={(e) => onUpdateItemRotation(selectedItem.instanceId, Number(e.target.value))}
                className="w-full h-1 bg-[#2D2D2D] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Dimensions Callout Badge */}
            <div className="bg-[#1A1A1A] px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between border border-[#2D2D2D]">
              <span className="text-[#888]">Dimensions</span>
              <span className="text-white font-mono font-medium">
                {Math.round(selectedProduct.dimensions.width * 100)} × {Math.round(selectedProduct.dimensions.depth * 100)} × {Math.round(selectedProduct.dimensions.height * 100)} cm
              </span>
            </div>
          </div>
        );
      })()}

      {/* Camera Instructions Hint Bar */}
      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-3 bg-[#121212]/90 text-[#888] text-[10px] px-3 py-1.5 rounded-lg backdrop-blur-md border border-[#2D2D2D] pointer-events-none">
        <span className="flex items-center gap-1 text-[#E5E5E5]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Drag item: Move in 3D
        </span>
        <span className="text-[#444]">|</span>
        <span>Left Drag Floor: Orbit</span>
        <span className="text-[#444]">|</span>
        <span>Right Drag: Pan</span>
        <span className="text-[#444]">|</span>
        <span>Scroll: Zoom</span>
      </div>
    </div>
  );
};
