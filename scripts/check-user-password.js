const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../src/.env.local' });
const { supabaseAPI } = require('../src/config/api');

async function checkUserPassword() {
  // Demander l'email via argument de ligne de commande
  const email = process.argv[2];
  const testPassword = process.argv[3];

  if (!email) {
    console.log('Usage: node check-user-password.js <email> [password_to_test]');
    console.log('Exemple: node check-user-password.js test@example.com 123456');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    console.log(`🔍 Recherche de l'utilisateur: ${normalizedEmail}\n`);
    
    // Chercher l'utilisateur
    const usersExact = await supabaseAPI.select('Users', { email: normalizedEmail });
    let user = usersExact[0];

    if (!user) {
      const candidates = await supabaseAPI.select('Users', { email: { like: normalizedEmail } });
      user = (candidates || []).find(
        (u) => typeof u?.email === 'string' && u.email.trim().toLowerCase() === normalizedEmail
      );
    }

    if (!user) {
      console.error('❌ Utilisateur non trouvé');
      return;
    }

    console.log('✅ Utilisateur trouvé:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.name}`);
    console.log(`   Créé le: ${new Date(user.created_at).toLocaleString('fr-FR')}`);
    console.log(`   Rôle: ${user.role}`);
    console.log('');

    // Vérifier le hash du mot de passe
    if (!user.password) {
      console.log('❌ Aucun mot de passe défini pour cet utilisateur');
      return;
    }

    console.log('🔐 Analyse du mot de passe:');
    console.log(`   Hash: ${user.password.substring(0, 30)}...`);
    console.log(`   Longueur: ${user.password.length} caractères`);
    
    // Vérifier si c'est un hash bcrypt
    const isBcrypt = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
    
    if (isBcrypt) {
      console.log('   Type: ✅ Hash bcrypt valide');
      
      if (testPassword) {
        console.log('');
        console.log(`🧪 Test du mot de passe: "${testPassword}"`);
        try {
          const isValid = await bcrypt.compare(testPassword, user.password);
          if (isValid) {
            console.log('   ✅ Le mot de passe correspond !');
          } else {
            console.log('   ❌ Le mot de passe ne correspond pas');
          }
        } catch (error) {
          console.log('   ❌ Erreur lors de la vérification:', error.message);
        }
      }
    } else {
      console.log('   Type: ❌ PAS un hash bcrypt');
      console.log('   ⚠️  Ce mot de passe ne peut pas être utilisé pour se connecter');
      console.log('   💡 Utilisez le script fix-user-password.js pour le corriger');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  }
}

checkUserPassword();
