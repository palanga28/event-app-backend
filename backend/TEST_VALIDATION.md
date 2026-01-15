# 🧪 Guide de Test - API de Validation des Tickets

## 📋 Prérequis

1. **Backend démarré**
   ```bash
   cd backend
   npm start
   ```

2. **Migration SQL exécutée** dans Supabase
   - Colonnes `qr_code`, `qr_code_image`, `validated_at`, `validated_by` ajoutées

3. **Un ticket avec QR code** dans la base de données

---

## 🚀 Méthode 1 : Script de test automatique

### **1. Préparer le script**

Ouvre `backend/test-validation-api.js` et remplace :

```javascript
const ORGANIZER_TOKEN = 'YOUR_ORGANIZER_JWT_TOKEN'; // Ton JWT token
const TEST_QR_CODE = 'A1B2C3D4E5F6789012345678901234'; // Un vrai QR code
```

**Comment obtenir le JWT token :**
1. Connecte-toi dans l'app mobile ou web
2. Ouvre les DevTools (F12) → Network
3. Cherche une requête API
4. Copie le token dans `Authorization: Bearer XXX`

**Comment obtenir un QR code :**
```sql
-- Dans Supabase SQL Editor
SELECT id, qr_code, status, event_id 
FROM "Tickets" 
WHERE qr_code IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```

### **2. Exécuter le script**

```bash
cd backend
node test-validation-api.js
```

**Résultat attendu :**
```
═══════════════════════════════════════════════
🧪 Tests de l'API de Validation des Tickets
═══════════════════════════════════════════════

📋 Test 1: Health Check
✅ Backend opérationnel
   Status: OK

📋 Test 2: Vérifier un ticket (sans valider)
✅ Vérification réussie
   Ticket valide: true
   Statut: active
   Événement: Concert Live
   Propriétaire: Paul Tshihumbwe

📋 Test 3: Valider un ticket
✅ Validation réussie
   Message: Ticket validé avec succès
   Ticket ID: 1
   Statut: used
   Validé à: 2026-01-15T12:00:00Z

📋 Test 4: Valider un ticket déjà utilisé
✅ Erreur attendue: ticket déjà utilisé
   Message: Ce ticket a déjà été validé

📋 Test 5: QR code invalide
✅ Erreur attendue: format invalide
   Message: Format de QR code invalide

📋 Test 6: Ticket inexistant
✅ Erreur attendue: ticket non trouvé
   Message: Ticket non trouvé

═══════════════════════════════════════════════
✅ Tests terminés
═══════════════════════════════════════════════
```

---

## 🔧 Méthode 2 : Tests manuels avec Postman/Insomnia

### **Test 1 : Vérifier un ticket**

```http
POST http://localhost:3000/api/validation/check
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "qrCode": "A1B2C3D4E5F6789012345678901234"
}
```

**Réponse attendue (200) :**
```json
{
  "valid": true,
  "ticket": {
    "id": 1,
    "status": "active",
    "quantity": 1,
    "purchaseDate": "2026-01-15T10:00:00Z",
    "owner": {
      "id": 1,
      "name": "Paul Tshihumbwe",
      "email": "paul@example.com"
    },
    "event": {
      "id": 1,
      "title": "Concert Live",
      "date": "2026-02-01T20:00:00Z",
      "location": "Kinshasa"
    },
    "ticketType": {
      "id": 1,
      "name": "VIP",
      "price": 50000,
      "currency": "CDF"
    }
  }
}
```

---

### **Test 2 : Valider un ticket**

```http
POST http://localhost:3000/api/validation/validate
Authorization: Bearer ORGANIZER_TOKEN
Content-Type: application/json

{
  "qrCode": "A1B2C3D4E5F6789012345678901234"
}
```

**Réponse attendue (200) :**
```json
{
  "message": "Ticket validé avec succès",
  "valid": true,
  "ticket": {
    "id": 1,
    "status": "used",
    "quantity": 1,
    "validatedAt": "2026-01-15T12:00:00Z",
    "owner": {
      "id": 1,
      "name": "Paul Tshihumbwe",
      "email": "paul@example.com"
    },
    "event": {
      "id": 1,
      "title": "Concert Live",
      "date": "2026-02-01T20:00:00Z",
      "location": "Kinshasa"
    },
    "ticketType": {
      "id": 1,
      "name": "VIP",
      "price": 50000,
      "currency": "CDF"
    }
  }
}
```

