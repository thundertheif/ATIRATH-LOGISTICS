const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  
  if (!email || !newPassword) {
    console.error('❌ Usage: node scripts/resetPassword.js <email> <new-password>');
    process.exit(1);
  }
  
  try {
    console.log(`\n🔍 Finding user: ${email}\n`);
    
    const user = await admin.auth().getUserByEmail(email);
    
    console.log('✅ User found!');
    console.log(`   UID: ${user.uid}\n`);
    
    console.log('🔐 Resetting password...');
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });
    
    console.log('\n✅ SUCCESS! Password reset!');
    console.log('='.repeat(60));
    console.log(`   Email:       ${email}`);
    console.log(`   New Password: ${newPassword}`);
    console.log(`   UID:         ${user.uid}`);
    console.log('='.repeat(60));
    
    console.log('\n📝 Now you can login with:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${newPassword}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

resetPassword();