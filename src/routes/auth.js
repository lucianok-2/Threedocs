const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebase');
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuariosRef = db.collection('usuarios');
    const querySnapshot = await usuariosRef
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (!userData.activo) {
      return res.status(403).json({ message: 'Usuario desactivado' });
    }

    if (userData.password !== password) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({
      uid: userDoc.id,
      email: userData.email,
      rol: userData.rol
    }, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.json({ token });

  } catch (err) {
    console.error("Error en autenticación:", err);
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