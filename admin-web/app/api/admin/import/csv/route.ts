import Papa from 'papaparse';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { upsertIngredient, upsertMealType, upsertRecipe } from '@/lib/firestore-repository';
import { ApiError, apiErrorResponse } from '@/lib/http';
import { splitDelimitedList } from '@/lib/normalize';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  target: z.enum(['mealTypes', 'ingredients', 'recipes']),
  csv: z.string().min(1)
});

function parseBool(value: string | undefined, fallback = true): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'evet'].includes(normalized)) return true;
  if (['false', '0', 'no', 'hayir', 'hayır'].includes(normalized)) return false;
  return fallback;
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const payload = requestSchema.parse(await request.json());
    const parsed = Papa.parse<Record<string, string>>(payload.csv, {
      header: true,
      skipEmptyLines: true
    });

    if (parsed.errors.length > 0) {
      throw new ApiError(400, parsed.errors.map((item) => item.message).join(' | '));
    }

    const rows = parsed.data;
    const ids: string[] = [];

    for (const row of rows) {
      if (payload.target === 'mealTypes') {
        const id = await upsertMealType({
          id: row.id,
          name: (row.name ?? '').trim(),
          order: Number(row.order ?? 0),
          isActive: parseBool(row.isActive, true),
          imageUrl: row.imageUrl,
          lottieUrl: row.lottieUrl
        });
        ids.push(id);
        continue;
      }

      if (payload.target === 'ingredients') {
        const id = await upsertIngredient({
          id: row.id,
          displayName: (row.displayName ?? row.name ?? '').trim(),
          category: row.category,
          emoji: row.emoji,
          aliases: splitDelimitedList(row.aliases ?? ''),
          isActive: parseBool(row.isActive, true)
        });
        ids.push(id);
        continue;
      }

      const id = await upsertRecipe({
        id: row.id,
        title: (row.title ?? '').trim(),
        description: row.description,
        mealTypeIds: splitDelimitedList(row.mealTypeIds ?? ''),
        ingredients: splitDelimitedList(row.ingredients ?? ''),
        steps: splitDelimitedList(row.steps ?? '', /[|;]/),
        imageUrl: row.imageUrl,
        sourceUrl: row.sourceUrl,
        youtubeUrl: row.youtubeUrl,
        cookingTime: row.cookingTime,
        difficulty: row.difficulty,
        isActive: parseBool(row.isActive, true)
      });
      ids.push(id);
    }

    return Response.json({
      success: true,
      target: payload.target,
      imported: ids.length,
      ids
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
