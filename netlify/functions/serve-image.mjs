import { getStore } from '@netlify/blobs';

const VALID_KEY_PATTERN = /^[a-zA-Z0-9_.-]+$/;

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (!key || !VALID_KEY_PATTERN.test(key)) {
    return new Response('Invalid key', { status: 400 });
  }

  try {
    const store = getStore('articles-images');
    const { data, metadata } = await store.getWithMetadata(key, { type: 'arrayBuffer' });

    if (!data) {
      return new Response('Not found', { status: 404 });
    }

    return new Response(data, {
      headers: {
        'Content-Type': metadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
