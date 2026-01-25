# 🏗️ Architecture AMPiA Event - Audit & Recommandations

## 📊 État actuel vs Recommandations

### 🧱 Architecture générale

| Composant | Recommandation | État AMPiA | Status |
|-----------|----------------|------------|--------|
| Backend | Railway | ✅ Railway | ✅ OK |
| Base de données | Supabase Postgres | ✅ Supabase | ✅ OK |
| Stockage images | Supabase Storage | ✅ Supabase Storage | ✅ OK |
| Auth | JWT / Supabase Auth | ✅ JWT custom | ✅ OK |

---

## ⚖️ Load Balancing

| Recommandation | État AMPiA | Status |
|----------------|------------|--------|
| Géré par Railway | ✅ Automatique | ✅ OK |
| Pas de Nginx nécessaire | ✅ Non utilisé | ✅ OK |

### Scaling recommandé
```
1 instance    → Lancement (actuel)
2-3 instances → Événements moyens (500-2000 users)
3-5 instances → Gros événements (5000+ users)
```

**Action** : Augmenter les instances Railway lors des pics.

---

## 🔁 Backend Stateless

| Recommandation | État AMPiA | Status |
|----------------|------------|--------|
| Pas de session en mémoire | ✅ JWT uniquement | ✅ OK |
| Pas de fichiers locaux | ✅ Supabase Storage | ✅ OK |
| DB comme source de vérité | ✅ Supabase | ✅ OK |

**Fichier vérifié** : `auth.middleware.js` - Utilise JWT, pas de session serveur.

---

## 💳 Paiements (Point critique)

| Recommandation | État AMPiA | Status |
|----------------|------------|--------|
| `transaction_ref` unique | ✅ `UNIQUE NOT NULL` en DB | ✅ OK |
| Statuts clairs | ✅ `pending → completed → failed` | ✅ OK |
| Contrainte UNIQUE en DB | ✅ Sur `transaction_ref` | ✅ OK |
| Logique idempotente | ⚠️ Partielle | 🔶 À améliorer |
| Webhook sécurisé (signature) | ❌ Pas de vérification | 🔴 À FAIRE |
| Webhook sécurisé (IP) | ❌ Pas de whitelist IP | 🔴 À FAIRE |

### Ce qui est bien fait ✅
```sql
-- Migration Payments
transaction_ref VARCHAR(50) UNIQUE NOT NULL,
status VARCHAR(20) NOT NULL DEFAULT 'pending',
CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))
```

### À améliorer 🔶

#### 1. Idempotence webhook
```javascript
// ACTUEL - Risque de double traitement
router.post('/webhook/wonyasoft', async (req, res) => {
  // Pas de vérification si déjà traité
});

// RECOMMANDÉ
router.post('/webhook/wonyasoft', async (req, res) => {
  // Vérifier si déjà traité
  if (payment.status === 'completed' || payment.status === 'failed') {
    return res.json({ message: 'Déjà traité', status: payment.status });
  }
  // Continuer le traitement...
});
```

#### 2. Sécurité webhook (signature)
```javascript
// À AJOUTER
function verifyWonyaSoftSignature(req) {
  const signature = req.headers['x-wonyasoft-signature'];
  const secret = process.env.WONYASOFT_WEBHOOK_SECRET;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return signature === expectedSignature;
}
```

#### 3. Whitelist IP webhook
```javascript
// À AJOUTER
const WONYASOFT_IPS = ['xxx.xxx.xxx.xxx']; // IPs WonyaSoft

function verifyWebhookIP(req) {
  const clientIP = req.ip || req.connection.remoteAddress;
  return WONYASOFT_IPS.includes(clientIP);
}
```

---

## 🖼️ Stockage Images

| Recommandation | État AMPiA | Status |
|----------------|------------|--------|
| Supabase Storage | ✅ Utilisé | ✅ OK |
| Upload direct client → Storage | ✅ Implémenté | ✅ OK |
| Backend = metadata seulement | ✅ Correct | ✅ OK |
| Bucket public (affiches) | ✅ `event-images` | ✅ OK |
| Bucket privé (QR codes) | ⚠️ À vérifier | 🔶 À vérifier |
| Signed URLs pour privé | ⚠️ À vérifier | 🔶 À vérifier |

### Organisation fichiers
| Recommandation | État AMPiA | Status |
|----------------|------------|--------|
| Nommage clair | ✅ `events/{id}/...` | ✅ OK |
| Compression client | ⚠️ Partielle | 🔶 À améliorer |
| Format WebP | ❌ Non utilisé | 🔶 Optionnel |
| Limite taille | ⚠️ Côté client | ✅ OK |
| Thumbnails séparés | ❌ Non implémenté | 🔶 Optionnel |

---

## 🔐 Sécurité

| Recommandation | État AMPiA | Status |
|----------------|------------|--------|
| RLS sur DB | ⚠️ Via backend | 🔶 OK (API) |
| RLS sur Storage | ⚠️ À vérifier | 🔶 À vérifier |
| Rate limiting | ✅ Helmet + rate-limit | ✅ OK |
| XSS protection | ✅ xss-clean | ✅ OK |
| CORS configuré | ✅ Oui | ✅ OK |

---

## 📋 Plan d'action prioritaire

### 🔴 CRITIQUE (Sécurité paiements)
1. **Sécuriser webhook WonyaSoft**
   - Ajouter vérification signature
   - Ajouter whitelist IP (si fournie par WonyaSoft)
   - Rendre idempotent (éviter double traitement)

### 🔶 IMPORTANT (Performance)
2. **Optimiser images**
   - Compression côté client avant upload
   - Générer thumbnails pour listes

### 🟢 OPTIONNEL (Scalabilité future)
3. **Préparer scaling**
   - Documenter procédure augmentation instances Railway
   - Monitorer métriques (CPU, RAM, latence)

---

## ✅ Points forts actuels

1. **Architecture moderne** - Railway + Supabase = scalable
2. **Backend stateless** - Prêt pour load balancing
3. **Paiements structurés** - transaction_ref unique, statuts clairs
4. **Sécurité de base** - Helmet, rate-limit, XSS, CORS
5. **Auth JWT** - Pas de session serveur

---

## 🎯 Verdict

> **AMPiA Event est sur une bonne architecture.**
> 
> Seul point critique : **sécuriser le webhook de paiement**.
> Le reste est prêt pour scaler.

---

*Document généré le 25/01/2026*
