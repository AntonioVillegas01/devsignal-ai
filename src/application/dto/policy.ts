export interface Policy {
  lookbackDays: number;
  duplicateThreshold: number;
  minReviewScore: number;
  minCategoryScore: number;
  maxArticlesPerDay: number;
  trustedDomains: readonly string[];
}
