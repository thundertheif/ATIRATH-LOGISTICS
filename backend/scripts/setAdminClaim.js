// backend/scripts/setAdminClaim.js
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim() {
  const email = "your-admin-email@gmail.com"; // ← Your admin email
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true
    });
    
    console.log(`✅ Admin claim set for: ${email}`);
    console.log(`⚠️  IMPORTANT: Logout and login again!`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
  
  process.exit(0);
}

setAdminClaim();