const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const jwt = require('jsonwebtoken');

console.log('✅ event.routes chargé');

function parseCsv(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

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

function extractTagsAndMentions(text) {
  const raw = typeof text === 'string' ? text : '';
  const tags = new Set();
  const mentions = new Set();

  // #tags: letters/numbers/_/- (kept as display name without #)
  const tagRe = /(^|\s)#([\p{L}\p{N}_-]{2,80})/gu;
  let m;
  while ((m = tagRe.exec(raw)) !== null) {
    const name = String(m[2] || '').trim();
    if (name) tags.add(name);
  }

  // @mentions: letters/numbers/_/- (username = Users.name matching)
  const mentionRe = /(^|\s)@([\p{L}\p{N}_-]{2,80})/gu;
  while ((m = mentionRe.exec(raw)) !== null) {
    const name = String(m[2] || '').trim();
    if (name) mentions.add(name);
  }

  return { tags: Array.from(tags), mentions: Array.from(mentions) };
}

async function ensureTagsByNames(names) {
  const normalized = Array.from(
    new Set(
      (Array.isArray(names) ? names : [])
        .map((n) => (typeof n === 'string' ? n.trim() : ''))
        .filter(Boolean)
        .slice(0, 20)
    )
  );

  if (normalized.length === 0) return [];

  const slugs = normalized.map(slugify).filter(Boolean);
  const existing = slugs.length ? await supabaseAPI.select('Tags', { slug: { in: slugs } }) : [];
  const bySlug = new Map(existing.map((t) => [t.slug, t]));

  for (let i = 0; i < normalized.length; i++) {
    const name = normalized[i];
    const slug = slugs[i];
    if (!slug) continue;
    if (bySlug.has(slug)) continue;
    try {
      const created = await supabaseAPI.insert('Tags', {
        name,
        slug,
        created_at: new Date().toISOString(),
      });
      bySlug.set(slug, created);
    } catch {
      // ignore conflits uniques
    }
  }

  return Array.from(bySlug.values());
}

async function setEventTagsFromNames(eventId, tagNames) {
  if (!Number.isFinite(eventId)) return [];
  const tags = await ensureTagsByNames(tagNames);
  const tagIds = tags.map((t) => t.id).filter((id) => Number.isFinite(id));
  if (tagIds.length === 0) return [];

  // add only (do not delete existing) for content parsing
  for (const tagId of tagIds) {
    try {
      await supabaseAPI.insert('EventTags', {
        event_id: eventId,
        tag_id: tagId,
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore conflits
    }
  }

  return tags;
}

async function resolveMentionedUsersByName(usernames) {
  const wanted = Array.from(
    new Set(
      (Array.isArray(usernames) ? usernames : [])
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .slice(0, 10)
    )
  );
  if (wanted.length === 0) return [];

  // We don't have an exact ilike in the helper, so we fetch by like and then strict-match in JS.
  const all = [];
  for (const name of wanted) {
    try {
      const rows = await supabaseAPI.select('Users', { name: { like: name } }, { limit: 20 });
      for (const u of rows) all.push(u);
    } catch {
      // ignore
    }
  }

  const seen = new Set();
  const out = [];
  for (const u of all) {
    if (!u || !Number.isFinite(u.id) || typeof u.name !== 'string') continue;
    const key = String(u.id);
    if (seen.has(key)) continue;
    // strict match (case-insensitive)
    const ok = wanted.some((w) => String(w).toLowerCase() === String(u.name).toLowerCase());
    if (!ok) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

async function createMentionsAndNotifications({ sourceType, sourceId, createdBy, mentionedUsers, eventId }) {
  if (!sourceType || !Number.isFinite(sourceId)) return;
  if (!Array.isArray(mentionedUsers) || mentionedUsers.length === 0) return;

  // Récupérer le nom de la personne qui mentionne
  let creatorName = 'Quelqu\'un';
  if (Number.isFinite(createdBy)) {
    try {
      const creators = await supabaseAPI.select('Users', { id: createdBy });
      if (creators[0]?.name) {
        creatorName = creators[0].name;
      }
    } catch {
      // ignore
    }
  }

  // Déterminer le contexte pour le message
  let contextMessage = '';
  let screen = 'Notifications';
  let navigationData = { sourceType, sourceId };

  if (sourceType === 'comment') {
    contextMessage = 'dans un commentaire';
    screen = 'EventDetail';
    // Récupérer l'eventId du commentaire
    try {
      const comments = await supabaseAPI.select('Comments', { id: sourceId });
      if (comments[0]?.event_id) {
        navigationData.eventId = comments[0].event_id;
      }
    } catch {
      // ignore
    }
  } else if (sourceType === 'event') {
    contextMessage = 'dans un événement';
    screen = 'EventDetail';
    navigationData.eventId = sourceId;
  }

  for (const u of mentionedUsers) {
    const mentionedUserId = u?.id;
    if (!Number.isFinite(mentionedUserId)) continue;
    if (createdBy && Number.isFinite(createdBy) && mentionedUserId === createdBy) continue;

    try {
      await supabaseAPI.insert('Mentions', {
        source_type: sourceType,
        source_id: sourceId,
        mentioned_user_id: mentionedUserId,
        created_by: Number.isFinite(createdBy) ? createdBy : null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore unique
    }

    try {
      await supabaseAPI.insert('Notifications', {
        user_id: mentionedUserId,
        type: 'mention',
        title: '📢 Vous avez été mentionné',
        message: `${creatorName} vous a mentionné ${contextMessage}`,
        data: JSON.stringify({
          source_type: sourceType,
          source_id: sourceId,
          by_user_id: Number.isFinite(createdBy) ? createdBy : null,
          by_user_name: creatorName,
          screen: screen,
          eventId: navigationData.eventId || null,
        }),
        created_at: new Date().toISOString(),
      });

      // Envoyer push notification
      const PushNotificationService = require('../services/push-notification.service');
      await PushNotificationService.sendNotification(
        [mentionedUserId],
        {
          title: '📢 Vous avez été mentionné',
          body: `${creatorName} vous a mentionné ${contextMessage}`,
          data: { 
            type: 'mention', 
            screen: screen,
            eventId: navigationData.eventId || null,
            sourceType,
            sourceId
          }
        }
      );
    } catch (err) {
      console.error('Erreur notification mention:', err);
    }
  }
}

// =========================
// CRÉER UN ÉVÉNEMENT (JWT requis)
// =========================
router.post('/', authMiddleware, async (req, res) => {
  const user = req.user;
  const { title, description, startDate, endDate, location, coverImage, images, capacity, submitForReview } = req.body;

  try {
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ message: 'Titre invalide (min 3 caractères)' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Champs requis: startDate, endDate' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Dates invalides' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'endDate doit être après startDate' });
    }

    if (!Array.isArray(images) || images.length < 2) {
      return res.status(400).json({ message: 'Au moins 2 photos sont requises' });
    }

    const normalizedImages = images
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean);

    if (normalizedImages.length < 2) {
      return res.status(400).json({ message: 'Au moins 2 photos valides sont requises' });
    }

    // Validation de la capacité (optionnelle)
    let eventCapacity = null;
    if (capacity !== undefined && capacity !== null) {
      const capacityNum = parseInt(capacity, 10);
      if (isNaN(capacityNum) || capacityNum < 1) {
        return res.status(400).json({ message: 'Capacité invalide (min 1)' });
      }
      eventCapacity = capacityNum;
    }

    // Récupérer les infos de l'utilisateur pour déterminer le statut
    const users = await supabaseAPI.select('Users', { id: user.id });
    const userData = users[0];
    
    // Déterminer le statut initial:
    // - Admin/Moderator: publié directement
    // - Organisateur vérifié: publié directement
    // - Autres: pending_review (ou draft si pas submitForReview)
    let initialStatus = 'draft';
    let submittedAt = null;
    
    if (userData?.role === 'admin' || userData?.role === 'moderator') {
      initialStatus = 'published';
    } else if (userData?.is_verified_organizer) {
      initialStatus = 'published';
    } else if (submitForReview !== false) {
      // Par défaut, soumettre pour review
      initialStatus = 'pending_review';
      submittedAt = new Date().toISOString();
    }

    const event = await supabaseAPI.insert('Events', {
      title: title.trim(),
      description,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      location,
      cover_image: typeof coverImage === 'string' && coverImage.trim() ? coverImage.trim() : normalizedImages[0],
      images: normalizedImages,
      capacity: eventCapacity,
      organizer_id: user.id,
      status: initialStatus,
      submitted_at: submittedAt,
      created_at: new Date().toISOString()
    });

    // Répondre immédiatement au client
    res.status(201).json({ message: 'Événement créé', event });

    // Opérations asynchrones en arrière-plan (ne bloquent pas la réponse)
    setImmediate(async () => {
      // Ajouter une entrée d'activité pour les modérateurs
      try {
        await supabaseAPI.insert('AuditLogs', {
          actor_id: user.id,
          action: 'event_published',
          entity_type: 'event',
          entity_id: event.id,
          metadata: {
            title: title.trim(),
            description: description || '',
            location: location || '',
            start_date: start.toISOString()
          },
          ip: req.ip,
          created_at: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn('Warn: failed to create audit log for event publication:', logErr?.message || logErr);
      }

      try {
        const parsed = extractTagsAndMentions(description || '');
        await setEventTagsFromNames(event.id, parsed.tags);
        const mentioned = await resolveMentionedUsersByName(parsed.mentions);
        await createMentionsAndNotifications({
          sourceType: 'event',
          sourceId: event.id,
          createdBy: user.id,
          mentionedUsers: mentioned,
        });
      } catch (e) {
        console.warn('Warn: parsing tags/mentions failed on event create', e?.message || e);
      }

      // Générer un QR code pour l'organisateur
      try {
        const QRCodeService = require('../services/qrcode.service');
        const { code, qrCode } = await QRCodeService.generateTicketQRCode(
          event.id,
          user.id,
          event.id
        );
        
        await supabaseAPI.update('Events', event.id, {
          organizer_qr_code: code,
          organizer_qr_code_image: qrCode,
          updated_at: new Date().toISOString()
        });
      } catch (qrErr) {
        console.warn('Warn: failed to generate organizer QR code:', qrErr?.message || qrErr);
      }
    });
  } catch (err) {
    console.error('Erreur création événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LISTER TOUS LES ÉVÉNEMENTS PUBLIÉS
// =========================
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 12;
    const offset = parseInt(req.query.offset, 10) || 0;
    const includePast = req.query.includePast === 'true'; // Option pour inclure les passés

    // D'abord récupérer les IDs des utilisateurs bannis
    const bannedUsers = await supabaseAPI.select('Users', { banned: true }, { limit: 1000 });
    const bannedUserIds = new Set(bannedUsers.map((u) => u.id));

    // Récupérer tous les événements publiés (limite haute pour inclure tous)
    const allEvents = await supabaseAPI.select(
      'Events',
      { status: 'published' },
      { limit: 1000, offset: 0, order: 'boost_score.desc,start_date.asc' }
    );

    // Date limite: événements terminés depuis plus de 24h sont masqués
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h avant maintenant

    // Filtrer les événements:
    // 1. Exclure les organisateurs bannis
    // 2. Exclure les événements terminés depuis plus de 24h (sauf si includePast=true)
    const filteredEvents = allEvents.filter((e) => {
      // Exclure les organisateurs bannis
      if (bannedUserIds.has(e.organizer_id)) return false;
      
      // Si includePast=true, on garde tous les événements
      if (includePast) return true;
      
      // Sinon, exclure les événements dont end_date est passée depuis plus de 24h
      const endDate = e.end_date ? new Date(e.end_date) : null;
      if (endDate && endDate < cutoffDate) return false;
      
      return true;
    });

    // Appliquer la pagination sur les événements filtrés
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    // Récupérer les organisateurs
    const organizerIds = Array.from(
      new Set(paginatedEvents.map((e) => e.organizer_id).filter((id) => id !== null && id !== undefined))
    );

    const organizers = organizerIds.length
      ? await supabaseAPI.select('Users', { id: { in: organizerIds } })
      : [];

    const organizerById = new Map(organizers.map((u) => [u.id, u]));

    const eventsWithOrganizers = paginatedEvents.map((event) => {
      const organizer = organizerById.get(event.organizer_id);
      return {
        ...event,
        organizer: organizer
          ? {
              id: organizer.id,
              name: organizer.name,
              email: organizer.email,
              avatar_url: organizer.avatar_url,
              is_verified_organizer: organizer.is_verified_organizer || false,
            }
          : null,
      };
    });

    // Indiquer s'il y a plus de résultats
    const hasMore = filteredEvents.length > offset + limit;

    res.json(eventsWithOrganizers);
  } catch (err) {
    console.error('Erreur récupération événements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// GÉNÉRER QR CODE ORGANISATEUR (pour événements existants)
// =========================
router.post('/:id/generate-organizer-qr', authMiddleware, async (req, res) => {
  const user = req.user;
  const eventId = parseInt(req.params.id, 10);

  try {
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const rows = await supabaseAPI.select('Events', { id: eventId });
    const event = rows[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement introuvable' });
    }

    if (event.organizer_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Vérifier si le QR code existe déjà
    if (event.organizer_qr_code && event.organizer_qr_code_image) {
      return res.json({
        message: 'QR code déjà existant',
        organizer_qr_code: event.organizer_qr_code,
        organizer_qr_code_image: event.organizer_qr_code_image
      });
    }

    // Générer le QR code
    const QRCodeService = require('../services/qrcode.service');
    const { code, qrCode } = await QRCodeService.generateTicketQRCode(
      eventId,
      event.organizer_id,
      eventId
    );

    // Mettre à jour l'événement
    await supabaseAPI.update('Events', eventId, {
      organizer_qr_code: code,
      organizer_qr_code_image: qrCode,
      updated_at: new Date().toISOString()
    });

    res.json({
      message: 'QR code organisateur généré',
      organizer_qr_code: code,
      organizer_qr_code_image: qrCode
    });
  } catch (err) {
    console.error('Erreur génération QR code organisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LISTER MES ÉVÉNEMENTS (organisateur)
// =========================
router.get('/mine', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const limit = req.query.limit;
    const offset = req.query.offset;

    const events = await supabaseAPI.select(
      'Events',
      { organizer_id: user.id },
      { limit, offset, order: 'created_at.desc' }
    );
    res.json(events);
  } catch (err) {
    console.error('Erreur récupération mes événements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// DEMANDER LE CARROUSEL (organisateur)
// =========================
router.post('/:id/request-carousel', authMiddleware, async (req, res) => {
  const user = req.user;
  const eventId = parseInt(req.params.id, 10);

  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });

    const rows = await supabaseAPI.select('Events', { id: eventId });
    const ev = rows[0];
    if (!ev) return res.status(404).json({ message: 'Événement introuvable' });
    if (ev.organizer_id !== user.id) return res.status(403).json({ message: 'Interdit' });

    const updated = await supabaseAPI.update(
      'Events',
      { carousel_requested: true, updated_at: new Date().toISOString() },
      { id: eventId }
    );

    res.json({ message: 'Demande de carrousel envoyée', event: updated });
  } catch (err) {
    console.error('Erreur request-carousel:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// RECHERCHE ÉVÉNEMENTS (q + tags)
// =========================
router.get('/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tagSlugs = parseCsv(req.query.tagSlugs);
    const limit = req.query.limit;
    const offset = req.query.offset;
    const includePast = req.query.includePast === 'true';

    // base: published
    let events = await supabaseAPI.select(
      'Events',
      { status: 'published' },
      { limit: 200, offset: 0, order: 'start_date.asc' }
    );

    // Filtrer les événements terminés depuis plus de 24h (sauf si includePast=true)
    if (!includePast) {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      events = events.filter((e) => {
        const endDate = e.end_date ? new Date(e.end_date) : null;
        return !endDate || endDate >= cutoffDate;
      });
    }

    if (q) {
      const qLower = q.toLowerCase();
      events = events.filter((e) => {
        const title = String(e.title || '').toLowerCase();
        const location = String(e.location || '').toLowerCase();
        const description = String(e.description || '').toLowerCase();
        return title.includes(qLower) || location.includes(qLower) || description.includes(qLower);
      });
    }

    if (tagSlugs.length > 0 && events.length > 0) {
      const tags = await supabaseAPI.select('Tags', { slug: { in: tagSlugs } });
      const tagIds = tags.map((t) => t.id);

      if (tagIds.length === 0) {
        return res.json([]);
      }

      const eventIds = events.map((e) => e.id);
      const links = await supabaseAPI.select('EventTags', { event_id: { in: eventIds }, tag_id: { in: tagIds } });
      const okEventIds = new Set(links.map((l) => l.event_id));
      events = events.filter((e) => okEventIds.has(e.id));
    }

    // pagination (après filtre)
    const lim = limit ? parseInt(limit, 10) : 20;
    const off = offset ? parseInt(offset, 10) : 0;
    const sliced = events.slice(off, off + (Number.isFinite(lim) ? lim : 20));
    res.json(sliced);
  } catch (err) {
    console.error('Erreur recherche événements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// FAVORIS (toggle)
// =========================
router.post('/:id/favorite', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });

    // insert (unique) -> si déjà, OK
    try {
      await supabaseAPI.insert('Favorites', {
        user_id: req.user.id,
        event_id: eventId,
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore (déjà favori)
    }

    res.json({ message: 'Ajouté aux favoris' });
  } catch (err) {
    console.error('Erreur favoris add:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id/favorite', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });
    await supabaseAPI.delete('Favorites', { user_id: req.user.id, event_id: eventId });
    res.json({ message: 'Retiré des favoris' });
  } catch (err) {
    console.error('Erreur favoris remove:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// COMMENTAIRES (list/create)
// =========================
router.get('/:id/comments', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });

    const comments = await supabaseAPI.select(
      'Comments',
      { event_id: eventId },
      { order: 'created_at.asc', limit: req.query.limit || 200 }
    );

    const alive = comments.filter((c) => !c.deleted_at);
    const userIds = Array.from(new Set(alive.map((c) => c.user_id)));
    const users = userIds.length ? await supabaseAPI.select('Users', { id: { in: userIds } }) : [];
    // Filtrer les utilisateurs bannis
    const activeUsers = users.filter((u) => !u.banned);
    const userById = new Map(activeUsers.map((u) => [u.id, u]));

    // Exclure les commentaires des utilisateurs bannis
    const withUsers = alive
      .filter((c) => userById.has(c.user_id))
      .map((c) => {
        const u = userById.get(c.user_id);
        return {
          ...c,
          user: u ? { id: u.id, name: u.name, avatar_url: u.avatar_url || null } : null,
        };
      });

    res.json(withUsers);
  } catch (err) {
    console.error('Erreur list comments:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const { content } = req.body;

  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });
    if (!content || typeof content !== 'string' || content.trim().length < 1) {
      return res.status(400).json({ message: 'Contenu invalide' });
    }

    const comment = await supabaseAPI.insert('Comments', {
      event_id: eventId,
      user_id: req.user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      const parsed = extractTagsAndMentions(content.trim());
      // Persist #tags by linking them to the event
      await setEventTagsFromNames(eventId, parsed.tags);
      const mentioned = await resolveMentionedUsersByName(parsed.mentions);
      await createMentionsAndNotifications({
        sourceType: 'comment',
        sourceId: comment.id,
        createdBy: req.user.id,
        mentionedUsers: mentioned,
      });
    } catch (e) {
      console.warn('Warn: parsing tags/mentions failed on comment create', e?.message || e);
    }

    // Notifier l'organisateur de l'événement (si ce n'est pas lui qui commente)
    try {
      const events = await supabaseAPI.select('Events', { id: eventId });
      const event = events[0];
      if (event && event.organizer_id && event.organizer_id !== req.user.id) {
        // Créer notification en base
        await supabaseAPI.insert('Notifications', {
          user_id: event.organizer_id,
          type: 'event_comment',
          title: '💬 Nouveau commentaire',
          message: `${req.user.name || 'Quelqu\'un'} a commenté votre événement "${event.title}"`,
          data: JSON.stringify({ eventId, commentId: comment.id, commenterId: req.user.id }),
          created_at: new Date().toISOString()
        });

        // Envoyer push notification
        const PushNotificationService = require('../services/push-notification.service');
        await PushNotificationService.sendNotification(
          [event.organizer_id],
          {
            title: '💬 Nouveau commentaire',
            body: `${req.user.name || 'Quelqu\'un'} a commenté votre événement "${event.title}"`,
            data: { type: 'event_comment', eventId, screen: 'EventDetail' }
          }
        );
      }
    } catch (notifErr) {
      console.error('Erreur notification commentaire:', notifErr);
    }

    res.status(201).json({ message: 'Commentaire ajouté', comment });
  } catch (err) {
    console.error('Erreur create comment:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// TAGS (GET/PUT)
// =========================
router.get('/:id/tags', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });

    const links = await supabaseAPI.select('EventTags', { event_id: eventId });
    const tagIds = Array.from(new Set(links.map((l) => l.tag_id)));
    if (tagIds.length === 0) return res.json([]);

    const tags = await supabaseAPI.select('Tags', { id: { in: tagIds } }, { order: 'name.asc' });
    res.json(tags);
  } catch (err) {
    console.error('Erreur get event tags:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter un tag (sans supprimer les autres)
router.post('/:id/tags', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const { name } = req.body;

  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });
    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'name requis' });

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    if (!event) return res.status(404).json({ message: 'Événement non trouvé' });

    const isOrganizer = event.organizer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) return res.status(403).json({ message: 'Accès interdit' });

    const tagName = name.trim();
    const slug = slugify(tagName);

    if (!slug) return res.status(400).json({ message: 'Nom de tag invalide' });

    // Vérifier si le tag existe déjà
    let tag;
    const existing = await supabaseAPI.select('Tags', { slug });
    if (existing.length > 0) {
      tag = existing[0];
    } else {
      // Créer le tag
      tag = await supabaseAPI.insert('Tags', {
        name: tagName,
        slug,
        created_at: new Date().toISOString(),
      });
    }

    // Vérifier si l'association existe déjà
    const links = await supabaseAPI.select('EventTags', { event_id: eventId, tag_id: tag.id });
    if (links.length === 0) {
      // Ajouter l'association
      await supabaseAPI.insert('EventTags', {
        event_id: eventId,
        tag_id: tag.id,
        created_at: new Date().toISOString(),
      });

      // Notifier l'organisateur si ce n'est pas lui qui a ajouté le tag
      if (event.organizer_id !== req.user.id) {
        try {
          await supabaseAPI.insert('Notifications', {
            user_id: event.organizer_id,
            type: 'event_tagged',
            title: 'Tag ajouté à votre événement',
            message: `Le tag "${tagName}" a été ajouté à votre événement "${event.title}"`,
            data: JSON.stringify({ event_id: eventId, tag_id: tag.id, tag_name: tagName }),
            created_at: new Date().toISOString(),
          });
        } catch (notifErr) {
          console.error('Erreur création notification tag:', notifErr);
          // Ne pas bloquer si la notification échoue
        }
      }
    }

    res.json({ message: 'Tag ajouté', tag });
  } catch (err) {
    console.error('Erreur post event tag:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id/tags', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const { names } = req.body;

  try {
    if (!Number.isFinite(eventId)) return res.status(400).json({ message: 'ID événement invalide' });
    if (!Array.isArray(names)) return res.status(400).json({ message: 'names doit être un tableau' });

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    if (!event) return res.status(404).json({ message: 'Événement non trouvé' });

    const isOrganizer = event.organizer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) return res.status(403).json({ message: 'Accès interdit' });

    const normalized = Array.from(
      new Set(
        names
          .map((n) => (typeof n === 'string' ? n.trim() : ''))
          .filter(Boolean)
          .slice(0, 20)
      )
    );

    const slugs = normalized.map(slugify).filter(Boolean);

    // On récupère les tags existants
    const existing = slugs.length ? await supabaseAPI.select('Tags', { slug: { in: slugs } }) : [];
    const bySlug = new Map(existing.map((t) => [t.slug, t]));

    // On crée les tags manquants (tags libres)
    for (let i = 0; i < normalized.length; i++) {
      const name = normalized[i];
      const slug = slugs[i];
      if (!slug) continue;
      if (bySlug.has(slug)) continue;

      try {
        const created = await supabaseAPI.insert('Tags', {
          name,
          slug,
          created_at: new Date().toISOString(),
        });
        bySlug.set(slug, created);
      } catch {
        // ignore conflits (unique)
      }
    }

    const finalTags = Array.from(bySlug.values());
    const tagIds = finalTags.map((t) => t.id);

    // Remplacer: supprimer toutes les associations puis réinsérer
    await supabaseAPI.delete('EventTags', { event_id: eventId });

    for (const tagId of tagIds) {
      try {
        await supabaseAPI.insert('EventTags', {
          event_id: eventId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        });
      } catch {
        // ignore conflits
      }
    }

    const updated = await supabaseAPI.select('Tags', { id: { in: tagIds } }, { order: 'name.asc' });
    res.json({ message: 'Tags mis à jour', tags: updated });
  } catch (err) {
    console.error('Erreur put event tags:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// CRÉER UN TYPE DE TICKET POUR UN ÉVÉNEMENT
// =========================
router.post('/:eventId/ticket-types', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  const user = req.user;
  const { name, description, price, currency, quantity } = req.body;

  try {
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Seul l\'organisateur peut créer des types de tickets' });
    }

    // Validation des champs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Nom du ticket invalide (min 2 caractères)' });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'Prix invalide' });
    }

    // Validation de la devise
    const validCurrencies = ['CDF', 'USD'];
    const selectedCurrency = currency && validCurrencies.includes(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : 'CDF';

    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum < 1) {
      return res.status(400).json({ message: 'Quantité invalide (min 1)' });
    }

    // Vérifier qu'un ticket du même type n'existe pas déjà pour cet événement
    const existingTickets = await supabaseAPI.select('TicketTypes', { 
      event_id: eventId, 
      name: name.trim(),
      status: 'active'
    });

    if (existingTickets && existingTickets.length > 0) {
      return res.status(400).json({ 
        message: `Un billet de type "${name.trim()}" existe déjà pour cet événement` 
      });
    }

    // Vérifier que la somme des billets ne dépasse pas la capacité de l'événement
    if (event.capacity) {
      const allTicketTypes = await supabaseAPI.select('TicketTypes', { 
        event_id: eventId,
        status: 'active'
      });
      
      const totalTickets = allTicketTypes.reduce((sum, t) => sum + (t.quantity || 0), 0);
      const newTotal = totalTickets + quantityNum;
      
      if (newTotal > event.capacity) {
        return res.status(400).json({ 
          message: `La capacité de l'événement est de ${event.capacity} places. Vous avez déjà ${totalTickets} billets. Vous ne pouvez ajouter que ${event.capacity - totalTickets} billets maximum.`
        });
      }
    }

    console.log('📝 Création type de ticket:', { name, price: priceNum, currency: selectedCurrency, quantity: quantityNum, eventId });

    // Créer le type de ticket
    const ticketType = await supabaseAPI.insert('TicketTypes', {
      name: name.trim(),
      description: description && typeof description === 'string' ? description.trim() : null,
      price: priceNum,
      currency: selectedCurrency,
      quantity: quantityNum,
      available_quantity: quantityNum,
      event_id: eventId,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    console.log(' Type de ticket créé:', ticketType);
    res.status(201).json({ message: 'Type de ticket créé', ticketType });
  } catch (err) {
    console.error(' Erreur création type de ticket:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// =========================
// MODIFIER UN TYPE DE TICKET
// =========================
router.put('/:eventId/ticket-types/:ticketTypeId', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  const ticketTypeId = parseInt(req.params.ticketTypeId, 10);
  const user = req.user;
  const { name, description, price, currency, quantity } = req.body;

  try {
    if (!Number.isFinite(eventId) || !Number.isFinite(ticketTypeId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Seul l\'organisateur peut modifier des types de tickets' });
    }

    // Vérifier que le ticket existe
    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticketTypeId, event_id: eventId });
    const ticketType = ticketTypes[0];

    if (!ticketType) {
      return res.status(404).json({ message: 'Type de ticket non trouvé' });
    }

    // Préparer les données de mise à jour
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Validation et ajout des champs si fournis
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ message: 'Nom du ticket invalide (min 2 caractères)' });
      }
      
      // Vérifier qu'un autre ticket du même type n'existe pas déjà (sauf celui-ci)
      const existingTickets = await supabaseAPI.select('TicketTypes', { 
        event_id: eventId, 
        name: name.trim(),
        status: 'active'
      });

      const duplicate = existingTickets.find(t => t.id !== ticketTypeId);
      if (duplicate) {
        return res.status(400).json({ 
          message: `Un autre billet de type "${name.trim()}" existe déjà pour cet événement` 
        });
      }

      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description && typeof description === 'string' ? description.trim() : null;
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: 'Prix invalide' });
      }
      updateData.price = priceNum;
    }

    if (currency !== undefined) {
      const validCurrencies = ['CDF', 'USD'];
      const selectedCurrency = validCurrencies.includes(currency.toUpperCase()) 
        ? currency.toUpperCase() 
        : 'CDF';
      updateData.currency = selectedCurrency;
    }

    if (quantity !== undefined) {
      const quantityNum = parseInt(quantity, 10);
      if (isNaN(quantityNum) || quantityNum < 1) {
        return res.status(400).json({ message: 'Quantité invalide (min 1)' });
      }
      
      // Calculer la différence pour ajuster available_quantity
      const diff = quantityNum - ticketType.quantity;
      updateData.quantity = quantityNum;
      updateData.available_quantity = Math.max(0, ticketType.available_quantity + diff);
    }

    console.log(' Modification type de ticket:', { ticketTypeId, updateData });

    // Mettre à jour le type de ticket
    const updated = await supabaseAPI.update('TicketTypes', updateData, { id: ticketTypeId });

    console.log(' Type de ticket modifié:', updated);
    res.json({ message: 'Type de ticket modifié', ticketType: updated });
  } catch (err) {
    console.error(' Erreur modification type de ticket:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// =========================
// SUPPRIMER UN TYPE DE TICKET
// =========================
router.delete('/:eventId/ticket-types/:ticketTypeId', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  const ticketTypeId = parseInt(req.params.ticketTypeId, 10);
  const user = req.user;

  try {
    if (!Number.isFinite(eventId) || !Number.isFinite(ticketTypeId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Seul l\'organisateur peut supprimer des types de tickets' });
    }

    // Vérifier que le ticket existe
    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticketTypeId, event_id: eventId });
    const ticketType = ticketTypes[0];

    if (!ticketType) {
      return res.status(404).json({ message: 'Type de ticket non trouvé' });
    }

    // Vérifier si des tickets ont été vendus
    const soldTickets = await supabaseAPI.select('Tickets', { ticket_type_id: ticketTypeId });
    
    if (soldTickets && soldTickets.length > 0) {
      // Si des tickets ont été vendus, on désactive au lieu de supprimer
      await supabaseAPI.update('TicketTypes', { 
        status: 'inactive',
        updated_at: new Date().toISOString()
      }, { id: ticketTypeId });

      console.log('⚠️  Type de ticket désactivé (tickets vendus):', ticketTypeId);
      return res.json({ 
        message: 'Type de ticket désactivé (des tickets ont été vendus)',
        ticketType: { ...ticketType, status: 'inactive' }
      });
    }

    // Sinon, supprimer complètement
    await supabaseAPI.delete('TicketTypes', { id: ticketTypeId });

    console.log('✅ Type de ticket supprimé:', ticketTypeId);
    res.json({ message: 'Type de ticket supprimé' });
  } catch (err) {
    console.error('❌ Erreur suppression type de ticket:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// =========================
// STATISTIQUES DE VENTE D'UN ÉVÉNEMENT
// =========================
router.get('/:eventId/sales-stats', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  const user = req.user;

  try {
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Seul l\'organisateur peut voir les statistiques' });
    }

    // Récupérer tous les types de tickets de l'événement
    const ticketTypes = await supabaseAPI.select('TicketTypes', { event_id: eventId });

    // Récupérer tous les tickets vendus (actifs)
    const soldTickets = await supabaseAPI.select('Tickets', { 
      event_id: eventId,
      status: 'active'
    });

    // Récupérer tous les paiements complétés
    const payments = await supabaseAPI.select('Payments', { 
      event_id: eventId,
      status: 'completed'
    });

    // Calculer les statistiques par type de ticket
    const statsByType = ticketTypes.map(ticketType => {
      const ticketsOfType = soldTickets.filter(t => t.ticket_type_id === ticketType.id);
      const paymentsOfType = payments.filter(p => p.ticket_type_id === ticketType.id);
      
      const totalSold = ticketsOfType.reduce((sum, t) => sum + (t.quantity || 1), 0);
      const totalRevenueCDF = paymentsOfType
        .filter(p => p.currency === 'CDF')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalRevenueUSD = paymentsOfType
        .filter(p => p.currency === 'USD')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      return {
        ticketTypeId: ticketType.id,
        ticketTypeName: ticketType.name,
        price: ticketType.price,
        currency: ticketType.currency || 'CDF',
        totalQuantity: ticketType.quantity,
        availableQuantity: ticketType.available_quantity,
        soldQuantity: totalSold,
        soldPercentage: ticketType.quantity > 0 
          ? Math.round((totalSold / ticketType.quantity) * 100) 
          : 0,
        revenueCDF: totalRevenueCDF,
        revenueUSD: totalRevenueUSD,
        numberOfPurchases: paymentsOfType.length,
      };
    });

    // Statistiques globales
    const totalTicketsSold = soldTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
    const totalRevenueCDF = payments
      .filter(p => p.currency === 'CDF')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalRevenueUSD = payments
      .filter(p => p.currency === 'USD')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalCapacity = ticketTypes.reduce((sum, t) => sum + t.quantity, 0);

    res.json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.start_date,
      },
      summary: {
        totalCapacity,
        totalSold: totalTicketsSold,
        totalAvailable: ticketTypes.reduce((sum, t) => sum + t.available_quantity, 0),
        soldPercentage: totalCapacity > 0 
          ? Math.round((totalTicketsSold / totalCapacity) * 100) 
          : 0,
        totalRevenueCDF,
        totalRevenueUSD,
        numberOfPurchases: payments.length,
        numberOfBuyers: new Set(payments.map(p => p.user_id)).size,
      },
      ticketTypes: statsByType,
      recentPurchases: payments
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          quantity: p.quantity,
          createdAt: p.created_at,
          ticketTypeId: p.ticket_type_id,
        })),
    });
  } catch (err) {
    console.error('❌ Erreur récupération statistiques:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// =========================
// OBTENIR UN ÉVÉNEMENT PAR ID
// =========================
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const eventId = parseInt(id);

  try {
    console.log(`🔍 Recherche événement avec ID: ${id}, type: ${typeof id}, parsed: ${eventId}`);
    
    // Validation de l'ID
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }
    
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    
    console.log(`📊 Événements trouvés: ${events?.length || 0}`);
    
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.status !== 'published') {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(404).json({ message: 'Événement non trouvé' });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Format du token invalide' });
      }

      const token = parts[1].replace(';', '').trim();

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      } catch (e) {
        return res.status(401).json({ message: 'Token invalide' });
      }

      const users = await supabaseAPI.select('Users', { id: decoded.id });
      const dbUser = users[0];

      if (!dbUser) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      const canAccess = dbUser.role === 'admin' || dbUser.role === 'moderator' || event.organizer_id === dbUser.id;
      if (!canAccess) {
        return res.status(403).json({ message: 'Accès interdit' });
      }
    }

    // Inclure l'organisateur
    console.log(`👤 Recherche organisateur ID: ${event.organizer_id}`);
    const organizers = await supabaseAPI.select('Users', { id: event.organizer_id });
    const organizer = organizers[0];

    // Vérifier si l'organisateur est banni (masquer l'événement)
    if (organizer && organizer.banned) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Inclure les tags
    const links = await supabaseAPI.select('EventTags', { event_id: eventId });
    const tagIds = Array.from(new Set(links.map((l) => l.tag_id)));
    const tags = tagIds.length
      ? await supabaseAPI.select('Tags', { id: { in: tagIds } }, { order: 'name.asc' })
      : [];

    res.json({
      ...event,
      organizer: organizer ? {
        id: organizer.id,
        name: organizer.name,
        email: organizer.email,
        avatar_url: organizer.avatar_url,
        is_verified_organizer: organizer.is_verified_organizer || false
      } : null,
      tags
    });
  } catch (err) {
    console.error('Erreur récupération événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// MODIFIER UN ÉVÉNEMENT (organisateur uniquement)
// =========================
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const { title, description, startDate, endDate, location, coverImage, status } = req.body;

  try {
    // Vérifier que l'utilisateur est l'organisateur
    const eventId = parseInt(id);
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    const updatedEvent = await supabaseAPI.update('Events', {
      title,
      description,
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate ? new Date(endDate).toISOString() : undefined,
      location,
      cover_image: coverImage,
      status,
      updated_at: new Date().toISOString()
    }, { id: eventId });

    res.json({ message: 'Événement modifié', event: updatedEvent });
  } catch (err) {
    console.error('Erreur modification événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// SUPPRIMER UN ÉVÉNEMENT (organisateur uniquement)
// =========================
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    // Vérifier que l'utilisateur est l'organisateur
    const eventId = parseInt(id);
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    await supabaseAPI.delete('Events', { id: eventId });
    res.json({ message: 'Événement supprimé' });
  } catch (err) {
    console.error('Erreur suppression événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LIKES GROUPÉS (OPTIMISÉ)
// =========================
// Middleware optionnel : charge req.user si le token est présent, mais ne bloque pas si absent
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('⚠️  Pas de token Authorization dans la requête');
    return next();
  }

  const token = authHeader.substring(7);
  console.log('🔑 Token reçu (premiers 20 chars):', token.substring(0, 20) + '...');
  
  try {
    // Utiliser JWT_ACCESS_SECRET au lieu de JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    console.log('✅ User authentifié dans optionalAuth:', req.user.id, '(type:', typeof req.user.id + ')');
  } catch (err) {
    console.log('⚠️  Token invalide dans optionalAuth:', err.message);
    console.log('🔑 JWT_ACCESS_SECRET défini:', !!process.env.JWT_ACCESS_SECRET);
    // Token invalide, mais on continue quand même
  }
  next();
};

router.get('/:eventId/comments-likes', optionalAuth, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);

  try {
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    // 1. Récupérer tous les commentaires de l'événement
    const comments = await supabaseAPI.select('Comments', { 
      event_id: eventId,
      deleted_at: null 
    });

    if (!comments || comments.length === 0) {
      return res.json({ likes: {} });
    }

    const commentIds = comments.map(c => c.id);

    // 2. Récupérer tous les likes pour ces commentaires en une seule requête
    const allLikes = await supabaseAPI.select('CommentLikes', {
      comment_id: { in: commentIds }
    });

    // 3. Grouper les likes par commentaire
    const likesByComment = {};
    commentIds.forEach(id => {
      likesByComment[id] = {
        count: 0,
        userIds: [],
        isLikedByCurrentUser: false
      };
    });

    const currentUserId = req.user?.id;
    console.log('👤 Current user ID:', currentUserId, '(type:', typeof currentUserId + ')');
    console.log('📊 Total likes trouvés:', allLikes.length);

    allLikes.forEach(like => {
      const commentId = like.comment_id;
      if (likesByComment[commentId]) {
        likesByComment[commentId].count++;
        likesByComment[commentId].userIds.push(like.user_id);
        
        // Si l'utilisateur est connecté, vérifier s'il a liké
        // Comparer en convertissant les deux en nombres pour éviter les problèmes de type
        const likeUserId = parseInt(like.user_id, 10);
        const currentUserIdNum = parseInt(currentUserId, 10);
        
        if (currentUserIdNum && likeUserId === currentUserIdNum) {
          likesByComment[commentId].isLikedByCurrentUser = true;
          console.log('❤️  User', currentUserIdNum, 'a liké le commentaire:', commentId);
        }
      }
    });

    res.json({ likes: likesByComment });
  } catch (err) {
    console.error('Erreur récupération likes événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;