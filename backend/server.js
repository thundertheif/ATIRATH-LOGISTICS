// ==========================================
// ✅ FIRST LINE - MUST LOAD .env BEFORE ANYTHING!
// ==========================================
require('dotenv').config(); // ✅ THIS IS THE FIX!

// ==========================================
// 1. IMPORTS & SETUP
// ==========================================
const express = require("express");
const cors = require("cors");
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// ✅ DEBUG: Check if env loaded
console.log('\n🔍 Environment Check:');
console.log('  RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✅ Loaded' : '❌ Missing');
console.log('  RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('  PORT:', process.env.PORT || '5000 (default)');

// ❌ REMOVED: routes/payment.js & routes/invoice.js imports
// (Payment & invoice endpoints are now directly in this file)

// ==========================================
// 2. FIREBASE INITIALIZATION
// ==========================================
try {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  
  if (!fs.existsSync(keyPath)) {
    throw new Error(`File not found: ${keyPath}`);
  }
  
  const rawKey = fs.readFileSync(keyPath, 'utf8');
  const serviceAccount = JSON.parse(rawKey);
  
  if (!serviceAccount.project_id || !serviceAccount.private_key) {
    throw new Error('Invalid key format');
  }
  
  const hasApps = admin.apps && admin.apps.length > 0;
  
  if (!hasApps) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log("✅ Firebase Admin initialized successfully");
  } else {
    console.log("ℹ️ Firebase Admin already initialized");
  }
} catch (error) {
  console.error("⚠️ Firebase Init Failed:", error.message);
}

// ==========================================
// 3. EXPRESS APP SETUP
// ==========================================
const app = express();

// ✅ CORS - Allow frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ GET FIRESTORE INSTANCE
const db = getFirestore();

// ==========================================
// 4. RAZORPAY INITIALIZATION (WITH SAFETY CHECK)
// ==========================================
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log(`💳 Razorpay initialized: ${process.env.RAZORPAY_KEY_ID.substring(0, 15)}...`);
  } catch (error) {
    console.error("⚠️ Razorpay init failed:", error.message);
  }
} else {
  console.warn("⚠️ Razorpay keys missing in .env - Payment features disabled");
}

// ==========================================
// 5. ROOT ROUTE
// ==========================================
app.get("/", (req, res) => {
  res.json({ 
    message: "ATIRATH Logistics API is running", 
    status: "Online",
    razorpay: razorpay ? "✅ Ready" : "❌ Not configured"
  });
});

// ==========================================
// 6. PAYMENT ENDPOINTS (DIRECT - NO ROUTES FILE)
// ==========================================

// A. Create Razorpay Order
app.post('/payment/create-order', async (req, res) => {
  console.log('📥 Create order request:', req.body);
  
  if (!razorpay) {
    return res.status(500).json({ 
      success: false, 
      error: 'Razorpay not configured. Check .env file.' 
    });
  }
  
  try {
    const { amount, invoiceId, userId } = req.body;

    if (!amount || !invoiceId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: amount, invoiceId, userId' 
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount' 
      });
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise
      currency: 'INR',
      receipt: `invoice_${invoiceId}`,
      notes: {
        invoiceId,
        userId,
      },
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Order created:', order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create order' 
    });
  }
});

