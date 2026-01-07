
import React from 'react';
import { TimberGrade, DeckingType } from './types';

export const MAX_PILE_SPACING = 1300; // mm
export const JOIST_SPACING = 450; // mm
export const DECKING_GAP = 5; // mm
export const FOOTING_DEPTH = 300; // mm
export const WASTE_FACTOR = 1.1; // 10% waste

export const DECKING_SPECS = {
  [DeckingType.PREMIUM_PINE_90]: { width: 90, thickness: 19 },
  [DeckingType.PREMIUM_PINE_140]: { width: 140, thickness: 32 },
  [DeckingType.KWILA_90]: { width: 90, thickness: 19 },
};

// Simplified NZS 3604 Table 7.1 Logic
export const getBearerSize = (span: number) => {
  if (span <= 1600) return '140x70mm H3.2';
  if (span <= 2000) return '190x70mm H3.2';
  return '240x70mm H3.2 (Heavy Duty)';
};

export const getJoistSize = (span: number) => {
  if (span <= 2500) return '140x45mm H3.2';
  if (span <= 3400) return '190x45mm H3.2';
  return '240x45mm H3.2';
};
