const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const { moderatorMiddleware } = require('../middlewares/role.middleware');

console.log('✅ moderator.routes chargé');

// =========================
// VALIDATION ÉVÉNEMENTS
// =========================
router.get('/events/pending', authMiddleware, moderatorMiddleware, async (req, res) => {
  try {
    // Événements en attente de validation
    const events = await supabaseAPI.select('Events', { status: 'pending' });
    
    const eventsWithOrganizers = await Promise.all(
      events.map(async (event) => {
        const organizers = await supabaseAPI.select('Users', { id: event.organizer_id });
        const organizer = organizers[0];
        
        return {
          ...event,
          organizer: organizer ? {
            id: organizer.id,
            name: organizer.name,
            email: organizer.email
          } : null
        };
      })
    );

    res.json(eventsWithOrganizers);
  } catch (err) {
    console.error('Erreur récupération événements en attente:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/events/:id/approve', authMiddleware, moderatorMiddleware, async (req, res) => {
  const { id } = req.params;
  const eventId = parseInt(id);

  try {
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const event = await supabaseAPI.update('Events', {
      status: 'published'
    }, { id: eventId });

    res.json({ message: 'Événement approuvé et publié', event });
  } catch (err) {
    console.error('Erreur approbation événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/events/:id/reject', authMiddleware, moderatorMiddleware, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const eventId = parseInt(id);

  try {
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const event = await supabaseAPI.update('Events', {
      status: 'rejected',
      updated_at: new Date().toISOString()
    }, { id: eventId });

    // En production, envoyer une notification à l'organisateur
    res.json({ message: 'Événement rejeté', reason: reason || 'Non conforme aux directives' });
  } catch (err) {
    console.error('Erreur rejet événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// MODÉRATION CONTENU
// =========================
router.get('/reports', authMiddleware, moderatorMiddleware, async (req, res) => {
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

    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const reporter = report.reported_by
          ? (await supabaseAPI.select('Users', { id: report.reported_by }))[0]
          : null;
        const resolver = report.resolved_by
          ? (await supabaseAPI.select('Users', { id: report.resolved_by }))[0]
          : null;

        let target = null;
        if (report.type === 'event') {
          target = (await supabaseAPI.select('Events', { id: report.target_id }))[0] || null;
        }
        if (report.type === 'user') {
          const u = (await supabaseAPI.select('Users', { id: report.target_id }))[0] || null;
          if (u) {
            const { password, ...safe } = u;
            target = safe;
          }
        }

        return {
          ...report,
          reporter: reporter ? { id: reporter.id, name: reporter.name, email: reporter.email } : null,
          resolver: resolver ? { id: resolver.id, name: resolver.name, email: resolver.email } : null,
          target
        };
      })
    );

    res.json(reportsWithDetails);
  } catch (err) {
    console.error('Erreur récupération signalements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/reports/:id/resolve', authMiddleware, moderatorMiddleware, async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const reportId = parseInt(id);

  try {
    if (isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({ message: 'ID signalement invalide' });
    }

    if (!['dismiss', 'remove', 'warn'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide' });
    }

    if (reason !== undefined && reason !== null && typeof reason !== 'string') {
      return res.status(400).json({ message: 'Reason invalide' });
    }

    const reports = await supabaseAPI.select('Reports', { id: reportId });
    const report = reports[0];

    if (!report) {
      return res.status(404).json({ message: 'Signalement non trouvé' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ message: 'Signalement déjà résolu' });
    }

    // Si l'action est ban et le signalement concerne un utilisateur, bannir réellement
    if ((action === 'ban' || action === 'user_banned') && report.type === 'user') {
      const targetUserId = report.target_id;
      const targetUsers = await supabaseAPI.select('Users', { id: targetUserId });
      const targetUser = targetUsers[0];
      
      if (targetUser && targetUser.role !== 'admin') {
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

        // Révoquer les sessions
        const activeTokens = await supabaseAPI.select('RefreshTokens', { user_id: targetUserId, revoked: false });
        await Promise.all(
          activeTokens.map((t) =>
            supabaseAPI.update('RefreshTokens', { revoked: true, revoked_at: new Date().toISOString() }, { token: t.token })
          )
        );
      }
    }

    const updated = await supabaseAPI.update(
      'Reports',
      {
        status: 'resolved',
        resolved_by: req.user.id,
        resolved_action: action,
        resolved_reason: reason || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { id: reportId }
    );

    if (action === 'remove' && report.type === 'event') {
      await supabaseAPI.update('Events', { status: 'rejected', updated_at: new Date().toISOString() }, { id: report.target_id });
    }

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'report_resolved',
      entity_type: 'report',
      entity_id: reportId,
      metadata: {
        report: { type: report.type, target_id: report.target_id },
        resolution: { action, reason: reason || null }
      },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Signalement résolu', report: updated });
  } catch (err) {
    console.error('Erreur résolution signalement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// GESTION UTILISATEURS SIGNALÉS
// =========================
router.get('/users/reported', authMiddleware, moderatorMiddleware, async (req, res) => {
  try {
    const reports = await supabaseAPI.select('Reports', { type: 'user', status: 'pending' });

    const byUserId = new Map();
    reports.forEach((r) => {
      byUserId.set(r.target_id, (byUserId.get(r.target_id) || 0) + 1);
    });

    const results = await Promise.all(
      Array.from(byUserId.entries()).map(async ([userId, count]) => {
        const users = await supabaseAPI.select('Users', { id: userId });
        const user = users[0];
        if (!user) return null;
        const { password, ...userSafe } = user;

        const userReports = reports.filter((r) => r.target_id === userId);
        const lastReport = userReports
          .map((r) => r.created_at)
          .filter(Boolean)
          .sort()
          .slice(-1)[0];

        return {
          ...userSafe,
          reportsCount: count,
          lastReport: lastReport || null
        };
      })
    );

    res.json(results.filter(Boolean));
  } catch (err) {
    console.error('Erreur récupération utilisateurs signalés:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/users/:id/warn', authMiddleware, moderatorMiddleware, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    // Ne pas avertir l'administrateur
    if (userId === 1) {
      return res.status(400).json({ message: 'Impossible d\'avertir l\'administrateur' });
    }

    if (message !== undefined && message !== null) {
      if (typeof message !== 'string') {
        return res.status(400).json({ message: 'Message invalide' });
      }
      if (message.length > 1000) {
        return res.status(400).json({ message: 'Message trop long (max 1000 caractères)' });
      }
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const report = await supabaseAPI.insert('Reports', {
      type: 'user',
      target_id: userId,
      reason: message || 'Avertissement modérateur',
      status: 'resolved',
      reported_by: req.user.id,
      resolved_by: req.user.id,
      resolved_action: 'warn',
      resolved_reason: message || null,
      resolved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await supabaseAPI.insert('AuditLogs', {
      actor_id: req.user.id,
      action: 'user_warned',
      entity_type: 'user',
      entity_id: userId,
      metadata: { message: message || null },
      ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({ message: `Avertissement enregistré pour l'utilisateur ${userId}`, report });
  } catch (err) {
    console.error('Erreur avertissement utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// STATISTIQUES MODÉRATION
// =========================
router.get('/stats', authMiddleware, moderatorMiddleware, async (req, res) => {
  try {
    const events = await supabaseAPI.select('Events');

    const stats = {
      pendingEvents: events.filter(e => e.status === 'pending').length,
      rejectedEvents: events.filter(e => e.status === 'rejected').length,
      publishedEvents: events.filter(e => e.status === 'published').length
    };

    res.json(stats);
  } catch (err) {
    console.error('Erreur récupération statistiques modération:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/challenges', authMiddleware, moderatorMiddleware, async (req, res) => {
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
    console.error('Erreur récupération défis modération:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/challenges', authMiddleware, moderatorMiddleware, async (req, res) => {
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
    console.error('Erreur création défi modération:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/challenges/:id', authMiddleware, moderatorMiddleware, async (req, res) => {
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
    console.error('Erreur update défi modération:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/challenges/:id/publish', authMiddleware, moderatorMiddleware, async (req, res) => {
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
    console.error('Erreur publish défi modération:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ACTIVITÉ MODÉRATION
// =========================
router.get('/activity', authMiddleware, moderatorMiddleware, async (req, res) => {
  try {
    // Récupérer les rapports résolus (activités de modération)
    const resolved = await supabaseAPI.select('Reports', { status: 'resolved' });
    
    // Récupérer les nouvelles publications d'événements
    const publishedEvents = await supabaseAPI.select('AuditLogs', { 
      action: 'event_published'
    });

    // Récupérer les nouvelles stories publiées
    const publishedStories = await supabaseAPI.select('AuditLogs', { 
      action: 'story_published'
    });

    // Combiner et trier par date
    const allActivities = [];

    // Ajouter les activités de modération (résolutions de rapports)
    const moderationActivities = await Promise.all(
      resolved
        .filter((r) => r.resolved_at)
        .sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at))
        .slice(0, 25)
        .map(async (r) => {
          const resolver = r.resolved_by
            ? (await supabaseAPI.select('Users', { id: r.resolved_by }))[0]
            : null;

          return {
            id: `report_${r.id}`,
            action: r.resolved_action,
            type: r.type,
            targetId: r.target_id,
            moderatorId: r.resolved_by,
            moderator: resolver ? { id: resolver.id, name: resolver.name, email: resolver.email } : null,
            timestamp: r.resolved_at,
            category: 'moderation'
          };
        })
    );

    // Ajouter les publications d'événements
    const eventActivities = await Promise.all(
      publishedEvents
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 25)
        .map(async (log) => {
          const user = log.actor_id
            ? (await supabaseAPI.select('Users', { id: log.actor_id }))[0]
            : null;

          return {
            id: `event_${log.id}`,
            action: 'event_published',
            type: 'event',
            targetId: log.entity_id,
            moderatorId: log.actor_id,
            moderator: user ? { id: user.id, name: user.name, email: user.email } : null,
            timestamp: log.created_at,
            category: 'publication',
            metadata: log.metadata
          };
        })
    );

    // Ajouter les publications de stories
    const storyActivities = await Promise.all(
      publishedStories
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 25)
        .map(async (log) => {
          const user = log.actor_id
            ? (await supabaseAPI.select('Users', { id: log.actor_id }))[0]
            : null;

          return {
            id: `story_${log.id}`,
            action: 'story_published',
            type: 'story',
            targetId: log.entity_id,
            moderatorId: log.actor_id,
            moderator: user ? { id: user.id, name: user.name, email: user.email } : null,
            timestamp: log.created_at,
            category: 'publication',
            metadata: log.metadata
          };
        })
    );

    allActivities.push(...moderationActivities, ...eventActivities, ...storyActivities);

    // Trier par date (plus récent en premier)
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50); // Limiter à 50 activités récentes

    res.json(sortedActivities);
  } catch (err) {
    console.error('Erreur récupération activité modération:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
