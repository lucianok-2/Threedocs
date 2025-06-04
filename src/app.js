const express = require('express');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
const { admin, db , storage} = require('./firebase');
const cookieParser = require('cookie-parser'); 
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();
const app = express();



// Configurar multer para almacenar archivos temporalmente
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  },
  fileFilter: function (req, file, cb) {
    // Permitir PDF, JPG, JPEG y otros formatos comunes
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, imágenes y documentos de Office.'));
    }
  }
});

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
const statsRoutes = require('./routes/stats.js');
app.use('/api/stats', statsRoutes);
// Middleware para verificar token
function verificarToken(req, res, next) {
  // Obtener token del header Authorization, query params o cookies
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || 
                req.query.token || 
                req.cookies.token;
  
  console.log('Token recibido:', token);
  console.log('Query params:', req.query);
  console.log('Cookies:', req.cookies);
  
  if (!token) {
      console.log('No se proporcionó token');
      return res.redirect('/');
  }
  
  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded;
      next();
  } catch (error) {
      console.error('Error al verificar token:', error);
      return res.redirect('/');
  }
}

// Firebase config público para frontend
app.get('/firebase-config.js', (req, res) => {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Nueva propiedad para Storage
  };
  res.type('application/javascript');
  res.send(`window.firebaseConfig = ${JSON.stringify(config)}`);
});


app.get('/', (req, res) => res.render('login', { layout: 'auth' }));
app.get('/register', (req, res) => res.render('register', { layout: 'auth' }));

// Rutas protegidas con layout principal (incluye sidebar)
app.get('/dashboard', verificarToken, (req, res) => res.render('dashboard', { usuario: req.usuario }));
app.get('/upload', verificarToken, (req, res) => {
    // Pasar el ID del predio a la vista si está presente en la URL
    const propertyId = req.query.propertyId || null;
    res.render('upload', { usuario: req.usuario, propertyId: propertyId });
});
app.get('/properties', verificarToken, (req, res) => res.render('properties', { usuario: req.usuario }));

// Ruta para la galería de documentos
app.get('/galery', verificarToken, (req, res) => res.render('galery', { usuario: req.usuario }));

// Ruta para cerrar sesión
app.get('/logout', (req, res) => { 
   res.clearCookie('token'); // borra la cookie token
   res.redirect('/');        // redirige al login o inicio
});

// Importar y usar las rutas de historial
const historialRoutes = require('./routes/historial.js');
app.use('/api/historial', historialRoutes);
module.exports = app;
