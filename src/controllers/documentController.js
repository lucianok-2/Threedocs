const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { Documento } = require('../models/documento');

// Configurar multer para el almacenamiento de archivos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Crear el directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generar un nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filtro para tipos de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, JPG, JPEG, PNG, DOC, DOCX, XLS y XLSX.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  }
});

// Controlador para subir documentos
exports.uploadDocument = [
  upload.single('file'),
  async (req, res) => {
    try {
      // Verificar si se subió un archivo
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo' });
      }
      
      // Obtener datos del formulario
      const { nombre, tipoDocumento, idPredio, hash } = req.body;
      
      // Verificar que se proporcionaron todos los datos necesarios
      if (!nombre || !tipoDocumento || !idPredio) {
        // Eliminar el archivo si falta información
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }
      
      // Verificar el hash SHA-256 del archivo
      const fileBuffer = fs.readFileSync(req.file.path);
      const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Si el hash proporcionado no coincide con el calculado, rechazar el archivo
      if (hash && hash !== calculatedHash) {
        // Eliminar el archivo si el hash no coincide
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'El hash del archivo no coincide' });
      }
      
      // Crear un nuevo documento en la base de datos
      const documento = new Documento({
        nombre,
        tipoDocumento,
        idPredio,
        idUsuario: req.user.id, // Asumiendo que el middleware de autenticación añade el usuario a req
        fechaSubida: new Date(),
        ruta: req.file.path,
        hash: calculatedHash,
        tamano: req.file.size,
        tipoArchivo: req.file.mimetype
      });
      
      // Guardar el documento en la base de datos
      await documento.save();
      
      // Responder con éxito
      res.status(201).json({
        mensaje: 'Documento subido correctamente',
        documento: {
          id: documento._id,
          nombre: documento.nombre,
          fechaSubida: documento.fechaSubida
        }
      });
    } catch (error) {
      console.error('Error al subir documento:', error);
      
      // Si hay un error, eliminar el archivo si se subió
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Error al procesar el documento' });
    }
  }
];

// Controlador para obtener documentos de un predio
exports.getDocumentsByProperty = async (req, res) => {
  try {
    const { idPredio } = req.params;
    
    // Buscar documentos por ID de predio
    const documentos = await Documento.find({ idPredio }).sort({ fechaSubida: -1 });
    
    res.status(200).json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ error: 'Error al obtener los documentos' });
  }
};

// Controlador para eliminar un documento
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar el documento por ID
    const documento = await Documento.findById(id);
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    // Eliminar el archivo físico
    if (fs.existsSync(documento.ruta)) {
      fs.unlinkSync(documento.ruta);
    }
    
    // Eliminar el documento de la base de datos
    await Documento.findByIdAndDelete(id);
    
    res.status(200).json({ mensaje: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: 'Error al eliminar el documento' });
  }
};

// Controlador para descargar un documento
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar el documento por ID
    const documento = await Documento.findById(id);
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    // Verificar que el archivo existe
    if (!fs.existsSync(documento.ruta)) {
      return res.status(404).json({ error: 'El archivo no existe en el servidor' });
    }
    
    // Enviar el archivo como respuesta
    res.download(documento.ruta, documento.nombre + path.extname(documento.ruta));
  } catch (error) {
    console.error('Error al descargar documento:', error);
    res.status(500).json({ error: 'Error al descargar el documento' });
  }
};