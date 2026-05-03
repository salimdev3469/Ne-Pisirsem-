import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { fetchSuggestions } from '@/lib/firestore-repository';
import { apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).default('pending')
});

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const status = querySchema.parse({
      status: (url.searchParams.get('status') ?? 'pending').trim()
    }).status;

    const items = await fetchSuggestions(status);
    return Response.json({ items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
