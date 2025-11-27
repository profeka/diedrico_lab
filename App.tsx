import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Grid, ChevronLeft, ChevronRight, MousePointer2, Pause, Play, Info, CheckCircle2, RefreshCw, PencilRuler, Eye, Edit3, Camera, Download, Image as ImageIcon, Eraser, User, Clipboard, Lock, Unlock, Box, Triangle, Upload } from 'lucide-react';
import VoxelViewer from './components/VoxelViewer';
import ProjectionGrid from './components/ProjectionGrid';
import html2canvas from 'html2canvas';
import { 
    getVoxelData, 
    calculateSolution, 
    calculateVoxelsFromViews, 
    createEmptyGridState,
    PALETTE, 
    GridState, 
    Projections, 
    getLevelResolution,
    getLevelName,
    Voxel
} from './utils/geometry';

const MAX_LEVELS = 30;

function App() {
    const [mode, setMode] = useState<'analysis' | 'synthesis'>('analysis');
    const [currentLevel, setCurrentLevel] = useState(1);
    const [autoRotate, setAutoRotate] = useState(true);
    const [checkResult, setCheckResult] = useState<'success' | 'error' | null>(null);
    const [studentName, setStudentName] = useState('');
    const [completedLevels, setCompletedLevels] = useState<number[]>([]);
    
    // Progress Modal State
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressCode, setProgressCode] = useState('');
    const [loadCode, setLoadCode] = useState(''); // State for loading code
    
    // Verifier State
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyResult, setVerifyResult] = useState<null | {name: string, completed: number[], date: string}>(null);
    
    const [synthResolution, setSynthResolution] = useState(4);
    const [removedVoxels, setRemovedVoxels] = useState<Set<string>>(new Set());
    
    // TOOL STATE
    const [tool, setTool] = useState<'cube' | 'triangle'>('cube');

    const activeResolution = mode === 'analysis' ? getLevelResolution(currentLevel) : synthResolution;

    const [userAnalysisGrids, setUserAnalysisGrids] = useState<Projections>({
        alzado: createEmptyGridState(getLevelResolution(1)),
        planta: createEmptyGridState(getLevelResolution(1)),
        perfil: createEmptyGridState(getLevelResolution(1))
    });

    const [userSynthesisGrids, setUserSynthesisGrids] = useState<Projections>({
        alzado: createEmptyGridState(synthResolution),
        planta: createEmptyGridState(synthResolution),
        perfil: createEmptyGridState(synthResolution)
    });

    useEffect(() => {
        setUserSynthesisGrids({
            alzado: createEmptyGridState(synthResolution),
            planta: createEmptyGridState(synthResolution),
            perfil: createEmptyGridState(synthResolution)
        });
        setRemovedVoxels(new Set());
    }, [synthResolution]);

    const levelVoxels = useMemo(() => getVoxelData(currentLevel), [currentLevel]);
    const levelSolution = useMemo(() => calculateSolution(levelVoxels, getLevelResolution(currentLevel)), [levelVoxels, currentLevel]);

    const rawSynthesisVoxels = useMemo(() => {
        return calculateVoxelsFromViews(
            userSynthesisGrids.alzado.cells,
            userSynthesisGrids.planta.cells,
            userSynthesisGrids.perfil.cells,
            synthResolution
        );
    }, [userSynthesisGrids, synthResolution]);

    const synthesisVoxels = useMemo(() => {
        return rawSynthesisVoxels.filter(v => !removedVoxels.has(v.join(',')));
    }, [rawSynthesisVoxels, removedVoxels]);

    const synthesisValidity = useMemo(() => {
        if (mode === 'analysis') return null;
        const res = synthResolution;
        const numCells = res * res;
        const supportedAlzado = new Array(numCells).fill(false);
        const supportedPlanta = new Array(numCells).fill(false);
        const supportedPerfil = new Array(numCells).fill(false);

        synthesisVoxels.forEach(([x, y, z]) => {
            supportedAlzado[(res - 1 - y) * res + x] = true;
            supportedPlanta[z * res + x] = true;
            supportedPerfil[(res - 1 - y) * res + (res - 1 - z)] = true;
        });

        return { alzado: supportedAlzado, planta: supportedPlanta, perfil: supportedPerfil };
    }, [synthesisVoxels, mode, synthResolution]);

    useEffect(() => {
        const res = getLevelResolution(currentLevel);
        setUserAnalysisGrids({
            alzado: createEmptyGridState(res),
            planta: createEmptyGridState(res),
            perfil: createEmptyGridState(res)
        });
        setCheckResult(null);
    }, [currentLevel]);

    const handleCellClick = (view: keyof Projections, idx: number, forcedValue?: number) => {
        if (checkResult === 'success') return;
        if (checkResult === 'error') setCheckResult(null); 

        const updateGrid = (prev: Projections) => {
            const viewData = { ...prev[view] };
            viewData.cells = [...viewData.cells];
            
            if (forcedValue !== undefined) {
                viewData.cells[idx] = forcedValue;
            } else {
                // Tool Logic
                const current = viewData.cells[idx];
                let next = 0;
                if (tool === 'cube') {
                    next = current === 0 ? 1 : 0;
                } else {
                    if (current < 2) next = 2;
                    else if (current < 5) next = current + 1;
                    else next = 2;
                }
                viewData.cells[idx] = next;
            }
            return { ...prev, [view]: viewData };
        };

        if (mode === 'analysis') setUserAnalysisGrids(prev => updateGrid(prev));
        else setUserSynthesisGrids(prev => updateGrid(prev));
    };

    const handleEdgeClick = (view: keyof Projections, type: 'v' | 'h', idx: number) => {
        if (checkResult === 'success') return;
        if (checkResult === 'error') setCheckResult(null);
        const cycleState = (currentState: number) => currentState === 0 ? 1 : 0;
        const updateGrid = (prev: Projections) => {
            const viewData = { ...prev[view] };
            if (type === 'v') {
                viewData.v = [...viewData.v];
                viewData.v[idx] = cycleState(viewData.v[idx]);
            } else {
                viewData.h = [...viewData.h];
                viewData.h[idx] = cycleState(viewData.h[idx]);
            }
            return { ...prev, [view]: viewData };
        };
        if (mode === 'analysis') setUserAnalysisGrids(prev => updateGrid(prev));
        else setUserSynthesisGrids(prev => updateGrid(prev));
    };

    const handleVoxelClick = (voxel: Voxel) => {
        if (mode === 'synthesis') {
            const key = voxel.join(',');
            setRemovedVoxels(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
        }
    };

    const handleAction = () => {
        if (mode === 'analysis') {
            if (checkResult === 'error') { setCheckResult(null); return; }
            const checkView = (user: GridState, sol: GridState) => {
                const userSimple = user.cells.map(c => c > 0 ? 1 : 0);
                const solSimple = sol.cells.map(c => c > 0 ? 1 : 0);
                const cellsOk = JSON.stringify(userSimple) === JSON.stringify(solSimple);
                const vOk = JSON.stringify(user.v) === JSON.stringify(sol.v);
                const hOk = JSON.stringify(user.h) === JSON.stringify(sol.h);
                return cellsOk && vOk && hOk;
            };
            const okA = checkView(userAnalysisGrids.alzado, levelSolution.alzado);
            const okP = checkView(userAnalysisGrids.planta, levelSolution.planta);
            const okS = checkView(userAnalysisGrids.perfil, levelSolution.perfil);
            const success = okA && okP && okS;
            setCheckResult(success ? 'success' : 'error');
            if (success) {
                setCompletedLevels(prev => !prev.includes(currentLevel) ? [...prev, currentLevel].sort((a,b)=>a-b) : prev);
            }
        } else {
            setUserSynthesisGrids({
                alzado: createEmptyGridState(synthResolution),
                planta: createEmptyGridState(synthResolution),
                perfil: createEmptyGridState(synthResolution)
            });
            setRemovedVoxels(new Set());
        }
    };

    const generateCode = () => {
        const payload = { n: studentName || "Anonimo", c: completedLevels, d: new Date().toISOString() };
        setProgressCode(`DIEDRICO-LAB-V1_${btoa(JSON.stringify(payload))}`);
        setShowProgressModal(true);
    };

    const handleLoadProgress = () => {
        if (!loadCode.trim()) return;
        try {
            const raw = loadCode.trim().replace('DIEDRICO-LAB-V1_', '');
            const json = atob(raw);
            const data = JSON.parse(json);
            
            if (Array.isArray(data.c)) {
                if(data.n) setStudentName(data.n);
                setCompletedLevels(data.c);
                alert(`¡Progreso cargado con éxito! ${data.c.length} niveles completados.`);
                setLoadCode('');
            } else {
                alert("El código no es válido.");
            }
        } catch (e) {
            alert("Error al leer el código. Asegúrate de copiarlo completo.");
        }
    };

    const verifyProgressCode = () => {
        try {
            const data = JSON.parse(atob(verifyCode.replace('DIEDRICO-LAB-V1_', '')));
            if (data.n && Array.isArray(data.c)) setVerifyResult({ name: data.n, completed: data.c, date: data.d });
            else alert("Código inválido: formato incorrecto.");
        } catch (e) { alert("Código inválido: no se pudo leer."); }
    };

    const handleExport = async (type: '3d' | '2d' | 'all') => {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        if (type === '3d') {
            const canvas = document.querySelector('#canvas-3d canvas') as HTMLCanvasElement;
            if (canvas) {
                const link = document.createElement('a');
                link.download = `diedrico-3d-${timestamp}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } else if (type === '2d') {
            const element = document.getElementById('plans-capture-area');
            if (element) {
                const canvas = await html2canvas(element, { backgroundColor: '#FFFFFF', scale: 2 });
                const link = document.createElement('a');
                link.download = `diedrico-planos-${timestamp}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } else {
            const element = document.body;
            const canvas = await html2canvas(element, { backgroundColor: '#E0E7FF' });
            const link = document.createElement('a');
            link.download = `diedrico-full-${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };

    const activeVoxels = mode === 'analysis' ? levelVoxels : synthesisVoxels;

    return (
        <div className="flex flex-col h-screen font-mono text-black bg-[#E0E7FF]">
            <header className="flex justify-between items-center p-4 border-b-4 border-black bg-white z-10 shadow-md shrink-0 h-20">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white p-2"><Grid size={28}/></div>
                    <div>
                        <h1 className="text-2xl font-black uppercase leading-none tracking-tight">Diédrico_Lab</h1>
                        <p className="text-xs font-bold text-gray-500">v9.5 // {mode === 'analysis' ? 'ANALYSIS' : 'CONSTRUCTOR'}_MODE</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 border-b-2 border-black/20 focus-within:border-black px-2">
                        <User size={16} className="text-gray-500" />
                        <input type="text" placeholder="Tu Nombre..." value={studentName} onChange={(e) => setStudentName(e.target.value)} className="bg-transparent outline-none text-sm font-bold w-32 placeholder-gray-400" />
                    </div>
                    <button onClick={generateCode} className="flex items-center gap-2 px-3 py-1 bg-green-100 border-2 border-black rounded hover:bg-green-200 transition-colors" title="Ver Progreso y Generar Código"><Lock size={16}/> <span className="text-xs font-bold">{completedLevels.length}/{MAX_LEVELS}</span></button>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    <div className="flex gap-1 mr-4">
                        <button onClick={() => handleExport('3d')} title="Guardar 3D" className="p-2 border-2 border-black rounded hover:bg-gray-100"><Camera size={18}/></button>
                        <button onClick={() => handleExport('2d')} title="Guardar Planos" className="p-2 border-2 border-black rounded hover:bg-gray-100"><ImageIcon size={18}/></button>
                        <button onClick={() => handleExport('all')} title="Guardar Ficha Completa" className="p-2 border-2 border-black rounded hover:bg-gray-100"><Download size={18}/></button>
                    </div>
                    {mode === 'synthesis' && (
                        <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded border-2 border-black">
                            <span className="text-[10px] font-bold uppercase">Resolución:</span>
                            <input type="range" min="3" max="10" value={synthResolution} onChange={(e) => setSynthResolution(parseInt(e.target.value))} className="w-24 accent-black cursor-pointer" />
                            <span className="font-black text-sm w-8 text-center">{synthResolution}x{synthResolution}</span>
                        </div>
                    )}
                    <div className="flex gap-2 bg-gray-100 p-1 border-2 border-black rounded-lg">
                        <button onClick={() => setMode('analysis')} className={`flex items-center gap-2 px-4 py-1 font-bold text-xs rounded border-2 transition-all ${mode === 'analysis' ? 'bg-black text-white border-black' : 'bg-white border-transparent hover:bg-gray-200 text-gray-500'}`}><Eye size={14} /> VER 3D ⮕ DIBUJAR 2D</button>
                        <button onClick={() => setMode('synthesis')} className={`flex items-center gap-2 px-4 py-1 font-bold text-xs rounded border-2 transition-all ${mode === 'synthesis' ? 'bg-black text-white border-black' : 'bg-white border-transparent hover:bg-gray-200 text-gray-500'}`}><PencilRuler size={14} /> DIBUJAR 2D ⮕ VER 3D</button>
                    </div>
                </div>
                <div className={`flex items-center gap-2 bg-[#FFDE00] border-2 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-opacity ${mode === 'synthesis' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <button onClick={() => setCurrentLevel(l => Math.max(1, l - 1))} className="p-2 hover:bg-black hover:text-white border-r-2 border-black disabled:opacity-50" disabled={currentLevel === 1}><ChevronLeft size={24} strokeWidth={3}/></button>
                    <div className="px-4 text-center min-w-[140px]">
                        <div className="flex items-center justify-center gap-2">
                             <span className="block text-[10px] font-bold">NIVEL {String(currentLevel).padStart(2, '0')}</span>
                             {completedLevels.includes(currentLevel) && <CheckCircle2 size={12} className="text-green-600 fill-green-100" />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider block overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">{getLevelName(currentLevel)}</span>
                    </div>
                    <button onClick={() => setCurrentLevel(l => Math.min(MAX_LEVELS, l + 1))} className="p-2 hover:bg-black hover:text-white border-l-2 border-black disabled:opacity-50" disabled={currentLevel === MAX_LEVELS}><ChevronRight size={24} strokeWidth={3}/></button>
                </div>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <div id="canvas-3d" className="w-2/5 relative border-r-4 border-black bg-[#E5E7EB] flex flex-col">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-2 flex items-center gap-2 font-bold text-sm"><MousePointer2 size={16} /><span>VISOR 3D</span></div>
                        <button onClick={() => setAutoRotate(!autoRotate)} className={`border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-2 font-bold text-sm flex items-center gap-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ${autoRotate ? 'bg-green-400' : 'bg-red-400 text-white'}`}>{autoRotate ? <Pause size={16}/> : <Play size={16}/>}</button>
                    </div>
                    <VoxelViewer voxels={activeVoxels} autoRotate={autoRotate} onToggleRotate={() => setAutoRotate(!autoRotate)} gridResolution={activeResolution} onVoxelClick={mode === 'synthesis' ? handleVoxelClick : undefined}/>
                    <div className="bg-white border-t-4 border-black p-4 shrink-0">
                        <h4 className="font-black mb-2 text-xs uppercase flex gap-2"><Info size={14}/> LEYENDA DE CARAS</h4>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase mb-2">
                            {[{l:'Planta', c:PALETTE.FACE_TOP}, {l:'Alzado', c:PALETTE.FACE_FRONT}, {l:'P. Derecho', c:PALETTE.FACE_SIDE}, {l:'P. Izq', c:PALETTE.FACE_SIDE_LEFT}, {l:'Atrás', c:PALETTE.FACE_BACK}, {l:'Abajo', c:PALETTE.FACE_BOTTOM}].map((k,i)=>(
                                <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded border border-gray-300"><div className="w-3 h-3 border border-black" style={{background: k.c}}></div>{k.l}</div>
                            ))}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">{mode === 'synthesis' ? "Tip: Usa la barra de herramientas para cambiar entre Bloques y Triángulos." : "Tip: Selecciona el nivel y completa las vistas."}</div>
                    </div>
                </div>
                <div id="grid-container" className="w-3/5 flex flex-col bg-white relative">
                    <div className="absolute inset-0 pointer-events-none opacity-5" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
                        <div className={`flex flex-col items-center border-2 border-black p-4 text-xs font-bold text-center max-w-lg mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${mode === 'analysis' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                            <div className="mb-2 uppercase text-sm">{mode === 'analysis' ? "Análisis: Dibuja las vistas" : "Constructor: Crea la pieza"}</div>
                            
                            {/* TOOLBAR */}
                            <div className="flex gap-4 mt-2 bg-white/50 p-1 rounded-full border border-black/10">
                                <button 
                                    onClick={() => setTool('cube')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all
                                    ${tool === 'cube' ? 'bg-black text-white border-black scale-105' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                                >
                                    <Box size={16}/> BLOQUE / BORRAR
                                </button>
                                <button 
                                    onClick={() => setTool('triangle')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all
                                    ${tool === 'triangle' ? 'bg-black text-white border-black scale-105' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                                >
                                    <Triangle size={16}/> PLANOS INCLINADOS
                                </button>
                            </div>
                            <div className="mt-2 text-[10px] opacity-70">
                                {tool === 'cube' ? "Clic para poner/quitar cuadrados completos." : "Clic para poner triángulos. Clic repetido para rotar."}
                            </div>
                        </div>

                        <div id="plans-capture-area" className="p-8 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100">
                            <div className="grid grid-cols-2 gap-x-12 gap-y-12">
                                <div className="flex justify-center"><ProjectionGrid title="ALZADO (Frente)" color={PALETTE.FACE_FRONT} data={mode === 'analysis' ? userAnalysisGrids.alzado : userSynthesisGrids.alzado} onCellClick={(i, val) => handleCellClick('alzado', i, val)} onEdgeClick={(t, i) => handleEdgeClick('alzado', t, i)} solution={mode === 'analysis' ? levelSolution.alzado : undefined} showResult={mode === 'analysis' ? checkResult : null} mode={mode} validityMask={mode === 'synthesis' ? synthesisValidity?.alzado : undefined} resolution={activeResolution} tool={tool}/></div>
                                <div className="flex justify-center"><ProjectionGrid title="PERFIL (Derecho)" color={PALETTE.FACE_SIDE} data={mode === 'analysis' ? userAnalysisGrids.perfil : userSynthesisGrids.perfil} onCellClick={(i, val) => handleCellClick('perfil', i, val)} onEdgeClick={(t, i) => handleEdgeClick('perfil', t, i)} solution={mode === 'analysis' ? levelSolution.perfil : undefined} showResult={mode === 'analysis' ? checkResult : null} mode={mode} validityMask={mode === 'synthesis' ? synthesisValidity?.perfil : undefined} resolution={activeResolution} tool={tool}/></div>
                                <div className="flex justify-center"><ProjectionGrid title="PLANTA (Arriba)" color={PALETTE.FACE_TOP} data={mode === 'analysis' ? userAnalysisGrids.planta : userSynthesisGrids.planta} onCellClick={(i, val) => handleCellClick('planta', i, val)} onEdgeClick={(t, i) => handleEdgeClick('planta', t, i)} solution={mode === 'analysis' ? levelSolution.planta : undefined} showResult={mode === 'analysis' ? checkResult : null} mode={mode} validityMask={mode === 'synthesis' ? synthesisValidity?.planta : undefined} resolution={activeResolution} tool={tool}/></div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                    <div className="h-20 border-t-4 border-black bg-gray-50 flex items-center justify-center shrink-0 p-4 gap-4 z-20">
                         {mode === 'analysis' ? (
                            <>
                                <button onClick={handleAction} className={`w-64 py-3 px-4 font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm ${checkResult === 'success' ? 'bg-green-500 text-white' : checkResult === 'error' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#FFDE00] hover:bg-[#FFE55C]'}`}>
                                    {checkResult === 'success' ? <><CheckCircle2 size={18}/> CORRECTO</> : checkResult === 'error' ? <><Edit3 size={18}/> SEGUIR EDITANDO</> : <><CheckCircle2 size={18}/> COMPROBAR</>}
                                </button>
                                {checkResult === 'success' && <div className="animate-success"><span className="text-[10px] font-bold bg-green-100 text-green-800 px-3 py-2 rounded border border-green-200 uppercase">¡Nivel Completado!</span></div>}
                                {checkResult === 'error' && <div className="animate-pulse"><span className="text-[10px] font-bold bg-red-100 text-red-800 px-3 py-2 rounded border border-red-200 uppercase">Revisar Fallos</span></div>}
                            </>
                        ) : (
                            <button onClick={handleAction} className="w-64 py-3 px-4 font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-red-100 hover:bg-red-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm"><RefreshCw size={18}/> BORRAR TODO</button>
                        )}
                    </div>
                </div>
            </div>
            {showProgressModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl p-6 relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowProgressModal(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 border border-black"><span className="font-black text-xl leading-none">×</span></button>
                        <h2 className="text-2xl font-black uppercase border-b-4 border-black pb-2">Registro de Progreso</h2>
                        <div className="bg-blue-50 border-2 border-blue-200 p-4">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><User size={20}/> Para el Alumno</h3>
                            <p className="text-sm mb-4">{studentName ? `Alumno: ${studentName}` : 'Nombre no introducido'} <br/> Niveles Completados: {completedLevels.length} / {MAX_LEVELS}</p>
                            <label className="text-xs font-bold uppercase block mb-1">Copia este código y envíalo a tu profesor:</label>
                            <div className="flex gap-2">
                                <textarea readOnly value={progressCode} className="w-full h-24 p-2 text-xs font-mono border-2 border-black resize-none bg-white"/>
                                <button onClick={() => navigator.clipboard.writeText(progressCode)} className="px-4 bg-black text-white font-bold border-2 border-black hover:bg-gray-800 flex flex-col items-center justify-center gap-1"><Clipboard size={16}/> COPIAR</button>
                            </div>
                            
                            {/* LOAD SECTION */}
                            <div className="mt-4 border-t-2 border-blue-200 pt-4">
                                <label className="text-xs font-bold uppercase block mb-1">¿Ya tienes un código? Cárgalo aquí:</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={loadCode} 
                                        onChange={(e) => setLoadCode(e.target.value)} 
                                        placeholder="Pegar código DIEDRICO-LAB-V1_..." 
                                        className="flex-1 p-2 border-2 border-black text-xs font-mono"
                                    />
                                    <button 
                                        onClick={handleLoadProgress} 
                                        className="px-4 bg-white text-black font-bold border-2 border-black hover:bg-gray-100 flex items-center gap-1"
                                    >
                                        <Upload size={16}/> CARGAR
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-yellow-50 border-2 border-yellow-200 p-4">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Unlock size={20}/> Para el Profesor (Verificador)</h3>
                            <p className="text-xs mb-2 text-gray-600">Pega aquí el código que te ha enviado el alumno para ver su progreso.</p>
                            <div className="flex gap-2 mb-4">
                                <input type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="Pegar código DIEDRICO-LAB-V1_..." className="flex-1 p-2 border-2 border-black text-xs font-mono"/>
                                <button onClick={verifyProgressCode} className="px-4 bg-[#FFDE00] font-bold border-2 border-black hover:bg-[#FFE55C]">VERIFICAR</button>
                            </div>
                            {verifyResult && (
                                <div className="bg-white border-2 border-black p-4 animate-success">
                                    <div className="flex justify-between items-start mb-2 border-b border-gray-200 pb-2"><div><span className="block text-xs text-gray-500 uppercase">Alumno</span><span className="font-black text-lg">{verifyResult.name}</span></div><div className="text-right"><span className="block text-xs text-gray-500 uppercase">Fecha</span><span className="font-bold text-sm">{new Date(verifyResult.date).toLocaleDateString()}</span></div></div>
                                    <div className="mb-2"><span className="text-xs font-bold uppercase mr-2">Progreso Total:</span><span className="text-xl font-black text-green-600">{verifyResult.completed.length} / {MAX_LEVELS}</span></div>
                                    <div><span className="text-xs font-bold uppercase block mb-1">Niveles Completados:</span><div className="flex flex-wrap gap-1">{verifyResult.completed.map(l => (<span key={l} className="text-xs bg-green-100 text-green-800 border border-green-200 px-1.5 py-0.5 rounded font-mono">{l}</span>))}{verifyResult.completed.length === 0 && <span className="text-xs text-gray-400 italic">Ninguno</span>}</div></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;