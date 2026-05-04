import { z } from 'zod';

import { fetchRecipesForMealType } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';
import { normalizeText } from '@/lib/normalize';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  mealTypeId: z.string().trim().min(1, 'mealTypeId zorunlu.'),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200)
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const payload = querySchema.parse({
      mealTypeId: url.searchParams.get('mealTypeId') ?? '',
      q: url.searchParams.get('q') ?? '',
      limit: url.searchParams.get('limit') ?? undefined
    });

    const recipes = await fetchRecipesForMealType(payload.mealTypeId, payload.limit);

    const query = normalizeText(payload.q ?? '');
    const items = query
      ? recipes.filter((recipe) => {
          const haystack = normalizeText(
            [
              recipe.title,
              recipe.description ?? '',
              ...recipe.ingredients,
              ...recipe.ingredientIds
            ].join(' ')
          );
          return haystack.includes(query);
        })
      : recipes;

    return Response.json({
      mealTypeId: payload.mealTypeId,
      query: payload.q ?? '',
      count: items.length,
      items
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
