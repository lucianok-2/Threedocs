// src/routes/properties.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebase');
// const { addHistoryEntry } = require('../services/history'); // Descomenta si usas historial

// Middleware para verificar el Firebase ID Token
async function verificarToken(req, res, next) {
  // 1) Extrae el token de Authorization, cookie o query
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.cookies.token || req.query.token;

  if (!token) {
    console.log('No se proporcionó token');
    return res.redirect('/');
  }

  try {
    // 2) Verifica el ID Token con Firebase Admin SDK
    const decoded = await admin.auth().verifyIdToken(token);
    req.usuario = decoded;    // contiene uid, email, customClaims, etc.
    return next();
  } catch (err) {
    console.error('Error al verificar token con Firebase:', err);
    return res.redirect('/');
  }
}

// GET /api/predios — Listar todos los predios del usuario
router.get('/', verificarToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('predios')
      .where('id_user', '==', req.usuario.uid)
      .get();

    const predios = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    res.json(predios);
  } catch (error) {
    console.error('Error al obtener predios:', error);
    res.status(500).json({ error: 'Error al obtener predios' });
  }
});

// GET /api/predios/:id — Obtener un predio específico
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const docRef = db.collection('predios').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    const data = docSnap.data();
    if (data.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'Sin permiso para acceder a este predio' });
    }
    res.json({ _id: docSnap.id, ...data });
  } catch (error) {
    console.error('Error al obtener predio:', error);
    res.status(500).json({ error: 'Error al obtener predio' });
  }
});

// POST /api/predios — Crear un nuevo predio
router.post('/', verificarToken, async (req, res) => {
  try {
    const {
      idPredio = '',
      nombre = '',
      rol = '',
      superficie = null,
      descripcion = '',
      ubicacion = '',
      modeloCompra,
      rutPropietario,
      nombrePropietario,
      intermediario,
      certificaciones = [],
      propietario
    } = req.body;

    if (!idPredio || !nombre) {
      return res.status(400).json({ error: 'idPredio y nombre son obligatorios' });
    }

    const predioData = {
      idPredio,
      nombre,
      rol,
      superficie,
      descripcion,
      ubicacion,
      modeloCompra: modeloCompra || null,
      rutPropietario: rutPropietario || null,
      nombrePropietario: nombrePropietario || null,
      intermediario: intermediario || null,
      certificaciones,
      propietario: propietario || null,
      fechaCreacion: new Date(),
      id_user: req.usuario.uid
    };

    const docRef = await db.collection('predios').add(predioData);

    // Historial (opcional)
/*
    await addHistoryEntry({
      userId: req.usuario.uid,
      actionType: 'CREATE_PROPERTY',
      entityType: 'property',
      entityId: docRef.id,
      details: { propertyName: nombre, idPredio }
    });
*/

    res.status(201).json({ _id: docRef.id, ...predioData });
  } catch (error) {
    console.error('Error al crear predio:', error);
    res.status(500).json({ error: 'Error al crear predio' });
  }
});

// PUT /api/predios/:id — Actualizar un predio existente
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const docRef = db.collection('predios').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    const current = docSnap.data();
    if (current.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'Sin permiso para modificar este predio' });
    }

    const updates = { fechaActualizacion: new Date() };
    // Sólo actualiza los campos presentes en el body
    ['idPredio','nombre','rol','superficie','descripcion','ubicacion','modeloCompra','rutPropietario','nombrePropietario','intermediario','certificaciones','propietario']
      .forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

    await docRef.update(updates);

    // Historial (opcional)
/*
    await addHistoryEntry({
      userId: req.usuario.uid,
      actionType: 'UPDATE_PROPERTY',
      entityType: 'property',
      entityId: req.params.id,
      details: { updatedFields: Object.keys(updates) }
    });
*/

    res.json({ _id: req.params.id, ...current, ...updates });
  } catch (error) {
    console.error('Error al actualizar predio:', error);
    res.status(500).json({ error: 'Error al actualizar predio' });
  }
});

// DELETE /api/predios/:id — Eliminar un predio
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const docRef = db.collection('predios').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    const data = docSnap.data();
    if (data.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'Sin permiso para eliminar este predio' });
    }

    await docRef.delete();

    // Historial (opcional)
/*
    await addHistoryEntry({
      userId: req.usuario.uid,
      actionType: 'DELETE_PROPERTY',
      entityType: 'property',
      entityId: req.params.id
    });
*/

    res.json({ _id: req.params.id, deleted: true });
  } catch (error) {
    console.error('Error al eliminar predio:', error);
    res.status(500).json({ error: 'Error al eliminar predio' });
  }
});

// GET /api/predios/:id/documentos — Obtener documentos de un predio
router.get('/:id/documentos', verificarToken, async (req, res) => {
  try {
    const predioSnap = await db.collection('predios').doc(req.params.id).get();
    if (!predioSnap.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    const predio = predioSnap.data();
    if (predio.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'Sin permiso para acceder a documentos' });
    }

    const docsSnap = await db
      .collection('documentos')
      .where('id_predio', '==', req.params.id)
      .get();

    const documentos = docsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    res.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos del predio:', error);
    res.status(500).json({ error: 'Error al obtener documentos del predio' });
  }
});

module.exports = router;
