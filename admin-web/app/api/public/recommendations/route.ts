import { z } from 'zod';

import { fetchRecipesForMealType } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';
import { normalizeText } from '@/lib/normalize';
import { calculateRecipeScore, MIN_MATCH_SCORE } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  mealTypeId: z.string().trim().default(''),
  ingredientIds: z.array(z.string().trim()).min(1),
  limit: z.number().int().min(1).max(50).default(10),
  minScore: z.number().min(0).max(100).optional()
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const payload = requestSchema.parse(raw);

    const threshold = payload.minScore ?? MIN_MATCH_SCORE;
    const selected = payload.ingredientIds.map((item) => normalizeText(item)).filter(Boolean);
    const recipes = await fetchRecipesForMealType(payload.mealTypeId, 400);

    const items = recipes
      .map((recipe) => {
        const source = recipe.ingredientIds.length > 0 ? recipe.ingredientIds : recipe.ingredients;
        const scoreResult = calculateRecipeScore(source, selected);

        return {
          recipeId: recipe.id,
          score: scoreResult.score,
          matchedIngredientIds: scoreResult.matchedIngredientIds,
          missingIngredientIds: scoreResult.missingIngredientIds,
          recipe
        };
      })
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, payload.limit);

    return Response.json({
      threshold,
      count: items.length,
      items
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
