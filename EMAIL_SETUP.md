# 📧 Configuration du service d'email

Le service d'email permet d'envoyer des emails de réinitialisation de mot de passe et de bienvenue aux utilisateurs.

---

## 🚀 Configuration rapide (Gmail)

### **1. Créer un mot de passe d'application Gmail**

1. Allez sur votre compte Google : https://myaccount.google.com/
2. Sécurité → Validation en deux étapes (activez-la si ce n'est pas fait)
3. Sécurité → Mots de passe des applications
4. Sélectionnez "Autre" et nommez-le "Event App Backend"
5. Copiez le mot de passe généré (16 caractères)

### **2. Ajouter les variables dans `.env.local`**

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Mot de passe d'application
```

### **3. Redémarrer le backend**

```bash
npm start
```

Vous devriez voir :
```
✅ Service email prêt
```

---

## 🔧 Autres fournisseurs SMTP

### **SendGrid**

```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=votre-api-key-sendgrid
```

### **Mailgun**

```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=postmaster@votre-domaine.mailgun.org
EMAIL_PASSWORD=votre-mot-de-passe-mailgun
```

### **Outlook/Hotmail**

```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@outlook.com
EMAIL_PASSWORD=votre-mot-de-passe
```

---

## 🧪 Tester le service d'email

### **Test de réinitialisation de mot de passe**

```bash
# Avec curl
curl -X POST http://localhost:3000/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**En développement (sans email configuré) :**
- Le token sera affiché dans la console
- La réponse contiendra le token et l'URL de réinitialisation

**En production (avec email configuré) :**
- Un email sera envoyé à l'utilisateur
- La réponse ne contiendra pas le token (sécurité)

---

## 📝 Emails disponibles

### **1. Réinitialisation de mot de passe**
- **Déclencheur :** `POST /api/auth/request-password-reset`
- **Contenu :** Lien de réinitialisation valide 1 heure
- **Template :** HTML responsive avec bouton CTA

### **2. Email de bienvenue** (optionnel)
- **Déclencheur :** Inscription réussie
- **Contenu :** Message de bienvenue et présentation de l'app
- **Template :** HTML responsive

---

## 🔒 Sécurité

### **Bonnes pratiques**

1. **Ne jamais commiter les credentials**
   - Les fichiers `.env*` sont dans `.gitignore`
   - Utiliser des mots de passe d'application (pas le mot de passe principal)

2. **Limiter les envois**
   - Gmail : 500 emails/jour (gratuit)
   - SendGrid : 100 emails/jour (gratuit)
   - Considérer un service payant pour production

3. **Validation des emails**
   - Tous les emails sont validés avant envoi
   - Format email vérifié avec regex

4. **Gestion des erreurs**
   - Les erreurs d'envoi ne bloquent pas l'application
   - Logs détaillés pour debugging

---

## 🐛 Dépannage

### **Erreur : "Service email non configuré"**

**Cause :** Variables `EMAIL_USER` ou `EMAIL_PASSWORD` manquantes

**Solution :**
```bash
# Vérifier .env.local
cat backend/src/.env.local | grep EMAIL

# Ajouter les variables manquantes
echo "EMAIL_USER=votre-email@gmail.com" >> backend/src/.env.local
echo "EMAIL_PASSWORD=votre-mot-de-passe" >> backend/src/.env.local
```

### **Erreur : "Invalid login"**

**Causes possibles :**
1. Mot de passe incorrect
2. Validation en deux étapes non activée (Gmail)
3. Mot de passe d'application non utilisé

**Solution :**
- Vérifier que vous utilisez un **mot de passe d'application** (pas votre mot de passe Gmail)
- Activer la validation en deux étapes sur Gmail

### **Erreur : "Connection timeout"**

**Causes possibles :**
1. Firewall bloquant le port 587
2. Mauvais host SMTP

**Solution :**
```bash
# Tester la connexion SMTP
telnet smtp.gmail.com 587

# Si ça ne fonctionne pas, essayer le port 465
EMAIL_PORT=465
EMAIL_SECURE=true
```

### **Emails non reçus**

**Vérifier :**
1. Dossier spam/courrier indésirable
2. Logs du backend : `✅ Email envoyé: <message-id>`
3. Quota d'envoi non dépassé

---

## 📊 Monitoring

### **Logs Winston**

Les emails sont loggés automatiquement :

```bash
# Succès
✅ Email envoyé: <1234567890@gmail.com>

# Erreur
❌ Erreur envoi email: Invalid login: 535-5.7.8 Username and Password not accepted
```

### **Fichiers de logs** (production)

```bash
backend/logs/combined.log  # Tous les logs
backend/logs/error.log     # Erreurs uniquement
```

---

## 🎨 Personnalisation des templates

Les templates HTML sont dans `backend/src/services/email.service.js`

**Modifier le design :**
1. Éditer la section `html` dans `sendPasswordResetEmail()`
2. Tester avec un email réel
3. Vérifier la compatibilité mobile

**Variables disponibles :**
- `userName` : Nom de l'utilisateur
- `resetUrl` : URL de réinitialisation
- `frontendUrl` : URL du frontend

---

## 📚 Ressources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Mailgun SMTP](https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp)

---

## ✅ Checklist de production

```bash
✅ Variables EMAIL_* configurées dans .env.production
✅ Service email testé avec emails réels
✅ Templates HTML testés sur mobile et desktop
✅ Quota d'envoi suffisant pour le trafic attendu
✅ Monitoring des erreurs d'envoi configuré
✅ Logs Winston activés
✅ Domaine vérifié (si SendGrid/Mailgun)
```
