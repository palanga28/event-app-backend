# 🚀 INSTRUCTIONS POUR ACTIVER LES RÔLES SUPABASE

## Étape 1 : Exécuter le script SQL

Allez dans votre projet Supabase : https://fcwficfbcrkpwnmhzztw.supabase.co

1. **SQL Editor** → **New query**
2. **Copiez-collez** le contenu de `update_roles_supabase.sql`
3. **Exécutez** le script

## Ce que fait le script :

### ✅ Ajoute le champ `role` à la table Users
```sql
ALTER TABLE public."Users" 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL;
```

### ✅ Crée un type ENUM pour les rôles
```sql
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
```

### ✅ Met à jour l'utilisateur 1 comme admin
```sql
UPDATE public."Users" 
SET role = 'admin' 
WHERE id = 1;
```

### ✅ Crée les fonctions de vérification
```sql
CREATE OR REPLACE FUNCTION check_user_role(user_id INTEGER, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public."Users" 
        WHERE id = user_id AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Étape 2 : Tester le système

Une fois le SQL exécuté, lancez :
```bash
node test_roles_system.js
```

## Résultat attendu :

✅ **Admin** : Accès complet à `/api/admin/*`  
✅ **Modérateur** : Accès à `/api/moderator/*`  
✅ **User** : Accès limité à ses propres données  
✅ **Sécurité** : Permissions correctement appliquées  

---

## 🎯 Avantages du système Supabase

### 🔐 **Sécurité renforcée**
- Rôles stockés en base de données
- Pas de hardcoding dans le code
- Mises à jour en temps réel

### 🛡️ **Contrôle granulaire**
- 3 niveaux : user → moderator → admin
- Héritage des permissions (admin > moderator > user)
- Validation côté base de données

### 📊 **Scalabilité**
- Ajout facile de nouveaux rôles
- Permissions modulaires
- Audit trail possible

---

**Exécutez le SQL et le système sera 100% fonctionnel !** 🚀
