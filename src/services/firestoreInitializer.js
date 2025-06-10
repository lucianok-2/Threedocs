// src/services/firestoreInitializer.js
const { db } = require('../firebase'); // Assuming db is exported from firebase.js

const documentClassificationStructure = {
  // Colección principal: document_types
  document_types: {
    // Documento 1: CONSULTA ANTECEDENTE BIEN RAÍZ (SII)
    consulta_antecedente_bien_raiz: {
      name: "CONSULTA ANTECEDENTE BIEN RAÍZ (SII)",
      keywords: [
        "sii", "servicio de impuestos internos", "documento de antecedentes",
        "bien raíz", "rol de avalúo", "contribuciones", "avalúo total",
        "comuna", "destino", "forestal", "agrícola", "rural", "urbano",
        "impuesto territorial", "exento", "afecto", "sobretasa"
      ],
      required_fields: [
        "rol_predio", "direccion", "comuna", "destino", "fecha_emision"
      ],
      patterns: [
        "ROL de Avalúo", "Número de ROL", "Destino del bien raíz",
        "Avalúos del bien raíz", "Contribución", "PRIMER SEMESTRE"
      ],
      weight: 1.0
    },

    // Documento 2: RESOLUCIÓN PLAN DE MANEJO
    resolucion_plan_manejo: {
      name: "RESOLUCIÓN PLAN DE MANEJO",
      keywords: [
        "resolución", "plan de manejo", "manejo forestal", "conaf",
        "superficie aprobada", "hectáreas", "bosque", "plantación",
        "corta", "silvicultura", "manejo sustentable"
      ],
      required_fields: [
        "rol_avaluo", "comuna", "resolucion_numero", "superficie_aprobada", "fecha"
      ],
      patterns: [
        "Resolución N°", "Plan de Manejo", "Superficie aprobada",
        "hectáreas", "CONAF", "Corporación Nacional Forestal"
      ],
      weight: 1.0
    },

    // Documento 3: AVISO EJECUCIÓN DE FAENA
    aviso_ejecucion_faena: {
      name: "AVISO EJECUCIÓN DE FAENA",
      keywords: [
        "aviso", "ejecución", "faena", "actividad forestal", "corta",
        "extracción", "maderera", "bosque", "predio", "inicio faena"
      ],
      required_fields: [
        "fecha_aviso", "aviso_numero", "predio", "comuna"
      ],
      patterns: [
        "Aviso N°", "Ejecución de Faena", "Fecha de aviso",
        "Inicio de faena", "Actividad forestal"
      ],
      weight: 1.0
    },

    // Documento 4: ESCRITURA O TÍTULOS DE DOMINIO
    escritura_titulos_dominio: {
      name: "ESCRITURA O TÍTULOS DE DOMINIO",
      keywords: [
        "escritura", "título", "dominio", "conservador", "bienes raíces",
        "inscripción", "fojas", "número", "repertorio", "notaría",
        "propiedad", "dominio", "transferencia"
      ],
      required_fields: [
        "numero_certificado", "fojas", "conservador_bienes_raices"
      ],
      patterns: [
        "Conservador de Bienes Raíces", "Fojas", "N° de Inscripción",
        "Repertorio", "Escritura Pública", "Título de Dominio"
      ],
      weight: 1.0
    },

    // Documento 5: CONTRATO COMPRA Y VENTA
    contrato_compra_venta: {
      name: "CONTRATO COMPRA Y VENTA",
      keywords: [
        "contrato", "compra", "venta", "comprador", "vendedor",
        "precio", "rol predial", "firma", "partes", "acuerdo",
        "transferencia", "propiedad", "inmueble"
      ],
      required_fields: [
        "nombre_comprador", "nombre_vendedor", "rol_predial", 
        "precio_venta", "fecha_contrato", "firma_partes"
      ],
      patterns: [
        "Contrato de Compra", "Comprador:", "Vendedor:", "Precio:",
        "Rol predial", "Firma de las partes"
      ],
      weight: 1.0
    },

    // Documento 6: CONTRATO DE TRABAJO
    contrato_trabajo: {
      name: "CONTRATO DE TRABAJO",
      keywords: [
        "contrato", "trabajo", "trabajador", "empleado", "rut",
        "cargo", "funciones", "sueldo", "jornada", "inicio",
        "empleador", "laboral", "remuneración"
      ],
      required_fields: [
        "nombre_trabajador", "rut", "cargo", "fecha_inicio"
      ],
      patterns: [
        "Contrato de Trabajo", "Trabajador:", "RUT:", "Cargo:",
        "Fecha de inicio", "Empleador", "Funciones"
      ],
      weight: 1.0
    },

    // Documento 7: DERECHO A SABER
    derecho_saber: {
      name: "DERECHO A SABER",
      keywords: [
        "derecho", "saber", "información", "trabajador", "rut",
        "riesgos", "seguridad", "salud", "ocupacional", "prevención",
        "capacitación", "informado"
      ],
      required_fields: [
        "nombre_trabajador", "rut", "descripcion_derecho", "fecha"
      ],
      patterns: [
        "Derecho a Saber", "Información de Riesgos", "Trabajador:",
        "Descripción del derecho", "Riesgos asociados"
      ],
      weight: 1.0
    },

    // Documento 8: ENTREGA EPP
    entrega_epp: {
      name: "ENTREGA EPP",
      keywords: [
        "entrega", "epp", "elementos", "protección", "personal",
        "trabajador", "rut", "casco", "guantes", "zapatos",
        "seguridad", "conformidad", "firma", "recepción"
      ],
      required_fields: [
        "nombre_trabajador", "rut", "elementos_entregados", 
        "fecha_entrega", "firma_conformidad"
      ],
      patterns: [
        "Entrega de EPP", "Elementos de Protección Personal",
        "Trabajador:", "Elementos entregados:", "Firma de conformidad"
      ],
      weight: 1.0
    },

    // Documento 9: REGLAMENTO INTERNO
    reglamento_interno: {
      name: "REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD",
      keywords: [
        "reglamento", "interno", "salud", "higiene", "seguridad",
        "orden", "normas", "procedimientos", "prevención", "riesgos",
        "trabajadores", "empresa", "disposiciones"
      ],
      required_fields: [
        "fecha_emision", "identificacion_documento"
      ],
      patterns: [
        "Reglamento Interno", "Salud, Higiene y Seguridad",
        "Orden, Higiene y Seguridad", "Fecha de emisión",
        "Disposiciones generales"
      ],
      weight: 1.0
    },

    // Documento 10: REGISTRO DE CAPACITACIÓN
    registro_capacitacion: {
      name: "REGISTRO DE CAPACITACIÓN",
      keywords: [
        "registro", "capacitación", "participante", "rut", "tema",
        "realización", "responsable", "instructor", "curso",
        "entrenamiento", "formación", "aprendizaje"
      ],
      required_fields: [
        "nombre_participante", "rut_participante", "tema_capacitacion",
        "fecha_realizacion", "nombre_responsable"
      ],
      patterns: [
        "Registro de Capacitación", "Participante:", "Tema:",
        "Fecha de realización:", "Responsable:", "Instructor"
      ],
      weight: 1.0
    }
  }
};

async function initializeFirestoreData() { // db is now imported from ../firebase
  try {
    const batch = db.batch();

    for (const [docId, docData] of Object.entries(documentClassificationStructure.document_types)) {
      const docRef = db.collection('document_types').doc(docId);
      batch.set(docRef, docData);
    }

    await batch.commit();
    console.log('Datos de clasificación inicializados en Firestore');
    return { success: true, message: 'Datos de clasificación inicializados en Firestore.' };
  } catch (error) {
    console.error('Error al inicializar datos:', error);
    return { success: false, message: 'Error al inicializar datos.', error: error };
  }
}

// The other functions like getDocumentTypes, addDocumentType, updateKeywords
// are not strictly needed for *this specific plan step* (initialization button)
// but can be included in the file if they are part of the broader
// document classification module you're building.
// For now, focus on initializeFirestoreData.

module.exports = {
  initializeFirestoreData,
  // Export other functions if they were included and are needed by other modules.
  documentClassificationStructure // Exporting this if needed elsewhere, though not typical for service files
};
