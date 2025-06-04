const express = require('express');
const router = express.Router();
const { db } = require('../firebase'); // Adjust path if your firebase init is elsewhere
const jwt = require('jsonwebtoken');

// Middleware to verify token
// This should ideally be in a shared middleware file if used by many routes
function verificarToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    // For a page render, redirect to login is appropriate
    return res.status(401).redirect('/');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).redirect('/');
  }
}

// GET route for /dashboard
router.get('/dashboard', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.uid;

    // Fetch total predios
    const prediosSnapshot = await db.collection('predios').where('id_user', '==', userId).get();
    const totalPredios = prediosSnapshot.size;

    // Fetch total documentos
    const documentosSnapshot = await db.collection('documentos').where('id_user', '==', userId).get();
    const totalDocumentos = documentosSnapshot.size;

    // Fetch recent history (e.g., last 5 items)
    const historialSnapshot = await db.collection('historial')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(5) // Get the last 5 activities
      .get();

    const historialActividad = [];
    historialSnapshot.forEach(doc => {
      const data = doc.data();
      historialActividad.push({
        ...data,
        id: doc.id,
        // Convert Firestore Timestamp to JS Date for Handlebars
        timestamp: data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
      });
    });

    res.render('dashboard', {
      layout: 'main', // Specify your layout file name (without extension)
      usuario: req.usuario,
      totalPredios,
      totalDocumentos,
      historialActividad,
      pageTitle: 'Dashboard', // Example of other data you might pass
      activePage: { dashboard: true } // For highlighting active nav link
    });

  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
    // Render the dashboard with an error message
    res.status(500).render('dashboard', {
      layout: 'main',
      usuario: req.usuario, // Still pass user if available for layout
      error: 'Error al cargar datos del dashboard. Intente más tarde.',
      totalPredios: 0, // Default values
      totalDocumentos: 0,
      historialActividad: [],
      pageTitle: 'Dashboard',
      activePage: { dashboard: true }
    });
  }
});

module.exports = router;
