require('dotenv').config({ path: './src/.env.local' });
const { supabaseAPI } = require('./src/config/api');

async function countEvents() {
  try {
    const events = await supabaseAPI.select('Events', {});
    
    console.log('\n📊 STATISTIQUES DES ÉVÉNEMENTS\n');
    console.log('━'.repeat(50));
    console.log(`📅 Nombre total d'événements: ${events.length}`);
    console.log('━'.repeat(50));
    
    if (events.length > 0) {
      console.log('\n📋 Liste des événements:\n');
      events.forEach((e, i) => {
        console.log(`${i + 1}. ${e.title}`);
        console.log(`   ID: ${e.id} | Statut: ${e.status || 'N/A'} | Organisateur ID: ${e.organizer_id}`);
        console.log(`   Créé le: ${new Date(e.created_at).toLocaleDateString('fr-FR')}`);
        console.log('');
      });
      
      // Statistiques par statut
      const byStatus = events.reduce((acc, e) => {
        const status = e.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Répartition par statut:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    } else {
      console.log('\n⚠️  Aucun événement trouvé dans la base de données.');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

countEvents();
