const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../src/.env.local' });
const { supabaseAPI } = require('../src/config/api');

async function fixUserPassword() {
  const email = 'paulpalanga21@gmail.com'; // Email normalisé
  const newPassword = '123456';

  try {
    console.log(`🔍 Recherche de l'utilisateur: ${email}`);
    
    // Chercher l'utilisateur (insensible à la casse)
    const usersExact = await supabaseAPI.select('Users', { email });
    let user = usersExact[0];

    if (!user) {
      const candidates = await supabaseAPI.select('Users', { email: { like: email } });
      user = (candidates || []).find(
        (u) => typeof u?.email === 'string' && u.email.trim().toLowerCase() === email
      );
    }

    if (!user) {
      console.error('❌ Utilisateur non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ID ${user.id}, Email: ${user.email}`);
    console.log(`📝 Hash actuel: ${user.password?.substring(0, 20)}...`);

    // Vérifier si c'est déjà un hash bcrypt
    if (user.password && user.password.startsWith('$2')) {
      console.log('⚠️  Le mot de passe est déjà hashé avec bcrypt');
      console.log('🔐 Test du mot de passe actuel...');
      const isValid = await bcrypt.compare(newPassword, user.password);
      if (isValid) {
        console.log('✅ Le mot de passe actuel fonctionne déjà !');
        return;
      } else {
        console.log('❌ Le mot de passe actuel ne correspond pas');
      }
    }

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
        email: email.toLowerCase(), // Normaliser l'email aussi
        updated_at: new Date().toISOString()
      },
      { id: user.id }
    );

    console.log('✅ Mot de passe mis à jour avec succès !');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Mot de passe: ${newPassword}`);
    console.log('');
    console.log('🎉 Tu peux maintenant te connecter avec ces identifiants depuis Expo !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  }
}

fixUserPassword();
