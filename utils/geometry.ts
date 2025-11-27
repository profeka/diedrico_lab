import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const U = 15; // Unit size

// Helper to determine resolution based on level
export const getLevelResolution = (level: number): number => {
    return level >= 20 ? 6 : 4;
};

export const getLevelName = (level: number): string => {
    const names: {[key: number]: string} = {
        1: "El Cubo",
        2: "El Escalón",
        3: "Gusano",
        4: "Pilar",
        5: "Mesa",
        6: "Muesca",
        7: "Pozo",
        8: "Escalera",
        9: "Arco",
        10: "Cruz 3D",
        11: "Puente",
        12: "Ventana",
        13: "Cruz",
        14: "Doble Bloque",
        15: "Autovía",
        16: "Intersección",
        17: "La Escalera",
        18: "Escenario",
        19: "La Serpiente",
        20: "La U",
        21: "Escaleras Gemelas",
        22: "Cuatro Pilares",
        23: "La Cruz",
        24: "La Muralla",
        25: "El Bosque",
        26: "Gran Pirámide",
        27: "La Rampa",
        28: "Cubo Hueco",
        29: "La Espiral",
        30: "El Núcleo"
    };
    return names[level] || "Pieza Desconocida";
};

// Colors
export const PALETTE = {
    BG: '#E0E7FF',       
    GRID_BG: '#FFFFFF',
    STROKE: '#000000',   
    ACCENT: '#8B5CF6',   
    
    FACE_TOP: '#A3E635',    // Planta
    FACE_FRONT: '#F472B6',  // Alzado
    FACE_SIDE: '#38BDF8',   // Perfil Derecho (Right)
    FACE_SIDE_LEFT: '#FB923C', // Perfil Izquierdo (Left) - Orange
    FACE_BACK: '#4F46E5',   // Atrás
    FACE_BOTTOM: '#059669', // Abajo
    
    SUCCESS: '#22C55E',     
    ERROR: '#EF4444'        
};

// --- TYPE DEFINITIONS ---
// Voxel: x, y, z, type (optional, default 1=Full)
export type Voxel = [number, number, number, number?]; 

export type GridState = {
    cells: number[]; // 0: Empty, 1: Full, 2: BL, 3: BR, 4: TR, 5: TL
    v: number[]; // 0: None, 1: Solid
    h: number[]; // 0: None, 1: Solid
};
export type Projections = {
    alzado: GridState;
    planta: GridState;
    perfil: GridState;
};

// --- HELPER: Create Empty State ---
export const createEmptyGridState = (res: number): GridState => {
    const numCells = res * res;
    const numVEdges = res * (res - 1);
    const numHEdges = (res - 1) * res;
    return {
        cells: new Array(numCells).fill(0),
        v: new Array(numVEdges).fill(0),
        h: new Array(numHEdges).fill(0)
    };
};

