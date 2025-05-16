const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const jwt = require('jsonwebtoken');

// Middleware para verificar token
function verificarToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Obtener todos los predios
router.get('/', verificarToken, async (req, res) => {
  try {
    const prediosRef = db.collection('predios');
    const snapshot = await prediosRef.get();
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const predios = [];
    snapshot.forEach(doc => {
      predios.push({
        _id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(predios);
  } catch (error) {
    console.error('Error al obtener predios:', error);
    res.status(500).json({ error: 'Error al obtener predios' });
  }
});

// Obtener un predio específico
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const predioRef = db.collection('predios').doc(req.params.id);
    const doc = await predioRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    res.json({
      _id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Error al obtener predio:', error);
    res.status(500).json({ error: 'Error al obtener predio' });
  }
});

// Crear un nuevo predio
router.post('/', verificarToken, async (req, res) => {
  try {
    const predioData = {
      nombre: req.body.nombre,
      ubicacion: req.body.ubicacion,
      rol: req.body.rol || '',
      superficie: req.body.superficie || null,
      descripcion: req.body.descripcion || '',
      fechaCreacion: new Date()
    };
    
    const docRef = await db.collection('predios').add(predioData);
    
    res.status(201).json({
      _id: docRef.id,
      ...predioData
    });
  } catch (error) {
    console.error('Error al crear predio:', error);
    res.status(500).json({ error: 'Error al crear predio' });
  }
});

// Actualizar un predio existente
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const predioRef = db.collection('predios').doc(req.params.id);
    const doc = await predioRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = {
      nombre: req.body.nombre,
      ubicacion: req.body.ubicacion,
      rol: req.body.rol || '',
      superficie: req.body.superficie || null,
      descripcion: req.body.descripcion || '',
      fechaActualizacion: new Date()
    };
    
    await predioRef.update(predioData);
    
    res.json({
      _id: doc.id,
      ...predioData
    });
  } catch (error) {
    console.error('Error al actualizar predio:', error);
    res.status(500).json({ error: 'Error al actualizar predio' });
  }
});

// Eliminar un predio
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const predioRef = db.collection('predios').doc(req.params.id);
    const doc = await predioRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    await predioRef.delete();
    
    res.json({ _id: doc.id, deleted: true });
  } catch (error) {
    console.error('Error al eliminar predio:', error);
    res.status(500).json({ error: 'Error al eliminar predio' });
  }
});

module.exports = router;