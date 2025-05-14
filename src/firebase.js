require('dotenv').config();
const admin = require('firebase-admin');

// Verificar si la variable de entorno existe
if (!process.env.FIREBASE_ADMIN_KEY) {
  console.error('Error: La variable de entorno FIREBASE_ADMIN_KEY no está definida');
  process.exit(1); // Detener la aplicación si falta la configuración crítica
}

try {
  // Parsear el JSON de la variable de entorno
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  
  // Log para verificar que se ha cargado correctamente
  console.log(`Firebase Admin SDK inicializando con Project ID: ${serviceAccount.project_id}`);
  
  // Inicializar Firebase Admin con el objeto de credenciales
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  const db = admin.firestore();
  console.log('✅ Firebase Admin SDK inicializado correctamente');
  
  module.exports = { admin, db };
} catch (error) {
  console.error('Error al inicializar Firebase Admin SDK:', error);
  process.exit(1); // Detener la aplicación si hay un error en la inicialización
}
