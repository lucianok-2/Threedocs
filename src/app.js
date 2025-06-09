const express = require('express');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
const { admin, db , storage} = require('./firebase');
const cookieParser = require('cookie-parser'); 
const multer = require('multer');

const cors = require('cors');
require('dotenv').config();
const app = express();


// Handlebars (debe ir antes de usar res.render)
app.engine('handlebars', engine({
  // Definir layouts diferentes según la ruta
  defaultLayout: 'main',
  helpers: {
    // Helper para determinar qué layout usar
    section: function(name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser()); // Agregar esta línea
app.use(express.static(path.join(__dirname, 'public')));

// Rutas importadas
const authRoutes = require('./routes/auth.js');
app.use('/auth', authRoutes);

// Importar y usar las rutas de predios
const propertiesRoutes = require('./routes/properties.js');
app.use('/api/predios', propertiesRoutes);

// Importar y usar las rutas de documentos
const documentsRoutes = require('./routes/documents.js');
app.use('/api/documentos', documentsRoutes);

// Importar y usar las rutas de admin
const adminRoutes = require('./routes/admin.js');
console.log('Attempting to mount /api/admin routes from admin.js');
app.use('/api/admin', adminRoutes);
// Importar y usar las rutas de estadísticas

// Middleware para verificar token
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

// Firebase config público para frontend
const firebaseConfig = {
  apiKey: "AIzaSyDmpM57gngAuzXPKfyrtXeZ4izhqCDIzMA",
  authDomain: "threedocs-4b9cc.firebaseapp.com",
  databaseURL: "https://threedocs-4b9cc-default-rtdb.firebaseio.com",
  projectId: "threedocs-4b9cc",
  storageBucket: "gs://threedocs-4b9cc.firebasestorage.app",
  messagingSenderId: "307923650702",
  appId: "1:307923650702:web:488b36ec583152711ae1df"
};

app.use('/firebase-config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.firebaseConfig = ${JSON.stringify(firebaseConfig)}`);
});
const geminiConfig = { apiKey: process.env.GEMINI_API_KEY || '' };
app.use('/gemini-config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.geminiConfig = ${JSON.stringify(geminiConfig)}`);
});
// Rutas de autenticación con layout de autenticación

app.get('/', (req, res) => res.render('login', { layout: 'auth' }));
app.get('/register', (req, res) => res.render('register', { layout: 'auth' }));

// Rutas protegidas con layout principal (incluye sidebar)
app.get('/dashboard', verificarToken, (req, res) => res.render('dashboard', { usuario: req.usuario }));
app.get('/upload', verificarToken, (req, res) => {
    // Pasar el ID del predio a la vista si está presente en la URL
    const propertyId = req.query.propertyId || null;
    res.render('upload', { usuario: req.usuario, propertyId: propertyId, firebaseConfig: firebaseConfig });
});
app.get('/properties', verificarToken, (req, res) => res.render('properties', { usuario: req.usuario }));

// Ruta para la galería de documentos
app.get('/galery', verificarToken, (req, res) => res.render('galery', { usuario: req.usuario }));

// Ruta para cerrar sesión
app.get('/logout', (req, res) => { 
   res.clearCookie('token'); // borra la cookie token
   res.redirect('/');        // redirige al login o inicio
});



module.exports = app;
