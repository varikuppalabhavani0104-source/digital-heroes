/** Product constants. Prices/percentages are overridable at runtime via the app_settings table. */
export const SITE_NAME = "Digital Heroes";

export const DEFAULTS = {
  monthlyPaise: 49900,   // ₹499
  yearlyPaise: 499900,   // ₹4,999
  prizePoolPercent: 50,
  minCharityPercent: 10,
  scoreMin: 1,
  scoreMax: 45,
  scoresKept: 5,
} as const;

/** Prize tier shares of the pool (PRD §07). Must total 100. */
export const TIER_SHARE = { 5: 40, 4: 35, 3: 25 } as const;
