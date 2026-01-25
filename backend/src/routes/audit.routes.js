const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/role.middleware');

console.log('✅ audit.routes chargé');

/**
 * GET /api/audit/logs
 * Liste les audit logs (admin uniquement)
 */
router.get('/logs', authMiddleware, adminMiddleware, async (req, res) => {
  const { 
    action, 
    entityType, 
    entityId, 
    actorId, 
    status,
    startDate,
    endDate,
    page = 1, 
    limit = 50 
  } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construire le filtre
    const filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entity_type = entityType;
    if (entityId) filter.entity_id = parseInt(entityId);
    if (actorId) filter.actor_id = parseInt(actorId);
    if (status) filter.status = status;

    // Récupérer les logs
    const logs = await supabaseAPI.select(
      'AuditLogs',
      filter,
      { limit: parseInt(limit), offset, order: 'created_at.desc' }
    );

    // Récupérer les acteurs pour enrichir
    const actorIds = [...new Set(logs.map(l => l.actor_id).filter(Boolean))];
    const actors = actorIds.length > 0
      ? await supabaseAPI.select('Users', {}, { limit: 1000 })
      : [];
    
    const actorsMap = new Map(actors.map(u => [u.id, { id: u.id, name: u.name, email: u.email }]));

    // Enrichir les logs
    const enrichedLogs = logs.map(log => ({
      ...log,
      actor: actorsMap.get(log.actor_id) || null,
    }));

    // Compter le total
    const allLogs = await supabaseAPI.select('AuditLogs', filter, { limit: 10000 });

    res.json({
      logs: enrichedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allLogs.length,
        totalPages: Math.ceil(allLogs.length / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Erreur récupération audit logs:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/audit/logs/:id
 * Détails d'un audit log
 */
router.get('/logs/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const logId = parseInt(req.params.id);

  try {
    const logs = await supabaseAPI.select('AuditLogs', { id: logId });
    const log = logs[0];

    if (!log) {
      return res.status(404).json({ message: 'Log non trouvé' });
    }

    // Récupérer l'acteur
    let actor = null;
    if (log.actor_id) {
      const actors = await supabaseAPI.select('Users', { id: log.actor_id });
      actor = actors[0] ? { id: actors[0].id, name: actors[0].name, email: actors[0].email } : null;
    }

    // Récupérer l'entité si possible
    let entity = null;
    if (log.entity_type && log.entity_id) {
      try {
        const tableName = getTableName(log.entity_type);
        if (tableName) {
          const entities = await supabaseAPI.select(tableName, { id: log.entity_id });
          entity = entities[0] || null;
        }
      } catch (e) {
        // Entité peut avoir été supprimée
      }
    }

    res.json({
      log,
      actor,
      entity,
    });
  } catch (err) {
    console.error('Erreur récupération détail log:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/audit/stats
 * Statistiques des audit logs
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  const { days = 30 } = req.query;

  try {
    // Récupérer tous les logs récents
    const allLogs = await supabaseAPI.select('AuditLogs', {}, { limit: 10000, order: 'created_at.desc' });
    
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const recentLogs = allLogs.filter(l => new Date(l.created_at) > cutoffDate);

    // Statistiques par action
    const byAction = {};
    for (const log of recentLogs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    }

    // Statistiques par type d'entité
    const byEntityType = {};
    for (const log of recentLogs) {
      if (log.entity_type) {
        byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1;
      }
    }

    // Statistiques par jour
    const byDay = {};
    for (const log of recentLogs) {
      const day = new Date(log.created_at).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }

    // Top acteurs
    const byActor = {};
    for (const log of recentLogs) {
      if (log.actor_id) {
        byActor[log.actor_id] = (byActor[log.actor_id] || 0) + 1;
      }
    }
    const topActorIds = Object.entries(byActor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => parseInt(id));

    const topActors = topActorIds.length > 0
      ? await supabaseAPI.select('Users', {}, { limit: 1000 })
      : [];
    
    const topActorsData = topActorIds.map(id => {
      const user = topActors.find(u => u.id === id);
      return {
        id,
        name: user?.name || 'Inconnu',
        count: byActor[id],
      };
    });

    res.json({
      period: `${days} jours`,
      totalLogs: recentLogs.length,
      byAction: Object.entries(byAction)
        .sort((a, b) => b[1] - a[1])
        .map(([action, count]) => ({ action, count })),
      byEntityType: Object.entries(byEntityType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
      byDay: Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, count]) => ({ day, count })),
      topActors: topActorsData,
    });
  } catch (err) {
    console.error('Erreur statistiques audit:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/audit/user/:userId
 * Historique d'activité d'un utilisateur
 */
router.get('/user/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { page = 1, limit = 50 } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer l'utilisateur
    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Récupérer les logs de l'utilisateur
    const logs = await supabaseAPI.select(
      'AuditLogs',
      { actor_id: userId },
      { limit: parseInt(limit), offset, order: 'created_at.desc' }
    );

    // Compter le total
    const allUserLogs = await supabaseAPI.select('AuditLogs', { actor_id: userId }, { limit: 10000 });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allUserLogs.length,
      },
    });
  } catch (err) {
    console.error('Erreur historique utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/audit/entity/:type/:id
 * Historique d'une entité spécifique
 */
router.get('/entity/:type/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const entityType = req.params.type;
  const entityId = parseInt(req.params.id);

  try {
    // Récupérer les logs de l'entité
    const logs = await supabaseAPI.select(
      'AuditLogs',
      { entity_type: entityType, entity_id: entityId },
      { limit: 100, order: 'created_at.desc' }
    );

    // Récupérer l'entité
    let entity = null;
    const tableName = getTableName(entityType);
    if (tableName) {
      try {
        const entities = await supabaseAPI.select(tableName, { id: entityId });
        entity = entities[0] || null;
      } catch (e) {
        // Entité peut avoir été supprimée
      }
    }

    // Enrichir les logs avec les acteurs
    const actorIds = [...new Set(logs.map(l => l.actor_id).filter(Boolean))];
    const actors = actorIds.length > 0
      ? await supabaseAPI.select('Users', {}, { limit: 1000 })
      : [];
    
    const actorsMap = new Map(actors.map(u => [u.id, { id: u.id, name: u.name }]));

    const enrichedLogs = logs.map(log => ({
      ...log,
      actor: actorsMap.get(log.actor_id) || null,
    }));

    res.json({
      entityType,
      entityId,
      entity,
      logs: enrichedLogs,
    });
  } catch (err) {
    console.error('Erreur historique entité:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/audit/sensitive
 * Liste les actions sensibles (pour conformité)
 */
router.get('/sensitive', authMiddleware, adminMiddleware, async (req, res) => {
  const { actionType, page = 1, limit = 50 } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = {};
    if (actionType) filter.action_type = actionType;

    let actions = [];
    try {
      actions = await supabaseAPI.select(
        'SensitiveActions',
        filter,
        { limit: parseInt(limit), offset, order: 'created_at.desc' }
      );
    } catch (e) {
      // Table peut ne pas exister
    }

    res.json({
      actions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error('Erreur actions sensibles:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Helper pour mapper entity_type vers table name
function getTableName(entityType) {
  const mapping = {
    event: 'Events',
    ticket: 'Tickets',
    payment: 'Payments',
    user: 'Users',
    verification: 'OrganizerVerifications',
    payout: 'OrganizerPayouts',
  };
  return mapping[entityType] || null;
}

module.exports = router;
