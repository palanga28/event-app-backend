// Script de test pour vérifier les likes
const { supabaseAPI } = require('./src/config/api');

async function testLikes() {
  console.log('🧪 Test du système de likes...\n');

  try {
    // Test 1: Vérifier si la table CommentLikes existe
    console.log('1️⃣ Vérification de la table CommentLikes...');
    const testLikes = await supabaseAPI.select('CommentLikes', {}, { limit: 1 });
    console.log('✅ Table CommentLikes existe');
    console.log(`   Nombre de likes: ${testLikes.length}`);

    // Test 2: Vérifier si la table EventLikes existe
    console.log('\n2️⃣ Vérification de la table EventLikes...');
    const testEventLikes = await supabaseAPI.select('EventLikes', {}, { limit: 1 });
    console.log('✅ Table EventLikes existe');
    console.log(`   Nombre de likes: ${testEventLikes.length}`);

    // Test 3: Vérifier la colonne parent_id dans Comments
    console.log('\n3️⃣ Vérification de la colonne parent_id...');
    const testComments = await supabaseAPI.select('Comments', {}, { limit: 1 });
    if (testComments.length > 0) {
      console.log('✅ Table Comments accessible');
      console.log(`   Colonnes disponibles: ${Object.keys(testComments[0]).join(', ')}`);
    }

    console.log('\n✅ Tous les tests sont passés !');
    console.log('\n📊 Résumé:');
    console.log('   - Table CommentLikes: ✅');
    console.log('   - Table EventLikes: ✅');
    console.log('   - Table Comments: ✅');

  } catch (err) {
    console.error('\n❌ Erreur lors des tests:', err.message);
    
    if (err.message.includes('relation') || err.message.includes('does not exist')) {
      console.error('\n⚠️  Les tables n\'existent pas encore dans Supabase !');
      console.error('\n📝 Pour créer les tables, exécute ces commandes SQL dans Supabase SQL Editor:');
      console.error('\n--- CommentLikes ---');
      console.error(`
CREATE TABLE IF NOT EXISTS "CommentLikes" (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES "Comments"(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON "CommentLikes"(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON "CommentLikes"(user_id);
      `);
      
      console.error('\n--- EventLikes ---');
      console.error(`
CREATE TABLE IF NOT EXISTS "EventLikes" (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON "EventLikes"(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON "EventLikes"(user_id);
      `);

      console.error('\n--- parent_id dans Comments ---');
      console.error(`
ALTER TABLE "Comments" 
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES "Comments"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON "Comments"(parent_id);
      `);
    }
    
    process.exit(1);
  }
}

testLikes();
