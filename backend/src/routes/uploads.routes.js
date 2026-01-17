const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Validation stricte des types de fichiers
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Types acceptés: JPEG, PNG, WebP, GIF, HEIC, HEIF`), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
  fileFilter: fileFilter,
});

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL manquant');
  }

  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY manquant');
  }

  return createClient(supabaseUrl, key);
}

router.post('/event-images', authMiddleware, upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'Aucun fichier envoyé' });
    }

    const bucket = process.env.EVENT_IMAGES_BUCKET || 'event-images';
    const supabase = getSupabaseClient();

    const urls = [];

    for (const f of files) {
      const safeName = String(f.originalname || 'image')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 120);

      const path = `events/${req.user.id}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, f.buffer, {
        contentType: f.mimetype || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) {
        console.error('❌ Erreur upload Supabase:', uploadError);
        return res.status(400).json({ message: uploadError.message, details: uploadError });
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    res.json({ urls });
  } catch (err) {
    console.error('Erreur upload images:', err);
    res.status(500).json({ message: err?.message || 'Erreur serveur' });
  }
});

router.post('/profile-avatar', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Aucun fichier envoyé' });
    }

    const bucket = process.env.PROFILE_IMAGES_BUCKET || process.env.EVENT_IMAGES_BUCKET || 'event-images';
    const supabase = getSupabaseClient();

    const safeName = String(file.originalname || 'avatar')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);

    const path = `profiles/${req.user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: true,
    });

    if (uploadError) {
      return res.status(400).json({ message: uploadError.message });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    res.json({ url: data.publicUrl });
  } catch (err) {
    console.error('Erreur upload avatar:', err);
    res.status(500).json({ message: err?.message || 'Erreur serveur' });
  }
});

router.post('/story-image', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Aucun fichier envoyé' });
    }

    const bucket = process.env.STORIES_IMAGES_BUCKET || process.env.EVENT_IMAGES_BUCKET || 'event-images';
    const supabase = getSupabaseClient();

    const safeName = String(file.originalname || 'story')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);

    const path = `stories/${req.user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) {
      return res.status(400).json({ message: uploadError.message });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    res.json({ url: data.publicUrl });
  } catch (err) {
    console.error('Erreur upload story:', err);
    res.status(500).json({ message: err?.message || 'Erreur serveur' });
  }
});

// Alias pour /story (utilisé par le mobile)
router.post('/story', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Aucun fichier envoyé' });
    }

    const bucket = process.env.STORIES_IMAGES_BUCKET || process.env.EVENT_IMAGES_BUCKET || 'event-images';
    const supabase = getSupabaseClient();

    const safeName = String(file.originalname || 'story')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);

    const path = `stories/${req.user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) {
      return res.status(400).json({ message: uploadError.message });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    res.json({ url: data.publicUrl });
  } catch (err) {
    console.error('Erreur upload story:', err);
    res.status(500).json({ message: err?.message || 'Erreur serveur' });
  }
});

module.exports = router;
