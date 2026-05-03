import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { fetchMealTypes, upsertMealType } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().trim().optional(),
  lottieUrl: z.string().trim().optional()
});

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const items = await fetchMealTypes(false);
    return Response.json({ items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const payload = schema.parse(await request.json());

    const id = await upsertMealType(payload);
    return Response.json({ success: true, id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
