import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ZoneStatus } from '../../types';

interface HydraulicMachineProps {
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
  zoneStatuses?: Record<string, ZoneStatus>;
}

interface ZoneTagInfo {
  id: string;
  name: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  status?: ZoneStatus;
  isSelected: boolean;
}

const ZONE_CONFIG = [
  { id: 'ZONE-01', name: 'Oil Reservoir', anchor: new THREE.Vector3(-3.2, 1.2, 0) },
  { id: 'ZONE-02', name: 'Hydraulic Pump & Motor', anchor: new THREE.Vector3(-1.2, 1.0, 0) },
  { id: 'ZONE-03', name: 'Pressure Pipeline & Manifold', anchor: new THREE.Vector3(-0.1, 1.6, 0) },
  { id: 'ZONE-04', name: 'Control Valve Block', anchor: new THREE.Vector3(1.1, 1.4, 0) },
  { id: 'ZONE-05', name: 'Hydraulic Cylinder & Ram', anchor: new THREE.Vector3(2.4, 2.4, 0) },
  { id: 'ZONE-06', name: 'Return Pipeline & Filter', anchor: new THREE.Vector3(-0.9, 0.9, 0.7) },
];

export const HydraulicMachine3D: React.FC<HydraulicMachineProps> = ({
  selectedZoneId = 'ZONE-03',
  onSelectZone = () => {},
  zoneStatuses = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [zoneTags, setZoneTags] = useState<ZoneTagInfo[]>([]);

  // Ref to hold dynamic materials so we can update highlight & alarm colors
  const zoneMaterialsRef = useRef<Record<string, THREE.MeshStandardMaterial[]>>({});
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F4F6F8');

    // 2. Camera setup - Isometric industrial perspective
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(2.5, 4.2, 7.8);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 2.5;
    controls.maxDistance = 16.0;
    controls.target.set(0.2, 0.3, 0);
    controlsRef.current = controls;

    // 5. Engineering Studio Lighting (Multi-point illumination with soft contact shadows)
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.4);
    keyLight.position.set(12, 18, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9BBBD8, 0.6);
    fillLight.position.set(-12, 10, -6);
    scene.add(fillLight);

    const underLight = new THREE.DirectionalLight(0xD0D7DE, 0.35);
    underLight.position.set(0, -10, 0);
    scene.add(underLight);

    // 6. CAD Floor Grid
    const gridHelper = new THREE.GridHelper(16, 32, 0xADB5BD, 0xDEE2E6);
    gridHelper.position.y = -1.6;
    scene.add(gridHelper);

    // Dynamic Zone Meshes and Materials Registry
    const zoneMeshes: { mesh: THREE.Mesh; zoneId: string }[] = [];
    zoneMaterialsRef.current = {
      'ZONE-01': [],
      'ZONE-02': [],
      'ZONE-03': [],
      'ZONE-04': [],
      'ZONE-05': [],
      'ZONE-06': [],
    };

    const registerMesh = (mesh: THREE.Mesh, zoneId: string) => {
      mesh.userData = { zoneId };
      zoneMeshes.push({ mesh, zoneId });
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        zoneMaterialsRef.current[zoneId].push(mesh.material);
      }
    };

    // Shared Palette Materials
    const castIronMat = new THREE.MeshStandardMaterial({ color: 0x243B53, metalness: 0.75, roughness: 0.35 });
    const machineSteelMat = new THREE.MeshStandardMaterial({ color: 0x495057, metalness: 0.8, roughness: 0.3 });
    const chromeRamMat = new THREE.MeshStandardMaterial({ color: 0xF8F9FA, metalness: 0.98, roughness: 0.05 });
    const brassFittingMat = new THREE.MeshStandardMaterial({ color: 0xC8963E, metalness: 0.9, roughness: 0.25 });
    const rubberHoseMat = new THREE.MeshStandardMaterial({ color: 0x1A1D20, roughness: 0.9, metalness: 0.1 });
    const darkSkidMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.85, roughness: 0.4 });

    // =========================================================================
    // COMPONENT 14 & 1: 500-TON PRESS STRUCTURAL FRAME & HEAVY SKID BASE
    // =========================================================================
    const pressFrameGroup = new THREE.Group();

    // 14. Heavy Base Skid Plate
    const skidGeom = new THREE.BoxGeometry(9.2, 0.24, 3.8);
    const skidMesh = new THREE.Mesh(skidGeom, darkSkidMat);
    skidMesh.position.set(0, -1.48, 0);
    skidMesh.receiveShadow = true;
    pressFrameGroup.add(skidMesh);

    // Skid Vibration Damping Isolators (8 Heavy Polyurethane Mounts)
    const isolatorGeom = new THREE.CylinderGeometry(0.18, 0.2, 0.14, 16);
    const isolatorMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.95 });
    [-4.0, -1.8, 1.8, 4.0].forEach((x) => {
      [1.5, -1.5].forEach((z) => {
        const iso = new THREE.Mesh(isolatorGeom, isolatorMat);
        iso.position.set(x, -1.55, z);
        pressFrameGroup.add(iso);
      });
    });

    // 1. Four Heavy-Duty Forged Steel Columns / Tie Rods (Press Architecture)
    const tieRodGeom = new THREE.CylinderGeometry(0.15, 0.15, 4.2, 24);
    const tieRodMat = new THREE.MeshStandardMaterial({ color: 0x64748B, metalness: 0.88, roughness: 0.2 });
    const columnOffsets = [
      [1.5, 0.5, 1.1],
      [3.3, 0.5, 1.1],
      [1.5, 0.5, -1.1],
      [3.3, 0.5, -1.1]
    ];
    columnOffsets.forEach(([cx, cy, cz]) => {
      const col = new THREE.Mesh(tieRodGeom, tieRodMat);
      col.position.set(cx, cy, cz);
      col.castShadow = true;
      pressFrameGroup.add(col);

      // Prestressed Locknuts Top and Bottom
      const nutGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 6);
      const nutTop = new THREE.Mesh(nutGeom, machineSteelMat);
      nutTop.position.set(cx, 2.65, cz);
      pressFrameGroup.add(nutTop);

      const nutBot = new THREE.Mesh(nutGeom, machineSteelMat);
      nutBot.position.set(cx, -1.35, cz);
      pressFrameGroup.add(nutBot);
    });

    // 1. Heavy Top Crown (Architrave) linking the 4 Columns
    const crownGeom = new THREE.BoxGeometry(2.4, 0.55, 2.8);
    const crownMesh = new THREE.Mesh(crownGeom, castIronMat);
    crownMesh.position.set(2.4, 2.5, 0);
    crownMesh.castShadow = true;
    pressFrameGroup.add(crownMesh);

    // 4. Lower Bed Bolster Platen with T-Slots
    const lowerBedGeom = new THREE.BoxGeometry(2.3, 0.45, 2.6);
    const lowerBedMesh = new THREE.Mesh(lowerBedGeom, machineSteelMat);
    lowerBedMesh.position.set(2.4, -1.15, 0);
    lowerBedMesh.receiveShadow = true;
    pressFrameGroup.add(lowerBedMesh);

    // 4. Moving Upper Slide Platen (Guided on 4 Columns)
    const slidePlatenGeom = new THREE.BoxGeometry(2.1, 0.4, 2.4);
    const slidePlatenMesh = new THREE.Mesh(slidePlatenGeom, machineSteelMat);
    slidePlatenMesh.position.set(2.4, 0.4, 0);
    slidePlatenMesh.castShadow = true;
    pressFrameGroup.add(slidePlatenMesh);

    // 15. HMI Operator Control Console Pedestal
    const hmiPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1.4, 16),
      machineSteelMat
    );
    hmiPedestal.position.set(4.3, -0.65, 1.2);
    pressFrameGroup.add(hmiPedestal);

    const hmiBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 })
    );
    hmiBox.position.set(4.3, 0.15, 1.2);
    hmiBox.rotation.y = -Math.PI / 6;
    pressFrameGroup.add(hmiBox);

    // HMI Glass Touch Screen Face
    const hmiScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x0EA5E9, emissive: 0x0369A1, emissiveIntensity: 0.5 })
    );
    hmiScreen.position.set(4.3, 0.15, 1.3);
    hmiScreen.rotation.y = -Math.PI / 6;
    pressFrameGroup.add(hmiScreen);

    // Emergency Stop Mushroom Button
    const estop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0xDC2626 })
    );
    estop.rotation.x = Math.PI / 2;
    estop.position.set(4.3, -0.05, 1.32);
    pressFrameGroup.add(estop);

    scene.add(pressFrameGroup);

    // =========================================================================
    // ZONE-01: HYDRAULIC OIL RESERVOIR & POWER PACK UNIT
    // =========================================================================
    const reservoirGroup = new THREE.Group();
    reservoirGroup.position.set(-3.2, -0.6, 0);

    const resTankMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.35 });
    const tankBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.45, 2.4), resTankMat);
    tankBody.castShadow = true;
    tankBody.receiveShadow = true;
    reservoirGroup.add(tankBody);
    registerMesh(tankBody, 'ZONE-01');

    // Structural Stiffener Baffle Flanges on Tank
    [-0.7, 0.7].forEach((z) => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.06, 0.06), machineSteelMat);
      rib.position.set(0, 0, z);
      reservoirGroup.add(rib);
    });

    // Oil Sight Level Gauge with Min/Max Markers
    const sightGlassMat = new THREE.MeshStandardMaterial({ color: 0x93C5FD, transparent: true, opacity: 0.85, metalness: 0.5 });
    const sightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.18), sightGlassMat);
    sightGlass.position.set(1.02, 0, 0.5);
    reservoirGroup.add(sightGlass);
    registerMesh(sightGlass, 'ZONE-01');

    // Reservoir Air Breather & Filler Cap
    const breatherMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8 });
    const breather = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 20), breatherMat);
    breather.position.set(-0.3, 0.85, 0.5);
    reservoirGroup.add(breather);

    // Magnetic Drain Plug Tap Valve at Bottom
    const drainPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12), brassFittingMat);
    drainPlug.rotation.z = Math.PI / 2;
    drainPlug.position.set(1.05, -0.55, -0.6);
    reservoirGroup.add(drainPlug);

    scene.add(reservoirGroup);

    // =========================================================================
    // ZONE-02: HYDRAULIC PUMP & ELECTRIC DRIVE MOTOR
    // =========================================================================
    const pumpMotorGroup = new THREE.Group();
    pumpMotorGroup.position.set(-1.2, -0.65, 0);

    // 7. Electric Drive Motor (TEFC Industrial Motor with Fin Radiators)
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x1E3A5F, metalness: 0.65, roughness: 0.35 });
    const motorCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.25, 32), motorMat);
    motorCylinder.rotation.z = Math.PI / 2;
    motorCylinder.position.set(-0.5, 0, 0);
    motorCylinder.castShadow = true;
    pumpMotorGroup.add(motorCylinder);
    registerMesh(motorCylinder, 'ZONE-02');

    // Motor Terminal Junction Box
    const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.28), machineSteelMat);
    termBox.position.set(-0.5, 0.52, 0);
    pumpMotorGroup.add(termBox);

    // Rear Fan Cowl Guard
    const fanCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.2, 24), darkSkidMat);
    fanCowl.rotation.z = Math.PI / 2;
    fanCowl.position.set(-1.18, 0, 0);
    pumpMotorGroup.add(fanCowl);

    // Motor-Pump Flexible Bellhousing Coupling
    const bellHousingMat = new THREE.MeshStandardMaterial({ color: 0x64748B, metalness: 0.85, roughness: 0.2 });
    const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.38, 24), bellHousingMat);
    coupling.rotation.z = Math.PI / 2;
    coupling.position.set(0.28, 0, 0);
    pumpMotorGroup.add(coupling);

    // 6. High-Pressure Variable Axial Piston Pump
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 });
    const pumpBody = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.65, 0.65), pumpMat);
    pumpBody.position.set(0.72, 0, 0);
    pumpBody.castShadow = true;
    pumpMotorGroup.add(pumpBody);
    registerMesh(pumpBody, 'ZONE-02');

    // Swashplate Angle Adjustment Servo Cylinder on Pump
    const swashCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 16), machineSteelMat);
    swashCyl.position.set(0.72, 0.42, 0);
    pumpMotorGroup.add(swashCyl);

    scene.add(pumpMotorGroup);

    // =========================================================================
    // ZONE-03: HIGH-PRESSURE PRESSURE PIPELINE & MANIFOLD
    // =========================================================================
    const pressurePipeGroup = new THREE.Group();

    // 8. Vertical Seamless High-Pressure Steel Pipe
    const hpPipeMat = new THREE.MeshStandardMaterial({ color: 0x1E40AF, metalness: 0.85, roughness: 0.2 });
    const vertPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 20), hpPipeMat);
    vertPipe.position.set(-0.15, 0.45, 0);
    vertPipe.castShadow = true;
    pressurePipeGroup.add(vertPipe);
    registerMesh(vertPipe, 'ZONE-03');

    // 13. SAE 4-Bolt Code 62 Forged Flange at Pump Outlet
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.15 });
    const flangePump = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), flangeMat);
    flangePump.position.set(-0.15, -0.3, 0);
    pressurePipeGroup.add(flangePump);

    // 8. 90-Degree Forged Elbow to Horizontal Delivery Line
    const elbowGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const elbow = new THREE.Mesh(elbowGeom, flangeMat);
    elbow.position.set(-0.15, 1.2, 0);
    pressurePipeGroup.add(elbow);

    const horizPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 20), hpPipeMat);
    horizPipe.rotation.z = Math.PI / 2;
    horizPipe.position.set(0.48, 1.2, 0);
    horizPipe.castShadow = true;
    pressurePipeGroup.add(horizPipe);
    registerMesh(horizPipe, 'ZONE-03');

    // 11. Glycerine-Filled Dial Pressure Gauge
    const gaugeGroup = new THREE.Group();
    gaugeGroup.position.set(-0.15, 0.85, 0.22);

    const gaugeCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.95, roughness: 0.1 })
    );
    gaugeCase.rotation.x = Math.PI / 2;
    gaugeGroup.add(gaugeCase);

    const dialFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 })
    );
    dialFace.rotation.x = Math.PI / 2;
    dialFace.position.z = 0.04;
    gaugeGroup.add(dialFace);

    // Dial Needle Indicator
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.12, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xDC2626 })
    );
    needle.position.set(0, 0.04, 0.055);
    needle.rotation.z = -Math.PI / 4;
    gaugeGroup.add(needle);

    pressurePipeGroup.add(gaugeGroup);
    scene.add(pressurePipeGroup);

    // =========================================================================
    // ZONE-04: DIRECTIONAL PROPORTIONAL CONTROL VALVE BLOCK
    // =========================================================================
    const valveGroup = new THREE.Group();
    valveGroup.position.set(1.15, 1.2, 0);

    // 10. Heavy Machined Hydraulic Manifold Block
    const manifoldMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.3 });
    const manifold = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.8, 0.8), manifoldMat);
    manifold.castShadow = true;
    valveGroup.add(manifold);
    registerMesh(manifold, 'ZONE-04');

    // Solenoids A & B (Proportional Actuators)
    const solMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.6, roughness: 0.4 });
    const solA = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 20), solMat);
    solA.rotation.z = Math.PI / 2;
    solA.position.set(-0.55, 0, 0);
    valveGroup.add(solA);

    const solB = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 20), solMat);
    solB.rotation.z = Math.PI / 2;
    solB.position.set(0.55, 0, 0);
    valveGroup.add(solB);

    // Manual Emergency Override Pins on Solenoids
    [-0.78, 0.78].forEach((x) => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), brassFittingMat);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(x, 0, 0);
      valveGroup.add(pin);
    });

    // Direct Pilot Relief Valve Cartridge mounted on top
    const reliefValve = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 16), machineSteelMat);
    reliefValve.position.set(0, 0.52, 0);
    valveGroup.add(reliefValve);

    scene.add(valveGroup);

    // =========================================================================
    // 12. WIRE-BRAIDED REINFORCED FLEXIBLE HYDRAULIC HOSES (VALVE TO CYLINDER)
    // =========================================================================
    const hoseGroup = new THREE.Group();
    // High-Pressure Feed Curve
    const hoseCurve1 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(1.5, 1.4, 0.2),
      new THREE.Vector3(1.9, 2.0, 0.4),
      new THREE.Vector3(2.1, 2.3, 0.3),
      new THREE.Vector3(2.4, 2.6, 0.1)
    );
    const hoseGeom1 = new THREE.TubeGeometry(hoseCurve1, 24, 0.055, 12, false);
    const hoseMesh1 = new THREE.Mesh(hoseGeom1, rubberHoseMat);
    hoseMesh1.castShadow = true;
    hoseGroup.add(hoseMesh1);
    scene.add(hoseGroup);

    // =========================================================================
    // ZONE-05: 500-TON HYDRAULIC CYLINDER & MAIN RAM
    // =========================================================================
    const cylinderGroup = new THREE.Group();
    cylinderGroup.position.set(2.4, 1.35, 0);

    // 2. Main High-Pressure Cylinder Barrel (Forged Alloy Steel)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1E3A8A, metalness: 0.85, roughness: 0.25 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.1, 36), barrelMat);
    barrel.position.set(0, 0.7, 0);
    barrel.castShadow = true;
    cylinderGroup.add(barrel);
    registerMesh(barrel, 'ZONE-05');

    // Cylinder Top Flange Mount attached to Press Crown
    const cylFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.22, 32), machineSteelMat);
    cylFlange.position.set(0, 1.75, 0);
    cylinderGroup.add(cylFlange);

    // 3. Mirror-Polished Hard-Chrome Plated Main Ram / Piston Rod
    const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.4, 36), chromeRamMat);
    ram.position.set(0, -0.65, 0);
    cylinderGroup.add(ram);
    registerMesh(ram, 'ZONE-05');

    // Low-Friction Rod Gland Seal Retainer Nut with Wiper Seal
    const glandNut = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 12), brassFittingMat);
    glandNut.position.set(0, -0.32, 0);
    cylinderGroup.add(glandNut);

    // Tool Clamping Adapter Head connecting Ram to Upper Slide Platen
    const ramHead = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.65), machineSteelMat);
    ramHead.position.set(0, -1.25, 0);
    cylinderGroup.add(ramHead);

    scene.add(cylinderGroup);

    // =========================================================================
    // ZONE-06: LOW-PRESSURE OIL RETURN PIPELINE & FILTER ASSEMBLY
    // =========================================================================
    const returnPipeGroup = new THREE.Group();

    // 9. Rigid Return Pipe from Valve Manifold Block Heading Back to Reservoir
    const returnPipeMat = new THREE.MeshStandardMaterial({ color: 0x0284C7, metalness: 0.75, roughness: 0.3 });
    const retPipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 20), returnPipeMat);
    retPipe1.rotation.z = Math.PI / 2;
    retPipe1.position.set(0.0, 0.45, 0.65);
    retPipe1.castShadow = true;
    returnPipeGroup.add(retPipe1);
    registerMesh(retPipe1, 'ZONE-06');

    // 9. Return Line High-Capacity Spin-On Filter Cartridge Bowl
    const filterMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.5, roughness: 0.5 });
    const filterBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.65, 24), filterMat);
    filterBowl.position.set(-1.5, 0.45, 0.65);
    filterBowl.castShadow = true;
    returnPipeGroup.add(filterBowl);
    registerMesh(filterBowl, 'ZONE-06');

    // Return Pipe Down-Leg discharging into Reservoir Below Fluid Level
    const retPipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 20), returnPipeMat);
    retPipe2.position.set(-2.4, 0.0, 0.65);
    returnPipeGroup.add(retPipe2);
    registerMesh(retPipe2, 'ZONE-06');

    scene.add(returnPipeGroup);

    // =========================================================================
    // RAYCASTING ON POINTER DOWN (CLICK-TO-SELECT COMPONENT & ZONE)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(zoneMeshes.map(z => z.mesh), false);

      if (intersects.length > 0) {
        const hitZoneId = intersects[0].object.userData.zoneId;
        if (hitZoneId) {
          onSelectZone(hitZoneId);
        }
      }
    };
    canvas.addEventListener('click', handlePointerDown);

    // =========================================================================
    // RESIZE OBSERVER
    // =========================================================================
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // ANIMATION & PROJECTION LOOP
    // =========================================================================
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      controls.update();
      renderer.render(scene, camera);

      // 1. Project Zone Anchors to 2D Screen Coordinates for Crisp HTML Overlays
      const tags: ZoneTagInfo[] = ZONE_CONFIG.map((cfg) => {
        const pos = cfg.anchor.clone();
        pos.project(camera);

        const isBehind = pos.z > 1.0;
        const screenX = ((pos.x + 1) * width) / 2;
        const screenY = ((-pos.y + 1) * height) / 2;

        return {
          id: cfg.id,
          name: cfg.name,
          screenX,
          screenY,
          visible: !isBehind,
          status: zoneStatuses[cfg.id],
          isSelected: cfg.id === selectedZoneId
        };
      });
      setZoneTags(tags);

      // 2. Realistic Selective Pulsing and Shading Based on Actual Defect Condition
      ZONE_CONFIG.forEach((cfg) => {
        const status = zoneStatuses[cfg.id];
        const isCritical = status === 'LEAKAGE_CONFIRMED' || status === 'LEAKAGE CONFIRMED';
        const isWarning = status === 'LEAKAGE_SUSPECTED' || status === 'LEAKAGE SUSPECTED' || status === 'WARNING';
        const isOffline = status === 'SENSOR_DISCONNECTED' || status === 'SENSOR DISCONNECTED';
        const isSel = cfg.id === selectedZoneId;
        const mats = zoneMaterialsRef.current[cfg.id] || [];

        mats.forEach((mat) => {
          if (isCritical) {
            // Smooth sine wave pulse in pure industrial red
            const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 6.5);
            mat.color.set('#DC2626').lerp(new THREE.Color('#EF4444'), pulse * 0.4);
            mat.emissive.set('#991B1B');
            mat.emissiveIntensity = 0.3 + 0.3 * pulse;
          } else if (isWarning) {
            // Amber warning state
            const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 4.0);
            mat.color.set('#D97706').lerp(new THREE.Color('#F59E0B'), pulse * 0.3);
            mat.emissive.set('#78350F');
            mat.emissiveIntensity = 0.2;
          } else if (isOffline) {
            mat.color.set('#64748B');
            mat.emissive.set('#000000');
            mat.emissiveIntensity = 0.0;
          } else if (isSel) {
            // Selected component prominent highlight
            mat.color.set('#0284C7');
            mat.emissive.set('#0369A1');
            mat.emissiveIntensity = 0.15;
          } else {
            // Nominal baseline palette
            mat.emissive.set('#000000');
            mat.emissiveIntensity = 0.0;
            if (cfg.id === 'ZONE-01') mat.color.set('#475569');
            else if (cfg.id === 'ZONE-02') mat.color.set('#1E3A5F');
            else if (cfg.id === 'ZONE-03') mat.color.set('#1E40AF');
            else if (cfg.id === 'ZONE-04') mat.color.set('#334155');
            else if (cfg.id === 'ZONE-05') mat.color.set('#1E3A8A');
            else if (cfg.id === 'ZONE-06') mat.color.set('#0284C7');
          }
        });
      });
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener('click', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, [selectedZoneId, zoneStatuses, onSelectZone]);

  // Camera Presets
  const resetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(2.5, 4.2, 7.8);
      controlsRef.current.target.set(0.2, 0.3, 0);
      controlsRef.current.update();
    }
  };

  const setViewFront = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0.2, 0.4, 9.2);
      controlsRef.current.target.set(0.2, 0.4, 0);
      controlsRef.current.update();
    }
  };

  const setViewTop = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0.2, 9.8, 0.01);
      controlsRef.current.target.set(0.2, 0.0, 0);
      controlsRef.current.update();
    }
  };

  const setViewSide = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(9.0, 0.6, 0.0);
      controlsRef.current.target.set(0.2, 0.4, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#F4F6F8'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* 2D Projected Screen Badges (Crisp typography, clickable, zero Fiber glitches) */}
      {zoneTags.map((tag) => {
        if (!tag.visible) return null;
        const isCritical = tag.status === 'LEAKAGE_CONFIRMED' || tag.status === 'LEAKAGE CONFIRMED';
        const isWarning = tag.status === 'LEAKAGE_SUSPECTED' || tag.status === 'LEAKAGE SUSPECTED' || tag.status === 'WARNING';
        const isOffline = tag.status === 'SENSOR_DISCONNECTED' || tag.status === 'SENSOR DISCONNECTED';
        const isSel = tag.isSelected;

        let badgeBg = 'rgba(255, 255, 255, 0.95)';
        let badgeColor = '#343A40';
        let badgeBorder = '1px solid #CED4DA';

        if (isCritical) {
          badgeBg = '#DC2626';
          badgeColor = '#FFFFFF';
          badgeBorder = '1.5px solid #FCA5A5';
        } else if (isWarning) {
          badgeBg = '#D97706';
          badgeColor = '#FFFFFF';
          badgeBorder = '1.5px solid #FDE68A';
        } else if (isOffline) {
          badgeBg = '#64748B';
          badgeColor = '#FFFFFF';
          badgeBorder = '1.5px solid #CBD5E1';
        } else if (isSel) {
          badgeBg = '#0284C7';
          badgeColor = '#FFFFFF';
          badgeBorder = '1.5px solid #38BDF8';
        }

        return (
          <div
            key={tag.id}
            onClick={() => onSelectZone(tag.id)}
            style={{
              position: 'absolute',
              left: `${tag.screenX}px`,
              top: `${tag.screenY}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
              pointerEvents: 'auto',
              cursor: 'pointer',
              userSelect: 'none',
              background: badgeBg,
              color: badgeColor,
              border: badgeBorder,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {tag.id}: {tag.name}
            {isCritical && ' [CRITICAL LEAK]'}
            {isWarning && ' [WARNING]'}
            {isOffline && ' [OFFLINE]'}
          </div>
        );
      })}

      {/* Floating CAD View Controls Toolbar */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          background: 'rgba(255, 255, 255, 0.94)',
          border: '1px solid #DEE2E6',
          borderRadius: 4,
          padding: '6px 10px',
          display: 'flex',
          gap: 6,
          fontSize: 11,
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          zIndex: 20
        }}
      >
        <button
          onClick={resetCamera}
          style={{
            background: '#F8F9FA',
            border: '1px solid #CED4DA',
            borderRadius: 3,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            color: '#243B53'
          }}
        >
          Isometric
        </button>
        <button
          onClick={setViewFront}
          style={{
            background: '#F8F9FA',
            border: '1px solid #CED4DA',
            borderRadius: 3,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            color: '#243B53'
          }}
        >
          Front
        </button>
        <button
          onClick={setViewTop}
          style={{
            background: '#F8F9FA',
            border: '1px solid #CED4DA',
            borderRadius: 3,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            color: '#243B53'
          }}
        >
          Top
        </button>
        <button
          onClick={setViewSide}
          style={{
            background: '#F8F9FA',
            border: '1px solid #CED4DA',
            borderRadius: 3,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            color: '#243B53'
          }}
        >
          Side
        </button>
        <span style={{ color: '#6C757D', marginLeft: 4 }}>
          Rotate: Left Drag | Pan: Right Drag | Zoom: Wheel
        </span>
      </div>
    </div>
  );
};

export default HydraulicMachine3D;
