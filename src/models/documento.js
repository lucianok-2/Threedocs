const mongoose = require('mongoose');

const documentoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipoDocumento: {
    type: Number,
    required: true,
    min: 1,
    max: 14
  },
  idPredio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Predio',
    required: true
  },
  idUsuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fechaSubida: {
    type: Date,
    default: Date.now
  },
  ruta: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true
  },
  tamano: {
    type: Number,
    required: true
  },
  tipoArchivo: {
    type: String,
    required: true
  }
});

// Método para obtener el nombre del tipo de documento
documentoSchema.methods.getNombreTipoDocumento = function() {
  const tiposDocumento = {
    1: 'Escritura',
    2: 'Plano Topográfico',
    3: 'Informe Ambiental',
    4: 'Certificado de Dominio',
    5: 'Plan de Manejo',
    6: 'Certificado Forestal',
    7: 'Informe Técnico',
    8: 'Contrato',
    9: 'Permiso Municipal',
    10: 'Factura',
    11: 'Estudio de Suelo',
    12: 'Certificado de Agua',
    13: 'Certificado Eléctrico',
    14: 'Otro'
  };
  
  return tiposDocumento[this.tipoDocumento] || 'Desconocido';
};

const Documento = mongoose.model('Documento', documentoSchema);

module.exports = { Documento };