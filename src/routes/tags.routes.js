const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');

console.log('✅ tags.routes chargé');

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

router.get('/', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filters = {};
    if (q) {
      // recherche simple sur name
      filters.name = { like: q };
    }

    const tags = await supabaseAPI.select('Tags', filters, {
      order: 'name.asc',
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });

    res.json(tags);
  } catch (err) {
    console.error('Erreur list tags:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Tags libres: crée si n'existe pas
router.post('/ensure', async (req, res) => {
  try {
    const { names } = req.body;
    if (!Array.isArray(names)) {
      return res.status(400).json({ message: 'names doit être un tableau' });
    }

    const normalized = Array.from(
      new Set(
        names
          .map((n) => (typeof n === 'string' ? n.trim() : ''))
          .filter(Boolean)
          .slice(0, 20)
      )
    );

    if (normalized.length === 0) return res.json([]);

    const slugs = normalized.map(slugify).filter(Boolean);

    const existing = await supabaseAPI.select('Tags', { slug: { in: slugs } });
    const existingBySlug = new Map(existing.map((t) => [t.slug, t]));

    const created = [];
    for (let i = 0; i < normalized.length; i++) {
      const name = normalized[i];
      const slug = slugs[i];
      if (!slug) continue;

      if (existingBySlug.has(slug)) continue;

      try {
        const tag = await supabaseAPI.insert('Tags', {
          name,
          slug,
          created_at: new Date().toISOString(),
        });
        existingBySlug.set(slug, tag);
        created.push(tag);
      } catch (err) {
        // probable conflit unique (slug créé en parallèle)
      }
    }

    const all = Array.from(existingBySlug.values());
    res.json(all);
  } catch (err) {
    console.error('Erreur ensure tags:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