---

### **Test 3 : Valider un ticket déjà utilisé**

```http
POST http://localhost:3000/api/validation/validate
Authorization: Bearer ORGANIZER_TOKEN
Content-Type: application/json

{
  "qrCode": "A1B2C3D4E5F6789012345678901234"
}
```

**Réponse attendue (400) :**
```json
{
  "message": "Ce ticket a déjà été validé",
  "valid": false,
  "ticket": {
    "id": 1,
    "status": "used",
    "event": "Concert Live",
    "validatedAt": "2026-01-15T12:00:00Z",
    "validatedBy": 2
  }
}
```

---

### **Test 4 : Historique des validations**

```http
GET http://localhost:3000/api/validation/history/1
Authorization: Bearer ORGANIZER_TOKEN
```

**Réponse attendue (200) :**
```json
{
  "event": {
    "id": 1,
    "title": "Concert Live",
    "date": "2026-02-01T20:00:00Z"
  },
  "statistics": {
    "totalSold": 150,
    "totalValidated": 120,
    "validationRate": "80.0"
  },
  "validations": [
    {
      "id": 1,
      "validatedAt": "2026-01-15T12:00:00Z",
      "quantity": 2,
      "owner": {
        "id": 1,
        "name": "Paul Tshihumbwe",
        "email": "paul@example.com"
      },
      "ticketType": {
        "id": 1,
        "name": "VIP"
      }
    }
  ]
}
```

---

## 🐛 Cas d'erreur à tester

### **Erreur 1 : Format de QR code invalide**
```json
{
  "qrCode": "INVALID"
}
```
**Réponse (400) :**
```json
{
  "message": "Format de QR code invalide"
}
```

---

### **Erreur 2 : Ticket non trouvé**
```json
{
  "qrCode": "AAAABBBBCCCCDDDDEEEEFFFFGGGGHHH1"
}
```
**Réponse (404) :**
```json
{
  "message": "Ticket non trouvé",
  "valid": false
}
```

---

### **Erreur 3 : Ticket annulé**
**Réponse (400) :**
```json
{
  "message": "Ce ticket a été annulé",
  "valid": false,
  "ticket": {
    "id": 1,
    "status": "cancelled",
    "event": "Concert Live"
  }
}
```

---

### **Erreur 4 : Pas organisateur**
**Réponse (403) :**
```json
{
  "message": "Seul l'organisateur peut valider les tickets"
}
```

---

### **Erreur 5 : Événement terminé**
**Réponse (400) :**
```json
{
  "message": "Cet événement est terminé",
  "valid": false,
  "ticket": {
    "id": 1,
    "event": "Concert Live",
    "eventDate": "2025-12-01T20:00:00Z"
  }
}
```

---

## ✅ Checklist de validation

- [ ] Backend démarre sans erreur
- [ ] Route `/health` retourne `{"status":"OK"}`
- [ ] Route `/api/validation/check` fonctionne
- [ ] Route `/api/validation/validate` fonctionne
- [ ] Validation change le statut à "used"
- [ ] Impossible de valider 2 fois
- [ ] Seul l'organisateur peut valider
- [ ] Format de QR code validé
- [ ] Ticket inexistant retourne 404
- [ ] Historique des validations fonctionne

---

## 🔍 Vérifier dans la base de données

```sql
-- Voir les tickets validés
SELECT 
  t.id,
  t.qr_code,
  t.status,
  t.validated_at,
  u.name as validated_by_name,
  e.title as event_title
FROM "Tickets" t
LEFT JOIN "Users" u ON t.validated_by = u.id
LEFT JOIN "Events" e ON t.event_id = e.id
WHERE t.status = 'used'
ORDER BY t.validated_at DESC;
```

---

**Les tests sont prêts ! Exécute le script ou teste manuellement.** 🚀
