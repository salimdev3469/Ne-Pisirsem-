import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { deleteIngredient, fetchIngredients, upsertIngredient } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().trim().optional(),
  displayName: z.string().trim().min(2),
  category: z.string().trim().optional(),
  emoji: z.string().trim().optional(),
  aliases: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional()
});

const deleteSchema = z.object({
  id: z.string().trim().min(1)
});

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const items = await fetchIngredients(false);
    return Response.json({ items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const payload = schema.parse(await request.json());
    const id = await upsertIngredient(payload);
    return Response.json({ success: true, id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const payload = deleteSchema.parse(await request.json());
    await deleteIngredient(payload.id);
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
