import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { upsertIngredient, upsertMealType, upsertRecipe } from '@/lib/firestore-repository';
import { ApiError, apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const mealTypeSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().trim().optional(),
  lottieUrl: z.string().trim().optional()
});

const ingredientSchema = z.object({
  id: z.string().trim().optional(),
  displayName: z.string().trim().min(2).optional(),
  name: z.string().trim().min(2).optional(),
  category: z.string().trim().optional(),
  emoji: z.string().trim().optional(),
  aliases: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional()
});

const recipeSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  mealTypeIds: z.array(z.string().trim()).optional(),
  ingredients: z.array(z.string().trim()).min(1),
  steps: z.array(z.string().trim()).min(1),
  imageUrl: z.string().trim().optional(),
  sourceUrl: z.string().trim().optional(),
  youtubeUrl: z.string().trim().optional(),
  cookingTime: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
  isActive: z.boolean().optional()
});

function normalizePayload(raw: unknown): {
  mealTypes: unknown[];
  ingredients: unknown[];
  recipes: unknown[];
} {
  if (Array.isArray(raw)) {
    return { mealTypes: [], ingredients: [], recipes: raw };
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      mealTypes: Array.isArray(obj.mealTypes) ? obj.mealTypes : [],
      ingredients: Array.isArray(obj.ingredients) ? obj.ingredients : [],
      recipes: Array.isArray(obj.recipes) ? obj.recipes : []
    };
  }

  throw new ApiError(400, 'JSON payload must be an array or object.');
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const raw = await request.json();
    const payload = normalizePayload(raw);

    const mealTypeIds: string[] = [];
    const ingredientIds: string[] = [];
    const recipeIds: string[] = [];

    for (const item of payload.mealTypes) {
      const parsed = mealTypeSchema.parse(item);
      const id = await upsertMealType(parsed);
      mealTypeIds.push(id);
    }

    for (const item of payload.ingredients) {
      const parsed = ingredientSchema.parse(item);
      const displayName = (parsed.displayName ?? parsed.name ?? '').trim();
      if (!displayName) {
        throw new ApiError(400, 'Ingredient item must include displayName or name.');
      }

      const id = await upsertIngredient({
        id: parsed.id,
        displayName,
        category: parsed.category,
        emoji: parsed.emoji,
        aliases: parsed.aliases,
        isActive: parsed.isActive
      });
      ingredientIds.push(id);
    }

    for (const item of payload.recipes) {
      const parsed = recipeSchema.parse(item);
      const id = await upsertRecipe({
        id: parsed.id,
        title: parsed.title,
        description: parsed.description,
        mealTypeIds: parsed.mealTypeIds ?? [],
        ingredients: parsed.ingredients,
        steps: parsed.steps,
        imageUrl: parsed.imageUrl,
        sourceUrl: parsed.sourceUrl,
        youtubeUrl: parsed.youtubeUrl,
        cookingTime: parsed.cookingTime,
        difficulty: parsed.difficulty,
        isActive: parsed.isActive
      });
      recipeIds.push(id);
    }

    return Response.json({
      success: true,
      imported: {
        mealTypes: mealTypeIds.length,
        ingredients: ingredientIds.length,
        recipes: recipeIds.length
      },
      ids: {
        mealTypeIds,
        ingredientIds,
        recipeIds
      }
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
