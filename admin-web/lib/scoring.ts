import { normalizeText } from './normalize';

const WEIGHTS = {
  recall: 0.45,
  precision: 0.25,
  jaccard: 0.3
} as const;

export const MIN_MATCH_SCORE = 85;

function uniqueNormalized(values: string[]): string[] {
  return [...new Set(values.map((item) => normalizeText(item)).filter(Boolean))];
}

export function calculateRecipeScore(
  recipeIngredientIds: string[],
  selectedIngredientIds: string[]
): {
  score: number;
  matchedIngredientIds: string[];
  missingIngredientIds: string[];
} {
  const recipeSet = uniqueNormalized(recipeIngredientIds);
  const selectedSet = uniqueNormalized(selectedIngredientIds);

  if (recipeSet.length === 0 || selectedSet.length === 0) {
    return { score: 0, matchedIngredientIds: [], missingIngredientIds: recipeSet };
  }

  const matched = recipeSet.filter((ingredient) => selectedSet.includes(ingredient));
  const missing = recipeSet.filter((ingredient) => !selectedSet.includes(ingredient));

  const matchCount = matched.length;
  const recall = matchCount / recipeSet.length;
  const precision = matchCount / selectedSet.length;
  const unionSize = new Set([...recipeSet, ...selectedSet]).size;
  const jaccard = unionSize > 0 ? matchCount / unionSize : 0;

  const weighted =
    WEIGHTS.recall * recall + WEIGHTS.precision * precision + WEIGHTS.jaccard * jaccard;

  return {
    score: Number((weighted * 100).toFixed(2)),
    matchedIngredientIds: matched,
    missingIngredientIds: missing
  };
}
