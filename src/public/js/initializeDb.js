// public/js/initializeDb.js

// This array will be used to initialize Firestore
const defaultDocumentTypes = [
    // 1. CONSULTA ANTECEDENTE BIEN RAÍZ (SII)
    {
      id: "CONSULTA_ANTECEDENTE_SII",
      name: "CONSULTA ANTECEDENTE BIEN RAÍZ (SII)",
      is_required: true,
      category: "PREDIAL",
      icon: "fas fa-map-marked-alt",
      description: "Consulta de antecedentes del bien raíz emitida por el SII, fundamental para la identificación del predio.",
      required_fields: [
        { field_name: "rol_predio", field_label: "Rol del predio", type: "text", required: true, placeholder: "Ej: 1234-56" },
        { field_name: "direccion_predio", field_label: "Dirección del Predio", type: "text", required: true, placeholder: "Ej: Fundo El Roble, Km 5 Ruta S-60" },
        { field_name: "comuna_predio", field_label: "Comuna", type: "text", required: true, placeholder: "Ej: Curacautín" },
        { field_name: "destino_predio", field_label: "Destino Principal", type: "text", required: true, placeholder: "Ej: Forestal, Conservación" },
        { field_name: "nombre_propietario_actual", field_label: "Nombre del Propietario Actual", type: "text", required: true, placeholder: "Ej: Forestal Arauco S.A." },
        { field_name: "fecha_emision_consulta", field_label: "Fecha de Emisión de la Consulta", type: "date", required: true, placeholder: "" }
      ]
    },
    // 2. RESOLUCIÓN PLAN DE MANEJO
    {
      id: "RESOLUCION_PLAN_MANEJO",
      name: "RESOLUCIÓN PLAN DE MANEJO",
      is_required: true,
      category: "PLANIFICACION_FORESTAL",
      icon: "fas fa-file-alt",
      description: "Resolución de CONAF que aprueba o modifica un Plan de Manejo Forestal.",
      required_fields: [
        { field_name: "rol_avaluo_predio", field_label: "Rol de Avalúo del Predio", type: "text", required: true, placeholder: "Ej: 5678-12" },
        { field_name: "comuna_plan", field_label: "Comuna", type: "text", required: true, placeholder: "Ej: Panguipulli" },
        { field_name: "resolucion_numero_conaf", field_label: "Número de Resolución CONAF", type: "text", required: true, placeholder: "Ej: RM 123/2023" },
        { field_name: "superficie_aprobada_hectareas", field_label: "Superficie Aprobada (ha)", type: "number", required: true, placeholder: "Ej: 150.75" },
        { field_name: "fecha_resolucion_plan", field_label: "Fecha de la Resolución", type: "date", required: true, placeholder: "" }
      ]
    },
    // 3. AVISO EJECUCIÓN DE FAENA
    {
      id: "AVISO_EJECUCION_FAENA",
      name: "AVISO EJECUCIÓN DE FAENA",
      is_required: true,
      category: "OPERACIONAL_FORESTAL",
      icon: "fas fa-hard-hat",
      description: "Aviso a CONAF sobre la ejecución de faenas de cosecha o manejo.",
      required_fields: [
        { field_name: "fecha_aviso_faena", field_label: "Fecha de Aviso", type: "date", required: true, placeholder: "" },
        { field_name: "aviso_id_o_codigo", field_label: "ID o Código del Aviso", type: "text", required: true, placeholder: "Ej: AEF-2023-001" },
        { field_name: "predio_nombre_faena", field_label: "Nombre del Predio donde se realiza la faena", type: "text", required: true, placeholder: "Ej: Fundo El Coihue" },
        { field_name: "comuna_faena_aviso", field_label: "Comuna", type: "text", required: true, placeholder: "Ej: Loncoche" }
      ]
    },
    // 4. ESCRITURA O TÍTULOS DE DOMINIO
    {
      id: "ESCRITURA_TITULOS_DOMINIO",
      name: "ESCRITURA O TÍTULOS DE DOMINIO",
      is_required: true,
      category: "PREDIAL",
      icon: "fas fa-file-signature",
      description: "Documentos legales que acreditan la propiedad y dominio del predio.",
      required_fields: [
        { field_name: "numero_inscripcion_cbr", field_label: "N° Inscripción CBR", type: "text", required: true, placeholder: "Ej: 10293" },
        { field_name: "fojas_cbr", field_label: "Fojas", type: "text", required: true, placeholder: "Ej: 12345 vta." },
        { field_name: "ano_inscripcion_cbr", field_label: "Año Inscripción CBR", type: "number", required: true, placeholder: "Ej: 2010" },
        { field_name: "conservador_bienes_raices_oficina", field_label: "Conservador de Bienes Raíces (Oficina)", type: "text", required: true, placeholder: "Ej: CBR Temuco" }
      ]
    },
    // 5. CONTRATO COMPRA Y VENTA
    {
      id: "CONTRATO_COMPRA_VENTA_PREDIO",
      name: "CONTRATO COMPRA Y VENTA",
      is_required: false,
      category: "PREDIAL",
      icon: "fas fa-handshake",
      description: "Contrato de compraventa del predio forestal.",
      required_fields: [
        { field_name: "nombre_comprador", field_label: "Nombre Comprador", type: "text", required: true, placeholder: "Ej: Forestal Los Ríos Ltda." },
        { field_name: "nombre_vendedor", field_label: "Nombre Vendedor", type: "text", required: true, placeholder: "Ej: Juan Silva Pérez" },
        { field_name: "rol_predial_contrato", field_label: "Rol Predial", type: "text", required: true, placeholder: "Ej: 123-45" },
        { field_name: "precio_venta_uf_clp", field_label: "Precio de Venta (UF o CLP)", type: "text", required: true, placeholder: "Ej: 5000 UF" },
        { field_name: "fecha_contrato_compraventa", field_label: "Fecha del Contrato", type: "date", required: true, placeholder: "" },
        { field_name: "notaria_contrato", field_label: "Notaría (si aplica)", type: "text", required: false, placeholder: "Ej: Notaría González" }
      ]
    },
    // 6. PLANO DEL PREDIO
    {
      id: "PLANO_PREDIO",
      name: "PLANO DEL PREDIO",
      is_required: false,
      category: "CARTOGRAFIA",
      icon: "fas fa-drafting-compass",
      description: "Plano topográfico o catastral del predio, idealmente georreferenciado.",
      required_fields: [
        { field_name: "nombre_plano", field_label: "Nombre o Identificador del Plano", type: "text", required: true, placeholder: "Ej: Plano PM-1023 Fundo El Roble" },
        { field_name: "formato_digital_plano", field_label: "Formato Digital (KMZ, SHP, GeoJSON, PDF)", type: "text", required: false, placeholder: "Ej: KMZ" },
        { field_name: "link_o_path_archivo_plano", field_label: "Link o Ruta al Archivo Digital", type: "text", required: true, placeholder: "Ej: /ruta/servidor/plano.kmz o https://..." },
        { field_name: "fecha_elaboracion_plano", field_label: "Fecha de Elaboración del Plano", type: "date", required: false, placeholder: "" }
      ]
    },
    // 7. CONTRATO DE TRABAJO
    {
      id: "CONTRATO_TRABAJO_FORESTAL",
      name: "CONTRATO DE TRABAJO",
      is_required: false,
      category: "LABORAL",
      icon: "fas fa-file-contract",
      description: "Contrato de trabajo del personal involucrado en faenas forestales.",
      required_fields: [
        { field_name: "nombre_trabajador", field_label: "Nombre del Trabajador", type: "text", required: true, placeholder: "" },
        { field_name: "rut_trabajador", field_label: "RUT del Trabajador", type: "text", required: true, placeholder: "Ej: 12.345.678-9" },
        { field_name: "cargo_trabajador", field_label: "Cargo", type: "text", required: true, placeholder: "Ej: Motosierrista, Operador de Maquinaria" },
        { field_name: "fecha_inicio_contrato", field_label: "Fecha de Inicio del Contrato", type: "date", required: true, placeholder: "" },
        { field_name: "empresa_contratista_nombre", field_label: "Empresa Contratista (si aplica)", type: "text", required: false, placeholder: "Ej: Servicios Forestales Ltda." }
      ]
    },
    // 8. DERECHO A SABER
    {
      id: "DERECHO_A_SABER_ODI",
      name: "DERECHO A SABER (ODI)",
      is_required: false,
      category: "SEGURIDAD_LABORAL",
      icon: "fas fa-info-circle",
      description: "Registro de Obligación de Informar los Riesgos Laborales (ODI).",
      required_fields: [
        { field_name: "nombre_trabajador_odi", field_label: "Nombre del Trabajador", type: "text", required: true, placeholder: "" },
        { field_name: "rut_trabajador_odi", field_label: "RUT del Trabajador", type: "text", required: true, placeholder: "Ej: 12.345.678-9" },
        { field_name: "descripcion_riesgos_informados", field_label: "Descripción de Riesgos Informados", type: "textarea", required: true, placeholder: "Ej: Riesgos asociados a la operación de motosierra, caída de árboles, etc." },
        { field_name: "fecha_odi", field_label: "Fecha de Entrega ODI", type: "date", required: true, placeholder: "" }
      ]
    },
    // 9. ENTREGA EPP
    {
      id: "ENTREGA_EPP",
      name: "ENTREGA EPP",
      is_required: false,
      category: "SEGURIDAD_LABORAL",
      icon: "fas fa-hard-hat",
      description: "Registro de entrega de Equipos de Protección Personal.",
      required_fields: [
        { field_name: "nombre_trabajador_epp", field_label: "Nombre del Trabajador", type: "text", required: true, placeholder: "" },
        { field_name: "rut_trabajador_epp", field_label: "RUT del Trabajador", type: "text", required: true, placeholder: "Ej: 12.345.678-9" },
        { field_name: "elementos_epp_entregados", field_label: "Elementos EPP Entregados", type: "textarea", required: true, placeholder: "Ej: Casco, guantes, zapatos de seguridad, protectores auditivos." },
        { field_name: "fecha_entrega_epp", field_label: "Fecha de Entrega EPP", type: "date", required: true, placeholder: "" },
        { field_name: "firma_recepcion_epp", field_label: "Firma de Recepción (Referencia)", type: "text", required: false, placeholder: "Ej: Firmado en papel, adjunto N°123" }
      ]
    },
    // 10. REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD
    {
      id: "REGLAMENTO_INTERNO_SHS",
      name: "REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD",
      is_required: false,
      category: "NORMATIVA_EMPRESA",
      icon: "fas fa-book-reader",
      description: "Reglamento Interno de Orden, Higiene y Seguridad de la empresa.",
      required_fields: [
        { field_name: "fecha_emision_reglamento", field_label: "Fecha de Emisión del Reglamento", type: "date", required: true, placeholder: "" },
        { field_name: "identificacion_documento_reglamento", field_label: "Identificación del Documento (Versión, Código)", type: "text", required: true, placeholder: "Ej: Versión 3.1, Código REG-SHS-001" }
      ]
    },
    // 11. REGISTRO DE CAPACITACIÓN
    {
      id: "REGISTRO_CAPACITACION_FORESTAL",
      name: "REGISTRO DE CAPACITACIÓN",
      is_required: false,
      category: "LABORAL",
      icon: "fas fa-chalkboard-teacher",
      description: "Registro de asistencia y aprobación de capacitaciones relevantes.",
      required_fields: [
        { field_name: "nombre_participante_capacitacion", field_label: "Nombre del Participante", type: "text", required: true, placeholder: "" },
        { field_name: "rut_participante_capacitacion", field_label: "RUT del Participante", type: "text", required: true, placeholder: "Ej: 12.345.678-9" },
        { field_name: "tema_capacitacion", field_label: "Tema de la Capacitación", type: "text", required: true, placeholder: "Ej: Uso correcto de EPP, Prevención de Incendios Forestales" },
        { field_name: "fecha_realizacion_capacitacion", field_label: "Fecha de Realización", type: "date", required: true, placeholder: "" },
        { field_name: "nombre_responsable_capacitacion", field_label: "Nombre Responsable Capacitación/Instructor", type: "text", required: true, placeholder: "Ej: Juan Segura Prevencionista" }
      ]
    }
  ];
  
  // Function to initialize Firestore with the default document types
  async function initializeDocumentTypesInFirestore() {
    // Show a confirmation dialog
    if (!confirm('¿Está seguro de que desea inicializar la base de datos con los tipos de documentos predeterminados? Esto podría sobrescribir datos existentes si los IDs coinciden.')) {
      alert('Inicialización cancelada.');
      return;
    }
  
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
      // Consider redirecting to login: window.location.href = '/';
      return;
    }
  
    // Get the button and show a loading state
    const initializeDbBtn = document.getElementById('initialize-db-btn'); // Assuming this ID for the button
    const originalButtonText = initializeDbBtn ? initializeDbBtn.textContent : 'Initialize';
    if (initializeDbBtn) {
      initializeDbBtn.textContent = 'Inicializando...';
      initializeDbBtn.disabled = true;
    }
  
    try {
      const response = await fetch('/api/admin/document-types/initialize-batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(defaultDocumentTypes) // Sending the array
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error al inicializar los tipos de documentos: ${errorData.message || response.status}`);
      }
  
      const result = await response.json();
      alert(result.message || 'Base de datos inicializada correctamente con los tipos de documentos predeterminados.');
      // Optionally, reload or update UI if needed, e.g., if this affects a currently viewed list of types.
      // For the upload page context, this primarily sets up data for future dynamic modal use.
  
    } catch (error) {
      console.error('Error en initializeDocumentTypesInFirestore:', error);
      alert(`Error al inicializar la base de datos: ${error.message}. Revise la consola para más detalles.`);
    } finally {
      if (initializeDbBtn) {
        initializeDbBtn.textContent = originalButtonText;
        initializeDbBtn.disabled = false;
      }
    }
  }
  
  // Event listener for the initialization button
  // This assumes the button will have the ID 'initialize-db-btn'
  // And this script is loaded on a page where such a button exists (e.g., upload.handlebars)
  document.addEventListener('DOMContentLoaded', () => {
    const initializeDbBtn = document.getElementById('initialize-db-btn');
    if (initializeDbBtn) {
      initializeDbBtn.addEventListener('click', initializeDocumentTypesInFirestore);
    } else {
      // This console log is helpful if the button isn't found on the page this script is running on.
      // console.log("Botón 'initialize-db-btn' no encontrado en esta página.");
    }
  });
  