document.addEventListener('DOMContentLoaded', function () {
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

  // Verificar si estamos en la página correcta
  if (!propertySelect) {
    console.log('No estamos en la página de subida de documentos');
    return; // Salir si no estamos en la página correcta
  }

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

      if (properties.length === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No hay predios disponibles';
        propertySelect.appendChild(option);

        // Mostrar mensaje al usuario
        alert('No hay predios registrados. Por favor, cree un predio primero.');
        // Opcionalmente redirigir a la página de predios
        // window.location.href = '/properties';
      } else {
        properties.forEach(property => {
          const option = document.createElement('option');
          option.value = property._id;
          option.textContent = property.nombre;
          propertySelect.appendChild(option);
        });
      }
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
  propertySelect.addEventListener('change', function () {
    if (this.value) {
      documentSection.classList.remove('hidden');

      // Limpiar el contenedor de tipos de documentos
      documentTypesContainer.innerHTML = '';

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

      // Cargar documentos existentes para este predio
      loadExistingDocuments(this.value);
    } else {
      documentSection.classList.add('hidden');
    }
  });

  // Función para cargar documentos existentes
  function loadExistingDocuments(propertyId) {
    fetch(`/api/predios/${propertyId}/documentos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(documents => {
        // Crear un mapa de documentos existentes
        const existingDocs = new Map(documents.map(doc => [doc.documentTypeId, doc]));

        // Actualizar el estado de cada tarjeta de documento
        documentTypes.forEach(type => {
          const card = document.querySelector(`[data-type-id="${type.id}"]`).closest('.bg-white');
          const existingDoc = existingDocs.get(type.id.toString());

          if (existingDoc) {
            // Documento existe
            card.classList.remove('border-red-200');
            card.classList.add('border-green-200');
            card.querySelector('button').textContent = 'Ver documento';
            card.querySelector('button').classList.remove('text-blue-600');
            card.querySelector('button').classList.add('text-green-600');

            // Agregar información del documento
            const infoDiv = card.querySelector('.doc-info') || document.createElement('div');
            infoDiv.className = 'doc-info mt-2 text-sm text-gray-600';
            infoDiv.innerHTML = `
            <p>Responsable: ${existingDoc.responsiblePerson}</p>
            <p>Fecha: ${new Date(existingDoc.documentDate).toLocaleDateString()}</p>
          `;
            if (!card.querySelector('.doc-info')) card.appendChild(infoDiv);
          } else {
            // Documento faltante
            card.classList.remove('border-green-200');
            card.classList.add('border-red-200');
            card.querySelector('button').textContent = 'Documento faltante - Subir';
            card.querySelector('button').classList.remove('text-green-600');
            card.querySelector('button').classList.add('text-red-600');
          }
        });
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

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
    uploadBtn.addEventListener('click', function () {
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
      const modalTitle = document.getElementById('modal-title');
      const documentTypeId = document.getElementById('document-type-id');
      const propertyId = document.getElementById('property-id');

      if (modalTitle) modalTitle.textContent = `Subir Documento: ${typeName}`;
      if (documentTypeId) documentTypeId.value = typeId;
      if (propertyId) propertyId.value = propertySelect.value;

      // Limpiar el formulario
      if (uploadForm) uploadForm.reset();
      if (selectedFileText) {
        selectedFileText.classList.add('hidden');
        selectedFileText.textContent = '';
      }

      if (uploadModal) uploadModal.classList.remove('hidden');
    }
  }

  // Cerrar el modal
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', function () {
      if (window.modalHelpers && window.modalHelpers.closeUploadModal) {
        window.modalHelpers.closeUploadModal();
      } else {
        if (uploadModal) uploadModal.classList.add('hidden');
      }
    });
  }

  if (cancelUploadBtn) {
    cancelUploadBtn.addEventListener('click', function () {
      if (window.modalHelpers && window.modalHelpers.closeUploadModal) {
        window.modalHelpers.closeUploadModal();
      } else {
        if (uploadModal) uploadModal.classList.add('hidden');
      }
    });
  }

  // Manejar la selección de archivos
  if (browseFilesBtn) {
    browseFilesBtn.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files.length > 0 && selectedFileText) {
        selectedFileText.textContent = `Archivo seleccionado: ${this.files[0].name}`;
        selectedFileText.classList.remove('hidden');
      } else if (selectedFileText) {
        selectedFileText.classList.add('hidden');
      }
    });
  }

  // Manejar el arrastrar y soltar archivos
  if (dropzone) {
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('border-blue-500');
    });

    dropzone.addEventListener('dragleave', function () {
      this.classList.remove('border-blue-500');
    });

    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('border-blue-500');

      if (e.dataTransfer.files.length > 0 && fileInput && selectedFileText) {
        fileInput.files = e.dataTransfer.files;
        selectedFileText.textContent = `Archivo seleccionado: ${e.dataTransfer.files[0].name}`;
        selectedFileText.classList.remove('hidden');
      }
    });
  }

  // Mejorar el manejo del envío del formulario
  if (uploadForm) {
    uploadForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const documentName = document.getElementById('document-name');
      const typeId = document.getElementById('document-type-id');
      const propertyId = document.getElementById('property-id');
      const responsiblePerson = document.getElementById('document-responsible'); // Corregido
      const documentDate = document.getElementById('document-date');
      const documentDescription = document.getElementById('document-description');

      if (!documentName || !typeId || !propertyId || !fileInput || !fileInput.files[0] || !responsiblePerson || !documentDate) {
        const missingFields = [];
        if (!documentName.value) missingFields.push('Nombre del documento');
        if (!responsiblePerson.value) missingFields.push('Persona responsable');
        if (!documentDate.value) missingFields.push('Fecha del documento');
        if (!fileInput.files[0]) missingFields.push('Archivo');
        
        alert(`Por favor complete los siguientes campos requeridos:\n\n${missingFields.join('\n')}`);
        return;
      }

      const file = fileInput.files[0];

      // Calcular el hash del archivo
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Crear FormData con todos los metadatos
      const formData = new FormData();
      formData.append('documentName', documentName.value);
      formData.append('documentTypeId', typeId.value);
      formData.append('propertyId', propertyId.value);
      formData.append('documentFile', file);
      formData.append('responsiblePerson', responsiblePerson.value);
      formData.append('documentDate', documentDate.value);
      formData.append('documentDescription', documentDescription.value);
      formData.append('fileHash', hashHex);
      formData.append('userId', JSON.parse(localStorage.getItem('user'))?.uid || 'unknown');
      formData.append('uploadDate', new Date().toISOString());

      // Deshabilitar el botón de envío
      if (submitUploadBtn) {
        submitUploadBtn.disabled = true;
        submitUploadBtn.textContent = 'Subiendo...';
      }

      try {
        // Subir a Firebase Storage
        // La configuración ya está disponible en window.firebaseConfig
        const app = firebase.initializeApp(window.firebaseConfig);
        const storage = firebase.storage();
        // Usa el método ref() en lugar de bucket()
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`documents/${propertyId.value}/${hashHex}/${file.name}`);
        
        // Y luego usa put() para subir el archivo
        const uploadTask = fileRef.put(file);
        
        uploadTask.on('state_changed', 
          (snapshot) => {
            // Mostrar progreso
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload is ${progress}% done`);
            if (submitUploadBtn) {
              submitUploadBtn.textContent = `Subiendo... ${Math.round(progress)}%`;
            }
          },
          (error) => {
            console.error('Error de subida:', error);
            alert(`Error al subir el archivo: ${error.message}`);
          },
          async () => {
            // Subida completada
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            // Agregar URL al FormData
            formData.append('fileUrl', downloadURL);

            // Enviar metadatos al servidor
            const response = await fetch('/api/documentos/upload', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });

            if (!response.ok) throw new Error('Error al subir el documento');

            const data = await response.json();
            alert('Documento subido correctamente');
            if (uploadModal) uploadModal.classList.add('hidden');

            // Recargar los documentos
            if (propertySelect.value) {
              loadExistingDocuments(propertySelect.value);
            }
          }
        );
      } catch (error) {
        console.error('Error:', error);
        alert('Error al subir el documento: ' + error.message);
      } finally {
        if (submitUploadBtn) {
          submitUploadBtn.disabled = false;
          submitUploadBtn.textContent = 'Subir Documento';
        }
      }
    });
  }
});
