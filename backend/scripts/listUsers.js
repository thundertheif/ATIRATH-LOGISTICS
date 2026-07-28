const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function listUsers() {
  try {
    console.log('📋 Fetching all users from Firebase Auth...\n');
    
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;
    
    if (users.length === 0) {
      console.log('❌ No users found in Firebase Auth!');
      console.log('👉 Please register a user first in your app.');
      return;
    }
    
    console.log(`✅ Found ${users.length} user(s):\n`);
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n[${index + 1}] User Details:`);
      console.log(`    Email:        ${user.email}`);
      console.log(`    UID:          ${user.uid}`);
      console.log(`    Display Name: ${user.displayName || 'N/A'}`);
      console.log(`    Created:      ${user.metadata.creationTime}`);
      console.log(`    Admin Claim:  ${user.customClaims?.admin ? '✅ YES' : '❌ NO'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 To make a user admin, run:');
    console.log('   node scripts/makeAdmin.js <email>');
    console.log('\n   Example:');
    console.log('   node scripts/makeAdmin.js user@example.com\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

listUsers();