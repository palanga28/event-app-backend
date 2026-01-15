const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../src/.env.local' });
const { supabaseAPI } = require('../src/config/api');

async function cleanDuplicateEmails() {
  try {
    console.log('🔍 Recherche des emails en double...\n');

    // Récupérer tous les utilisateurs
    const allUsers = await supabaseAPI.select('Users', {}, { limit: 10000 });
    console.log(`📊 Total utilisateurs: ${allUsers.length}`);

    // Grouper par email normalisé
    const emailGroups = new Map();
    
    for (const user of allUsers) {
      const normalizedEmail = user.email.trim().toLowerCase();
      if (!emailGroups.has(normalizedEmail)) {
        emailGroups.set(normalizedEmail, []);
      }
      emailGroups.get(normalizedEmail).push(user);
    }

    // Trouver les doublons
    const duplicates = Array.from(emailGroups.entries())
      .filter(([email, users]) => users.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ Aucun email en double trouvé !');
      return;
    }

    console.log(`\n⚠️  ${duplicates.length} email(s) en double trouvé(s):\n`);

    for (const [email, users] of duplicates) {
      console.log(`📧 Email: ${email}`);
      console.log(`   Nombre de comptes: ${users.length}`);
      
      // Trier par date de création (garder le plus ancien)
      users.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      const keepUser = users[0];
      const deleteUsers = users.slice(1);

      console.log(`   ✅ Garder: ID ${keepUser.id} (créé le ${new Date(keepUser.created_at).toLocaleString('fr-FR')})`);
      
      for (const user of deleteUsers) {
        console.log(`   ❌ Supprimer: ID ${user.id} (créé le ${new Date(user.created_at).toLocaleString('fr-FR')})`);
      }
      console.log('');
    }

    // Demander confirmation (en mode automatique pour ce script)
    console.log('🗑️  Suppression des doublons...\n');

    for (const [email, users] of duplicates) {
      users.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const deleteUsers = users.slice(1);

      for (const user of deleteUsers) {
        try {
          // Supprimer les dépendances d'abord
          console.log(`   Suppression des dépendances pour l'utilisateur ID ${user.id}...`);
          
          // Supprimer les refresh tokens
          await supabaseAPI.delete('RefreshTokens', { user_id: user.id });
          
          // Supprimer les favoris
          await supabaseAPI.delete('Favorites', { user_id: user.id });
          
          // Supprimer les tickets
          await supabaseAPI.delete('Tickets', { user_id: user.id });
          
          // Note: Les événements ne sont PAS supprimés pour préserver le contenu
          // On pourrait les réassigner au compte principal si nécessaire
          
          // Supprimer l'utilisateur
          await supabaseAPI.delete('Users', { id: user.id });
          
          console.log(`   ✅ Utilisateur ID ${user.id} supprimé`);
        } catch (error) {
          console.error(`   ❌ Erreur lors de la suppression de l'utilisateur ID ${user.id}:`, error.message);
        }
      }
    }

    console.log('\n✅ Nettoyage terminé !');
    console.log('\n📝 Résumé:');
    console.log(`   - Emails en double traités: ${duplicates.length}`);
    console.log(`   - Comptes supprimés: ${duplicates.reduce((sum, [_, users]) => sum + users.length - 1, 0)}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  }
}

cleanDuplicateEmails();
