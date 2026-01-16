// Script de debug pour tester la route des likes
require('dotenv').config({ path: './src/.env.local' });
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testLikesRoute() {
  console.log('🧪 Test de la route des likes avec authentification\n');

  // Créer un token de test
  const testUser = { id: 1, email: 'test@example.com' };
  const token = jwt.sign(testUser, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
  
  console.log('📝 Token généré pour user ID:', testUser.id);
  console.log('🔑 Token:', token.substring(0, 20) + '...\n');

  try {
    // Test 1: Sans token
    console.log('1️⃣ Test sans token...');
    const res1 = await axios.get('http://172.20.10.12:3000/api/events/16/comments-likes');
    console.log('✅ Réponse sans token:', JSON.stringify(res1.data, null, 2).substring(0, 200));

    // Test 2: Avec token
    console.log('\n2️⃣ Test avec token...');
    const res2 = await axios.get('http://172.20.10.12:3000/api/events/16/comments-likes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Réponse avec token:', JSON.stringify(res2.data, null, 2).substring(0, 500));

    // Vérifier si isLikedByCurrentUser est présent
    const likes = res2.data.likes;
    const firstCommentId = Object.keys(likes)[0];
    if (firstCommentId) {
      console.log('\n📊 Premier commentaire:');
      console.log('   ID:', firstCommentId);
      console.log('   Count:', likes[firstCommentId].count);
      console.log('   isLikedByCurrentUser:', likes[firstCommentId].isLikedByCurrentUser);
    }

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', err.response.data);
    }
  }
}

testLikesRoute();
