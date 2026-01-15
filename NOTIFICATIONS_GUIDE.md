# 📱 Guide des Notifications Push

## 🎯 Vue d'ensemble

Système complet de notifications push utilisant Expo Notifications pour envoyer des notifications aux utilisateurs iOS et Android.

---

## ✅ Fonctionnalités Implémentées

### **Backend**

#### **1. Service de notifications** (`backend/src/services/push-notification.service.js`)
- ✅ Enregistrement des tokens push
- ✅ Envoi de notifications à un ou plusieurs utilisateurs
- ✅ Envoi de notifications globales
- ✅ Notifications automatiques :
  - Nouvel événement créé
  - Rappel avant événement
  - Confirmation d'achat de ticket
  - Ticket validé
  - Nouveau commentaire
  - Nouveau follower

#### **2. Routes API** (`backend/src/routes/push-notifications.routes.js`)
- ✅ `POST /api/push-notifications/register-token` - Enregistrer un token
- ✅ `POST /api/push-notifications/unregister-token` - Supprimer un token
- ✅ `POST /api/push-notifications/test` - Envoyer une notification de test
- ✅ `POST /api/push-notifications/send` - Envoyer à des utilisateurs spécifiques (admin)
- ✅ `POST /api/push-notifications/send-all` - Envoyer à tous (admin)

### **Mobile**

#### **1. Service de notifications** (`mobile/src/services/notificationService.ts`)
- ✅ Initialisation automatique
- ✅ Demande de permissions
- ✅ Enregistrement du token au backend
- ✅ Gestion des notifications reçues
- ✅ Navigation depuis les notifications
- ✅ Notifications locales
- ✅ Badge count

#### **2. Hook React** (`mobile/src/hooks/useNotifications.ts`)
- ✅ Hook `useNotifications()` pour utilisation dans les composants
- ✅ Envoi de notifications de test
- ✅ Planification de notifications locales

---

## 🚀 Installation & Configuration

### **1. Créer la table PushTokens dans Supabase**

```sql
-- Exécute ce SQL dans Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS "PushTokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "push_token" VARCHAR(255) NOT NULL,
  "device_id" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("user_id", "device_id")
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON "PushTokens"(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_id ON "PushTokens"(device_id);
```

### **2. Configurer app.json (mobile)**

```json
{
  "expo": {
    "plugins": [
      "expo-barcode-scanner",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366f1",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "android": {
      "useNextNotificationsApi": true,
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

### **3. Redémarrer le backend**

```bash
cd backend
npm start
```

**Vérifier dans les logs :**
```
✅ push-notifications.routes chargé
```

### **4. Redémarrer l'app mobile**

```bash
cd mobile
npx expo start
```

---

## 🧪 Tests

### **Test 1 : Enregistrement du token**

L'enregistrement se fait automatiquement au démarrage de l'app.

**Vérifier dans les logs de l'app :**
```
📱 Token push: ExponentPushToken[xxxxxxxxxxxxxx]
✅ Token enregistré au backend
✅ Notifications initialisées
```

**Vérifier dans Supabase :**
```sql
SELECT * FROM "PushTokens" ORDER BY created_at DESC LIMIT 5;
```

---

### **Test 2 : Notification de test**

**Via l'app mobile :**
```typescript
import { useNotifications } from '../hooks/useNotifications';

function TestScreen() {
  const { sendTestNotification } = useNotifications();

  return (
    <Button 
      title="Envoyer notification test"
      onPress={sendTestNotification}
    />
  );
}
```

**Via API (Postman) :**
```http
POST http://localhost:3000/api/push-notifications/test
Authorization: Bearer YOUR_TOKEN
```

**Résultat attendu :**
- Notification reçue sur le téléphone
- Titre : "🧪 Notification de test"
- Message : "Si tu vois ce message, les notifications fonctionnent !"

---

### **Test 3 : Notification locale**

```typescript
import notificationService from '../services/notificationService';

