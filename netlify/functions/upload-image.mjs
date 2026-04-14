import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

// ALLOWED_IMAGE_MAGIC_BYTES contains the leading bytes for supported image formats.
const ALLOWED_IMAGE_MAGIC_BYTES = [
  [0xFF, 0xD8, 0xFF],                                         // JPEG
  [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],         // PNG
  [0x47, 0x49, 0x46, 0x38],                                   // GIF
  [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], // WebP
];

function isValidImageBytes(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  return ALLOWED_IMAGE_MAGIC_BYTES.some(magic =>
    magic.every((b, i) => b === null || bytes[i] === b)
  );
}

async function verifyFirebaseToken(idToken) {
  const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyAEK1NeUrS-4VXtYSGcWMOxbpg64n3DIuk';
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  const idToken = authHeader?.replace('Bearer ', '');
  if (!idToken || !(await verifyFirebaseToken(idToken))) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Fichier image requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const buffer = await file.arrayBuffer();

    if (!isValidImageBytes(buffer)) {
      return new Response(JSON.stringify({ error: 'Le fichier ne semble pas être une image valide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const store = getStore('articles-images');
    const randomId = randomUUID().slice(0, 8);
    const filename = `${Date.now()}-${randomId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await store.set(filename, buffer, { metadata: { contentType: file.type } });

    const imageUrl = `/.netlify/functions/serve-image?key=${encodeURIComponent(filename)}`;
    return new Response(JSON.stringify({ url: imageUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: 'Erreur lors du téléchargement' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
