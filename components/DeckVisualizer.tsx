
import React from 'react';
import { DeckSpecs, CalculationResult, Point, ViewMode } from '../types';
import { JOIST_SPACING, DECKING_GAP, DECKING_SPECS } from '../constants';
import { isPointInPolygon, getHorizontalIntersections, getVerticalIntersections } from '../logic/calculator';

interface VisualizerProps {
  specs: DeckSpecs;
  calc: CalculationResult;
  layers: {
    piles: boolean;
    bearers: boolean;
    joists: boolean;
    decking: boolean;
  };
  viewMode: ViewMode;
  onPointMove?: (index: number, newPoint: Point) => void;
  isEditing?: boolean;
}

const DeckVisualizer: React.FC<VisualizerProps> = ({ specs, calc, layers, viewMode, onPointMove, isEditing }) => {
  const { points, height } = specs.dimensions;
  
  const svgWidth = 800;
  const svgHeight = 600;
  const padding = 140;
  
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  
  const width = maxX - minX;
  const depth = maxY - minY;
  
  const scale = (svgWidth - padding * 2) / Math.max(width, depth, 1500);

  const PILE_S = 125;
  const BEARER_D = 140; 
  const JOIST_D = 140;
  const DECK_D = DECKING_SPECS[specs.deckingType].thickness;
  const BOARD_W = DECKING_SPECS[specs.deckingType].width;

  const toIso = (p: Point, z: number = 0) => {
    const relX = (p.x - (minX + maxX) / 2) * scale;
    const relY = (p.y - (minY + maxY) / 2) * scale;
    const relZ = z * scale * 0.45;
    
    if (viewMode === ViewMode.PLAN) {
      return { x: svgWidth / 2 + relX, y: svgHeight / 2 + relY };
    }
    
    const isoX = (relX - relY) * 0.866;
    const isoY = (relX + relY) * 0.5 - relZ;
    return { x: svgWidth / 2 + isoX, y: svgHeight / 2 + isoY };
  };

  const renderBox = (p1: Point, p2: Point, zB: number, zT: number, thick: number, color: string, isVertical: boolean = false, opacity: number = 1) => {
    const pt1 = toIso(p1, zT);
    const pt2 = toIso(p2, zT);

    if (viewMode === ViewMode.PLAN) {
      return <line x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y} stroke={color} strokeWidth={thick * scale} strokeLinecap="butt" strokeOpacity={opacity} />;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const nx = isVertical ? 1 : -dy / len;
    const ny = isVertical ? 0 : dx / len;

    const off = (p: Point, d: number) => ({ x: p.x + nx * d, y: p.y + ny * d });

    const topPts = [toIso(off(p1, -thick/2), zT), toIso(off(p2, -thick/2), zT), toIso(off(p2, thick/2), zT), toIso(off(p1, thick/2), zT)];
    const sidePts = [toIso(off(p1, -thick/2), zB), toIso(off(p2, -thick/2), zB), toIso(off(p2, -thick/2), zT), toIso(off(p1, -thick/2), zT)];
    const frontPts = [toIso(off(p1, -thick/2), zB), toIso(off(p1, thick/2), zB), toIso(off(p1, thick/2), zT), toIso(off(p1, -thick/2), zT)];

    const draw = (pts: {x:number, y:number}[]) => pts.map((p,i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
      <g style={{ opacity }}>
        <path d={draw(sidePts)} fill={color} filter="brightness(0.65)" />
        <path d={draw(frontPts)} fill={color} filter="brightness(0.85)" />
        <path d={draw(topPts)} fill={color} stroke={color} strokeWidth="0.2" />
      </g>
    );
  };

  const renderDimensionLine = (p1: Point, p2: Point, offset: number, label?: string, isInternal: boolean = false) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 0;
    if (len < 5) return null;

    const ux = dx/len, uy = dy/len;
    const nx = -uy, ny = ux;

    const sp1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };
    const sp2 = { x: p2.x + nx * offset, y: p2.y + ny * offset };
    
    const pt1 = toIso(sp1, height);
    const pt2 = toIso(sp2, height);
    const mid = { x: (pt1.x + pt2.x) / 2, y: (pt1.y + pt2.y) / 2 };
    const angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x) * 180 / Math.PI;

    return (
      <g className={`dimension-line ${isInternal ? 'opacity-60' : ''}`}>
        <line x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y} stroke="#64748b" strokeWidth="0.8" />
        {/* Arch Ticks */}
        <line x1={pt1.x - (ux+uy)*6} y1={pt1.y + (ux-uy)*6} x2={pt1.x + (ux+uy)*6} y2={pt1.y - (ux-uy)*6} stroke="#64748b" strokeWidth="1.2" />
        <line x1={pt2.x - (ux+uy)*6} y1={pt2.y + (ux-uy)*6} x2={pt2.x + (ux+uy)*6} y2={pt2.y - (ux-uy)*6} stroke="#64748b" strokeWidth="1.2" />
        {/* Text */}
        <g transform={`translate(${mid.x}, ${mid.y}) rotate(${angle})`}>
          <rect x="-24" y="-12" width="48" height="12" fill="white" />
          <text x="0" y="-3" textAnchor="middle" className="text-[9px] font-black fill-slate-500 uppercase select-none">
            {label || `${Math.round(len)}mm`}
          </text>
        </g>
      </g>
    );
  };

  const bPath = points.map((p, i) => { const pt = toIso(p, 0); return `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`; }).join(' ') + ' Z';

  return (
    <div id="deck-visualizer-frame" className="bg-slate-50 p-6 rounded-3xl shadow-inner flex flex-col items-center border border-slate-200 relative overflow-hidden">
      <svg id="deck-plan-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-auto rounded-2xl bg-white shadow-lg overflow-visible">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {viewMode === ViewMode.ISOMETRIC && (
          <path d={bPath} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="6,6" />
        )}

        {/* Foundation Piles */}
        {layers.piles && Array.from({ length: calc.bearerRows }).map((_, r) => {
          const y = minY + 250 + r * calc.joistSpan;
          return Array.from({ length: calc.pilesPerRow }).map((__, c) => {
            const x = minX + 250 + c * calc.bearerSpan;
            if (!isPointInPolygon({ x, y }, points)) return null;
            return <React.Fragment key={`p-${r}-${c}`}>
              {renderBox({x:x-PILE_S/4, y}, {x:x+PILE_S/4, y}, 0, height - BEARER_D - 20, PILE_S, "#1e293b", true)}
            </React.Fragment>;
          });
        })}

        {/* Bearers */}
        {layers.bearers && Array.from({ length: calc.bearerRows }).map((_, r) => {
          const y = minY + 250 + r * calc.joistSpan;
          const xInts = getHorizontalIntersections(y, points);
          return Array.from({ length: xInts.length / 2 }).map((__, i) => (
            <React.Fragment key={`b-${r}-${i}`}>
              {renderBox({ x: xInts[i*2], y }, { x: xInts[i*2+1], y }, height - BEARER_D - 10, height - 10, 70, "#2563eb")}
            </React.Fragment>
          ));
        })}

        {/* Joists */}
        {layers.joists && Array.from({ length: Math.ceil(width / JOIST_SPACING) + 1 }).map((_, c) => {
          const x = minX + c * JOIST_SPACING;
          const yInts = getVerticalIntersections(x, points);
          return Array.from({ length: yInts.length / 2 }).map((__, i) => (
            <React.Fragment key={`j-${c}-${i}`}>
              {renderBox({ x, y: yInts[i*2] }, { x, y: yInts[i*2+1] }, height - JOIST_D, height, 45, "#0ea5e9")}
            </React.Fragment>
          ));
        })}

        {/* Boundary Joist (Capping) */}
        {layers.joists && points.map((p, i) => {
          const p2 = points[(i + 1) % points.length];
          return <React.Fragment key={`cap-${i}`}>
            {renderBox(p, p2, height - JOIST_D, height, 45, "#10b981")}
          </React.Fragment>;
        })}

        {/* Decking Boards (60% Opacity) */}
        {layers.decking && Array.from({ length: calc.deckingBoardCount }).map((_, row) => {
          const y = minY + row * (BOARD_W + DECKING_GAP) + BOARD_W / 2;
          const xInts = getHorizontalIntersections(y, points);
          return Array.from({ length: xInts.length / 2 }).map((__, i) => (
            <React.Fragment key={`board-${row}-${i}`}>
              {renderBox({ x: xInts[i*2], y }, { x: xInts[i*2+1], y }, height - DECK_D, height, BOARD_W, "#f97316", false, 0.6)}
            </React.Fragment>
          ));
        })}

        {/* ARCHITECTURAL ANNOTATIONS (Plan View Only) */}
        {viewMode === ViewMode.PLAN && (
          <g className="annotations">
            {/* Perimeter Dimensions */}
            {points.map((p, i) => {
              const nextP = points[(i + 1) % points.length];
              return <React.Fragment key={`ext-dim-${i}`}>
                {renderDimensionLine(p, nextP, 100)}
              </React.Fragment>;
            })}

            {/* Internal Structural Dimensions: Joist Spacing */}
            {layers.joists && (
              <g className="joist-dims">
                {Array.from({ length: Math.min(3, Math.ceil(width / JOIST_SPACING)) }).map((_, c) => {
                  const x1 = minX + c * JOIST_SPACING;
                  const x2 = minX + (c + 1) * JOIST_SPACING;
                  if (x2 > maxX) return null;
                  return <React.Fragment key={`jd-${c}`}>
                    {renderDimensionLine({x: x1, y: minY + 150}, {x: x2, y: minY + 150}, 0, `${JOIST_SPACING} TYP.`, true)}
                  </React.Fragment>;
                })}
              </g>
            )}

            {/* Internal Structural Dimensions: Bearer/Joist Spans */}
            {layers.bearers && (
              <g className="bearer-dims">
                {Array.from({ length: calc.bearerRows - 1 }).map((_, r) => {
                  const y1 = minY + 250 + r * calc.joistSpan;
                  const y2 = minY + 250 + (r + 1) * calc.joistSpan;
                  return <React.Fragment key={`bd-${r}`}>
                    {renderDimensionLine({x: minX + 150, y: y1}, {x: minX + 150, y: y2}, 0, `${Math.round(calc.joistSpan)} CTRS`, true)}
                  </React.Fragment>;
                })}
              </g>
            )}

            {/* Internal Structural Dimensions: Pile Spacing */}
            {layers.piles && (
              <g className="pile-dims">
                {Array.from({ length: Math.min(2, calc.pilesPerRow - 1) }).map((_, c) => {
                  const x1 = minX + 250 + c * calc.bearerSpan;
                  const x2 = minX + 250 + (c + 1) * calc.bearerSpan;
                  return <React.Fragment key={`pd-${c}`}>
                    {renderDimensionLine({x: x1, y: minY + 250}, {x: x2, y: minY + 250}, 40, `${Math.round(calc.bearerSpan)} TYP.`, true)}
                  </React.Fragment>;
                })}
              </g>
            )}
          </g>
        )}

        <path 
          d={points.map((p, i) => { const pt = toIso(p, height); return `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`; }).join(' ') + ' Z'} 
          fill="none" stroke="#0f172a" strokeWidth="0.5" strokeOpacity="0.5" 
        />

        {/* Title Block Overlay */}
        <g transform="translate(560, 480)" className="title-block shadow-sm">
          <rect width="220" height="100" fill="white" stroke="#cbd5e1" strokeWidth="1" rx="4" />
          <text x="10" y="25" className="text-[14px] font-black fill-emerald-900 uppercase italic tracking-tighter">KIWIDECK BUILDER</text>
          <line x1="10" y1="35" x2="210" y2="35" stroke="#f1f5f9" strokeWidth="1" />
          <text x="10" y="55" className="text-[9px] font-bold fill-slate-500 uppercase">DRAWING: {viewMode} PLAN</text>
          <text x="10" y="70" className="text-[9px] font-bold fill-slate-500 uppercase">TIMBER: SG8 H3.2/H5</text>
          <text x="10" y="85" className="text-[9px] font-bold fill-slate-400 uppercase">STANDARD: NZS 3604:2011</text>
        </g>

        {viewMode === ViewMode.PLAN && isEditing && points.map((p, i) => {
          const pt = toIso(p, height);
          return (
            <g key={`h-${i}`} onMouseDown={(e) => {
              const rect = (e.currentTarget as any).ownerSVGElement.getBoundingClientRect();
              const move = (me: MouseEvent) => {
                const dx = (me.clientX - rect.left - svgWidth/2) / scale;
                const dy = (me.clientY - rect.top - svgHeight/2) / scale;
                const nx = Math.round((dx + (minX + maxX)/2) / 100) * 100;
                const ny = Math.round((dy + (minY + maxY)/2) / 100) * 100;
                onPointMove?.(i, { x: nx, y: ny });
              };
              window.addEventListener('mousemove', move);
              window.addEventListener('mouseup', () => window.removeEventListener('mousemove', move), { once: true });
            }}>
              <circle cx={pt.x} cy={pt.y} r="20" fill="#f97316" fillOpacity="0.15" className="cursor-move" />
              <circle cx={pt.x} cy={pt.y} r="8" fill="#f97316" stroke="white" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      
      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-3xl no-print">
        <LegendItem color="bg-[#1e293b]" label="Piles" detail="125x125 H5" />
        <LegendItem color="bg-[#2563eb]" label="Bearers" detail="140x70 SG8" />
        <LegendItem color="bg-[#0ea5e9]" label="Joists" detail="140x45 SG8" />
        <LegendItem color="bg-[#10b981]" label="Capping" detail="Boundary Joist" />
        <LegendItem color="bg-[#f97316]" label="Decking" detail="60% Opacity" />
      </div>
    </div>
  );
};

const LegendItem = ({ color, label, detail }: { color: string; label: string; detail: string }) => (
  <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-100 shadow-sm">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase text-slate-700 leading-tight">{label}</span>
      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">{detail}</span>
    </div>
  </div>
);

export default DeckVisualizer;
