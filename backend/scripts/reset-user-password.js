const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../src/.env.local' });
const { supabaseAPI } = require('../src/config/api');

async function resetUserPassword() {
  // Arguments: email et nouveau mot de passe
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: node reset-user-password.js <email> <nouveau_mot_de_passe>');
    console.log('Exemple: node reset-user-password.js test@example.com 123456');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    console.log(`🔍 Recherche de l'utilisateur: ${normalizedEmail}`);
    
    // Chercher l'utilisateur (insensible à la casse)
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

    console.log(`✅ Utilisateur trouvé: ID ${user.id}, Email: ${user.email}`);

    // Créer un nouveau hash bcrypt
    console.log(`🔐 Création d'un nouveau hash bcrypt pour le mot de passe: ${newPassword}`);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`✅ Hash créé: ${hashedPassword.substring(0, 20)}...`);

    // Mettre à jour l'utilisateur
    console.log('💾 Mise à jour dans Supabase...');
    await supabaseAPI.update(
      'Users',
      { 
        password: hashedPassword,
        email: normalizedEmail, // Normaliser l'email aussi
        updated_at: new Date().toISOString()
      },
      { id: user.id }
    );

    console.log('✅ Mot de passe mis à jour avec succès !');
    console.log('');
    console.log('📧 Identifiants de connexion:');
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Mot de passe: ${newPassword}`);
    console.log('');
    console.log('🎉 Tu peux maintenant te connecter avec ces identifiants depuis Expo !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  }
}

resetUserPassword();
