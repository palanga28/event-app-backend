/**
 * Script de test pour l'API de validation des tickets
 * Usage: node test-validation-api.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const ORGANIZER_TOKEN = 'YOUR_ORGANIZER_JWT_TOKEN'; // À remplacer
const TEST_QR_CODE = 'A1B2C3D4E5F6789012345678901234'; // À remplacer par un vrai code

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Client API
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ORGANIZER_TOKEN}`,
  },
});

// Tests
async function testHealthCheck() {
  log('\n📋 Test 1: Health Check', 'cyan');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    log('✅ Backend opérationnel', 'green');
    log(`   Status: ${response.data.status}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Backend non accessible', 'red');
    log(`   Erreur: ${error.message}`, 'red');
    return false;
  }
}

async function testCheckTicket(qrCode) {
  log('\n📋 Test 2: Vérifier un ticket (sans valider)', 'cyan');
  try {
    const response = await api.post('/api/validation/check', {
      qrCode: qrCode,
    });
    log('✅ Vérification réussie', 'green');
    log(`   Ticket valide: ${response.data.valid}`, 'blue');
    log(`   Statut: ${response.data.ticket.status}`, 'blue');
    log(`   Événement: ${response.data.ticket.event.title}`, 'blue');
    log(`   Propriétaire: ${response.data.ticket.owner.name}`, 'blue');
    return response.data;
  } catch (error) {
    log('❌ Erreur lors de la vérification', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Message: ${error.response.data.message}`, 'red');
    } else {
      log(`   Erreur: ${error.message}`, 'red');
    }
    return null;
  }
}

async function testValidateTicket(qrCode) {
  log('\n📋 Test 3: Valider un ticket', 'cyan');
  try {
    const response = await api.post('/api/validation/validate', {
      qrCode: qrCode,
    });
    log('✅ Validation réussie', 'green');
    log(`   Message: ${response.data.message}`, 'blue');
    log(`   Ticket ID: ${response.data.ticket.id}`, 'blue');
    log(`   Statut: ${response.data.ticket.status}`, 'blue');
    log(`   Validé à: ${response.data.ticket.validatedAt}`, 'blue');
    return response.data;
  } catch (error) {
    log('❌ Erreur lors de la validation', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Message: ${error.response.data.message}`, 'red');
    } else {
      log(`   Erreur: ${error.message}`, 'red');
    }
    return null;
  }
}

async function testValidateAlreadyUsed(qrCode) {
  log('\n📋 Test 4: Valider un ticket déjà utilisé', 'cyan');
  try {
    const response = await api.post('/api/validation/validate', {
      qrCode: qrCode,
    });
    log('⚠️  Le ticket a été validé (ne devrait pas arriver)', 'yellow');
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log('✅ Erreur attendue: ticket déjà utilisé', 'green');
      log(`   Message: ${error.response.data.message}`, 'blue');
    } else {
      log('❌ Erreur inattendue', 'red');
      log(`   Erreur: ${error.message}`, 'red');
    }
    return null;
  }
}

async function testValidationHistory(eventId) {
  log('\n📋 Test 5: Historique des validations', 'cyan');
  try {
    const response = await api.get(`/api/validation/history/${eventId}`);
    log('✅ Historique récupéré', 'green');
    log(`   Événement: ${response.data.event.title}`, 'blue');
    log(`   Tickets vendus: ${response.data.statistics.totalSold}`, 'blue');
    log(`   Tickets validés: ${response.data.statistics.totalValidated}`, 'blue');
    log(`   Taux de validation: ${response.data.statistics.validationRate}%`, 'blue');
    log(`   Nombre de validations: ${response.data.validations.length}`, 'blue');
    return response.data;
  } catch (error) {
    log('❌ Erreur lors de la récupération de l\'historique', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Message: ${error.response.data.message}`, 'red');
    } else {
      log(`   Erreur: ${error.message}`, 'red');
    }
    return null;
  }
}

async function testInvalidQRCode() {
  log('\n📋 Test 6: QR code invalide', 'cyan');
  try {
    const response = await api.post('/api/validation/validate', {
      qrCode: 'INVALID_CODE_123',
    });
    log('⚠️  Validation réussie (ne devrait pas arriver)', 'yellow');
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log('✅ Erreur attendue: format invalide', 'green');
      log(`   Message: ${error.response.data.message}`, 'blue');
    } else {
      log('❌ Erreur inattendue', 'red');
    }
    return null;
  }
}

async function testNonExistentTicket() {
  log('\n📋 Test 7: Ticket inexistant', 'cyan');
  try {
    const response = await api.post('/api/validation/validate', {
      qrCode: 'AAAABBBBCCCCDDDDEEEEFFFFGGGGHHH1', // Format valide mais n'existe pas
    });
    log('⚠️  Validation réussie (ne devrait pas arriver)', 'yellow');
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log('✅ Erreur attendue: ticket non trouvé', 'green');
      log(`   Message: ${error.response.data.message}`, 'blue');
    } else {
      log('❌ Erreur inattendue', 'red');
    }
    return null;
  }
}

// Fonction principale
async function runTests() {
  log('═══════════════════════════════════════════════', 'cyan');
  log('🧪 Tests de l\'API de Validation des Tickets', 'cyan');
  log('═══════════════════════════════════════════════', 'cyan');

  // Vérifier la configuration
  if (ORGANIZER_TOKEN === 'YOUR_ORGANIZER_JWT_TOKEN') {
    log('\n⚠️  ATTENTION: Remplace ORGANIZER_TOKEN dans le script', 'yellow');
    log('   1. Connecte-toi en tant qu\'organisateur', 'yellow');
    log('   2. Copie le JWT token', 'yellow');
    log('   3. Remplace ORGANIZER_TOKEN dans ce fichier', 'yellow');
    return;
  }

  if (TEST_QR_CODE === 'A1B2C3D4E5F6789012345678901234') {
    log('\n⚠️  ATTENTION: Remplace TEST_QR_CODE dans le script', 'yellow');
    log('   1. Achète un ticket', 'yellow');
    log('   2. Récupère le qr_code depuis la DB', 'yellow');
    log('   3. Remplace TEST_QR_CODE dans ce fichier', 'yellow');
    return;
  }

  // Exécuter les tests
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    log('\n❌ Backend non accessible, arrêt des tests', 'red');
    return;
  }

  await testCheckTicket(TEST_QR_CODE);
  await testValidateTicket(TEST_QR_CODE);
  await testValidateAlreadyUsed(TEST_QR_CODE);
  await testInvalidQRCode();
  await testNonExistentTicket();
  
  // Pour tester l'historique, remplace 1 par l'ID de ton événement
  // await testValidationHistory(1);

  log('\n═══════════════════════════════════════════════', 'cyan');
  log('✅ Tests terminés', 'green');
  log('═══════════════════════════════════════════════', 'cyan');
}

// Exécuter
runTests().catch(error => {
  log('\n❌ Erreur fatale:', 'red');
  console.error(error);
  process.exit(1);
});