// --- LEVELS DATA ---
export const getVoxelData = (level: number): Voxel[] => {
    const voxels: Voxel[] = [];
    // Default addBox creates Type 1 (Full) voxels
    const addBox = (x: number, y: number, z: number, w=1, h=1, d=1) => {
        for(let i=0; i<w; i++)
            for(let j=0; j<h; j++)
                for(let k=0; k<d; k++)
                    voxels.push([x+i, y+j, z+k, 1]);
    };

    switch(level) {
        // 4x4 LEVELS
        case 1: addBox(0,0,0, 2,2,2); break; 
        case 2: addBox(0,0,0, 2,1,2); addBox(0,1,0, 1,1,2); break; 
        
        case 3: // Gusano
             addBox(0,0,0, 1,1,1);
             addBox(1,0,0, 1,1,1);
             addBox(1,1,0, 1,1,1);
             addBox(2,1,0, 1,1,1);
             break;
        
        case 4: // Pilar
             // Back Layer (High 'A')
             addBox(1,0,1, 1,4,1); // Left Leg Back
             addBox(2,0,1, 1,4,1); // Right Leg Back
             addBox(1,1,1, 2,1,1); // Bar Back
             addBox(1,3,1, 2,1,1); // Top Back
             // Front Layer (Low Base)
             addBox(1,0,2, 1,2,1); // Left Leg Front
             addBox(2,0,2, 1,2,1); // Right Leg Front
             break;
             
        case 5: // Mesa
             // Back Layer (High 'H')
             addBox(1,0,1, 1,4,1); // Left Leg Back
             addBox(2,0,1, 1,4,1); // Right Leg Back
             addBox(1,2,1, 2,1,1); // Bar Back
             // Front Layer (Low Base)
             addBox(1,0,2, 1,2,1); // Left Leg Front
             addBox(2,0,2, 1,2,1); // Right Leg Front
             break;

        case 6: // Muesca
             addBox(0,0,0, 2,1,2); 
             addBox(0,1,0, 1,1,2); 
             addBox(0,0,0, 2,2,1); 
             break; 
        
        case 7: // Pozo
             addBox(0,0,0, 3,2,1); // Back Wall
             addBox(0,0,2, 3,2,1); // Front Wall
             addBox(0,0,1, 1,2,1); // Left Wall
             addBox(2,0,1, 1,2,1); // Right Wall
             break; 
        
        case 8: // Escalera
             addBox(2,0,0, 1,1,2); 
             addBox(1,0,0, 1,2,2); 
             addBox(0,0,0, 1,3,2); 
             break; 
        
        case 9: // Arco
             addBox(0,0,0, 1,4,2); // Left Col
             addBox(3,0,0, 1,4,2); // Right Col
             addBox(0,3,0, 4,1,2); // Top Beam
             break; 
        
        case 10: // Cruz 3D
             addBox(1,0,1, 2,4,2); // Center Column
             addBox(0,2,1, 4,1,2); // Crossing Arms
             break; 

        case 11: // Puente
             addBox(0,0,1, 1,2,2); // Left Pillar
             addBox(3,0,1, 1,2,2); // Right Pillar
             addBox(0,2,1, 4,1,2); // Top Beam
             break; 
        case 12: // Ventana
             addBox(0,0,1, 4,1,1); // Bottom
             addBox(0,3,1, 4,1,1); // Top
             addBox(0,1,1, 1,2,1); // Left
             addBox(3,1,1, 1,2,1); // Right
             break; 
        case 13: // Cruz
             addBox(1,0,1, 2,4,1); // Vertical (thicker 2u)
             addBox(0,1,1, 4,2,1); // Horizontal (thicker 2u)
             break; 
        case 14: // Doble Bloque
             addBox(1,0,0, 2,2,1); // Base at back
             addBox(1,2,1, 2,2,1); // Top front overhang
             break; 
        case 15: // Autovía
             addBox(0,0,1, 1,2,1); // Pillar 1
             addBox(3,0,1, 1,2,1); // Pillar 2
             addBox(0,2,0, 4,1,3); // Road deck
             break; 
        case 16: // Intersección
             addBox(0,1,1, 4,1,2); // X Road
             addBox(1,1,0, 2,1,4); // Z Road
             break; 
        case 17: // La Escalera
            addBox(0,0,0, 4,1,4); 
            addBox(0,1,1, 4,1,3); 
            addBox(0,2,2, 4,1,2); 
            addBox(0,3,3, 4,1,1); 
            break; 
        case 18: // Escenario
             addBox(0,0,0, 4,1,3); // Floor
             addBox(0,1,0, 4,3,1); // Back Wall
             break; 
        case 19: // La Serpiente
             addBox(0,0,0, 1,1,1);
             addBox(1,0,0, 1,1,1);
             addBox(1,1,0, 1,1,1);
             addBox(1,1,1, 1,1,1);
             addBox(2,1,1, 1,1,1);
             addBox(2,2,1, 1,1,1);
             addBox(2,2,0, 1,1,1);
             break;

        // 6x6 LEVELS
        case 20: addBox(0,0,0, 6,1,2); addBox(0,1,0, 1,2,2); addBox(5,1,0, 1,2,2); break; // U-shape
        case 21: // Twin Stairs
            for(let i=0; i<6; i++) {
                addBox(0,i,i, 2,1,1); 
                addBox(4,i,i, 2,1,1); 
            }
            break; 
        case 22: addBox(0,0,0, 6,1,6); addBox(1,1,1, 1,3,1); addBox(4,1,4, 1,3,1); addBox(1,1,4, 1,3,1); addBox(4,1,1, 1,3,1); break; // Pillars
        case 23: addBox(2,0,2, 2,6,2); addBox(0,3,2, 2,1,2); addBox(4,3,2, 2,1,2); break; // Cross Tower
        case 24: addBox(0,0,0, 6,2,2); addBox(1,2,0, 1,1,2); addBox(3,2,0, 1,1,2); addBox(5,2,0, 1,1,2); break; // Wall
        case 25: addBox(0,0,0, 1,6,1); addBox(2,0,1, 1,4,1); addBox(5,0,2, 1,3,1); addBox(1,0,3, 1,5,1); addBox(4,0,5, 1,2,1); break; // Forest
        case 26: addBox(0,0,0, 6,1,6); addBox(1,1,1, 4,1,4); addBox(2,2,2, 2,1,2); break; // Pyramid
        case 27: addBox(0,0,0, 6,1,1); addBox(0,1,1, 5,1,1); addBox(0,2,2, 4,1,1); addBox(0,3,3, 3,1,1); addBox(0,4,4, 2,1,1); addBox(0,5,5, 1,1,1); break; // Wedge
        case 28: addBox(0,0,0, 6,1,1); addBox(0,0,0, 1,6,1); addBox(0,0,0, 1,1,6); addBox(5,0,0, 1,6,1); addBox(0,5,0, 6,1,1); addBox(0,0,5, 1,6,1); break; // Wireframe
        case 29: // Spiral
            addBox(0,0,0, 2,1,2); 
            addBox(2,1,0, 2,1,2); 
            addBox(4,2,0, 2,1,2); 
            addBox(4,3,2, 2,1,2); 
            addBox(2,4,2, 2,1,2);
            addBox(0,4,4, 2,1,2);
            break; 
        case 30: // Core
            addBox(0,0,0, 6,1,6); addBox(0,5,0, 6,1,6); 
            addBox(0,1,0, 1,4,1); addBox(5,1,0, 1,4,1); addBox(0,1,5, 1,4,1); addBox(5,1,5, 1,4,1); 
            addBox(2,2,2, 2,2,2); 
            break; 

        default: addBox(0,0,0, 2,2,2);
    }
    return voxels;
};

