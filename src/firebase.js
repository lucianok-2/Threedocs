require('dotenv').config();
const admin = require('firebase-admin');

// Log para verificar si FIREBASE_PROJECT_ID se carga desde .env
console.log(`Valor de FIREBASE_PROJECT_ID en firebase.js: ${process.env.FIREBASE_PROJECT_ID}`);

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();
module.exports = { admin, db }; // Asegúrate de que 'admin' se exporta aquí
