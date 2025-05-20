const app = require('./app');
require('dotenv').config();
app.listen(3000);   
console.log('Server is running on port 3000');

// Importar rutas
const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const documentsRoutes = require('./routes/documents');

// Configurar rutas
app.use('/api/auth', authRoutes);
app.use('/api/predios', propertiesRoutes);
app.use('/api/documentos', documentsRoutes);