// --- CORE LOGIC ---

// Calculates expected 2D views from 3D voxels (Analysis Mode)
export const calculateSolution = (voxels: Voxel[], res: number): Projections => {
    const numCells = res * res;
    const numV = res * (res - 1);
    const numH = (res - 1) * res;

    const projections: Projections = {
        alzado: { cells: Array(numCells).fill(0), v: Array(numV).fill(0), h: Array(numH).fill(0) },
        planta: { cells: Array(numCells).fill(0), v: Array(numV).fill(0), h: Array(numH).fill(0) },
        perfil: { cells: Array(numCells).fill(0), v: Array(numV).fill(0), h: Array(numH).fill(0) }
    };

    const depthPlanta = Array(numCells).fill(-99);
    const depthAlzado = Array(numCells).fill(-99);
    const depthPerfil = Array(numCells).fill(-99);

    voxels.forEach(([x, y, z]) => {
        if (x >= res || y >= res || z >= res) return; 

        // Planta: Top View (X, Z)
        const idxP = z * res + x;
        projections.planta.cells[idxP] = 1;
        depthPlanta[idxP] = Math.max(depthPlanta[idxP], y);

        // Alzado: Front View (X, Y)
        const idxA = (res - 1 - y) * res + x;
        projections.alzado.cells[idxA] = 1;
        depthAlzado[idxA] = Math.max(depthAlzado[idxA], z);

        // Perfil: Right View (Z, Y)
        // FLIPPED: col = res - 1 - z
        const idxS = (res - 1 - y) * res + (res - 1 - z);
        projections.perfil.cells[idxS] = 1;
        depthPerfil[idxS] = Math.max(depthPerfil[idxS], x);
    });

    const calcEdges = (projObj: GridState, depthMap: number[]) => {
        for(let r=0; r<res; r++) {
            for(let c=0; c<res-1; c++) {
                const i = r * res + c;
                const nextI = r * res + c + 1;
                if (projObj.cells[i] > 0 && projObj.cells[nextI] > 0 && depthMap[i] !== depthMap[nextI]) {
                    projObj.v[r * (res - 1) + c] = 1; 
                }
            }
        }
        for(let r=0; r<res-1; r++) {
            for(let c=0; c<res; c++) {
                const i = r * res + c;
                const nextI = (r + 1) * res + c;
                if (projObj.cells[i] > 0 && projObj.cells[nextI] > 0 && depthMap[i] !== depthMap[nextI]) {
                    projObj.h[r * res + c] = 1; 
                }
            }
        }
    };

    calcEdges(projections.planta, depthPlanta);
    calcEdges(projections.alzado, depthAlzado);
    calcEdges(projections.perfil, depthPerfil);

    return projections;
};

