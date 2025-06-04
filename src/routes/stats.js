const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify token
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

router.use(verificarToken);

// GET /api/stats - return counts of properties and documents for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.usuario.uid;
    const prediosSnap = await db.collection('predios').where('id_user', '==', userId).get();
    const documentosSnap = await db.collection('documentos').where('id_user', '==', userId).get();
    res.json({
      properties: prediosSnap.size,
      documents: documentosSnap.size
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;