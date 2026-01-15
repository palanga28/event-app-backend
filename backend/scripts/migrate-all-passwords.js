const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../src/.env.local' });
const { supabaseAPI } = require('../src/config/api');

async function migrateAllPasswords() {
  const defaultPassword = process.argv[2] || '123456';
  
  console.log('🔐 Migration automatique des mots de passe');
  console.log(`📝 Mot de passe par défaut: ${defaultPassword}`);
  console.log('');

  try {
    // Récupérer tous les utilisateurs
    console.log('🔍 Récupération de tous les utilisateurs...');
    const allUsers = await supabaseAPI.select('Users', {}, { limit: 10000 });
    console.log(`✅ ${allUsers.length} utilisateurs trouvés\n`);

    let migratedCount = 0;
    let alreadyValidCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        // Vérifier si le mot de passe est déjà un hash bcrypt valide
        const isBcrypt = user.password && 
          (user.password.startsWith('$2a$') || 
           user.password.startsWith('$2b$') || 
           user.password.startsWith('$2y$'));

        if (isBcrypt) {
          // Tester si le hash est valide en essayant de comparer
          try {
            await bcrypt.compare('test', user.password);
            console.log(`✅ [ID ${user.id}] ${user.email} - Hash bcrypt valide (ignoré)`);
            alreadyValidCount++;
            continue;
          } catch (error) {
            // Hash corrompu, on va le remplacer
            console.log(`⚠️  [ID ${user.id}] ${user.email} - Hash bcrypt corrompu, migration...`);
          }
        } else {
          console.log(`🔄 [ID ${user.id}] ${user.email} - Pas de hash bcrypt, migration...`);
        }

        // Créer un nouveau hash bcrypt
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Mettre à jour l'utilisateur
        await supabaseAPI.update(
          'Users',
          { 
            password: hashedPassword,
            email: user.email.trim().toLowerCase(), // Normaliser l'email aussi
            updated_at: new Date().toISOString()
          },
          { id: user.id }
        );

        console.log(`   ✅ Migré avec succès`);
        migratedCount++;

      } catch (error) {
        console.error(`   ❌ Erreur pour l'utilisateur ID ${user.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📊 Résumé de la migration');
    console.log('═══════════════════════════════════════════');
    console.log(`Total utilisateurs:        ${allUsers.length}`);
    console.log(`✅ Déjà valides (ignorés):  ${alreadyValidCount}`);
    console.log(`🔄 Migrés avec succès:      ${migratedCount}`);
    console.log(`❌ Erreurs:                 ${errorCount}`);
    console.log('═══════════════════════════════════════════');
    console.log('');

    if (migratedCount > 0) {
      console.log('🎉 Migration terminée avec succès !');
      console.log('');
      console.log('📧 Tous les utilisateurs migrés peuvent maintenant se connecter avec :');
      console.log(`   Mot de passe: ${defaultPassword}`);
      console.log('');
      console.log('💡 Recommandation: Demande aux utilisateurs de changer leur mot de passe');
      console.log('   via le système de réinitialisation de mot de passe.');
    } else {
      console.log('✅ Aucune migration nécessaire - tous les mots de passe sont déjà valides !');
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   Migration automatique des mots de passe utilisateurs   ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('⚠️  ATTENTION: Ce script va réinitialiser les mots de passe');
console.log('   de tous les utilisateurs qui n\'ont pas de hash bcrypt valide.');
console.log('');
console.log('Usage: node migrate-all-passwords.js [mot_de_passe_par_defaut]');
console.log('Exemple: node migrate-all-passwords.js 123456');
console.log('');
console.log('Appuie sur Ctrl+C dans les 5 secondes pour annuler...');
console.log('');

// Attendre 5 secondes avant de commencer
setTimeout(() => {
  migrateAllPasswords();
}, 5000);
