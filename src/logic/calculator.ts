
import { DeckSpecs, CalculationResult, Point } from '../types';
import { 
  MAX_PILE_SPACING, 
  JOIST_SPACING, 
  DECKING_GAP, 
  DECKING_SPECS, 
  getBearerSize, 
  getJoistSize 
} from '../constants';

export const getPolygonArea = (points: Point[]) => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2 / 1000000;
};

export const isPointInPolygon = (point: Point, polygon: Point[]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export const getHorizontalIntersections = (y: number, points: Point[]) => {
  const intersections: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
      const x = p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y);
      intersections.push(x);
    }
  }
  return intersections.sort((a, b) => a - b);
};

export const getVerticalIntersections = (x: number, points: Point[]) => {
  const intersections: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    if ((p1.x <= x && p2.x > x) || (p2.x <= x && p1.x > x)) {
      const y = p1.y + (x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x);
      intersections.push(y);
    }
  }
  return intersections.sort((a, b) => a - b);
};

export const calculateDeck = (specs: DeckSpecs): CalculationResult => {
  const { points, height } = specs.dimensions;
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  
  const width = maxX - minX;
  const projection = maxY - minY;
  const area = getPolygonArea(points);

  // BEARER ROW OPTIMIZATION (Joist Span)
  // We place rows starting 250mm from edges to ensure joist cantilever is safe.
  const edgeOffset = 250;
  const effectiveProjection = Math.max(0, projection - edgeOffset * 2);
  const maxJoistSpan = 1200; 
  const bearerRowsCount = Math.max(2, Math.ceil(effectiveProjection / maxJoistSpan) + 1);
  const actualJoistSpan = effectiveProjection / (bearerRowsCount - 1);

  // PILE SPACING OPTIMIZATION (Bearer Span)
  const effectiveWidth = Math.max(0, width - edgeOffset * 2);
  const pilesPerRow = Math.max(2, Math.ceil(effectiveWidth / MAX_PILE_SPACING) + 1);
  const actualBearerSpan = effectiveWidth / (pilesPerRow - 1);

  let totalPiles = 0;
  let bearerLM = 0;
  for (let r = 0; r < bearerRowsCount; r++) {
    const y = minY + edgeOffset + r * actualJoistSpan;
    for (let c = 0; c < pilesPerRow; c++) {
      const x = minX + edgeOffset + c * actualBearerSpan;
      if (isPointInPolygon({ x, y }, points)) {
        totalPiles++;
      }
    }
    const segments = getHorizontalIntersections(y, points);
    for (let i = 0; i < segments.length; i += 2) {
      if (segments[i+1] !== undefined) {
        bearerLM += (segments[i+1] - segments[i]);
      }
    }
  }

  // JOIST & CANTILEVER CHECK
  let joistLM = 0;
  let maxJoistCantilever = 0;
  const joistCountAcross = Math.ceil(width / JOIST_SPACING) + 1;
  for (let c = 0; c < joistCountAcross; c++) {
    const x = minX + c * JOIST_SPACING;
    const segments = getVerticalIntersections(x, points);
    for (let i = 0; i < segments.length; i += 2) {
      if (segments[i+1] !== undefined) {
        joistLM += (segments[i+1] - segments[i]);
        
        // Cantilever is distance from edge to first/last bearer row
        const topEdge = segments[i];
        const botEdge = segments[i+1];
        const firstRow = minY + edgeOffset;
        const lastRow = minY + edgeOffset + (bearerRowsCount - 1) * actualJoistSpan;
        
        maxJoistCantilever = Math.max(maxJoistCantilever, firstRow - topEdge, botEdge - lastRow);
      }
    }
  }

  // CANTILEVER RULES (NZS 3604)
  let joistSizeStr = getJoistSize(actualJoistSpan);
  let warning = "";

  // The Balustrade Rule
  if (height > 1000 && maxJoistCantilever > 400) {
    joistSizeStr = "190x45mm H3.2 (Structural Balustrade Required)";
  }

  // Caps
  if (joistSizeStr.includes("140x45") && maxJoistCantilever > 1100) {
    warning = "CRITICAL: Joist cantilever exceeds 1100mm limit for 140x45.";
  } else if (joistSizeStr.includes("190x45") && maxJoistCantilever > 1500) {
    warning = "CRITICAL: Joist cantilever exceeds 1500mm limit.";
  }

  // Perimeter for capping
  let perimeterLM = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    perimeterLM += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  const deckingInfo = DECKING_SPECS[specs.deckingType];
  const boardRows = Math.ceil(projection / (deckingInfo.width + DECKING_GAP));

  return {
    pilesPerRow,
    bearerRows: bearerRowsCount,
    totalPiles: Math.max(totalPiles, 4),
    bearerSize: getBearerSize(actualBearerSpan),
    joistSize: joistSizeStr,
    joistCount: Math.ceil((joistLM + perimeterLM) / (projection || 1000)),
    deckingBoardCount: boardRows,
    concreteBags: Math.max(totalPiles, 4) * 2,
    screwsCount: Math.ceil(area * 45),
    bearerSpan: actualBearerSpan,
    joistSpan: actualJoistSpan,
    area,
    cantileverWarning: warning
  };
};
