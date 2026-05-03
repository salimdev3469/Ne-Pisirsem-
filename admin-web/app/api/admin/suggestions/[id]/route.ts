import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { decideSuggestion } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
  moderationNote: z.string().trim().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    const payload = bodySchema.parse(await request.json());

    await decideSuggestion({
      id: params.id,
      status: payload.status,
      moderationNote: payload.moderationNote
    });

    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