// Planifier une notification dans 5 secondes
await notificationService.scheduleLocalNotification(
  'Test Local',
  'Notification locale dans 5 secondes',
  5
);
```

---

### **Test 4 : Notification à tous les utilisateurs (Admin)**

```http
POST http://localhost:3000/api/push-notifications/send-all
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "title": "🎉 Annonce importante",
  "body": "Découvrez les nouveaux événements !",
  "data": {
    "type": "announcement"
  }
}
```

---

## 📊 Types de Notifications Automatiques

### **1. Nouvel événement créé**

**Quand :** Un organisateur crée un événement

**Qui reçoit :** Tous les utilisateurs sauf le créateur

**Implémentation :**
```javascript
// Dans backend/src/routes/event.routes.js
const PushNotificationService = require('../services/push-notification.service');

// Après la création de l'événement
await PushNotificationService.notifyNewEvent(event);
```

---

### **2. Rappel avant événement**

**Quand :** 24h et 1h avant l'événement

**Qui reçoit :** Les participants (qui ont acheté un ticket)

**Implémentation (à ajouter) :**
```javascript
// Créer un cron job ou scheduler
const cron = require('node-cron');

// Tous les jours à 10h
cron.schedule('0 10 * * *', async () => {
  // Récupérer les événements dans 24h
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const events = await supabaseAPI.select('Events', {
    date: tomorrow.toISOString().split('T')[0]
  });
  
  for (const event of events) {
    // Récupérer les participants
    const tickets = await supabaseAPI.select('Tickets', {
      event_id: event.id,
      status: 'active'
    });
    
    const userIds = [...new Set(tickets.map(t => t.user_id))];
    
    await PushNotificationService.notifyEventReminder(event, userIds);
  }
});
```

---

### **3. Confirmation d'achat de ticket**

**Quand :** Un utilisateur achète un ticket

**Qui reçoit :** L'acheteur

**Implémentation :**
```javascript
// Dans backend/src/routes/payment.routes.js (fonction createTicketFromPayment)
const PushNotificationService = require('../services/push-notification.service');

// Après la création du ticket
const events = await supabaseAPI.select('Events', { id: ticket.event_id });
const event = events[0];

await PushNotificationService.notifyTicketPurchase(
  ticket.user_id,
  ticket,
  event
);
```

---

### **4. Ticket validé**

**Quand :** Un organisateur scanne et valide un ticket

**Qui reçoit :** Le propriétaire du ticket

**Implémentation :**
```javascript
// Dans backend/src/routes/validation.routes.js
const PushNotificationService = require('../services/push-notification.service');

// Après la validation du ticket
await PushNotificationService.notifyTicketValidated(
  ticket.user_id,
  event
);
```

---

### **5. Nouveau commentaire**

**Quand :** Quelqu'un commente sur un événement

**Qui reçoit :** Le créateur de l'événement

**Implémentation :**
```javascript
// Dans backend/src/routes/comments.routes.js
const PushNotificationService = require('../services/push-notification.service');

// Après la création du commentaire
const events = await supabaseAPI.select('Events', { id: comment.event_id });
const event = events[0];

if (event.organizer_id !== comment.user_id) {
  await PushNotificationService.notifyNewComment(
    event.organizer_id,
    comment,
    event
  );
}
```

---

### **6. Nouveau follower**

**Quand :** Quelqu'un suit un utilisateur

**Qui reçoit :** L'utilisateur suivi

**Implémentation :**
```javascript
// Dans backend/src/routes/follows.routes.js
const PushNotificationService = require('../services/push-notification.service');

// Après le follow
const followers = await supabaseAPI.select('Users', { id: follow.follower_id });
const follower = followers[0];

