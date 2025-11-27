import React, { useRef, useEffect } from 'react';
import { GridState, PALETTE } from '../utils/geometry';
import { X } from 'lucide-react';

interface ProjectionGridProps {
    title: string;
    color: string;
    data: GridState;
    onCellClick?: (idx: number, forcedValue?: number) => void;
    onEdgeClick?: (type: 'v' | 'h', idx: number) => void;
    solution?: GridState;
    showResult: 'success' | 'error' | null;
    readOnly?: boolean;
    mode: 'analysis' | 'synthesis';
    validityMask?: boolean[]; 
    resolution: number;
    tool?: 'cube' | 'triangle';
}

const ProjectionGrid: React.FC<ProjectionGridProps> = ({ 
    title, color, data, onCellClick, onEdgeClick, solution, showResult, readOnly = false, mode, validityMask, resolution, tool = 'cube'
}) => {
    const gridStyle = {
        gridTemplateColumns: `repeat(${resolution}, minmax(0, 1fr))`
    };

    const isDragging = useRef(false);
    const paintValue = useRef(0);

    useEffect(() => {
        const handleGlobalMouseUp = () => { isDragging.current = false; };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const handleMouseDown = (idx: number) => {
        if (readOnly || (mode === 'analysis' && showResult === 'success')) return;
        
        isDragging.current = true;
        
        const current = data.cells[idx];
        let next = 0;

        if (tool === 'cube') {
            if (current === 0) next = 1;
            else next = 0;
        } else {
            if (current < 2) next = 2;
            else if (current < 5) next = current + 1;
            else next = 2;
        }

        paintValue.current = next;
        if (onCellClick) onCellClick(idx, next);
    };

    const handleMouseEnter = (idx: number) => {
        if (isDragging.current && onCellClick) {
            if (readOnly || (mode === 'analysis' && showResult === 'success')) return;
            onCellClick(idx, paintValue.current);
        }
    };

    const renderCellContent = (type: number, color: string) => {
        if (type === 0) return null;
        if (type === 1) return <div className="w-full h-full" style={{ backgroundColor: color }} />;
        
        let points = "";
        if (type === 2) points = "0,0 0,32 32,32"; 
        else if (type === 3) points = "32,0 32,32 0,32"; 
        else if (type === 4) points = "0,0 32,0 32,32"; 
        else if (type === 5) points = "0,32 0,0 32,0"; 

        return (
            <svg viewBox="0 0 32 32" className="w-full h-full block">
                <polygon points={points} fill={color} />
            </svg>
        );
    };

    return (
        <div className="flex flex-col items-center">
            <div className="mb-2 font-black uppercase text-[10px] tracking-widest bg-black text-white px-2 py-1 shadow-md select-none">
                {title}
            </div>
            <div className="relative bg-white border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="grid gap-0" style={gridStyle}>
                    {data.cells.map((activeType, i) => {
                        let border = activeType > 0 ? 'border-0' : 'border border-gray-200';
                        let cellColor = color;
                        let isError = false;
                        
                        if (mode === 'analysis' && showResult && solution) {
                            const solType = solution.cells[i];
                            const userFilled = activeType > 0;
                            const solFilled = solType > 0;
                            if (userFilled !== solFilled) {
                                isError = true;
                                cellColor = '#FCA5A5'; 
                            } else if (userFilled) {
                                cellColor = PALETTE.SUCCESS;
                            }
                        }

                        const isInvalid = mode === 'synthesis' && activeType > 0 && validityMask && !validityMask[i];

                        return (
                            <div key={i}
                                onMouseDown={() => handleMouseDown(i)}
                                onMouseEnter={() => handleMouseEnter(i)}
                                className={`w-8 h-8 ${border} ${readOnly ? '' : 'cursor-pointer'} relative select-none flex items-center justify-center bg-transparent`}
                                style={{ 
                                    backgroundImage: isInvalid ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' : 'none'
                                }}
                            >
                                {renderCellContent(activeType, isError ? '#FCA5A5' : cellColor)}
                                {mode === 'analysis' && showResult && isError && <div className="absolute inset-0 flex items-center justify-center text-red-700 font-black z-0">×</div>}
                                {isInvalid && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><X size={20} className="text-red-500 opacity-80" strokeWidth={3} /></div>}
                            </div>
                        );
                    })}
                </div>
                 <div className="absolute top-1 left-1 right-1 bottom-1 pointer-events-none">
                    {Array.from({length: resolution * (resolution - 1)}).map((_, i) => {
                        const r = Math.floor(i / (resolution - 1));
                        const c = i % (resolution - 1);
                        const left = (c + 1) * 2 + 'rem';
                        const top = r * 2 + 'rem';
                        const edgeState = data.v[i];
                        let lineClass = edgeState === 1 ? 'bg-black' : 'bg-transparent';
                        const zIndex = edgeState > 0 ? 'z-20' : 'z-30';
                        return (
                             <div key={`v-${i}`} className={`absolute w-2 h-8 -ml-1 flex justify-center items-center group ${zIndex} ${(!readOnly && (!showResult || showResult === 'error')) ? 'cursor-col-resize pointer-events-auto' : ''}`} style={{ left, top }} onMouseDown={() => onEdgeClick && onEdgeClick('v', i)}>
                                <div className={`w-1 h-full transition-colors ${lineClass} ${(!readOnly && edgeState === 0) ? 'group-hover:bg-gray-300' : ''}`}></div>
                            </div>
                        );
                    })}
                </div>
                 <div className="absolute top-1 left-1 right-1 bottom-1 pointer-events-none">
                    {Array.from({length: resolution * (resolution - 1)}).map((_, i) => {
                        const r = Math.floor(i / resolution);
                        const c = i % resolution;
                        const top = (r + 1) * 2 + 'rem';
                        const left = c * 2 + 'rem';
                        const edgeState = data.h[i];
                        let lineClass = edgeState === 1 ? 'bg-black' : 'bg-transparent';
                        const zIndex = edgeState > 0 ? 'z-20' : 'z-30';
                        return (
                             <div key={`h-${i}`} className={`absolute h-2 w-8 -mt-1 flex justify-center items-center group ${zIndex} ${(!readOnly && (!showResult || showResult === 'error')) ? 'cursor-row-resize pointer-events-auto' : ''}`} style={{ left, top }} onMouseDown={() => onEdgeClick && onEdgeClick('h', i)}>
                                <div className={`h-1 w-full transition-colors ${lineClass} ${(!readOnly && edgeState === 0) ? 'group-hover:bg-gray-300' : ''}`}></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProjectionGrid;