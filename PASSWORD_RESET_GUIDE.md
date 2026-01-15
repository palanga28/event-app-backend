# 🔐 Guide de réinitialisation de mot de passe

Ce guide explique comment fonctionne la réinitialisation de mot de passe dans l'application Event App (Web + Mobile).

---

## 📋 **Fonctionnalités implémentées**

### ✅ **Backend (API)**
- Route `/api/auth/request-password-reset` : Demander un lien de réinitialisation
- Route `/api/auth/reset-password` : Réinitialiser le mot de passe avec token
- Service email (Nodemailer) : Envoi d'emails HTML responsive
- Tokens sécurisés : Valides pendant 1 heure, usage unique
- Table `PasswordResetTokens` : Stockage des tokens

### ✅ **Frontend Web**
- Page `/forgot-password` : Demander la réinitialisation
- Page `/reset-password?token=XXX` : Définir nouveau mot de passe
- Lien "Mot de passe oublié ?" sur la page de connexion
- Design moderne avec glass morphism

### ✅ **Mobile (React Native)**
- Écran `ForgotPasswordScreen` : Demander la réinitialisation
- Écran `ResetPasswordScreen` : Définir nouveau mot de passe
- Navigation depuis l'écran de connexion
- Design cohérent avec l'app

---

## 🔄 **Flux utilisateur**

### **1. Utilisateur oublie son mot de passe**

**Web :**
```
Page de connexion → Clic "Mot de passe oublié ?"
→ /forgot-password → Entre son email → Clic "Envoyer le lien"
```

**Mobile :**
```
Écran Login → Clic "Mot de passe oublié ?"
→ ForgotPasswordScreen → Entre son email → Clic "Envoyer le lien"
```

### **2. Backend traite la demande**

```javascript
POST /api/auth/request-password-reset
Body: { email: "user@example.com" }

→ Vérifie si l'utilisateur existe
→ Génère un token unique (32 bytes)
→ Stocke le token dans PasswordResetTokens (expire dans 1h)
→ Envoie un email avec le lien
```

### **3. Utilisateur reçoit l'email**

**Email HTML responsive :**
```
┌─────────────────────────────────────────┐
│  🔐 Réinitialisation de mot de passe    │
├─────────────────────────────────────────┤
│                                         │
│  Bonjour [Nom],                         │
│                                         │
│  Vous avez demandé à réinitialiser     │
│  votre mot de passe.                    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Réinitialiser mon mot de passe    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Ou copiez ce lien :                   │
│  https://app.com/reset-password?token=...│
│                                         │
│  ⚠️ Important :                         │
│  • Valide pendant 1 heure              │
│  • Ne partagez jamais ce lien          │
│                                         │
└─────────────────────────────────────────┘
```

### **4. Utilisateur clique sur le lien**

**Web :**
```
Lien dans l'email → /reset-password?token=ABC123
→ Entre nouveau mot de passe (min 6 caractères)
→ Confirme le mot de passe
→ Clic "Réinitialiser le mot de passe"
```

**Mobile :**
```
Lien dans l'email → Deep link vers ResetPasswordScreen
→ Entre nouveau mot de passe
→ Confirme le mot de passe
→ Clic "Réinitialiser le mot de passe"
```

### **5. Backend réinitialise le mot de passe**

```javascript
POST /api/auth/reset-password
Body: { token: "ABC123", newPassword: "newpass123" }

→ Vérifie que le token existe
→ Vérifie que le token n'est pas expiré
→ Vérifie que le token n'a pas été utilisé
→ Hash le nouveau mot de passe (bcrypt)
→ Met à jour le mot de passe
→ Marque le token comme utilisé
→ Retourne succès
```

### **6. Utilisateur se connecte**

```
Redirection automatique vers /login
→ Connexion avec nouveau mot de passe
→ Accès au compte restauré ✅
```

---

## 🗂️ **Fichiers créés/modifiés**

### **Backend**
```
✅ backend/src/services/email.service.js (nouveau)
   - Service d'envoi d'emails avec Nodemailer
   - Templates HTML pour réinitialisation et bienvenue
   
✅ backend/src/routes/auth.routes.js (modifié)
   - Intégration du service email
   - Route /request-password-reset mise à jour
   
✅ backend/package.json (modifié)
   - nodemailer@6.9.7 ajouté
   - winston@3.11.0 ajouté
   
✅ backend/.env.example (modifié)
   - Variables EMAIL_* ajoutées
   
✅ backend/EMAIL_SETUP.md (nouveau)
   - Guide de configuration email
```

### **Frontend Web**
```
✅ frontend/src/pages/ForgotPasswordPage.tsx (nouveau)
   - Page de demande de réinitialisation
   
✅ frontend/src/pages/ResetPasswordPage.tsx (nouveau)
   - Page de définition du nouveau mot de passe
   
✅ frontend/src/pages/LoginPage.tsx (modifié)
   - Lien "Mot de passe oublié ?" ajouté
   
✅ frontend/src/routes/AppRouter.tsx (modifié)
   - Routes /forgot-password et /reset-password ajoutées
```