// Calculate Voxels based on 2D Views (Visual Hull / Intersection Method)
export const calculateVoxelsFromViews = (alzado: number[], planta: number[], perfil: number[], res: number): Voxel[] => {
    const voxels: Voxel[] = [];
    
    for (let x = 0; x < res; x++) {
        for (let y = 0; y < res; y++) {
            for (let z = 0; z < res; z++) {
                // Check Alzado (Front) - (x, y)
                const idxA = (res - 1 - y) * res + x;
                const valA = alzado[idxA];

                // Check Planta (Top) - (x, z)
                const idxP = z * res + x;
                const valP = planta[idxP];

                // Check Perfil (Side) - (z, y)
                const idxS = (res - 1 - y) * res + (res - 1 - z);
                const valS = perfil[idxS];

                if (valA > 0 && valP > 0 && valS > 0) {
                    let type = 1; 

                    // ALZADO SLOPES (Front View)
                    // If Alzado is Type 2-5, encode as 12-15
                    if (valA >= 2) {
                        type = 10 + valA; 
                    } 
                    // PERFIL SLOPES (Side View)
                    // If Perfil is Type 2-5, encode as 22-25
                    else if (valS >= 2) {
                        type = 20 + valS;
                    }

                    voxels.push([x, y, z, type]);
                }
            }
        }
    }
    return voxels;
};

// --- THREE.JS MESH GENERATION ---

// Helper to create a Wedge Geometry based on 2D triangle type and orientation
// shapeType: 2=BL, 3=BR, 4=TR, 5=TL (Visual corner in grid)
// axis: 'z' (Alzado extrusion) or 'x' (Perfil extrusion)
const createWedgeGeometry = (shapeType: number, axis: 'x' | 'z') => {
    // Helper to build vertices array from coords
    const buildWedge = (p0:number[], p1:number[], p2:number[]) => {
        // p0, p1, p2 are the 2D triangle coords (e.g. [0,0], [1,0], [0,1])
        // axis determines the 3rd dimension
        
        const v3 = (p: number[], d: number) => {
            if (axis === 'z') {
                // Alzado: Grid X -> World X. Grid Y -> World Y.
                // Center Vertices by subtracting 0.5 from 0..1 range
                return [p[0] - 0.5, p[1] - 0.5, d - 0.5];
            }
            // Perfil: axis='x'. Grid X maps to Z (inverted).
            // Grid Left (0) = Front (Z=1). Grid Right (1) = Back (Z=0).
            // Z = 1 - p[0]. Centered Z = (1 - p[0]) - 0.5 = 0.5 - p[0].
            return [d - 0.5, p[1] - 0.5, 0.5 - p[0]]; 
        }

        const pts: number[] = [];
        const addTri = (a:number[], b:number[], c:number[]) => {
            pts.push(...a.map(v=>v*U), ...b.map(v=>v*U), ...c.map(v=>v*U));
        }
        const addQuad = (a:number[], b:number[], c:number[], d:number[]) => {
            addTri(a,b,c); addTri(a,c,d);
        }

        const A0 = v3(p0, 0), B0 = v3(p1, 0), C0 = v3(p2, 0);
        const A1 = v3(p0, 1), B1 = v3(p1, 1), C1 = v3(p2, 1);

        // Faces 
        addTri(A0, C0, B0); // Front 
        addTri(A1, B1, C1); // Back
        addQuad(A0, B0, B1, A1); // Side 1
        addQuad(B0, C0, C1, B1); // Side 2
        addQuad(C0, A0, A1, C1); // Side 3

        const buffer = new THREE.BufferGeometry();
        buffer.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return buffer;
    };

    // Grid coordinates
    if (shapeType === 2) return buildWedge([0,0], [1,0], [0,1]);
    if (shapeType === 3) return buildWedge([0,0], [1,0], [1,1]);
    if (shapeType === 4) return buildWedge([1,0], [1,1], [0,1]);
    if (shapeType === 5) return buildWedge([0,0], [1,1], [0,1]);
    
    return new THREE.BoxGeometry(U,U,U);
};

