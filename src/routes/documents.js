const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('../firebase');
const jwt = require('jsonwebtoken');

// Middleware para verificar token
function verificarToken(req, res, next) {
  // Obtener token del header Authorization, query params o cookies
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || 
                req.query.token || 
                req.cookies.token;
  
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

// Aplicar middleware de verificación de token a todas las rutas
router.use(verificarToken);

// Configurar multer para almacenar archivos temporalmente
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const tempDir = path.join(__dirname, '../temp');
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

// Ruta para subir un documento
router.post('/upload', upload.single('documentFile'), async (req, res) => {
  try {
    // Verificar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }
    
    // Verificar que se hayan enviado todos los datos necesarios
    if (!req.body.documentName || !req.body.documentTypeId || !req.body.propertyId) {
      // Eliminar el archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    // Verificar que el predio exista y pertenezca al usuario
    const predioRef = db.collection('predios').doc(req.body.propertyId);
    const predioDoc = await predioRef.get();
    
    if (!predioDoc.exists) {
      // Eliminar el archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = predioDoc.data();
    
    // Verificar que el predio pertenezca al usuario actual
    if (predioData.id_user !== req.usuario.uid) {
      // Eliminar el archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'No tienes permiso para subir documentos a este predio' });
    }
    
    // Leer el archivo
    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Generar hash SHA-256 del archivo
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Guardar el archivo en el sistema de archivos
    const uploadDir = path.join(__dirname, '../../uploads', req.usuario.uid, req.body.propertyId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const fileName = `${Date.now()}_${path.basename(req.file.originalname)}`;
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, fileBuffer);
    
    // Crear el documento en la base de datos
    const documentData = {
      nombre: req.body.documentName,
      id_predio: req.body.propertyId,
      id_user: req.usuario.uid,
      tipo_documento: parseInt(req.body.documentTypeId),
      fecha_subida: new Date(),
      ruta_archivo: `/uploads/${req.usuario.uid}/${req.body.propertyId}/${fileName}`,
      hash: fileHash,
      tipo_archivo: req.file.mimetype,
      tamano: req.file.size
    };
    
    const docRef = await db.collection('documentos').add(documentData);
    
    // Eliminar el archivo temporal
    fs.unlinkSync(req.file.path);
    
    res.status(201).json({
      _id: docRef.id,
      ...documentData
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    
    // Eliminar el archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Error al subir el documento' });
  }
});

module.exports = router;