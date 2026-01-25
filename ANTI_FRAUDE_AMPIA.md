# 🛡️ Stratégie Anti-Fraude AMPiA Event

## 🎯 Problème à résoudre

Une personne malveillante peut :
1. Copier l'affiche d'un artiste connu
2. Créer un faux événement sur la plateforme
3. Vendre de faux billets et encaisser l'argent

**Objectif** : Empêcher, Détecter, Bloquer, Prouver.

---

## 📊 Audit de l'existant AMPiA

| Fonctionnalité | État actuel | Status |
|----------------|-------------|--------|
| Rôles utilisateurs | ✅ user, moderator, admin | OK |
| Statut événement | ⚠️ Seulement `published` | À améliorer |
| Badge organisateur vérifié | ❌ N'existe pas | À créer |
| Modération événements | ⚠️ Partielle (admin peut supprimer) | À améliorer |
| QR code ticket | ✅ Hash SHA256 unique | OK |
| Signature HMAC billet | ❌ N'existe pas | À créer |
| Scan validation serveur | ✅ Vérifie en DB | OK |
| Détection copies images | ❌ N'existe pas | À créer |
| Traçabilité (IP, logs) | ⚠️ Partielle | À améliorer |

---

## 🛡️ STRATÉGIE EN 5 COUCHES

### 🥇 COUCHE 1 : Vérification des organisateurs

**Priorité : 🔴 CRITIQUE**

#### État actuel
- Tout utilisateur peut créer un événement
- Pas de distinction organisateur vérifié / non vérifié

#### À implémenter

**1.1 Nouvelle table `OrganizerVerifications`**
```sql
CREATE TABLE "OrganizerVerifications" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES "Users"(id),
    
    -- Documents de vérification
    id_document_url TEXT,           -- Pièce d'identité
    business_document_url TEXT,     -- Document entreprise (optionnel)
    
    -- Réseaux sociaux
    facebook_url TEXT,
    instagram_url TEXT,
    website_url TEXT,
    
    -- Statut
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES "Users"(id),
    rejection_reason TEXT,
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**1.2 Ajouter colonne à `Users`**
```sql
ALTER TABLE "Users" ADD COLUMN is_verified_organizer BOOLEAN DEFAULT FALSE;
ALTER TABLE "Users" ADD COLUMN can_sell_tickets BOOLEAN DEFAULT FALSE;
```

**1.3 Règles business**
| Type compte | Peut créer événement | Peut vendre billets |
|-------------|---------------------|---------------------|
| Utilisateur simple | ❌ Non | ❌ Non |
| Organisateur non vérifié | ✅ Brouillon seulement | ❌ Non |
| Organisateur vérifié | ✅ Oui | ✅ Oui |

**1.4 Badge UI**
```
✔ Organisateur vérifié
```

---

### 🥈 COUCHE 2 : Modération des événements

**Priorité : 🔴 CRITIQUE**

#### État actuel
- Événement créé → directement `published`
- Pas de workflow de validation

#### À implémenter

**2.1 Nouveaux statuts événement**
```sql
-- Modifier contrainte status
ALTER TABLE "Events" DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE "Events" ADD CONSTRAINT events_status_check 
    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'suspended', 'cancelled'));
```

**2.2 Workflow de publication**
```
┌─────────┐     ┌────────────────┐     ┌───────────┐
│  DRAFT  │ ──► │ PENDING_REVIEW │ ──► │ PUBLISHED │
└─────────┘     └────────────────┘     └───────────┘
                       │
                       ▼
                 ┌──────────┐
                 │ REJECTED │
                 └──────────┘
