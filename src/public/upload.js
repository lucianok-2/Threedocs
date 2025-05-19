document.addEventListener('DOMContentLoaded', function() {
  const propertySelect = document.getElementById('property-select');
  const documentSection = document.getElementById('document-section');
  const documentTypesContainer = document.getElementById('document-types-container');
  const uploadModal = document.getElementById('upload-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const browseFilesBtn = document.getElementById('browse-files');
  const dropzone = document.getElementById('dropzone');
  const selectedFileText = document.getElementById('selected-file');
  const cancelUploadBtn = document.getElementById('cancel-upload');
  const submitUploadBtn = document.getElementById('submit-upload');
  
  const token = localStorage.getItem('token');
  
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  // Cargar la lista de predios
  fetch('/api/predios', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar los predios');
    }
    return response.json();
  })
  .then(properties => {
    propertySelect.innerHTML = '<option value="">Seleccione un predio...</option>';
    
    properties.forEach(property => {
      const option = document.createElement('option');
      option.value = property.id;
      option.textContent = property.nombre;
      propertySelect.appendChild(option);
    });
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al cargar los predios');
  });
  
  // Tipos de documentos
  const documentTypes = [
    { id: 1, name: 'CONSULTA ANTECEDENTE BIEN RAIZ (SII)', required: true },
    { id: 2, name: 'RESOLUCIÓN PLAN DE MANEJO', required: true },
    { id: 3, name: 'AVISO EJECUCION DE FAENA', required: false },
    { id: 4, name: 'ESCRITURA O TITULOS DE DOMINIO', required: true },
    { id: 6, name: 'CONTRATO COMPRA Y VENTA', required: false },
    { id: 7, name: 'PLANO DEL PREDIO', required: false },
    { id: 8, name: 'CONTRATO DE TRABAJO', required: false },
    { id: 9, name: 'DERECHO A SABER', required: false },
    { id: 10, name: 'ENTREGA EPP', required: false },
    { id: 11, name: 'VARIOS', required: false },
    { id: 12, name: 'REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD', required: false },
    { id: 13, name: 'REGISTRO DE CAPACITACIÓN', required: false },
    { id: 14, name: 'DOCTO. ADICIONAL', required: false }
  ];
  
  // Mostrar tipos de documentos cuando se selecciona un predio
  propertySelect.addEventListener('change', function() {
    if (this.value) {
      documentSection.classList.remove('hidden');
      
      // Limpiar el contenedor de tipos de documentos
      while (documentTypesContainer.firstChild) {
        documentTypesContainer.removeChild(documentTypesContainer.firstChild);
      }
      
      // Agregar encabezado para documentos requeridos
      const requiredHeader = document.createElement('div');
      requiredHeader.className = 'col-span-full mb-4';
      requiredHeader.innerHTML = '<h4 class="font-medium text-gray-700 mb-2">Documentos Requeridos <span class="text-red-500">*</span></h4>';
      documentTypesContainer.appendChild(requiredHeader);
      
      // Agregar tipos de documentos requeridos
      documentTypes.filter(type => type.required).forEach(type => {
        addDocumentTypeCard(type);
      });
      
      // Agregar encabezado para documentos opcionales
      const optionalHeader = document.createElement('div');
      optionalHeader.className = 'col-span-full mb-4 mt-6';
      optionalHeader.innerHTML = '<h4 class="font-medium text-gray-700 mb-2">Documentos Opcionales</h4>';
      documentTypesContainer.appendChild(optionalHeader);
      
      // Agregar tipos de documentos opcionales
      documentTypes.filter(type => !type.required).forEach(type => {
        addDocumentTypeCard(type);
      });
    } else {
      documentSection.classList.add('hidden');
    }
  });
  
  // Función para agregar una tarjeta de tipo de documento
  function addDocumentTypeCard(type) {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow';
    card.innerHTML = `
      <h5 class="font-medium text-gray-800 mb-2">${type.name}</h5>
      <button type="button" class="upload-doc-btn mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center" data-type-id="${type.id}" data-type-name="${type.name}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        Subir documento
      </button>
    `;
    
    documentTypesContainer.appendChild(card);
    
    // Agregar event listener al botón de subir
    const uploadBtn = card.querySelector('.upload-doc-btn');
    uploadBtn.addEventListener('click', function() {
      const typeId = this.getAttribute('data-type-id');
      const typeName = this.getAttribute('data-type-name');
      openUploadModal(typeId, typeName);
    });
  }
  
  // Función para abrir el modal de subida
  function openUploadModal(typeId, typeName) {
    if (window.modalHelpers && window.modalHelpers.openUploadModal) {
      // Usar la función del archivo de modales
      window.modalHelpers.openUploadModal(typeId, typeName, propertySelect.value);
    } else {
      // Fallback al código original
      document.getElementById('modal-title').textContent = `Subir Documento: ${typeName}`;
      document.getElementById('document-type-id').value = typeId;
      document.getElementById('property-id').value = propertySelect.value;
      
      // Limpiar el formulario
      uploadForm.reset();
      selectedFileText.classList.add('hidden');
      selectedFileText.textContent = '';
      
      uploadModal.classList.remove('hidden');
    }
  }
  
  // Cerrar el modal
  closeModalBtn.addEventListener('click', function() {
    if (window.modalHelpers && window.modalHelpers.closeUploadModal) {
      window.modalHelpers.closeUploadModal();
    } else {
      uploadModal.classList.add('hidden');
    }
  });
  
  cancelUploadBtn.addEventListener('click', function() {
    if (window.modalHelpers && window.modalHelpers.closeUploadModal) {
      window.modalHelpers.closeUploadModal();
    } else {
      uploadModal.classList.add('hidden');
    }
  });
  
  // Manejar la selección de archivos
  browseFilesBtn.addEventListener('click', function() {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      selectedFileText.textContent = `Archivo seleccionado: ${this.files[0].name}`;
      selectedFileText.classList.remove('hidden');
    } else {
      selectedFileText.classList.add('hidden');
    }
  });
  
  // Manejar el arrastrar y soltar archivos
  dropzone.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.classList.add('border-blue-500');
  });
  
  dropzone.addEventListener('dragleave', function() {
    this.classList.remove('border-blue-500');
  });
  
  dropzone.addEventListener('drop', function(e) {
    e.preventDefault();
    this.classList.remove('border-blue-500');
    
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      selectedFileText.textContent = `Archivo seleccionado: ${e.dataTransfer.files[0].name}`;
      selectedFileText.classList.remove('hidden');
    }
  });
  
  // Manejar el envío del formulario
  uploadForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const documentName = document.getElementById('document-name').value;
    const propertyId = document.getElementById('property-id').value;
    const documentTypeId = document.getElementById('document-type-id').value;
    const file = fileInput.files[0];
    
    if (!documentName || !propertyId || !documentTypeId || !file) {
      alert('Por favor, complete todos los campos y seleccione un archivo.');
      return;
    }
    
    // Validar el tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Por favor, seleccione un archivo PDF o JPG/JPEG.');
      return;
    }
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('documentName', documentName);
    formData.append('propertyId', propertyId);
    formData.append('documentTypeId', documentTypeId);
    formData.append('documentFile', file);
    
    // Deshabilitar el botón de envío y mostrar indicador de carga
    submitUploadBtn.disabled = true;
    submitUploadBtn.textContent = 'Subiendo...';
    
    // Enviar la solicitud
    fetch('/api/documentos/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al subir el documento');
      }
      return response.json();
    })
    .then(data => {
      alert('Documento subido correctamente');
      uploadModal.classList.add('hidden');
      
      // Redirigir a la página de documentos del predio
      window.location.href = `/property/${propertyId}/documents`;
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error al subir el documento');
    })
    .finally(() => {
      // Restaurar el botón de envío
      submitUploadBtn.disabled = false;
      submitUploadBtn.textContent = 'Subir Documento';
    });
  });
});