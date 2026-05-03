import { z } from 'zod';

import { submitIngredientSuggestion } from '@/lib/firestore-repository';
import { ApiError, apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2),
  categoryHint: z.string().trim().optional()
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());

    const name = payload.name.trim();
    if (!name) {
      throw new ApiError(400, 'Ingredient name is required.');
    }

    const suggestionId = await submitIngredientSuggestion({
      name,
      categoryHint: payload.categoryHint
    });

    return Response.json({
      success: true,
      suggestionId,
      message: 'Öneri alındı. Teşekkürler!'
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
