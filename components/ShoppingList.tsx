
import React from 'react';
import { Package, Hash, Ruler, Box, ShoppingCart } from 'lucide-react';
import { DeckSpecs, CalculationResult } from '../types';
import { WASTE_FACTOR, DECKING_SPECS, FOOTING_DEPTH } from '../constants';

interface ShoppingListProps {
  specs: DeckSpecs;
  calc: CalculationResult;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ specs, calc }) => {
  // Fix: Calculate bounding box dimensions as they are not properties of DeckDimensions
  const { points, height } = specs.dimensions;
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const width = maxX - minX;
  const projection = maxY - minY;

  // Linear Meters Calculations
  const totalBearerLM = (width / 1000) * calc.bearerRows * WASTE_FACTOR;
  const totalJoistLM = (projection / 1000) * calc.joistCount * WASTE_FACTOR;
  const totalDeckingLM = (width / 1000) * calc.deckingBoardCount * WASTE_FACTOR;

  const items = [
    {
      category: 'Foundation',
      name: '125x125mm H5 Piles',
      qty: calc.totalPiles,
      unit: 'pcs',
      detail: `Length: ${height + FOOTING_DEPTH}mm (including footing)`
    },
    {
      category: 'Foundation',
      name: 'Concrete (Handycrete)',
      qty: calc.concreteBags,
      unit: 'bags',
      detail: '2x 25kg bags per pile'
    },
    {
      category: 'Framing',
      name: `${calc.bearerSize} Bearers`,
      qty: Math.ceil(totalBearerLM),
      unit: 'LM',
      detail: `Based on ${calc.bearerRows} rows across ${width}mm width`
    },
    {
      category: 'Framing',
      name: `${calc.joistSize} Joists`,
      qty: Math.ceil(totalJoistLM),
      unit: 'LM',
      detail: `Based on ${calc.joistCount} joists at 450mm centers`
    },
    {
      category: 'Finish',
      name: specs.deckingType,
      qty: Math.ceil(totalDeckingLM),
      unit: 'LM',
      detail: `${calc.deckingBoardCount} boards total`
    },
    {
      category: 'Hardware',
      name: 'Decking Screws (Stainless)',
      qty: Math.ceil(calc.screwsCount / 100) * 100,
      unit: 'qty',
      detail: 'Estimated 2 screws per joist crossing'
    },
    {
      category: 'Hardware',
      name: 'Joist Hangers & Bolts',
      qty: calc.totalPiles + calc.joistCount * 2,
      unit: 'mixed',
      detail: 'M12 Bolts for piles, 45mm hangers for joists'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8 print:border-none print:shadow-none">
      <div className="bg-emerald-800 p-4 flex items-center gap-3 text-white">
        <ShoppingCart className="w-6 h-6" />
        <h2 className="text-xl font-bold">Shopping List (BOM)</h2>
      </div>
      
      <div className="p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
              <th className="px-6 py-4">Item Details</th>
              <th className="px-6 py-4 text-center">Quantity</th>
              <th className="px-6 py-4">Context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.category}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {item.qty} {item.unit}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 italic">
                  {item.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-6 bg-slate-50 border-t border-slate-200">
        <div className="flex items-start gap-4">
          <Package className="w-5 h-5 text-slate-400 mt-1" />
          <div>
            <h4 className="text-sm font-semibold text-slate-700">Estimator Note</h4>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Quantities include a 10% waste factor. Prices vary by merchant. 
              Ensure all timber is H3.2 (framing) and H5 (piles) treated for durability in NZ conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;
