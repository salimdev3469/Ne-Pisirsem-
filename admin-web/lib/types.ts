export type MealTypeDoc = {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  imageUrl?: string | null;
  lottieUrl?: string | null;
};

export type IngredientDoc = {
  id: string;
  displayName: string;
  normalizedName: string;
  category: string;
  emoji: string;
  aliases: string[];
  isActive: boolean;
};

export type RecipeDoc = {
  id: string;
  title: string;
  description?: string | null;
  mealTypeIds: string[];
  ingredientIds: string[];
  ingredients: string[];
  steps: string[];
  imageUrl?: string | null;
  sourceUrl?: string | null;
  youtubeUrl?: string | null;
  cookingTime?: string | null;
  difficulty?: string | null;
  isActive: boolean;
};

export type SuggestionDoc = {
  id: string;
  name: string;
  normalizedName: string;
  categoryHint?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  moderationNote?: string | null;
};

export type RecommendationMatch = {
  recipeId: string;
  score: number;
  matchedIngredientIds: string[];
  missingIngredientIds: string[];
  recipe: RecipeDoc;
};
