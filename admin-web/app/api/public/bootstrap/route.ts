import { fetchIngredients, fetchMealTypes } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';
import { MIN_MATCH_SCORE } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [mealTypes, ingredients] = await Promise.all([
      fetchMealTypes(true),
      fetchIngredients(true)
    ]);

    return Response.json({
      mealTypes,
      ingredients,
      config: {
        minMatchScore: MIN_MATCH_SCORE,
        corePenalty: 0,
        nonCorePenalty: 0,
        defaultLimit: 20
      }
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
