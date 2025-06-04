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

// Obtener todos los predios del usuario actual
router.get('/', verificarToken, async (req, res) => {
  try {
    const prediosRef = db.collection('predios');
    // Filtrar por id_user igual al uid del usuario autenticado
    const snapshot = await prediosRef.where('id_user', '==', req.usuario.uid).get();
    
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

// Obtener un predio específico (verificando que pertenezca al usuario)
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const predioRef = db.collection('predios').doc(req.params.id);
    const doc = await predioRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = doc.data();
    
    // Verificar que el predio pertenezca al usuario actual
    if (predioData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este predio' });
    }
    
    res.json({
      _id: doc.id,
      ...predioData
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
      ubicacion: req.body.ubicacion || '',
      rol: req.body.rol || '',
      superficie: req.body.superficie || null,
      descripcion: req.body.descripcion || '',
      idPredio: req.body.idPredio, // Añadir el campo idPredio
      fechaCreacion: new Date(),
      // Guardar automáticamente el ID del usuario
      id_user: req.usuario.uid
    };
    
    // Añadir información de certificaciones si existe
    if (req.body.certificaciones && Array.isArray(req.body.certificaciones)) {
      predioData.certificaciones = req.body.certificaciones;
    }
    
    // Añadir información del propietario si existe
    if (req.body.propietario) {
      predioData.propietario = {
        nombre: req.body.propietario.nombre || '',
        rut: req.body.propietario.rut || ''
      };
    }
    
    // Añadir modelo de compra si existe
    if (req.body.modeloCompra) {
      predioData.modeloCompra = req.body.modeloCompra;
    }
    
    // Añadir información de rutPropietario y nombrePropietario si existen
    if (req.body.rutPropietario) {
      predioData.rutPropietario = req.body.rutPropietario;
    }
    
    if (req.body.nombrePropietario) {
      predioData.nombrePropietario = req.body.nombrePropietario;
    }
    
    // Añadir información de intermediario si existe
    if (req.body.intermediario) {
      predioData.intermediario = req.body.intermediario;
    }
    const docRef = await db.collection('predios').add(predioData);
    
    // Registrar historial de creación
    await db.collection('historial').add({
      timestamp: new Date(),
      userId: req.usuario.uid,
      action: 'create',
      type: 'predio',
      itemId: docRef.id,
      itemName: predioData.nombre,
      details: {
        message: `Predio "${predioData.nombre}" creado.`
      }
    });

    res.status(201).json({
      _id: docRef.id,
      ...predioData
    });
  } catch (error) {
    console.error('Error al crear predio:', error);
    res.status(500).json({ error: 'Error al crear predio' });
  }
});

// Actualizar un predio existente (verificando que pertenezca al usuario)
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const predioRef = db.collection('predios').doc(req.params.id);
    const doc = await predioRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioActual = doc.data();
    
    // Verificar que el predio pertenezca al usuario actual
    if (predioActual.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este predio' });
    }
    
    const predioData = {
      nombre: req.body.nombre || predioActual.nombre,
      ubicacion: req.body.ubicacion || predioActual.ubicacion || '',
      rol: req.body.rol || predioActual.rol || '',
      superficie: req.body.superficie || predioActual.superficie || null,
      descripcion: req.body.descripcion || predioActual.descripcion || '',
      idPredio: predioActual.idPredio, // Mantener el idPredio existente
      fechaActualizacion: new Date(),
      // Mantener el id_user original
      id_user: req.usuario.uid,
      // Actualizar rutPropietario y nombrePropietario
      rutPropietario: req.body.rutPropietario || predioActual.rutPropietario || '',
      nombrePropietario: req.body.nombrePropietario || predioActual.nombrePropietario || '',
      // Actualizar modeloCompra
      modeloCompra: req.body.modeloCompra || predioActual.modeloCompra || 'Propietario'
    };
    
    // Actualizar información de certificaciones si existe
    if (req.body.certificaciones && Array.isArray(req.body.certificaciones)) {
      predioData.certificaciones = req.body.certificaciones;
    }
    
    // Actualizar información del intermediario si existe
    if (req.body.intermediario) {
      predioData.intermediario = req.body.intermediario;
    } else if (predioData.modeloCompra !== 'Intermediario') {
      // Si el modelo ya no es intermediario, eliminar la información de intermediario
      predioData.intermediario = null;
    }
    
    await predioRef.update(predioData);
    
    // Registrar historial de actualización
    await db.collection('historial').add({
      timestamp: new Date(),
      userId: req.usuario.uid,
      action: 'update',
      type: 'predio',
      itemId: doc.id,
      itemName: predioData.nombre,
      details: {
        message: `Predio "${predioData.nombre}" actualizado.`
      }
    });

    res.json({
      _id: doc.id,
      ...predioData
    });
  } catch (error) {
    console.error('Error al actualizar predio:', error);
    res.status(500).json({ error: 'Error al actualizar predio' });
  }
});

// Eliminar un predio (verificando que pertenezca al usuario)
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const predioRef = db.collection('predios').doc(req.params.id);
    const doc = await predioRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = doc.data();
    
    // Verificar que el predio pertenezca al usuario actual
    if (predioData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este predio' });
    }
    
    const nombrePredioEliminado = predioData.nombre; // Store the name before deleting

    await predioRef.delete();
    
    // Registrar historial de eliminación
    await db.collection('historial').add({
      timestamp: new Date(),
      userId: req.usuario.uid,
      action: 'delete',
      type: 'predio',
      itemId: doc.id,
      itemName: nombrePredioEliminado,
      details: {
        message: `Predio "${nombrePredioEliminado}" eliminado.`
      }
    });

    res.json({ _id: doc.id, deleted: true });
  } catch (error) {
    console.error('Error al eliminar predio:', error);
    res.status(500).json({ error: 'Error al eliminar predio' });
  }
});

// Ruta para obtener los documentos de un predio
router.get('/:id/documentos', verificarToken, async (req, res) => {
  try {
    // Primero verificar que el predio pertenezca al usuario
    const predioRef = db.collection('predios').doc(req.params.id);
    const predioDoc = await predioRef.get();
    
    if (!predioDoc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = predioDoc.data();
    
    if (predioData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este predio' });
    }
    
    // Obtener los documentos asociados al predio
    const documentosRef = db.collection('documentos');
    const snapshot = await documentosRef.where('id_predio', '==', req.params.id).get();
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const documentos = [];
    snapshot.forEach(doc => {
      documentos.push({
        _id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos del predio:', error);
    res.status(500).json({ error: 'Error al obtener documentos del predio' });
  }
});

module.exports = router;