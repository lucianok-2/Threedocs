const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebase');
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  console.log("Recibido desde el frontend:", { email, password });

  try {
    // Primero, obtener todos los usuarios para debug
    const todosLosUsuarios = await db.collection('usuarios').get();
    console.log("🔍 Todos los usuarios en la colección:");
    console.log(`📄 Número de documentos encontrados en 'usuarios': ${todosLosUsuarios.size}`);
    
    // Imprimir cada documento con más detalle
    todosLosUsuarios.forEach(doc => {
      const userData = doc.data();
      console.log(`ID: ${doc.id}, Email: "${userData.email}", Password: "${userData.password}"`);
      console.log(`Comparación: "${email.toLowerCase()}" === "${userData.email}" => ${email.toLowerCase() === userData.email}`);
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

// Agregar esta nueva ruta para el registro
router.post('/register', async (req, res) => {
  const { email, password, role, active } = req.body;
  
  try {
    // Verificar si el usuario ya existe
    const usuariosRef = db.collection('usuarios');
    const snapshot = await usuariosRef.where('email', '==', email.toLowerCase()).get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }
    
    // Crear nuevo usuario
    const nuevoUsuario = {
      email: email.toLowerCase(),
      password, // Considera usar hash para la contraseña en producción
      rol: role,
      activo: active,
      fechaRegistro: new Date().toISOString()
    };
    
    const docRef = await usuariosRef.add(nuevoUsuario);
    
    console.log(`✅ Usuario registrado correctamente: ${email}, ID: ${docRef.id}`);
    res.status(201).json({ 
      message: 'Usuario registrado correctamente',
      uid: docRef.id 
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;