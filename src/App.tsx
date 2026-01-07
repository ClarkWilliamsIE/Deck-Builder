
import React, { useState, useMemo } from 'react';
import { 
  Hammer, 
  Printer, 
  AlertTriangle, 
  Settings2, 
  Layers, 
  Info,
  Box,
  MousePointer2,
  Trash2,
  Plus,
  Square,
  Pentagon,
  Ruler,
  Download,
  FileText,
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';
import { TimberGrade, DeckingType, DeckSpecs, ViewMode, Point } from './types';
import { calculateDeck } from './logic/calculator';
import { WASTE_FACTOR, DECKING_SPECS, FOOTING_DEPTH } from './constants';
import DeckVisualizer from './components/DeckVisualizer';
import ShoppingList from './components/ShoppingList';

const App: React.FC = () => {
  const [shapeMode, setShapeMode] = useState<'standard' | 'irregular'>('standard');
  const [specs, setSpecs] = useState<DeckSpecs>({
    dimensions: {
      points: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 3000 },
        { x: 0, y: 3000 },
      ],
      height: 600,
    },
    timberGrade: TimberGrade.SG8_WET,
    deckingType: DeckingType.PREMIUM_PINE_90,
  });

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PLAN);
  const [layers, setLayers] = useState({
    piles: true,
    bearers: true,
    joists: true,
    decking: true,
  });

  const calculation = useMemo(() => calculateDeck(specs), [specs]);

  const updateStandardShape = (w: number, d: number) => {
    setSpecs(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        points: [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: d },
          { x: 0, y: d },
        ]
      }
    }));
  };

  const handlePointMove = (index: number, newPoint: Point) => {
    setSpecs(prev => {
      const newPoints = [...prev.dimensions.points];
      newPoints[index] = newPoint;
      return { ...prev, dimensions: { ...prev.dimensions, points: newPoints } };
    });
  };

  const updateSegmentLength = (index: number, newLength: number) => {
    setSpecs(prev => {
      const pts = [...prev.dimensions.points];
      const p1 = pts[index];
      const p2 = pts[(index + 1) % pts.length];
      const dx = p2.x - p1.x, dy = p2.y - p1.y, currentLen = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / currentLen, uy = dy / currentLen;
      const deltaX = (ux * newLength) - dx, deltaY = (uy * newLength) - dy;

      for (let i = (index + 1) % pts.length; i !== index; i = (i + 1) % pts.length) {
        pts[i] = { x: pts[i].x + deltaX, y: pts[i].y + deltaY };
        if ((i + 1) % pts.length === 0 && index !== pts.length - 1) break;
      }
      if (index === pts.length - 1) pts[index] = { x: pts[index].x - deltaX, y: pts[index].y - deltaY };
      return { ...prev, dimensions: { ...prev.dimensions, points: pts } };
    });
  };

  const addPoint = () => {
    const last = specs.dimensions.points[specs.dimensions.points.length - 1];
    setSpecs(prev => ({ ...prev, dimensions: { ...prev.dimensions, points: [...prev.dimensions.points, { x: last.x + 1000, y: last.y }] } }));
  };

  const removePoint = (index: number) => {
    if (specs.dimensions.points.length <= 3) return;
    setSpecs(prev => ({ ...prev, dimensions: { ...prev.dimensions, points: prev.dimensions.points.filter((_, i) => i !== index) } }));
  };

  const isHighDeck = specs.dimensions.height > 1500;
  const boundingBox = useMemo(() => {
    const pts = specs.dimensions.points;
    const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
    const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
    return { width: maxX - minX, depth: maxY - minY };
  }, [specs.dimensions.points]);

  const exportBOM = () => {
    const { width, depth } = boundingBox;
    const summary = `
KIWIDECK PROJECT SUMMARY & BOM
================================
Date: ${new Date().toLocaleDateString()}
Structural Compliance: NZS 3604:2011

DECK DIMENSIONS:
- Footprint: ${width}mm x ${depth}mm
- Total Area: ${calculation.area.toFixed(2)}m²
- Height off ground: ${specs.dimensions.height}mm
- Perimeter Sides: ${specs.dimensions.points.length}

STRUCTURAL SPECIFICATIONS:
- Timber Grade: ${specs.timberGrade}
- Bearer Type: ${calculation.bearerSize}
- Joist Type: ${calculation.joistSize}
- Foundation Piles: ${calculation.totalPiles} (125x125 H5)
- Bearer Spacing: Approx ${calculation.joistSpan.toFixed(0)}mm centers
- Joist Spacing: 450mm centers

SHOPPING LIST (Including 10% Waste):
- Piles: ${calculation.totalPiles} pcs (Length: ${specs.dimensions.height + FOOTING_DEPTH}mm)
- Concrete: ${calculation.concreteBags} bags (Handycrete 25kg)
- Bearers: ${Math.ceil((width / 1000) * calculation.bearerRows * WASTE_FACTOR)} LM of ${calculation.bearerSize}
- Joists: ${Math.ceil(calculation.joistCount * (depth / 1000) * WASTE_FACTOR)} LM of ${calculation.joistSize}
- Decking: ${Math.ceil((width / 1000) * calculation.deckingBoardCount * WASTE_FACTOR)} LM of ${specs.deckingType}
- Hardware: Approx ${Math.ceil(calculation.screwsCount / 100) * 100} Stainless Screws

NOTES:
${calculation.cantileverWarning ? `!! WARNING: ${calculation.cantileverWarning}` : '- Structural logic within NZS 3604 safe limits.'}
- Ensure all timber is H3.2 (framing) and H5 (piles).
- Balustrade required for decks >1000mm off ground.
    `.trim();

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'KiwiDeck_BOM_Summary.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTechnicalPlan = () => {
    const svg = document.getElementById('deck-plan-svg');
    if (!svg) {
      alert("Plan visualizer not found.");
      return;
    }

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns\:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KiwiDeck_Technical_Plan_${viewMode}.svg`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-emerald-900 text-white py-6 px-6 shadow-md no-print border-b border-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg shadow-inner">
              <Hammer className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase italic leading-none mb-1">KiwiDeck Builder</h1>
              <p className="text-emerald-300 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Structural Compliance - NZS 3604:2011
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={exportTechnicalPlan} 
              title="Download Vector Technical Drawing (Scalable SVG)"
              className="flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-400 transition-all px-6 py-2.5 rounded-full font-black text-xs uppercase shadow-lg active:scale-95"
            >
              <ImageIcon className="w-4 h-4" /> Export Plans (SVG)
            </button>
            <button 
              onClick={exportBOM} 
              title="Download Project Summary & Shopping List"
              className="flex items-center gap-2 bg-white text-emerald-900 hover:bg-emerald-50 transition-all px-6 py-2.5 rounded-full font-black text-xs uppercase shadow-lg active:scale-95"
            >
              <FileText className="w-4 h-4" /> Export BOM
            </button>
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 transition-all px-6 py-2.5 rounded-full font-black text-xs uppercase shadow-lg active:scale-95 border border-emerald-600"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6 no-print">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button onClick={() => setShapeMode('standard')} className={`flex-1 py-4 text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-colors ${shapeMode === 'standard' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Square className="w-4 h-4" /> Standard
              </button>
              <button onClick={() => setShapeMode('irregular')} className={`flex-1 py-4 text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-colors ${shapeMode === 'irregular' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Pentagon className="w-4 h-4" /> Irregular
              </button>
            </div>

            <div className="p-6">
              {shapeMode === 'standard' ? (
                <div className="space-y-5">
                  <InputGroup label="Deck Width (mm)" description="Facing House" value={boundingBox.width} onChange={(v) => updateStandardShape(Number(v), boundingBox.depth)} />
                  <InputGroup label="Deck Projection (mm)" description="Outward" value={boundingBox.depth} onChange={(v) => updateStandardShape(boundingBox.width, Number(v))} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Perimeter Sides</h3>
                    <button onClick={addPoint} className="text-[10px] bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-black uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm">
                      <Plus className="w-3 h-3" /> Add Wall
                    </button>
                  </div>
                  <div className="space-y-3">
                    {specs.dimensions.points.map((p, i) => {
                      const nextP = specs.dimensions.points[(i + 1) % specs.dimensions.points.length];
                      const length = Math.round(Math.sqrt(Math.pow(nextP.x - p.x, 2) + Math.pow(nextP.y - p.y, 2)));
                      return (
                        <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 group shadow-xs">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-700 uppercase italic">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white shadow-sm not-italic">{String.fromCharCode(65 + i)}</span>
                              Side {String.fromCharCode(65 + i)}
                            </span>
                            <button onClick={() => removePoint(i)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                          <div className="relative">
                            <Ruler className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input type="number" className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-12 py-2 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" value={length} onChange={(e) => updateSegmentLength(i, Number(e.target.value))} />
                            <span className="absolute right-3 top-2.5 text-[10px] font-black text-slate-300 uppercase">mm</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <InputGroup label="Deck Height (mm)" description="Ground to Surface" value={specs.dimensions.height} onChange={(v) => setSpecs(prev => ({ ...prev, dimensions: { ...prev.dimensions, height: Number(v) } }))} />
                {isHighDeck && (
                  <div className="flex gap-3 bg-red-50 border border-red-200 p-4 rounded-xl animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-800 font-black uppercase leading-tight">Council Building Consent Required (&gt;1.5m)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-orange-500" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Material Config</h2>
            </div>
            <div className="space-y-4">
              <SelectGroup label="Timber Grade" value={specs.timberGrade} options={Object.values(TimberGrade)} onChange={(v) => setSpecs(p => ({ ...p, timberGrade: v as TimberGrade }))} />
              <SelectGroup label="Decking Profile" value={specs.deckingType} options={Object.values(DeckingType)} onChange={(v) => setSpecs(p => ({ ...p, deckingType: v as DeckingType }))} />
            </div>
          </section>

          <section className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 shadow-sm">
             <div className="flex items-start gap-4">
                <Info className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="w-full text-xs font-bold">
                  <h3 className="text-emerald-800 text-[10px] font-black uppercase tracking-widest mb-3 italic">Structural Summary</h3>
                  <div className="space-y-2.5">
                    <SummaryItem label="Bearer Type" value={calculation.bearerSize} />
                    <SummaryItem label="Joist Type" value={calculation.joistSize} />
                    <SummaryItem label="Foundation Piles" value={calculation.totalPiles} />
                    <SummaryItem label="Total Area" value={`${calculation.area.toFixed(1)}m²`} />
                  </div>
                </div>
             </div>
          </section>
        </aside>

        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
               <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 <MousePointer2 className="w-5 h-5 text-emerald-600" /> Professional Plan Sets
               </h2>
               <div className="flex flex-wrap items-center gap-4 no-print">
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                    <button onClick={() => setViewMode(ViewMode.PLAN)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.PLAN ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Tech Plan</button>
                    <button onClick={() => setViewMode(ViewMode.ISOMETRIC)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.ISOMETRIC ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>3D View</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(layers).map(([k, v]) => (
                      <button key={k} onClick={() => setLayers(prev => ({ ...prev, [k]: !v }))} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${v ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                        {k}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <DeckVisualizer specs={specs} calc={calculation} layers={layers} viewMode={viewMode} isEditing={shapeMode === 'irregular'} onPointMove={handlePointMove} />
            
            <div className="mt-4 flex flex-col items-center gap-2 no-print">
              <span className="text-[10px] text-slate-400 font-bold uppercase italic flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                Plans now include internal spacing for joists (450mm TYP.), bearer spans, and pile centers.
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase italic flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" />
                Technical Plans feature standard architectural tick marks and professional title blocks.
              </span>
            </div>
          </div>

          {calculation.cantileverWarning && (
            <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 flex gap-5 shadow-sm">
              <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-red-900 uppercase italic mb-1">Structural Safety Breach</h4>
                <p className="text-sm text-red-800 font-bold leading-relaxed">{calculation.cantileverWarning}</p>
                <p className="text-[10px] text-red-600 uppercase mt-2 font-black tracking-widest">Foundation grid adjusted to 300mm edge safety limit.</p>
              </div>
            </div>
          )}

          <ShoppingList specs={specs} calc={calculation} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex gap-4 shadow-sm">
              <ImageIcon className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <h4 className="text-[10px] font-black text-blue-800 uppercase italic">Architectural Blueprints</h4>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed font-bold italic">
                  SVG exports provide scalable architectural blueprints with internal spacing measurements. 
                  Ready for project approval and merchant ordering.
                </p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex gap-4 shadow-sm">
              <Settings2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-[10px] font-black text-emerald-800 uppercase italic">Structural Layout</h4>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed font-bold italic">
                  Toggle structural layers to see detailed spacings for bearers and piles. 
                  All measurements are calculated based on NZS 3604:2011 logic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const InputGroup = ({ label, description, value, onChange }: { label: string, description: string, value: number, onChange: (v: string) => void }) => (
  <div className="group">
    <div className="flex justify-between items-baseline mb-1.5">
      <label className="text-xs font-black text-slate-800 uppercase tracking-tight">{label}</label>
      <span className="text-[9px] text-slate-400 font-black uppercase italic">{description}</span>
    </div>
    <div className="relative">
      <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" value={Math.round(value)} onChange={(e) => onChange(e.target.value)} />
      <span className="absolute right-4 top-3 text-slate-400 font-black text-xs uppercase">mm</span>
    </div>
  </div>
);

const SelectGroup = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => (
  <div>
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{label}</label>
    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm cursor-pointer" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SummaryItem = ({ label, value }: { label: string, value: any }) => (
  <div className="flex justify-between items-center text-[11px] py-1 border-b border-emerald-100/40 last:border-0 italic">
    <span className="text-emerald-700 font-black uppercase tracking-tighter">{label}</span>
    <span className="text-emerald-900 font-black">{value}</span>
  </div>
);

export default App;
