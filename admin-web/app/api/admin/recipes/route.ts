import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { fetchRecipesForMealType, upsertRecipe } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  mealTypeIds: z.array(z.string().trim()).min(1),
  ingredients: z.array(z.string().trim()).min(1),
  steps: z.array(z.string().trim()).min(1),
  imageUrl: z.string().trim().optional(),
  sourceUrl: z.string().trim().optional(),
  youtubeUrl: z.string().trim().optional(),
  cookingTime: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
  isActive: z.boolean().optional()
});

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const mealTypeId = url.searchParams.get('mealTypeId') ?? '';
    const items = await fetchRecipesForMealType(mealTypeId, 500);
    return Response.json({ items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const payload = schema.parse(await request.json());
    const id = await upsertRecipe(payload);
    return Response.json({ success: true, id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