```

**2.3 Contrôles automatiques avant publication**
| Contrôle | Action si suspect |
|----------|-------------------|
| Titre similaire à événement existant | 🚩 Flag + review manuelle |
| Même date + même ville | 🚩 Flag + review manuelle |
| Image identique (hash) | 🚩 Flag + review manuelle |
| Organisateur non vérifié | ⏸️ Bloqué en pending |

**2.4 Table `EventReviews`**
```sql
CREATE TABLE "EventReviews" (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES "Events"(id),
    reviewer_id INTEGER REFERENCES "Users"(id),
    action VARCHAR(20), -- approved, rejected, flagged
    reason TEXT,
    flags JSONB, -- {similar_title: true, same_image: true, ...}
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 🥉 COUCHE 3 : Billets sécurisés (Signature HMAC)

**Priorité : 🟠 IMPORTANT**

#### État actuel
- QR code = hash SHA256 du ticket
- Validation en DB ✅
- Pas de signature cryptographique

#### À améliorer

**3.1 Ajouter signature HMAC au ticket**
```javascript
// QRCodeService amélioré
generateSecureTicketCode(ticketId, userId, eventId) {
    const payload = {
        t: ticketId,      // ticket_id
        u: userId,        // user_id
        e: eventId,       // event_id
        ts: Date.now()    // timestamp
    };
    
    const data = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', process.env.TICKET_SECRET)
        .update(data)
        .digest('hex')
        .substring(0, 16);
    
    // Format: BASE64(payload).SIGNATURE
    const encoded = Buffer.from(data).toString('base64url');
    return `${encoded}.${signature}`;
}

verifyTicketSignature(code) {
    const [encoded, signature] = code.split('.');
    const data = Buffer.from(encoded, 'base64url').toString();
    
    const expectedSignature = crypto
        .createHmac('sha256', process.env.TICKET_SECRET)
        .update(data)
        .digest('hex')
        .substring(0, 16);
    
    return signature === expectedSignature;
}
```

**3.2 Validation à l'entrée (scan)**
```
Scan QR → Vérifier signature → API AMPiA → Vérifier DB
                 │
                 ▼
         Si signature invalide → ❌ FAUX BILLET
```

**3.3 Checks serveur**
- [ ] Billet existe en DB
- [ ] Appartient à l'événement scanné
- [ ] Pas déjà utilisé (`used_at IS NULL`)
- [ ] Événement valide et non suspendu
- [ ] Organisateur valide et non banni

---

### 🏅 COUCHE 4 : Détection des copies

**Priorité : 🟡 MOYEN**

#### À implémenter

**4.1 Hash d'image (pHash)**
```sql
ALTER TABLE "Events" ADD COLUMN image_hash VARCHAR(64);
```

```javascript
// Lors de l'upload d'image
const imageHash = await generatePerceptualHash(imageBuffer);

// Vérifier si hash similaire existe
const similar = await supabaseAPI.select('Events', {
    image_hash: imageHash,
    status: 'published'
});

if (similar.length > 0) {
    // Flag automatique
    await flagEvent(eventId, 'similar_image', similar[0].id);
}
```

**4.2 Détection titres similaires**
```javascript
function checkSimilarTitle(newTitle, existingEvents) {
    const normalize = (s) => s.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/concert|live|show|fete|soiree/g, '');
    
    const normalizedNew = normalize(newTitle);
    
    for (const event of existingEvents) {
        const normalizedExisting = normalize(event.title);
        const similarity = calculateSimilarity(normalizedNew, normalizedExisting);
        
        if (similarity > 0.8) {
            return { similar: true, matchedEvent: event };
        }
    }
    return { similar: false };
}
```

**4.3 Alertes automatiques**
```
"Concert Fally Ipupa – 15 Mars"  ──┐
                                   ├──► 🚩 ALERTE ADMIN
"Live Fally Ipupa – 15/03"      ──┘
```

---

### 🎖️ COUCHE 5 : Traçabilité légale

**Priorité : 🟡 MOYEN**

#### À implémenter

**5.1 Table `AuditLogs`**
```sql
CREATE TABLE "AuditLogs" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "Users"(id),
    action VARCHAR(50), -- create_event, update_event, sell_ticket, etc.
    entity_type VARCHAR(30), -- event, ticket, user
    entity_id INTEGER,
    
    -- Contexte
    ip_address INET,
    user_agent TEXT,
    
    -- Données
    old_data JSONB,
    new_data JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON "AuditLogs"(user_id);
CREATE INDEX idx_audit_entity ON "AuditLogs"(entity_type, entity_id);
CREATE INDEX idx_audit_created ON "AuditLogs"(created_at DESC);
```

**5.2 Middleware de logging**
```javascript
function auditMiddleware(action, entityType) {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        
        res.json = (data) => {
            // Log après succès
            if (res.statusCode < 400) {
                logAudit({
                    user_id: req.user?.id,
                    action,
                    entity_type: entityType,
                    entity_id: data?.id || req.params?.id,
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent'],
                    new_data: data
                });
            }
            return originalJson(data);
        };
        
        next();
    };
}
```

**5.3 En cas de plainte**
```
Dossier de preuve :
├── Qui a créé l'événement (user_id, IP, date)
├── Qui a modifié (historique complet)
├── Qui a vendu (transactions)
├── Qui a encaissé (payout requests)
└── Timeline complète des actions
```

---

## 🚨 Plan d'urgence (fraude détectée)

| Étape | Action | Responsable |
|-------|--------|-------------|
| 1 | Geler l'événement (`status: suspended`) | Admin |
| 2 | Bloquer les ventes | Automatique |
| 3 | Notifier les acheteurs | Email/Push |
| 4 | Initier remboursements | Admin |
| 5 | Bannir l'organisateur | Admin |
| 6 | Générer dossier de preuve | Système |

---

## 📱 UX côté utilisateur

### Affichage événement
```
┌─────────────────────────────────────┐
│ 🎵 Concert Fally Ipupa              │
│ ✔ Organisateur vérifié              │  ← Badge visible
│ 📍 Stade des Martyrs, Kinshasa      │
│                                     │
│ 🔗 Page officielle artiste          │  ← Lien externe
│                                     │
│ ⚠️ Billet valable uniquement        │  ← Avertissement
│    via AMPiA Event                  │
└─────────────────────────────────────┘
```

### Éducation utilisateur
- Message clair sur chaque billet
- Vérification possible via app (scan QR = vrai/faux)
- Signalement facile des événements suspects

---

## 📋 Plan d'implémentation

### Phase 1 : Fondations (1-2 semaines) 🔴 CRITIQUE
1. [ ] Migration DB : `OrganizerVerifications`, colonnes `Users`
2. [ ] Migration DB : Nouveaux statuts événements
3. [ ] API : Demande de vérification organisateur
4. [ ] API : Workflow publication événement
5. [ ] Admin : Écran validation organisateurs
6. [ ] Admin : Écran modération événements

### Phase 2 : Sécurité billets (1 semaine) 🟠 IMPORTANT
1. [ ] Améliorer QRCodeService avec signature HMAC
2. [ ] Variable env `TICKET_SECRET`
3. [ ] Validation signature au scan

### Phase 3 : Détection (1-2 semaines) 🟡 MOYEN
1. [ ] Hash d'image à l'upload
2. [ ] Détection titres similaires
3. [ ] Système d'alertes admin

### Phase 4 : Traçabilité (1 semaine) 🟡 MOYEN
1. [ ] Table `AuditLogs`
2. [ ] Middleware de logging
3. [ ] Export dossier de preuve

---

## 🎯 Résumé

| Couche | Protection | Impact |
|--------|------------|--------|
| **1. Vérification organisateurs** | Empêche les fraudeurs de vendre | 🔴 Critique |
| **2. Modération événements** | Détecte les faux événements | 🔴 Critique |
| **3. Billets signés** | Empêche les faux billets | 🟠 Important |
| **4. Détection copies** | Alerte sur les copies | 🟡 Moyen |
| **5. Traçabilité** | Preuve légale | 🟡 Moyen |

**Avec ces 5 couches, AMPiA Event sera l'une des plateformes de billetterie les plus sécurisées d'Afrique.**

---

*Document créé le 25/01/2026*
