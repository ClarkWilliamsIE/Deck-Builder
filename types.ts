
export enum TimberGrade {
  SG8_WET = 'SG8 Wet',
  SG8_DRY = 'SG8 Dry',
  SG10_WET = 'SG10 Wet'
}

export enum DeckingType {
  PREMIUM_PINE_90 = '90x19mm Premium Pine',
  PREMIUM_PINE_140 = '140x32mm Premium Pine',
  KWILA_90 = '90x19mm Kwila'
}

export enum ViewMode {
  PLAN = 'Plan',
  ISOMETRIC = 'Isometric'
}

export interface Point {
  x: number;
  y: number;
}

export interface DeckDimensions {
  points: Point[];
  height: number; // mm (off the ground)
}

export interface DeckSpecs {
  dimensions: DeckDimensions;
  timberGrade: TimberGrade;
  deckingType: DeckingType;
}

export interface CalculationResult {
  pilesPerRow: number;
  bearerRows: number;
  totalPiles: number;
  bearerSize: string;
  joistSize: string;
  joistCount: number;
  deckingBoardCount: number;
  concreteBags: number;
  screwsCount: number;
  bearerSpan: number;
  joistSpan: number;
  area: number; // m2
  cantileverWarning?: string;
}