// B. Verify Payment
app.post('/payment/verify-payment', async (req, res) => {
  console.log('📥 Verify payment request');
  
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoiceId,
      userId,
      amount,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.error('❌ Signature mismatch');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }

    console.log('✅ Signature verified');

    // Update invoice
    await db.collection('invoices').doc(invoiceId).update({
      status: 'Paid',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAmount: amount,
      paymentMethod: 'Razorpay',
    });

    // Create payment record
    await db.collection('payments').add({
      invoiceId,
      userId,
      amount,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      method: 'Razorpay',
      status: 'Success',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Invoice ${invoiceId} marked as Paid`);

    // Generate invoice data
    let invoiceData = null;
    try {
      invoiceData = await generateInvoiceData(invoiceId);
    } catch (err) {
      console.warn('⚠️ Invoice data generation failed:', err.message);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: razorpay_payment_id,
      invoice: invoiceData,
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Payment verification failed' 
    });
  }
});

// ✅ Helper: Generate Invoice Data
async function generateInvoiceData(invoiceId) {
  const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
  const invoice = invoiceDoc.data();

  let shipment = null;
  if (invoice.shipmentId) {
    const shipmentDoc = await db.collection('shipments').doc(invoice.shipmentId).get();
    if (shipmentDoc.exists) {
      shipment = shipmentDoc.data();
    }
  }

  let user = null;
  if (invoice.userId) {
    const userDoc = await db.collection('users').doc(invoice.userId).get();
    if (userDoc.exists) {
      user = userDoc.data();
    }
  }

  return {
    invoiceId,
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toISOString(),
    customer: {
      name: user?.displayName || invoice.customer || 'Customer',
      email: user?.email || '',
      phone: user?.phone || '',
    },
    shipment: {
      trackingId: shipment?.trackingId || '',
      from: shipment?.pickupCity || '',
      to: shipment?.dropCity || '',
      weight: shipment?.weight || 0,
      serviceType: shipment?.serviceType || 'Standard',
    },
    amount: invoice.amount,
    paymentId: invoice.paymentId,
    status: 'Paid',
  };
}

// ==========================================
// 7. INVOICE ENDPOINTS (DIRECT)
// ==========================================

// A. Get All Invoices for User
app.get('/invoices/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const invoicesSnapshot = await db
      .collection('invoices')
      .where('userId', '==', userId)
      .get();

    const invoices = [];
    invoicesSnapshot.forEach((doc) => {
      invoices.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// B. Get Single Invoice
app.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();

    if (!invoiceDoc.exists) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() };

    let shipment = null;
    if (invoice.shipmentId) {
      const shipmentDoc = await db.collection('shipments').doc(invoice.shipmentId).get();
      if (shipmentDoc.exists) {
        shipment = { id: shipmentDoc.id, ...shipmentDoc.data() };
      }
    }

    res.json({ success: true, invoice, shipment });
  } catch (error) {
    console.error('Fetch invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 8. CUSTOMER ENDPOINTS
// ==========================================

// A. Book a Shipment
app.post("/book", async (req, res) => {
  try {
    const { idToken, shipmentData } = req.body;
    
    if (!idToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const newBooking = {
      ...shipmentData,
      userId: userId,
      userEmail: decodedToken.email,
      status: "Booked",
      issueResolved: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('shipments').add(newBooking);
    
    // Auto-create invoice
    const invoiceData = {
      userId: userId,
      shipmentId: docRef.id,
      customer: shipmentData.senderName || 'Customer',
      route: `${shipmentData.pickupCity} → ${shipmentData.dropCity}`,
      amount: shipmentData.amount || calculateShippingCost(shipmentData.weight, shipmentData.serviceType),
      status: "Unpaid",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('invoices').add(invoiceData);
    console.log(`✅ Invoice created for shipment ${docRef.id}`);
    
    res.status(201).json({ 
      success: true, 
      bookingId: docRef.id,
      trackingId: shipmentData.trackingId 
    });

  } catch (error) {
    console.error("Booking Error:", error);
    res.status(500).json({ error: "Failed to book shipment" });
  }
});

function calculateShippingCost(weight, serviceType) {
  const baseRate = 100;
  const perKgRate = serviceType === 'Express' ? 150 : 80;
  return baseRate + (weight * perKgRate);
}

// B. Get User's Bookings
app.get("/bookings", async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const snapshot = await db.collection('shipments')
      .where('userId', '==', userId)
      .get();

    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(bookings);
  } catch (error) {
    console.error("Fetch Bookings Error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// C. Track Shipment
app.get("/track/:id", async (req, res) => {
  try {
    const doc = await db.collection('shipments').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    const data = doc.data();
    
    res.json({
      id: doc.id,
      trackingId: data.trackingId,
      status: data.status,
      from: data.pickupCity,
      to: data.dropCity,
      estimatedDelivery: data.dropDate
    });
  } catch (error) {
    res.status(500).json({ error: "Tracking failed" });
  }
});

// D. Resolve Issue
app.post("/resolve-issue", async (req, res) => {
  try {
    const { bookingId, solution, adminId } = req.body;
    
    await db.collection('shipments').doc(bookingId).update({
      issueResolved: true,
      solution: solution,
      resolvedBy: adminId,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('adminLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminEmail: adminId,
      action: "RESOLVE_ISSUE",
      details: `Issue resolved for shipment #${bookingId}`
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Resolution failed" });
  }
});

// ==========================================
// 9. ADMIN ENDPOINTS
// ==========================================

