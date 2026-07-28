const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function makeAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Please provide email as argument!');
    console.error('   Usage: node scripts/makeAdmin.js <email>');
    console.error('   Example: node scripts/makeAdmin.js user@gmail.com');
    process.exit(1);
  }
  
  try {
    console.log(`\n🔍 Looking for user: ${email}\n`);
    
    const user = await admin.auth().getUserByEmail(email);
    
    console.log('✅ User found!');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Display Name: ${user.displayName || 'N/A'}\n`);
    
    console.log('🔐 Setting admin claim...');
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: 'superadmin'
    });
    
    console.log('\n✅ SUCCESS! Admin claim set!');
    console.log('='.repeat(60));
    console.log(`   Email:    ${email}`);
    console.log(`   UID:      ${user.uid}`);
    console.log(`   Claims:   { admin: true, role: 'superadmin' }`);
    console.log('='.repeat(60));
    
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Go to your app');
    console.log('   2. LOGOUT from this account');
    console.log('   3. LOGIN again with same email');
    console.log('   4. Admin features will now work!\n');
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\n❌ User not found: ${email}`);
      console.error('\n💡 Solutions:');
      console.error('   1. Check spelling of email');
      console.error('   2. Run: node scripts/listUsers.js (to see all users)');
      console.error('   3. Register this email in your app first\n');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
  
  process.exit(0);
}

makeAdmin();