### **Mobile**
```
✅ mobile/src/screens/ForgotPasswordScreen.tsx (existant)
   - Écran de demande de réinitialisation
   
✅ mobile/src/screens/ResetPasswordScreen.tsx (nouveau)
   - Écran de définition du nouveau mot de passe
```

---

## 🧪 **Comment tester**

### **Test complet (avec email configuré)**

1. **Configurer l'email** (voir `backend/EMAIL_SETUP.md`)
   ```bash
   # Dans backend/src/.env.local
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=ton-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

2. **Redémarrer le backend**
   ```bash
   cd backend
   npm start
   # Vérifier : ✅ Service email prêt
   ```

3. **Créer un utilisateur de test**
   ```bash
   # Web : http://localhost:5173/register
   # Mobile : Écran Register
   ```

4. **Demander une réinitialisation**
   ```bash
   # Web : http://localhost:5173/forgot-password
   # Mobile : ForgotPasswordScreen
   # Entre ton email → Clic "Envoyer le lien"
   ```

5. **Vérifier l'email**
   ```
   Boîte de réception → Email "Réinitialisation de mot de passe"
   → Clic sur le bouton ou copier le lien
   ```

6. **Réinitialiser le mot de passe**
   ```
   Page /reset-password?token=XXX
   → Nouveau mot de passe : "newpass123"
   → Confirmer : "newpass123"
   → Clic "Réinitialiser"
   ```

7. **Se connecter**
   ```
   Page /login
   → Email + nouveau mot de passe
   → Connexion réussie ✅
   ```

### **Test en développement (sans email)**

Si l'email n'est pas configuré :
```
1. Demander réinitialisation → Token affiché dans la console backend
2. Copier le token
3. Aller sur /reset-password?token=COPIED_TOKEN
4. Définir nouveau mot de passe
5. Se connecter
```

---

## 🔒 **Sécurité**

### **Mesures implémentées**

✅ **Tokens sécurisés**
- Générés avec `crypto.randomBytes(32)` (256 bits)
- Stockés en base de données
- Expiration après 1 heure
- Usage unique (marqués comme `used`)

✅ **Validation**
- Email validé avec regex
- Mot de passe minimum 6 caractères
- Vérification de correspondance des mots de passe
- Token vérifié côté serveur

✅ **Protection contre énumération**
- Même réponse si l'email existe ou non
- "Si cet email existe, un lien a été envoyé"

✅ **Logs**
- Toutes les tentatives loggées avec Winston
- IP et User-Agent enregistrés
- Détection d'activité suspecte possible

✅ **Email sécurisé**
- Lien HTTPS en production
- Token dans l'URL (pas dans le corps de l'email)
- Avertissements de sécurité dans l'email

---

## 📊 **Base de données**

### **Table PasswordResetTokens**

```sql
CREATE TABLE PasswordResetTokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES Users(id),
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Exemple d'enregistrement :**
```json
{
  "id": 1,
  "user_id": 42,
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "expires_at": "2026-01-15T11:30:00Z",
  "used": false,
  "created_at": "2026-01-15T10:30:00Z"
}
```

---

## 🎨 **Design**

### **Web (Glass Morphism)**
- Fond dégradé violet/rose
- Cartes avec effet verre
- Animations fluides (fade-in, scale-in)
- Responsive mobile

### **Mobile (React Native)**
- Dégradés LinearGradient
- Icônes Lucide React Native
- Animations natives
- KeyboardAvoidingView

---

## 🚀 **Prochaines améliorations possibles**

1. **Deep linking mobile**
   - Ouvrir l'app directement depuis l'email
   - Configuration : `expo-linking`

2. **Historique des réinitialisations**
   - Afficher les dernières réinitialisations dans le profil
   - Alertes si trop de tentatives

3. **Authentification à deux facteurs (2FA)**
   - Code SMS ou email en plus du mot de passe
   - Encore plus de sécurité

4. **Personnalisation des emails**
   - Logo de l'app
   - Couleurs de marque
   - Langue de l'utilisateur

---

## 📞 **Support**

**Problèmes courants :**

1. **Email non reçu**
   - Vérifier le dossier spam
   - Vérifier les logs backend : `✅ Email envoyé`
   - Vérifier la configuration EMAIL_*

2. **Token expiré**
   - Redemander une réinitialisation
   - Les tokens expirent après 1 heure

3. **Token invalide**
   - Vérifier que le lien est complet
   - Ne pas modifier le token manuellement

---

## ✅ **Checklist de production**

```bash
✅ Service email configuré (Gmail/SendGrid/Mailgun)
✅ Variables EMAIL_* dans .env.production
✅ HTTPS activé (certificat SSL)
✅ FRONTEND_URL correcte dans .env
✅ Deep linking mobile configuré (optionnel)
✅ Logs Winston activés
✅ Tests effectués avec emails réels
✅ Documentation à jour
```

---

**La fonctionnalité de réinitialisation de mot de passe est maintenant complète et sécurisée !** 🎉🔐
