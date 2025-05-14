// Modelo para la colección de documentos
const documentTypes = [
  { id: 1, name: "CONSULTA ANTECEDENTE BIEN RAIZ (SII)", required: true },
  { id: 2, name: "RESOLUCIÓN PLAN DE MANEJO", required: false },
  { id: 3, name: "AVISO EJECUCION DE FAENA", required: false },
  { id: 4, name: "ESCRITURA O TITULOS DE DOMINIO", required: false },
  { id: 6, name: "CONTRATO COMPRA Y VENTA", required: false },
  { id: 7, name: "PLANO DEL PREDIO", required: false },
  { id: 8, name: "CONTRATO DE TRABAJO", required: false },
  { id: 9, name: "DERECHO A SABER", required: false },
  { id: 10, name: "ENTREGA EPP", required: false },
  { id: 11, name: "VARIOS", required: false },
  { id: 12, name: "REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD", required: false },
  { id: 13, name: "REGISTRO DE CAPACITACIÓN", required: false },
  { id: 14, name: "DOCTO. ADICIONAL", required: false }
];

// Estructura de documento en Firestore
/*
documents: {
  id: string (auto-generado),
  propertyId: string (referencia al predio),
  typeId: number (tipo de documento),
  name: string (nombre del archivo),
  url: string (URL de descarga),
  contentType: string (tipo de contenido),
  size: number (tamaño en bytes),
  uploadedBy: string (ID del usuario),
  uploadedAt: timestamp,
  status: string (activo, archivado, etc.)
}
*/

module.exports = {
  documentTypes
};