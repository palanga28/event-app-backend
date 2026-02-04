const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

async function getClaimedMap(userId) {
  const rows = await supabaseAPI.select('UserChallenges', { user_id: userId });
  const map = new Map();
  for (const r of rows) {
    map.set(String(r.challenge_id), r);
  }
  return map;
}

function calcLevelFromPoints(points) {
  const p = Math.max(0, Number(points) || 0);
  if (p < 100) return 1;
  if (p < 250) return 2;
  if (p < 500) return 3;
  if (p < 900) return 4;
  if (p < 1400) return 5;
  return 6;
}

function normalizeBadges(badges) {
  if (Array.isArray(badges)) return badges.filter((b) => typeof b === 'string');
  if (typeof badges === 'string') return [badges];
  return [];
}

function isEligibleForTargets({ targets, userLevel, userBadges }) {
  if (!Array.isArray(targets) || targets.length === 0) return true;

  // OR semantics: if any target row matches => eligible.
  return targets.some((t) => {
    const minLevel = t?.min_level;
    const requiredBadge = t?.required_badge;
    if (Number.isFinite(minLevel) && userLevel < Number(minLevel)) return false;
    if (requiredBadge && !userBadges.includes(requiredBadge)) return false;
    return true;
  });
}

async function computeProgressForRule({ ruleType, rulePayload, userId }) {
  const payload = rulePayload && typeof rulePayload === 'object' ? rulePayload : {};
  const target = Number(payload.target || 0) || 0;

  if (!ruleType) {
    return { value: 0, max: target || 1, isCompleted: false };
  }

  if (ruleType === 'count_favorites') {
    const current = await supabaseAPI.count('Favorites', { user_id: userId });
    return { value: Math.min(current, target), max: target, isCompleted: current >= target };
  }

  if (ruleType === 'count_tickets') {
    const current = await supabaseAPI.count('Tickets', { user_id: userId });
    return { value: Math.min(current, target), max: target, isCompleted: current >= target };
  }

  if (ruleType === 'count_events_created') {
    const current = await supabaseAPI.count('Events', { organizer_id: userId });
    return { value: Math.min(current, target), max: target, isCompleted: current >= target };
  }

  if (ruleType === 'count_followers') {
    const current = await supabaseAPI.count('Follows', { following_id: userId });
    return { value: Math.min(current, target), max: target, isCompleted: current >= target };
  }

  return { value: 0, max: target || 1, isCompleted: false };
}

