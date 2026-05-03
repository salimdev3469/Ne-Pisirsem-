import { randomUUID } from 'crypto';

import { requireAdmin } from '@/lib/auth';
import { adminStorage } from '@/lib/firebase-admin';
import { ApiError, apiErrorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ApiError(400, 'file alanı zorunlu.');
    }

    if (!file.type.startsWith('image/')) {
      throw new ApiError(400, 'Sadece görsel dosyaları yüklenebilir.');
    }

    if (file.size <= 0) {
      throw new ApiError(400, 'Boş dosya yüklenemez.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ApiError(400, 'Dosya en fazla 8MB olabilir.');
    }

    const bucket = adminStorage.bucket();
    if (!bucket.name) {
      throw new ApiError(500, 'Firebase Storage bucket yapılandırması eksik.');
    }

    const extension = extensionFromMimeType(file.type);
    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const path = `recipes/${fileName}`;
    const token = randomUUID();

    const bytes = Buffer.from(await file.arrayBuffer());

    await bucket.file(path).save(bytes, {
      resumable: false,
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: token
        }
      }
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

    return Response.json({
      success: true,
      path,
      url: downloadUrl
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
