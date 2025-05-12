const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebase'); // Asegúrate que 'admin' se exporta desde firebase.js
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  console.log("Recibido desde el frontend:", { email, password });

  try {
    // Log para verificar el Project ID con el que Firebase Admin SDK está inicializado
    if (admin.apps.length > 0) { // Verificar que la app por defecto está inicializada
      console.log(`Firebase Admin SDK Project ID: ${admin.app().options.projectId}`);
    } else {
      console.log("Firebase Admin SDK no parece estar inicializado.");
    }

    // Primero, obtener todos los usuarios para debug
    const todosLosUsuarios = await db.collection('usuarios').get();
    console.log("🔍 Todos los usuarios en la colección:");
    console.log(`📄 Número de documentos encontrados en 'usuarios': ${todosLosUsuarios.size}`);
    todosLosUsuarios.forEach(doc => {
      console.log(`ID: ${doc.id}, Datos:`, doc.data());
    });

    const usuariosRef = db.collection('usuarios');
    const querySnapshot = await usuariosRef
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.log("⚠️ Usuario no encontrado con email:", email);
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    console.log("📄 Usuario Firestore:", userData);

    if (!userData.activo) {
      return res.status(403).json({ message: 'Usuario desactivado' });
    }

    if (userData.password !== password) {
      console.log("❌ Contraseña incorrecta para usuario:", email);
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({
      uid: userDoc.id,
      email: userData.email,
      rol: userData.rol
    }, process.env.JWT_SECRET, { expiresIn: '2h' });

    console.log("✅ Login exitoso para usuario:", email);
    res.json({ token });

  } catch (err) {
    console.error("❌ Error en autenticación:", err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;