const app = require('./app');
require('dotenv').config();

// Usar un puerto diferente o tomarlo de variables de entorno
const PORT = process.env.PORT || 3001;

// Configurar rutas antes de iniciar el servidor
// Importar rutas
const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const documentsRoutes = require('./routes/documents');

// Configurar rutas
app.use('/api/auth', authRoutes);
app.use('/api/predios', propertiesRoutes);
app.use('/api/documentos', documentsRoutes);

// Iniciar el servidor con manejo de errores
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`El puerto ${PORT} está ocupado, intentando con el puerto ${PORT + 1}`);
    app.listen(PORT + 1, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT + 1}`);
    });
  } else {
    console.error('Error del servidor:', err);
  }
});