// A. Verify Admin - ✅ FIXED: Check BOTH custom claims AND Firestore
app.post('/verify-admin', async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ error: "No token provided" });
  }
  
  try {
    // ✅ Step 1: Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    
    console.log(`\n🔍 Verifying admin: ${email}`);
    console.log(`   UID: ${uid}`);
    
    // ✅ Step 2: Check Firebase Auth custom claims (from makeAdmin.js)
    const hasAdminClaim = decodedToken.admin === true;
    console.log(`   Custom Claim (admin): ${hasAdminClaim}`);
    
    // ✅ Step 3: Check Firestore users collection (fallback)
    let firestoreRole = null;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        firestoreRole = userDoc.data().role;
        console.log(`   Firestore Role: ${firestoreRole}`);
      }
    } catch (err) {
      console.log(`   Firestore check failed: ${err.message}`);
    }
    
    // ✅ Step 4: Admin if EITHER custom claim OR Firestore role is 'admin'
    const isAdmin = hasAdminClaim || firestoreRole === 'admin';
    
    if (!isAdmin) {
      console.log(`   ❌ Not an admin`);
      return res.status(403).json({ 
        success: false,
        error: "Not an admin",
        role: 'customer'
      });
    }
    
    console.log(`   ✅ Admin verified!`);
    
    // ✅ Step 5: Return admin data
    res.json({ 
      success: true,
      uid: uid, 
      email: email, 
      role: 'admin',
      name: decodedToken.name || "Admin User"
    });

  } catch (error) {
    console.error("❌ Verification Error:", error.message);
    res.status(500).json({ 
      success: false,
      error: "Invalid token or server error",
      role: 'customer'
    });
  }
});

// B. Update Shipment Status
app.put("/update/:id", async (req, res) => {
  try {
    await db.collection('shipments').doc(req.params.id).update({
      status: req.body.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('adminLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminEmail: "admin@atirath.com",
      action: "UPDATE_STATUS",
      details: `Shipment #${req.params.id} → ${req.body.status}`
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

// C. Get Stats
app.get("/admin/stats", async (req, res) => {
  try {
    const shipmentsSnap = await db.collection('shipments').get();
    const usersSnap = await db.collection('users').get();
    const invoicesSnap = await db.collection('invoices').get();
    
    const shipments = shipmentsSnap.docs.map(d => d.data());
    const users = usersSnap.docs.map(d => d.data());
    const invoices = invoicesSnap.docs.map(d => d.data());

    const totalRevenue = invoices
      .filter(i => i.status === "Paid")
      .reduce((sum, i) => sum + (Number(i.paidAmount || i.amount) || 0), 0);
    
    res.json({
      totalRevenue,
      activeClients: users.filter(u => u.status === 'active').length,
      pendingIssues: shipments.filter(b => !b.issueResolved).length,
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(i => i.status === "Paid").length,
      serverStatus: "Online",
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Stats fetch failed" });
  }
});

// D. Get Admin Logs
app.get("/admin/logs", async (req, res) => {
  try {
    const snapshot = await db.collection('adminLogs')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
      
    res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (error) {
    res.json([]);
  }
});

// E. Toggle Maintenance
app.put("/admin/maintenance", async (req, res) => {
  try {
    await db.collection('systemSettings').doc('config').set({
      maintenanceMode: req.body.enabled
    }, { merge: true });
    
    res.json({ success: true, enabled: req.body.enabled });
  } catch (error) {
    res.status(500).json({ error: "Toggle failed" });
  }
});

// F. Get Users
app.get("/users", async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (error) {
    res.json([]);
  }
});

// G. Grant Access
app.put("/grant-access/:userId", async (req, res) => {
  try {
    await db.collection('users').doc(req.params.userId).update({
      canViewEndUsers: true
    });
    
    await db.collection('adminLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminEmail: "admin@atirath.com",
      action: "GRANT_ACCESS",
      details: `Access granted to user ${req.params.userId}`
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Grant access failed" });
  }
});

// H. Toggle User Status
app.put("/users/:userId/status", async (req, res) => {
  try {
    await db.collection('users').doc(req.params.userId).update({
      status: req.body.status
    });
    
    await db.collection('adminLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminEmail: "admin@atirath.com",
      action: "TOGGLE_USER_STATUS",
      details: `User ${req.params.userId} status changed to ${req.body.status}`
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Status update failed" });
  }
});

// ==========================================
// 10. SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`💾 Connected to Firestore Database`);
  console.log(`💳 Razorpay: ${razorpay ? '✅ Ready' : '❌ Not configured'}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /`);
  console.log(`   POST /payment/create-order`);
  console.log(`   POST /payment/verify-payment`);
  console.log(`   POST /book`);
  console.log(`   GET  /bookings?userId=xxx`);
  console.log(`   GET  /track/:id`);
  console.log(`   POST /verify-admin`);
  console.log(`   GET  /invoices/user/:userId`);
  console.log(`   GET  /invoices/:invoiceId\n`);
});