router.get('/challenges', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users, claimedMap, challenges] = await Promise.all([
      supabaseAPI.select('Users', { id: userId }),
      getClaimedMap(userId),
      supabaseAPI.select('Challenges', { status: 'published' }, { order: 'created_at.desc', limit: 200 }),
    ]);

    const userRow = users[0];
    const userPoints = Number(userRow?.points || 0);
    const userLevel = calcLevelFromPoints(userPoints);
    const userBadges = normalizeBadges(userRow?.badges);

    const challengeIds = challenges.map((c) => c.id).filter(Boolean);
    const targets = challengeIds.length
      ? await supabaseAPI.select('ChallengeTargets', { challenge_id: { in: challengeIds } })
      : [];
    const targetsByChallengeId = new Map();
    for (const t of targets) {
      const id = String(t.challenge_id);
      if (!targetsByChallengeId.has(id)) targetsByChallengeId.set(id, []);
      targetsByChallengeId.get(id).push(t);
    }

    const eligible = challenges.filter((c) =>
      isEligibleForTargets({
        targets: targetsByChallengeId.get(String(c.id)) || [],
        userLevel,
        userBadges,
      })
    );

    const items = await Promise.all(
      eligible.map(async (c) => {
        const claimed = claimedMap.get(String(c.id));
        const reward = {
          type: c.reward_type,
          amount: Number(c.reward_payload?.amount || c.reward_payload?.points || 0) || 0,
          label: c.reward_payload?.label || (c.reward_type === 'points' ? `+${Number(c.reward_payload?.points || 0)} points` : 'Récompense'),
        };

        let progress = { value: 0, max: 1 };
        let isCompleted = false;

        if (c.type === 'automatic') {
          const computed = await computeProgressForRule({ ruleType: c.rule_type, rulePayload: c.rule_payload, userId });
          progress = { value: computed.value, max: computed.max };
          isCompleted = computed.isCompleted;
        } else {
          // Manual challenges are considered "active" until admin marks them completed by switching to automatic,
          // or you can add a future manual-completion flow.
          progress = { value: 0, max: 1 };
          isCompleted = false;
        }

        const status = claimed ? 'claimed' : isCompleted ? 'completed' : 'active';

        return {
          id: String(c.id),
          title: c.title,
          description: c.description,
          reward,
          progress,
          status,
          canClaim: !claimed && isCompleted,
          claimedAt: claimed?.claimed_at || null,
          badge: c.reward_type === 'badge' ? c.reward_payload?.badge || null : null,
        };
      })
    );

    res.json({ challenges: items, user: { level: userLevel, points: userPoints, badges: userBadges } });
  } catch (err) {
    console.error('Erreur /me/challenges:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// RGPD - Export des données utilisateur (Article 20)
// =========================
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer toutes les données de l'utilisateur
    const [
      userData,
      tickets,
      events,
      favorites,
      follows,
      followers,
      comments,
      stories,
      notifications
    ] = await Promise.all([
      supabaseAPI.select('Users', { id: userId }),
      supabaseAPI.select('Tickets', { user_id: userId }),
      supabaseAPI.select('Events', { organizer_id: userId }),
      supabaseAPI.select('Favorites', { user_id: userId }),
      supabaseAPI.select('Follows', { follower_id: userId }),
      supabaseAPI.select('Follows', { following_id: userId }),
      supabaseAPI.select('Comments', { user_id: userId }),
      supabaseAPI.select('Stories', { user_id: userId }),
      supabaseAPI.select('Notifications', { user_id: userId })
    ]);

    const user = userData[0];
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Exclure le mot de passe et les données sensibles
    const { password, ...userWithoutPassword } = user;

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      user: userWithoutPassword,
      tickets: tickets || [],
      eventsCreated: events || [],
      favorites: favorites || [],
      following: follows || [],
      followers: followers || [],
      comments: comments || [],
      stories: stories || [],
      notifications: notifications || []
    };

    // Log de l'export pour audit
    await supabaseAPI.insert('AuditLogs', {
      user_id: userId,
      action: 'data_export',
      entity_type: 'user',
      entity_id: userId,
      details: { exportedAt: exportData.exportedAt },
      created_at: new Date().toISOString()
    }, true);

    res.json(exportData);
  } catch (err) {
    console.error('Erreur /me/export:', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'export des données' });
  }
});

// =========================
// RGPD - Suppression du compte (Article 17 - Droit à l'oubli)
// =========================
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmPassword } = req.body;

    // Vérifier que l'utilisateur existe
    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe pour confirmer la suppression
    if (confirmPassword) {
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(confirmPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Mot de passe incorrect' });
      }
    }

    const anonymizedEmail = `deleted_${userId}_${Date.now()}@anonymous.local`;
    const deletedAt = new Date().toISOString();

    // Anonymiser les données utilisateur (plutôt que supprimer pour intégrité référentielle)
    await supabaseAPI.update('Users', {
      email: anonymizedEmail,
      name: 'Compte supprimé',
      password: null,
      bio: null,
      avatar_url: null,
      phone: null,
      push_token: null,
      deleted_at: deletedAt,
      updated_at: deletedAt
    }, { id: userId });

    // Révoquer tous les tokens
    await supabaseAPI.update('RefreshTokens', {
      revoked: true,
      revoked_at: deletedAt
    }, { user_id: userId });

    // Supprimer les stories (données éphémères)
    await supabaseAPI.delete('Stories', { user_id: userId });

    // Supprimer les notifications
    await supabaseAPI.delete('Notifications', { user_id: userId });

    // Log de la suppression pour audit
    await supabaseAPI.insert('AuditLogs', {
      user_id: userId,
      action: 'account_deleted',
      entity_type: 'user',
      entity_id: userId,
      details: { 
        deletedAt,
        anonymizedEmail,
        reason: 'User requested account deletion (GDPR Art. 17)'
      },
      created_at: deletedAt
    }, true);

    res.json({ 
      message: 'Compte supprimé avec succès',
      deletedAt
    });
  } catch (err) {
    console.error('Erreur /me/account DELETE:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du compte' });
  }
});

