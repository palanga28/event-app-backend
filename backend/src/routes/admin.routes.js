const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/role.middleware');

console.log('✅ admin.routes chargé');

// =========================
// STATISTIQUES ADMINISTRATION
// =========================
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoIso = oneMonthAgo.toISOString();

    const [
      usersTotal,
      usersNewThisMonth,
      eventsTotal,
      eventsPublished,
      eventsDraft,
      ticketTypesTotal,
      ticketTypesActive,
      ticketsTotal,
      ticketsSold,
      ticketsCancelled,
      activeTicketsForRevenue,
    ] = await Promise.all([
      supabaseAPI.count('Users'),
      // created_at >= oneMonthAgo
      supabaseAPI.count('Users', { created_at: { gte: oneMonthAgoIso } }),
      supabaseAPI.count('Events'),
      supabaseAPI.count('Events', { status: 'published' }),
      supabaseAPI.count('Events', { status: 'draft' }),
      supabaseAPI.count('TicketTypes'),
      supabaseAPI.count('TicketTypes', { status: 'active' }),
      supabaseAPI.count('Tickets'),
      supabaseAPI.count('Tickets', { status: 'active' }),
      supabaseAPI.count('Tickets', { status: 'cancelled' }),
      // Pour la revenue, on récupère seulement price_paid sur les tickets actifs
      supabaseAPI.select('Tickets', { status: 'active' }, { select: 'price_paid' }),
    ]);

    const revenue = Array.isArray(activeTicketsForRevenue)
      ? activeTicketsForRevenue.reduce((sum, t) => sum + parseFloat(t.price_paid || 0), 0)
      : 0;

    const stats = {
      users: {
        total: usersTotal,
        newThisMonth: usersNewThisMonth,
      },
      events: {
        total: eventsTotal,
        published: eventsPublished,
        draft: eventsDraft,
      },
      tickets: {
        total: ticketsTotal,
        sold: ticketsSold,
        cancelled: ticketsCancelled,
        revenue,
      },
      ticketTypes: {
        total: ticketTypesTotal,
        active: ticketTypesActive,
      },
    };

    res.json(stats);
  } catch (err) {
    console.error('Erreur récupération statistiques:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// STATISTIQUES TEMPORELLES
// =========================
router.get('/stats/timeline', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startDateIso = startDate.toISOString();

    const [users, events, tickets] = await Promise.all([
      supabaseAPI.select('Users', { created_at: { gte: startDateIso } }, { select: 'id,created_at' }),
      supabaseAPI.select('Events', { created_at: { gte: startDateIso } }, { select: 'id,created_at,status' }),
      supabaseAPI.select('Tickets', { created_at: { gte: startDateIso } }, { select: 'id,created_at,price_paid,status' }),
    ]);

    const timeline = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayUsers = users.filter(u => u.created_at?.startsWith(dateStr)).length;
      const dayEvents = events.filter(e => e.created_at?.startsWith(dateStr)).length;
      const dayTickets = tickets.filter(t => t.created_at?.startsWith(dateStr)).length;
      const dayRevenue = tickets
        .filter(t => t.created_at?.startsWith(dateStr) && t.status === 'active')
        .reduce((sum, t) => sum + parseFloat(t.price_paid || 0), 0);

      timeline.push({
        date: dateStr,
        label: new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        users: dayUsers,
        events: dayEvents,
        tickets: dayTickets,
        revenue: Math.round(dayRevenue * 100) / 100,
      });
    }

    const totals = {
      users: users.length,
      events: events.length,
      tickets: tickets.length,
      revenue: Math.round(tickets.filter(t => t.status === 'active').reduce((sum, t) => sum + parseFloat(t.price_paid || 0), 0) * 100) / 100,
    };

    res.json({ timeline, totals, days });
  } catch (err) {
    console.error('Erreur récupération stats timeline:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// GESTION UTILISATEURS
// =========================
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await supabaseAPI.select('Users');
    
    // Exclure les mots de passe
    const usersSafe = users.map(user => {
      const { password, ...userSafe } = user;
      return userSafe;
    });

    res.json(usersSafe);
  } catch (err) {
    console.error('Erreur récupération utilisateurs:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/users/:id/ban', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    const targetUser = users[0];

    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ message: 'Impossible de bannir un administrateur' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous bannir vous-même' });
    }

    // Marquer l'utilisateur comme banni
    await supabaseAPI.update(
      'Users',
      {
        banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason || 'Banni par un administrateur',
        updated_at: new Date().toISOString()
      },
      { id: userId }
    );

    // Révoquer toutes les sessions actives
    const activeTokens = await supabaseAPI.select('RefreshTokens', { user_id: userId, revoked: false });

    await Promise.all(
      activeTokens.map((t) =>
        supabaseAPI.update(
          'RefreshTokens',
          {
            revoked: true,
            revoked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { token: t.token }
        )
      )
    );

    // Log d'audit
    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'user_banned',
      entity_type: 'user',
      entity_id: userId,
      metadata: { 
        banned_user: { id: userId, name: targetUser.name, email: targetUser.email },
        reason: reason || 'Banni par un administrateur'
      },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({
      message: `Utilisateur ${targetUser.name} banni avec succès`,
      userId,
      revokedSessions: activeTokens.length
    });
  } catch (err) {
    console.error('Erreur bannissement utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/users/:id/unban', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    const targetUser = users[0];

    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!targetUser.banned) {
      return res.status(400).json({ message: 'Cet utilisateur n\'est pas banni' });
    }

    await supabaseAPI.update(
      'Users',
      {
        banned: false,
        banned_at: null,
        banned_reason: null,
        updated_at: new Date().toISOString()
      },
      { id: userId }
    );

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'user_unbanned',
      entity_type: 'user',
      entity_id: userId,
      metadata: { unbanned_user: { id: userId, name: targetUser.name, email: targetUser.email } },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({
      message: `Utilisateur ${targetUser.name} débanni avec succès`,
      userId
    });
  } catch (err) {
    console.error('Erreur débannissement utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/users/:id/sessions', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const tokens = await supabaseAPI.select('RefreshTokens', { user_id: userId });

    const safe = tokens.map((t) => ({
      id: t.id,
      user_id: t.user_id,
      expires_at: t.expires_at,
      revoked: t.revoked,
      revoked_at: t.revoked_at,
      created_at: t.created_at,
      updated_at: t.updated_at
    }));

    res.json(safe);
  } catch (err) {
    console.error('Erreur récupération sessions utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const validRoles = ['user', 'moderator', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide. Valeurs acceptées: user, moderator, admin' });
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    const targetUser = users[0];

    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas modifier votre propre rôle' });
    }

    const previousRole = targetUser.role;

    const updated = await supabaseAPI.update(
      'Users',
      { role, updated_at: new Date().toISOString() },
      { id: userId }
    );

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'user_role_changed',
      entity_type: 'user',
      entity_id: userId,
      metadata: { previous_role: previousRole, new_role: role },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    const { password, ...userSafe } = updated || targetUser;
    res.json({ message: 'Rôle mis à jour', user: { ...userSafe, role } });
  } catch (err) {
    console.error('Erreur modification rôle utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    const targetUser = users[0];

    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ message: 'Impossible de supprimer un administrateur' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    await supabaseAPI.delete('RefreshTokens', { user_id: userId });
    await supabaseAPI.delete('Favorites', { user_id: userId });
    await supabaseAPI.delete('Follows', { follower_id: userId });
    await supabaseAPI.delete('Follows', { following_id: userId });
    await supabaseAPI.delete('Stories', { user_id: userId });
    await supabaseAPI.delete('Notifications', { user_id: userId });
    await supabaseAPI.delete('UserChallenges', { user_id: userId });

    await supabaseAPI.delete('Users', { id: userId });

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'user_deleted',
      entity_type: 'user',
      entity_id: userId,
      metadata: { deleted_user: { id: userId, name: targetUser.name, email: targetUser.email } },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Utilisateur supprimé', userId });
  } catch (err) {
    console.error('Erreur suppression utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/challenges', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const status = req.query.status;
    const type = req.query.type;

    const challenges = await supabaseAPI.select(
      'Challenges',
      {
        status: typeof status === 'string' && status ? status : undefined,
        type: typeof type === 'string' && type ? type : undefined,
      },
      { order: 'created_at.desc', limit: 200 }
    );

    const ids = challenges.map((c) => c.id).filter(Boolean);
    const targets = ids.length ? await supabaseAPI.select('ChallengeTargets', { challenge_id: { in: ids } }) : [];

    const targetsById = new Map();
    for (const t of targets) {
      const id = String(t.challenge_id);
      if (!targetsById.has(id)) targetsById.set(id, []);
      targetsById.get(id).push(t);
    }

    res.json(
      challenges.map((c) => ({
        ...c,
        targets: targetsById.get(String(c.id)) || [],
      }))
    );
  } catch (err) {
    console.error('Erreur récupération défis admin:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/challenges', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      reward_type,
      reward_payload,
      rule_type,
      rule_payload,
      targets,
    } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ message: 'Titre invalide (min 3 caractères)' });
    }

    const created = await supabaseAPI.insert('Challenges', {
      title: title.trim(),
      description: typeof description === 'string' ? description : null,
      type: typeof type === 'string' ? type : 'manual',
      status: 'draft',
      reward_type: typeof reward_type === 'string' ? reward_type : 'points',
      reward_payload: reward_payload && typeof reward_payload === 'object' ? reward_payload : {},
      rule_type: typeof rule_type === 'string' ? rule_type : null,
      rule_payload: rule_payload && typeof rule_payload === 'object' ? rule_payload : {},
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const challengeId = created?.id;
    if (challengeId && Array.isArray(targets) && targets.length > 0) {
      for (const t of targets.slice(0, 10)) {
        await supabaseAPI.insert('ChallengeTargets', {
          challenge_id: challengeId,
          min_level: Number.isFinite(t?.min_level) ? t.min_level : t?.min_level ? parseInt(t.min_level) : null,
          required_badge: typeof t?.required_badge === 'string' && t.required_badge ? t.required_badge : null,
          created_at: new Date().toISOString(),
        });
      }
    }

    const savedTargets = challengeId
      ? await supabaseAPI.select('ChallengeTargets', { challenge_id: challengeId })
      : [];

    res.status(201).json({ ...created, targets: savedTargets });
  } catch (err) {
    console.error('Erreur création défi admin:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/challenges/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const challengeId = String(req.params.id || '');
    if (!challengeId) return res.status(400).json({ message: 'ID défi manquant' });

    const {
      title,
      description,
      type,
      status,
      reward_type,
      reward_payload,
      rule_type,
      rule_payload,
      targets,
    } = req.body || {};

    const patch = {
      updated_at: new Date().toISOString(),
    };

    if (typeof title === 'string') patch.title = title.trim();
    if (description !== undefined) patch.description = typeof description === 'string' ? description : null;
    if (typeof type === 'string') patch.type = type;
    if (typeof status === 'string') patch.status = status;
    if (typeof reward_type === 'string') patch.reward_type = reward_type;
    if (reward_payload !== undefined) patch.reward_payload = reward_payload && typeof reward_payload === 'object' ? reward_payload : {};
    if (rule_type !== undefined) patch.rule_type = typeof rule_type === 'string' ? rule_type : null;
    if (rule_payload !== undefined) patch.rule_payload = rule_payload && typeof rule_payload === 'object' ? rule_payload : {};

    const updated = await supabaseAPI.update('Challenges', patch, { id: challengeId });

    if (Array.isArray(targets)) {
      await supabaseAPI.delete('ChallengeTargets', { challenge_id: challengeId });
      for (const t of targets.slice(0, 10)) {
        await supabaseAPI.insert('ChallengeTargets', {
          challenge_id: challengeId,
          min_level: Number.isFinite(t?.min_level) ? t.min_level : t?.min_level ? parseInt(t.min_level) : null,
          required_badge: typeof t?.required_badge === 'string' && t.required_badge ? t.required_badge : null,
          created_at: new Date().toISOString(),
        });
      }
    }

    const savedTargets = await supabaseAPI.select('ChallengeTargets', { challenge_id: challengeId });
    res.json({ ...updated, targets: savedTargets });
  } catch (err) {
    console.error('Erreur update défi admin:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/challenges/:id/publish', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const challengeId = String(req.params.id || '');
    if (!challengeId) return res.status(400).json({ message: 'ID défi manquant' });

    const updated = await supabaseAPI.update(
      'Challenges',
      {
        status: 'published',
        updated_at: new Date().toISOString(),
      },
      { id: challengeId }
    );

    res.json({ message: 'Défi publié', challenge: updated });
  } catch (err) {
    console.error('Erreur publish défi admin:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// GESTION ÉVÉNEMENTS (ADMIN)
// =========================
router.get('/events', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const events = await supabaseAPI.select('Events');

    const organizerIds = Array.from(
      new Set(events.map((e) => e.organizer_id).filter((id) => typeof id === 'number'))
    );

    const organizers = organizerIds.length
      ? await supabaseAPI.select('Users', { id: { in: organizerIds } })
      : [];

    const organizerById = new Map(
      organizers.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }])
    );

    const eventsWithOrganizers = events.map((event) => ({
      ...event,
      organizer: organizerById.get(event.organizer_id) || null,
    }));

    res.json(eventsWithOrganizers);
  } catch (err) {
    console.error('Erreur récupération événements admin:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/events/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const eventId = parseInt(id);

  try {
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const validStatuses = ['draft', 'published', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide. Valeurs acceptées: draft, published, cancelled' });
    }

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    const previousStatus = event.status;

    const updated = await supabaseAPI.update(
      'Events',
      { status, updated_at: new Date().toISOString() },
      { id: eventId }
    );

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'event_status_changed',
      entity_type: 'event',
      entity_id: eventId,
      metadata: { previous_status: previousStatus, new_status: status },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Statut mis à jour', event: updated || { ...event, status } });
  } catch (err) {
    console.error('Erreur modification statut événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const eventId = parseInt(id);

  try {
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Supprimer les dépendances de l'événement
    try { await supabaseAPI.delete('Favorites', { event_id: eventId }); } catch (e) { console.log('No favorites to delete'); }
    try { await supabaseAPI.delete('EventTags', { event_id: eventId }); } catch (e) { console.log('No event tags to delete'); }
    try { await supabaseAPI.delete('Tickets', { event_id: eventId }); } catch (e) { console.log('No tickets to delete'); }
    try { await supabaseAPI.delete('TicketTypes', { event_id: eventId }); } catch (e) { console.log('No ticket types to delete'); }
    
    // Supprimer les signalements liés à cet événement
    try {
      const reports = await supabaseAPI.select('Reports', { target_id: eventId });
      const eventReports = reports.filter(r => r.type === 'event');
      for (const report of eventReports) {
        await supabaseAPI.delete('Reports', { id: report.id });
      }
    } catch (e) { console.log('No reports to delete'); }

    // Supprimer les commentaires liés à cet événement
    try { await supabaseAPI.delete('Comments', { event_id: eventId }); } catch (e) { console.log('No comments to delete'); }

    // Supprimer l'événement
    await supabaseAPI.delete('Events', { id: eventId });

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'event_deleted',
      entity_type: 'event',
      entity_id: eventId,
      metadata: { deleted_event: { id: eventId, title: event.title, organizer_id: event.organizer_id } },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Événement supprimé', eventId });
  } catch (err) {
    console.error('Erreur suppression événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/events/:id/feature', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { featured } = req.body;
  const eventId = parseInt(id);

  try {
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    if (typeof featured !== 'boolean') {
      return res.status(400).json({ message: 'Champ featured requis (boolean)' });
    }

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    let updated = await supabaseAPI.update(
      'Events',
      {
        featured,
        status: featured ? 'published' : event.status,
        updated_at: new Date().toISOString()
      },
      { id: eventId }
    );

    // Certains environnements peuvent ne pas renvoyer la représentation patchée.
    // On relit l'event pour garantir featured/status dans la réponse.
    if (!updated || typeof updated.featured !== 'boolean') {
      const refreshedRows = await supabaseAPI.select('Events', { id: eventId });
      updated = refreshedRows[0];
    }

    if (!updated) {
      return res.status(500).json({ message: 'Événement mis à jour mais introuvable après mise à jour' });
    }

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: featured ? 'event_featured' : 'event_unfeatured',
      entity_type: 'event',
      entity_id: eventId,
      metadata: {
        previous: { featured: !!event.featured, status: event.status },
        next: { featured, status: featured ? 'published' : event.status },
      },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({
      message: 'Événement mis à jour',
      event: {
        ...updated,
        featured: !!updated.featured,
      },
    });
  } catch (err) {
    console.error('Erreur mise en avant événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// GESTION SIGNALEMENTS
// =========================
router.get('/reports', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit;
    const offset = req.query.offset;
    const status = req.query.status;
    const type = req.query.type;

    const reports = await supabaseAPI.select(
      'Reports',
      { status: status || undefined, type: type || undefined },
      { limit, offset, order: 'created_at.desc' }
    );

    const userIds = Array.from(
      new Set(
        reports
          .flatMap((r) => [r.reported_by, r.resolved_by, r.type === 'user' ? r.target_id : null])
          .filter((id) => typeof id === 'number')
      )
    );

    const eventIds = Array.from(
      new Set(
        reports
          .filter((r) => r.type === 'event')
          .map((r) => r.target_id)
          .filter((id) => typeof id === 'number')
      )
    );

    const [users, events] = await Promise.all([
      userIds.length ? supabaseAPI.select('Users', { id: { in: userIds } }) : Promise.resolve([]),
      eventIds.length ? supabaseAPI.select('Events', { id: { in: eventIds } }) : Promise.resolve([]),
    ]);

    const userById = new Map(users.map((u) => [u.id, u]));
    const eventById = new Map(events.map((e) => [e.id, e]));

    const reportsWithDetails = reports.map((report) => {
      const reporter = typeof report.reported_by === 'number' ? userById.get(report.reported_by) : null;
      const resolver = typeof report.resolved_by === 'number' ? userById.get(report.resolved_by) : null;

      let target = null;
      if (report.type === 'event') {
        target = typeof report.target_id === 'number' ? eventById.get(report.target_id) || null : null;
      }
      if (report.type === 'user') {
        const u = typeof report.target_id === 'number' ? userById.get(report.target_id) || null : null;
        if (u) {
          const { password, ...safe } = u;
          target = safe;
        }
      }

      return {
        ...report,
        reporter: reporter ? { id: reporter.id, name: reporter.name, email: reporter.email } : null,
        resolver: resolver ? { id: resolver.id, name: resolver.name, email: resolver.email } : null,
        target,
      };
    });

    res.json(reportsWithDetails);
  } catch (err) {
    console.error('Erreur récupération reports admin:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/reports/:id/resolve', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const reportId = parseInt(id);

  try {
    if (isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({ message: 'ID signalement invalide' });
    }

    const validActions = ['dismissed', 'warning_sent', 'content_removed', 'user_banned'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({ message: 'Action invalide. Valeurs acceptées: dismissed, warning_sent, content_removed, user_banned' });
    }

    const reports = await supabaseAPI.select('Reports', { id: reportId });
    const report = reports[0];

    if (!report) {
      return res.status(404).json({ message: 'Signalement non trouvé' });
    }

    if (report.status === 'resolved') {
      return res.status(400).json({ message: 'Ce signalement est déjà résolu' });
    }

    // Si l'action est user_banned, bannir réellement l'utilisateur
    if (action === 'user_banned' && report.type === 'user') {
      const targetUserId = report.target_id;
      const targetUsers = await supabaseAPI.select('Users', { id: targetUserId });
      const targetUser = targetUsers[0];
      
      if (targetUser && targetUser.role !== 'admin') {
        // Marquer l'utilisateur comme banni
        await supabaseAPI.update(
          'Users',
          {
            banned: true,
            banned_at: new Date().toISOString(),
            banned_reason: reason || 'Banni suite à un signalement',
            updated_at: new Date().toISOString()
          },
          { id: targetUserId }
        );

        // Révoquer toutes les sessions actives
        const activeTokens = await supabaseAPI.select('RefreshTokens', { user_id: targetUserId, revoked: false });
        await Promise.all(
          activeTokens.map((t) =>
            supabaseAPI.update(
              'RefreshTokens',
              { revoked: true, revoked_at: new Date().toISOString() },
              { token: t.token }
            )
          )
        );

        // Log d'audit pour le ban
        await supabaseAPI.insert('AuditLogs', {
          actor_id: req.user.id,
          action: 'user_banned',
          entity_type: 'user',
          entity_id: targetUserId,
          metadata: { 
            banned_user: { id: targetUserId, name: targetUser.name, email: targetUser.email },
            reason: reason || 'Banni suite à un signalement',
            from_report: reportId
          },
          ip: req.ip,
          created_at: new Date().toISOString()
        });
      }
    }

    const updated = await supabaseAPI.update(
      'Reports',
      {
        status: 'resolved',
        resolved_by: req.user.id,
        resolved_action: action,
        resolved_reason: typeof reason === 'string' ? reason : null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { id: reportId }
    );

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'report_resolved',
      entity_type: 'report',
      entity_id: reportId,
      metadata: { 
        report_type: report.type,
        target_id: report.target_id,
        resolved_action: action,
        resolved_reason: reason || null
      },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Signalement résolu', report: updated || { ...report, status: 'resolved', resolved_action: action } });
  } catch (err) {
    console.error('Erreur résolution signalement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LOGS D'AUDIT
// =========================
router.get('/logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit;
    const offset = req.query.offset;
    const action = req.query.action;

    const ordered = await supabaseAPI.select(
      'AuditLogs',
      { action: action || undefined },
      { limit: limit || 100, offset, order: 'created_at.desc' }
    );

    const actorIds = Array.from(
      new Set(ordered.map((l) => l.actor_id).filter((id) => typeof id === 'number'))
    );

    const actors = actorIds.length ? await supabaseAPI.select('Users', { id: { in: actorIds } }) : [];
    const actorById = new Map(actors.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }]));

    const logsWithActors = ordered.map((log) => ({
      ...log,
      actor: actorById.get(log.actor_id) || null,
    }));

    res.json(logsWithActors);
  } catch (err) {
    console.error('Erreur récupération logs:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// CRÉER UN UTILISATEUR (ADMIN)
// =========================
router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, email, password, role, bio } = req.body;

  try {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Champs requis: name, email, password' });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Nom invalide' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe invalide (min 6 caractères)' });
    }

    if (role && !['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Vérifier si l'email existe déjà
    const existingUsers = await supabaseAPI.select('Users', { email: normalizedEmail });
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await supabaseAPI.insert('Users', {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'user',
      bio: bio || null,
      created_at: new Date().toISOString()
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ message: 'Utilisateur créé avec succès', user: userWithoutPassword });
  } catch (err) {
    console.error('Erreur création utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// RÉINITIALISER MOT DE PASSE UTILISATEUR (ADMIN)
// =========================
router.put('/users/:id/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'Nouveau mot de passe invalide (min 6 caractères)' });
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await supabaseAPI.update('Users', { password: hashedPassword }, { id: userId });

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    console.error('Erreur réinitialisation mot de passe:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// GESTION DES PAIEMENTS (ADMIN)
// =========================
router.get('/payments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payments = await supabaseAPI.select('Payments', {}, { order: 'created_at.desc', limit: 500 });

    // Récupérer les IDs uniques
    const userIds = [...new Set(payments.map(p => p.user_id).filter(Boolean))];
    const eventIds = [...new Set(payments.map(p => p.event_id).filter(Boolean))];
    const ticketTypeIds = [...new Set(payments.map(p => p.ticket_type_id).filter(Boolean))];

    // Récupérer les données associées
    const [users, events, ticketTypes] = await Promise.all([
      userIds.length ? supabaseAPI.select('Users', { id: { in: userIds } }) : [],
      eventIds.length ? supabaseAPI.select('Events', { id: { in: eventIds } }) : [],
      ticketTypeIds.length ? supabaseAPI.select('TicketTypes', { id: { in: ticketTypeIds } }) : []
    ]);

    const userById = new Map(users.map(u => [u.id, { id: u.id, name: u.name, email: u.email }]));
    const eventById = new Map(events.map(e => [e.id, { id: e.id, title: e.title }]));
    const ticketTypeById = new Map(ticketTypes.map(t => [t.id, { id: t.id, name: t.name, price: t.price }]));

    const paymentsWithDetails = payments.map(payment => ({
      ...payment,
      user: userById.get(payment.user_id) || null,
      event: eventById.get(payment.event_id) || null,
      ticket_type: ticketTypeById.get(payment.ticket_type_id) || null
    }));

    res.json(paymentsWithDetails);
  } catch (err) {
    console.error('Erreur récupération paiements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// GESTION DES TICKETS (ADMIN)
// =========================
router.get('/tickets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tickets = await supabaseAPI.select('Tickets', {}, { order: 'created_at.desc', limit: 500 });

    // Récupérer les IDs uniques
    const userIds = [...new Set(tickets.map(t => t.user_id).filter(Boolean))];
    const eventIds = [...new Set(tickets.map(t => t.event_id).filter(Boolean))];
    const ticketTypeIds = [...new Set(tickets.map(t => t.ticket_type_id).filter(Boolean))];

    // Récupérer les données associées
    const [users, events, ticketTypes] = await Promise.all([
      userIds.length ? supabaseAPI.select('Users', { id: { in: userIds } }) : [],
      eventIds.length ? supabaseAPI.select('Events', { id: { in: eventIds } }) : [],
      ticketTypeIds.length ? supabaseAPI.select('TicketTypes', { id: { in: ticketTypeIds } }) : []
    ]);

    const userById = new Map(users.map(u => [u.id, { id: u.id, name: u.name, email: u.email }]));
    const eventById = new Map(events.map(e => [e.id, { id: e.id, title: e.title, date: e.date, location: e.location }]));
    const ticketTypeById = new Map(ticketTypes.map(t => [t.id, { id: t.id, name: t.name, price: t.price }]));

    const ticketsWithDetails = tickets.map(ticket => ({
      ...ticket,
      user: userById.get(ticket.user_id) || null,
      event: eventById.get(ticket.event_id) || null,
      ticket_type: ticketTypeById.get(ticket.ticket_type_id) || null
    }));

    res.json(ticketsWithDetails);
  } catch (err) {
    console.error('Erreur récupération tickets:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
