const express = require('express');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
const { admin, db } = require('./firebase');

const app = express();

// Handlebars (debe ir antes de usar res.render)
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas importadas
const authRoutes = require('./routes/auth.js');
app.use('/auth', authRoutes);

// Middleware de token
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Firebase config público para frontend
app.get('/firebase-config.js', (req, res) => {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID
  };
  res.type('application/javascript');
  res.send(`window.firebaseConfig = ${JSON.stringify(config)}`);
});


app.get('/', (req, res) => res.render('login'));

// Agregar esta nueva ruta para el registro
app.get('/register', (req, res) => res.render('register'));

// Rutas protegidas
app.get('/dashboard', verificarToken, (req, res) => res.render('dashboard', { usuario: req.usuario }));
app.get('/upload', verificarToken, (req, res) => res.render('upload', { usuario: req.usuario }));
app.get('/properties', verificarToken, (req, res) => res.render('properties', { usuario: req.usuario }));

module.exports = app;