await PushNotificationService.notifyNewFollower(
  follow.following_id,
  follower
);
```

---

## 🎨 Navigation depuis les Notifications

Les notifications incluent un champ `data` qui permet de naviguer vers un écran spécifique :

```typescript
// Dans notificationService.ts
private handleNotificationNavigation(data: any) {
  if (data.screen === 'EventDetail') {
    // Naviguer vers l'écran de détail d'événement
    navigation.navigate('EventDetail', { eventId: data.eventId });
  } else if (data.screen === 'TicketDetail') {
    // Naviguer vers l'écran de détail de ticket
    navigation.navigate('TicketDetail', { ticketId: data.ticketId });
  }
  // etc.
}
```

---

## 🔧 Préférences Utilisateur (À implémenter)

Créer un écran de paramètres pour activer/désactiver les notifications :

```typescript
// NotificationSettingsScreen.tsx
const [preferences, setPreferences] = useState({
  newEvents: true,
  eventReminders: true,
  ticketPurchase: true,
  ticketValidated: true,
  comments: true,
  followers: true,
});

// Sauvegarder dans la DB
await api.post('/api/users/notification-preferences', preferences);
```

**Table à créer :**
```sql
CREATE TABLE "NotificationPreferences" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "new_events" BOOLEAN DEFAULT TRUE,
  "event_reminders" BOOLEAN DEFAULT TRUE,
  "ticket_purchase" BOOLEAN DEFAULT TRUE,
  "ticket_validated" BOOLEAN DEFAULT TRUE,
  "comments" BOOLEAN DEFAULT TRUE,
  "followers" BOOLEAN DEFAULT TRUE,
  UNIQUE("user_id")
);
```

---

## 📊 Statistiques des Notifications (À implémenter)

Tracker les notifications envoyées et ouvertes :

```sql
CREATE TABLE "NotificationLogs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "Users"(id),
  "type" VARCHAR(50),
  "title" VARCHAR(255),
  "body" TEXT,
  "sent_at" TIMESTAMPTZ DEFAULT NOW(),
  "opened_at" TIMESTAMPTZ,
  "data" JSONB
);
```

---

## 🐛 Dépannage

### **Problème 1 : Notifications ne s'affichent pas**

**Causes possibles :**
- Permissions refusées
- Token non enregistré
- App en mode simulateur (pas de push sur simulateur)

**Solution :**
1. Vérifier les permissions :
   ```typescript
   const { status } = await Notifications.getPermissionsAsync();
   console.log('Permission status:', status);
   ```

2. Vérifier le token :
   ```typescript
   const token = notificationService.getPushToken();
   console.log('Push token:', token);
   ```

3. Tester sur un appareil physique

---

### **Problème 2 : Erreur "Invalid push token"**

**Cause :** Le token n'est pas un token Expo valide

**Solution :**
```typescript
import { Expo } from 'expo-server-sdk';

if (!Expo.isExpoPushToken(token)) {
  console.error('Token invalide:', token);
}
```

---

### **Problème 3 : Notifications ne s'affichent pas en premier plan**

**Cause :** Configuration du handler

**Solution :**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Afficher même en premier plan
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

## ✅ Checklist de Déploiement

```bash
Backend :
✅ npm install expo-server-sdk
✅ Créer push-notification.service.js
✅ Créer push-notifications.routes.js
✅ Ajouter route dans app.js
✅ Créer table PushTokens dans Supabase
✅ Redémarrer le serveur

Mobile :
✅ npx expo install expo-notifications expo-device expo-constants
✅ Créer notificationService.ts
✅ Créer useNotifications.ts
✅ Initialiser dans App.tsx
✅ Configurer app.json
✅ Redémarrer Expo

Tests :
⚠️ Tester sur appareil physique
⚠️ Vérifier l'enregistrement du token
⚠️ Envoyer une notification de test
⚠️ Tester la navigation depuis une notification
⚠️ Tester les notifications en arrière-plan
```

---

## 🎉 Résultat Final

**Flux complet fonctionnel :**
```
App démarre → Demande permissions → Obtient token → Enregistre au backend
    ↓
Événement se produit → Backend envoie notification → Utilisateur reçoit
    ↓
Utilisateur clique → Navigation vers l'écran approprié
```

**Avantages :**
- ✅ Engagement utilisateur accru
- ✅ Rappels automatiques
- ✅ Communication en temps réel
- ✅ Personnalisable par utilisateur
- ✅ Fonctionne iOS et Android

---

**Le système de notifications push est maintenant prêt !** 🚀
