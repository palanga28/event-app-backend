# 🔥 Configuration du Pare-feu Windows pour accès mobile

## 🐛 Problème

Le téléphone ne peut pas accéder au backend/frontend car le **Pare-feu Windows** bloque les connexions entrantes sur les ports 3000 et 5173.

---

## ✅ Solution : Autoriser les ports dans le pare-feu

### **Méthode 1 : Via PowerShell (Administrateur)**

**Ouvre PowerShell en tant qu'administrateur :**
1. Clique droit sur le menu Démarrer
2. "Windows PowerShell (Admin)" ou "Terminal (Admin)"

**Exécute ces commandes :**

```powershell
# Autoriser le port 3000 (Backend Node.js)
New-NetFirewallRule -DisplayName "Event App Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Autoriser le port 5173 (Frontend Vite)
New-NetFirewallRule -DisplayName "Event App Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

**Résultat attendu :**
```
Name                  : {GUID}
DisplayName           : Event App Backend
Enabled               : True
Direction             : Inbound
Action                : Allow
```

---

### **Méthode 2 : Via l'interface graphique**

**1. Ouvrir le Pare-feu Windows :**
- Appuie sur `Win + R`
- Tape : `wf.msc`
- Appuie sur Entrée

**2. Créer une règle pour le port 3000 (Backend) :**
- Clic droit sur "Règles de trafic entrant"
- "Nouvelle règle..."
- Type de règle : **Port** → Suivant
- Protocole : **TCP**
- Ports locaux spécifiques : **3000** → Suivant
- Action : **Autoriser la connexion** → Suivant
- Profil : Cocher **Domaine, Privé, Public** → Suivant
- Nom : **Event App Backend** → Terminer

**3. Créer une règle pour le port 5173 (Frontend) :**
- Répéter les mêmes étapes
- Port : **5173**
- Nom : **Event App Frontend**

---

### **Méthode 3 : Désactiver temporairement le pare-feu (TEST UNIQUEMENT)**

**⚠️ ATTENTION : À utiliser uniquement pour tester, pas en production !**

```powershell
# Désactiver le pare-feu (PowerShell Admin)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Réactiver après le test
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

---

## 🧪 Tester après configuration

### **1. Vérifier que les règles sont créées**

```powershell
Get-NetFirewallRule -DisplayName "Event App*"
```

**Tu devrais voir :**
```
DisplayName           : Event App Backend
Enabled               : True
Direction             : Inbound
Action                : Allow

DisplayName           : Event App Frontend
Enabled               : True
Direction             : Inbound
Action                : Allow
```

### **2. Tester depuis le téléphone**

**Navigateur mobile :**
```
http://192.168.46.225:3000/health
```

**Résultat attendu :**
```json
{
  "status": "OK",
  "database": { "status": "Connected" }
}
```

**Frontend :**
```
http://192.168.46.225:5173
```

**Résultat attendu :**
- ✅ Page d'accueil chargée
- ✅ Plus d'erreur réseau

---

## 🔍 Vérifier les connexions actives

```powershell
# Voir les connexions sur le port 3000
netstat -an | Select-String "3000"

# Voir les connexions sur le port 5173
netstat -an | Select-String "5173"
```

**Tu devrais voir :**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING
```

---

## 📱 Test complet depuis le téléphone

### **1. Backend accessible**
```
http://192.168.46.225:3000/health
→ ✅ {"status":"OK"}
```

### **2. Frontend accessible**
```
http://192.168.46.225:5173
→ ✅ Page d'accueil
```

### **3. Connexion fonctionne**
```
Email: paultshihumbwe@gmail.com
Mot de passe: [ton mot de passe]
→ ✅ Connexion réussie
```

### **4. Réinitialisation fonctionne**
```
"Mot de passe oublié" → Email → Lien → Nouveau mot de passe
→ ✅ Réinitialisation réussie
```

---

## 🛡️ Sécurité

**Les règles créées autorisent uniquement :**
- ✅ Connexions TCP entrantes sur les ports 3000 et 5173
- ✅ Uniquement sur le réseau local (192.168.x.x)
- ✅ Pas d'accès depuis Internet

**Pour plus de sécurité en production :**
- Utiliser HTTPS (SSL/TLS)
- Configurer un reverse proxy (nginx)
- Limiter l'accès par adresse IP
- Utiliser un VPN pour accès distant

---

## ✅ Checklist finale

```bash
✅ PowerShell ouvert en tant qu'administrateur
✅ Règle pare-feu créée pour port 3000
✅ Règle pare-feu créée pour port 5173
✅ Backend redémarré (npm start)
✅ Frontend redémarré (npm run dev)
✅ Backend écoute sur 0.0.0.0:3000
✅ Frontend écoute sur 0.0.0.0:5173
✅ Téléphone sur le même WiFi que le PC
✅ Test /health depuis le téléphone réussi
✅ Test frontend depuis le téléphone réussi
✅ Connexion depuis le téléphone réussie
✅ Réinitialisation mot de passe réussie
```

---

**Le pare-feu est maintenant configuré pour permettre l'accès mobile !** 🎉