export const generateVoxelMesh = (voxels: Voxel[], res: number) => {
    if(!voxels || voxels.length === 0) return null;
    const geometries: THREE.BufferGeometry[] = [];
    
    const center = new THREE.Vector3((res * U) / 2 - U/2, (res * U) / 2 - U/2, (res * U) / 2 - U/2);

    voxels.forEach(([x, y, z, type]) => {
        let geo: THREE.BufferGeometry;
        
        if (!type || type === 1) {
            geo = new THREE.BoxGeometry(U, U, U).toNonIndexed(); // Convert to non-indexed
            if (geo.getAttribute('normal')) geo.deleteAttribute('normal'); // Remove attributes not present in wedge
            if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
        } else if (type >= 12 && type <= 15) {
             geo = createWedgeGeometry(type - 10, 'z'); // Already non-indexed and pos-only
        } else if (type >= 22 && type <= 25) {
             geo = createWedgeGeometry(type - 20, 'x'); // Already non-indexed and pos-only
        } else {
             geo = new THREE.BoxGeometry(U, U, U).toNonIndexed();
             if (geo.getAttribute('normal')) geo.deleteAttribute('normal');
             if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
        }

        geo.translate(x * U - center.x, y * U - center.y, z * U - center.z);
        geometries.push(geo);
    });

    if(geometries.length === 0) return null;
    let mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
    
    mergedGeo = BufferGeometryUtils.mergeVertices(mergedGeo);
    mergedGeo.computeVertexNormals();

    const colors: number[] = [];
    const pos = mergedGeo.attributes.position;
    const count = pos.count;
    const normal = mergedGeo.attributes.normal;
    const _normal = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        _normal.fromBufferAttribute(normal, i);
        let colorHex = PALETTE.FACE_FRONT;
        
        // Approximate normal checks for colors
        if (_normal.y > 0.5) colorHex = PALETTE.FACE_TOP;
        else if (_normal.y < -0.5) colorHex = PALETTE.FACE_BOTTOM;
        else if (_normal.z > 0.5) colorHex = PALETTE.FACE_FRONT;
        else if (_normal.z < -0.5) colorHex = PALETTE.FACE_BACK;
        else if (_normal.x > 0.5) colorHex = PALETTE.FACE_SIDE;
        else if (_normal.x < -0.5) colorHex = PALETTE.FACE_SIDE_LEFT;

        const c = new THREE.Color(colorHex);
        colors.push(c.r, c.g, c.b);
    }
    mergedGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(mergedGeo, material);
    
    // Edges
    const edges = new THREE.EdgesGeometry(mergedGeo, 1);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: PALETTE.STROKE, linewidth: 2 }));
    mesh.add(line);
    return mesh;
};