router.post('/challenges/:id/claim', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const challengeId = String(req.params.id || '');

    const [alreadyClaimed, rows, users] = await Promise.all([
      supabaseAPI.select('UserChallenges', { user_id: userId, challenge_id: challengeId }),
      supabaseAPI.select('Challenges', { id: challengeId }),
      supabaseAPI.select('Users', { id: userId }),
    ]);

    if (alreadyClaimed.length > 0) {
      return res.status(409).json({ message: 'Récompense déjà réclamée' });
    }

    const challenge = rows[0];
    if (!challenge || challenge.status !== 'published') {
      return res.status(404).json({ message: 'Défi introuvable' });
    }

    // Eligibility + completion (currently only automatic can be completed)
    const userRow = users[0];
    const userPoints = Number(userRow?.points || 0);
    const userLevel = calcLevelFromPoints(userPoints);
    const userBadges = normalizeBadges(userRow?.badges);

    const challengeTargets = await supabaseAPI.select('ChallengeTargets', { challenge_id: challengeId });
    const eligible = isEligibleForTargets({ targets: challengeTargets, userLevel, userBadges });
    if (!eligible) {
      return res.status(403).json({ message: 'Défi non disponible pour cet utilisateur' });
    }

    if (challenge.type !== 'automatic') {
      return res.status(400).json({ message: 'Ce défi ne peut pas être réclamé automatiquement' });
    }

    const computed = await computeProgressForRule({ ruleType: challenge.rule_type, rulePayload: challenge.rule_payload, userId });
    if (!computed.isCompleted) {
      return res.status(400).json({ message: 'Défi pas encore complété' });
    }

    const rewardType = challenge.reward_type;
    const rewardPayload = challenge.reward_payload && typeof challenge.reward_payload === 'object' ? challenge.reward_payload : {};

    let nextPoints = userPoints;
    let nextBadges = userBadges;
    let boostedEvent = null;

    if (rewardType === 'points') {
      const pts = Number(rewardPayload.points || rewardPayload.amount || 0) || 0;
      nextPoints = userPoints + pts;
    }

    if (rewardType === 'badge') {
      const badge = rewardPayload.badge;
      if (badge && !nextBadges.includes(badge)) nextBadges = [...nextBadges, badge];
    }

    if (rewardType === 'boost_score') {
      const inc = Number(rewardPayload.boost_score || rewardPayload.amount || 0) || 0;
      const eventId = Number(rewardPayload.event_id || 0) || null;

      if (eventId) {
        const events = await supabaseAPI.select('Events', { id: eventId });
        const ev = events[0];
        if (!ev) return res.status(404).json({ message: 'Événement introuvable pour le boost' });
        if (ev.organizer_id !== userId) {
          return res.status(403).json({ message: 'Tu ne peux booster que tes événements' });
        }
        const currentBoost = Number(ev.boost_score || 0);
        boostedEvent = await supabaseAPI.update('Events', { boost_score: currentBoost + inc }, { id: eventId });
      } else {
        // fallback: boost the most recent event of the organizer
        const myEvents = await supabaseAPI.select('Events', { organizer_id: userId }, { order: 'created_at.desc', limit: 1 });
        const ev = myEvents[0];
        if (!ev) return res.status(400).json({ message: 'Aucun événement à booster' });
        const currentBoost = Number(ev.boost_score || 0);
        boostedEvent = await supabaseAPI.update('Events', { boost_score: currentBoost + inc }, { id: ev.id });
      }
    }

    await Promise.all([
      supabaseAPI.insert('UserChallenges', {
        user_id: userId,
        challenge_id: challengeId,
        claimed_at: new Date().toISOString(),
        reward: { type: rewardType, payload: rewardPayload },
      }),
      supabaseAPI.update('Users', { points: nextPoints, badges: nextBadges }, { id: userId }),
    ]);

    res.json({ ok: true, points: nextPoints, badges: nextBadges, boostedEvent });
  } catch (err) {
    console.error('Erreur /me/challenges/:id/claim:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
