const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const jwt = require('jsonwebtoken');
const { addHistoryEntry } = require('../models/historial.js');

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
    const { nombre, ubicacion, rol, superficie, descripcion, idPredio, certificaciones, propietario, modeloCompra, rutPropietario, nombrePropietario, intermediario } = req.body;
    const { uid } = req.usuario;

    // Verificar si ya existe un predio con el mismo id_user e idPredio
    const existingPredioQuery = await db.collection('predios')
                                      .where('id_user', '==', uid)
                                      .where('idPredio', '==', idPredio)
                                      .get();

    if (!existingPredioQuery.empty) {
      return res.status(409).json({ 
        error: 'Ya existe un predio con este ID', 
        idPredio: idPredio 
      });
    }

    const predioData = {
      nombre: nombre,
      ubicacion: ubicacion || '',
      rol: rol || '',
      superficie: superficie || null,
      descripcion: descripcion || '',
      idPredio: idPredio, 
      fechaCreacion: new Date(),
      id_user: uid
    };
    
    if (certificaciones && Array.isArray(certificaciones)) {
      predioData.certificaciones = certificaciones;
    }
    
    if (propietario) {
      predioData.propietario = {
        nombre: propietario.nombre || '',
        rut: propietario.rut || ''
      };
    }
    
    if (modeloCompra) {
      predioData.modeloCompra = modeloCompra;
    }
    
    if (rutPropietario) {
      predioData.rutPropietario = rutPropietario;
    }
    
    if (nombrePropietario) {
      predioData.nombrePropietario = nombrePropietario;
    }
    
    if (intermediario) {
      predioData.intermediario = intermediario;
    }

    const docRef = await db.collection('predios').add(predioData);

    try {
      await addHistoryEntry({
        userId: uid,
        actionType: 'CREATE_PROPERTY',
        entityType: 'property',
        entityId: docRef.id,
        details: { 
          propertyName: predioData.nombre, 
          idPredio: predioData.idPredio 
        }
      });
    } catch (historyError) {
      console.error('Error adding history entry for create property:', historyError);
    }
    
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
    
    if (predioActual.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este predio' });
    }
    
    const predioData = {
      nombre: req.body.nombre || predioActual.nombre,
      ubicacion: req.body.ubicacion || predioActual.ubicacion || '',
      rol: req.body.rol || predioActual.rol || '',
      superficie: req.body.superficie || predioActual.superficie || null,
      descripcion: req.body.descripcion || predioActual.descripcion || '',
      idPredio: predioActual.idPredio, 
      fechaActualizacion: new Date(),
      id_user: req.usuario.uid,
      rutPropietario: req.body.rutPropietario || predioActual.rutPropietario || '',
      nombrePropietario: req.body.nombrePropietario || predioActual.nombrePropietario || '',
      modeloCompra: req.body.modeloCompra || predioActual.modeloCompra || 'Propietario'
    };
    
    if (req.body.certificaciones && Array.isArray(req.body.certificaciones)) {
      predioData.certificaciones = req.body.certificaciones;
    }
    
    if (req.body.intermediario) {
      predioData.intermediario = req.body.intermediario;
    } else if (predioData.modeloCompra !== 'Intermediario') {
      predioData.intermediario = null;
    }
    
    await predioRef.update(predioData);

    try {
      await addHistoryEntry({
        userId: req.usuario.uid,
        actionType: 'UPDATE_PROPERTY',
        entityType: 'property',
        entityId: doc.id, 
        details: { 
          propertyName: predioData.nombre, 
          idPredio: predioData.idPredio, 
          updatedFields: Object.keys(req.body) 
        }
      });
    } catch (historyError) {
      console.error('Error adding history entry for update property:', historyError);
    }
    
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
    
    if (predioData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este predio' });
    }

    try {
      await addHistoryEntry({
        userId: req.usuario.uid,
        actionType: 'DELETE_PROPERTY',
        entityType: 'property',
        entityId: doc.id, 
        details: { 
          propertyName: predioData.nombre, 
          idPredio: predioData.idPredio 
        }
      });
    } catch (historyError) {
      console.error('Error adding history entry for delete property:', historyError);
    }
    
    await predioRef.delete();
    
    res.json({ _id: doc.id, deleted: true });
  } catch (error) {
    console.error('Error al eliminar predio:', error);
    res.status(500).json({ error: 'Error al eliminar predio' });
  }
});

// Ruta para obtener los documentos de un predio
router.get('/:id/documentos', verificarToken, async (req, res) => {
  try {
    const predioRef = db.collection('predios').doc(req.params.id);
    const predioDoc = await predioRef.get();
    
    if (!predioDoc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = predioDoc.data();
    
    if (predioData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este predio' });
    }
    
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