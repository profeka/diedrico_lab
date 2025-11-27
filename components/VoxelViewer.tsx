import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Voxel, generateVoxelMesh, U } from '../utils/geometry';

interface VoxelViewerProps {
    voxels: Voxel[];
    autoRotate: boolean;
    onToggleRotate: () => void;
    gridResolution: number;
    onVoxelClick?: (voxel: Voxel) => void;
}

const VoxelViewer: React.FC<VoxelViewerProps> = ({ voxels, autoRotate, onToggleRotate, gridResolution, onVoxelClick }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const ghostRef = useRef<THREE.Mesh | null>(null);
    const axisRef = useRef<THREE.AxesHelper | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);

    // Raycaster refs
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const isDragging = useRef(false);

    // Init Scene
    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#E5E7EB'); 
        sceneRef.current = scene;

        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        const aspect = w / h;
        
        const camera = new THREE.OrthographicCamera(-60 * aspect, 60 * aspect, 60, -60, 1, 1000);
        camera.position.set(100, 81.6, 100); 
        camera.lookAt(scene.position);
        cameraRef.current = camera;

        // preserveDrawingBuffer required for HTML2Canvas/toDataURL export
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 2.0;
        
        // Track dragging state to distinguish clicks from drags
        controls.addEventListener('start', () => { isDragging.current = true; });
        controls.addEventListener('end', () => { isDragging.current = false; });
        
        controlsRef.current = controls;

        let animFrame: number;
        const animate = () => {
            animFrame = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            renderer.render(scene, camera);
        };
        animate();

        // RESIZE HANDLER
        const handleResize = () => {
            if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;
            const newAspect = width / height;
            
            cameraRef.current.left = -60 * newAspect;
            cameraRef.current.right = 60 * newAspect;
            cameraRef.current.top = 60;
            cameraRef.current.bottom = -60;
            cameraRef.current.updateProjectionMatrix();
            
            rendererRef.current.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animFrame);
            if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    // Handle Clicks for Voxel Deletion
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
             // Reset drag status on down
             isDragging.current = false;
        };

        const handleClick = (event: MouseEvent) => {
            if (!onVoxelClick || !rendererRef.current || !cameraRef.current || !meshRef.current || !mountRef.current) return;
            if (isDragging.current) return; // Ignore drags

            // Check modifiers: Shift key or Right Click
            const isRightClick = event.button === 2;
            const isShiftClick = event.shiftKey && event.button === 0;

            if (!isRightClick && !isShiftClick) return;

            const rect = mountRef.current.getBoundingClientRect();
            pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.current.setFromCamera(pointer.current, cameraRef.current);
            const intersects = raycaster.current.intersectObject(meshRef.current);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                const face = intersect.face;
                if (!face) return;

                // To find the voxel, we move slightly inside the cube from the hit point
                // Normal points OUT, so subtract normal * small_epsilon
                const p = intersect.point.clone().add(face.normal.clone().multiplyScalar(-U/2));
                
                // Convert world pos to voxel coord
                // Mesh is translated by -center
                const center = new THREE.Vector3(
                    (gridResolution * U) / 2 - U/2,
                    (gridResolution * U) / 2 - U/2,
                    (gridResolution * U) / 2 - U/2
                );

                const voxelX = Math.round((p.x + center.x) / U);
                const voxelY = Math.round((p.y + center.y) / U);
                const voxelZ = Math.round((p.z + center.z) / U);

                onVoxelClick([voxelX, voxelY, voxelZ]);
            }
        };

        const element = mountRef.current;
        if (element) {
            element.addEventListener('pointerdown', handlePointerDown);
            element.addEventListener('mousedown', handleClick); // Use mousedown for right click support
            element.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent context menu
        }

        return () => {
            if (element) {
                element.removeEventListener('pointerdown', handlePointerDown);
                element.removeEventListener('mousedown', handleClick);
                element.removeEventListener('contextmenu', (e) => e.preventDefault());
            }
        };

    }, [onVoxelClick, gridResolution]);

    // Handle Resolution Changes (Ghost Box & Axes)
    useEffect(() => {
        if (!sceneRef.current) return;

        // Update Ghost Box
        if (ghostRef.current) sceneRef.current.remove(ghostRef.current);
        const boxSize = gridResolution * U;
        const ghostGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        const ghost = new THREE.Mesh(ghostGeo, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, opacity: 0.05, transparent: true }));
        sceneRef.current.add(ghost);
        ghostRef.current = ghost;

        // Update Axes
        if (axisRef.current) sceneRef.current.remove(axisRef.current);
        const axisSize = boxSize / 2; 
        const axesHelper = new THREE.AxesHelper(boxSize + 10);
        axesHelper.position.set(-axisSize, -axisSize, -axisSize); 
        
        // Make axes lines diffused (semi-transparent)
        const axesMat = axesHelper.material as THREE.LineBasicMaterial;
        if (axesMat) {
            axesMat.transparent = true;
            axesMat.opacity = 0.25;
        }

        sceneRef.current.add(axesHelper);
        axisRef.current = axesHelper;

    }, [gridResolution]);

    // Update Voxels Mesh
    useEffect(() => {
        if (!sceneRef.current) return;
        
        if (meshRef.current) {
            sceneRef.current.remove(meshRef.current);
            (meshRef.current.geometry as THREE.BufferGeometry).dispose();
            (meshRef.current.material as THREE.Material).dispose();
            meshRef.current = null;
        }

        // Pass resolution to generateVoxelMesh for correct centering
        const mesh = generateVoxelMesh(voxels, gridResolution);
        if (mesh) {
            sceneRef.current.add(mesh);
            meshRef.current = mesh;
        }
    }, [voxels, gridResolution]);

    // Update Rotation
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.autoRotate = autoRotate;
        }
    }, [autoRotate]);

    return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};

export default VoxelViewer;