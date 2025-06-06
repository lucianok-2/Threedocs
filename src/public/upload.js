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
  const processAiBtn = document.getElementById('process-ai-btn');

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

  // Variable para almacenar los tipos de documentos recuperados
  let allFetchedDocumentTypes = [];

  // Mostrar tipos de documentos cuando se selecciona un predio
  propertySelect.addEventListener('change', async function () {
    if (this.value) {
      documentSection.classList.remove('hidden');
      documentTypesContainer.innerHTML = ''; // Clear previous

      try {
        const response = await fetch('/api/admin/document-types', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch document types: ${response.statusText}`);
        }
        allFetchedDocumentTypes = await response.json(); // Populate the higher-scoped variable

        if (!allFetchedDocumentTypes || allFetchedDocumentTypes.length === 0) {
          documentTypesContainer.innerHTML = '<p>No document types defined in the system.</p>';
          return;
        }

        // Add a general header
        const generalHeader = document.createElement('div');
        generalHeader.className = 'col-span-full mb-4'; // Asegúrate que col-span-full es la clase correcta para tu layout (ej. grid)
        generalHeader.innerHTML = '<h4 class="font-medium text-gray-700 mb-2">Documentación del Predio</h4>';
        documentTypesContainer.appendChild(generalHeader);

        allFetchedDocumentTypes.forEach(type => {
          addDocumentTypeCard(type); // Pass the full type object
        });

        loadExistingDocuments(this.value); // This function will need access to allFetchedDocumentTypes

      } catch (error) {
        console.error('Error fetching document types:', error);
        documentTypesContainer.innerHTML = '<p class="text-red-500">Error loading document types.</p>';
        allFetchedDocumentTypes = []; // Reset on error
      }
    } else {
      documentSection.classList.add('hidden');
      allFetchedDocumentTypes = []; // Clear if no property selected
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
        // Crear un mapa de documentos existentes (usando el ID de Firestore del tipo de documento)
        const existingDocs = new Map(documents.map(doc => [doc.documentTypeId, doc]));

        // Actualizar el estado de cada tarjeta de documento
        allFetchedDocumentTypes.forEach(type => {
          // Asegurarse de que el card exista antes de intentar modificarlo
          const cardButton = document.querySelector(`[data-type-id="${type.id}"]`);
          if (!cardButton) return; // Si no se encuentra el botón, pasar al siguiente tipo

          const card = cardButton.closest('.bg-white');
          if (!card) return; // Si no se encuentra la tarjeta, pasar al siguiente tipo
          
          const existingDoc = existingDocs.get(type.id); // Usar el ID de Firestore (type.id)

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
  function addDocumentTypeCard(type) { // type is now an object like { id: 'firestoreId', name: 'Doc Name', ... }
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow';
    // Usar type.description si existe, o un placeholder
    const description = type.description || 'Descripción no disponible.'; 
    
    card.innerHTML = `
      <h5 class="font-medium text-gray-800 mb-1">${type.name}</h5>
      <p class="text-xs text-gray-500 mb-2">${description}</p>
      <button type="button" class="upload-doc-btn mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center" 
              data-type-id="${type.id}" 
              data-type-name="${type.name}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        Subir documento
      </button>
    `;
    // Añadir data-fields-to-collect al botón
    const uploadBtn = card.querySelector('.upload-doc-btn');
    uploadBtn.dataset.fieldsToCollect = JSON.stringify(type.fieldsToCollect || []);


    documentTypesContainer.appendChild(card);

    // Agregar event listener al botón de subir
    uploadBtn.addEventListener('click', function () {
      const typeId = this.dataset.typeId;
      const typeName = this.dataset.typeName;
      const fieldsToCollect = JSON.parse(this.dataset.fieldsToCollect || '[]');
      openUploadModal(typeId, typeName, fieldsToCollect);
    });
  }

  // Función para abrir el modal de subida
  function openUploadModal(typeId, typeName, fieldsToCollect) {
    if (processAiBtn) {
      processAiBtn.classList.add('hidden');
      processAiBtn.disabled = true;
      processAiBtn.dataset.fieldsToCollect = JSON.stringify(fieldsToCollect || []);
    }
    console.log('Fields to collect for ' + typeName + ':', fieldsToCollect); // Log para verificar

    // El resto de la lógica para abrir el modal permanece, pero no se usa window.modalHelpers
    // ya que la tarea especifica actualizar solo openUploadModal en upload.js
    const modalTitleText = document.getElementById('modal-title-text'); // Usar el span dentro del h3
    const documentTypeIdInput = document.getElementById('document-type-id');
    const propertyIdInput = document.getElementById('property-id');

    if (modalTitleText) modalTitleText.textContent = `Subir: ${typeName}`;
    if (documentTypeIdInput) documentTypeIdInput.value = typeId;

    const documentTypeNameInput = document.getElementById('document-type-name');
    if (documentTypeNameInput) {
        documentTypeNameInput.value = typeName;
    } else {
        console.error('CRITICAL: Hidden input with ID "document-type-name" not found in upload.handlebars. This field is required for sending the type name.');
    }

    if (propertyIdInput) propertyIdInput.value = propertySelect.value;

    // Limpiar el formulario
    if (uploadForm) uploadForm.reset();
    if (selectedFileText) {
      selectedFileText.classList.add('hidden');
      selectedFileText.textContent = '';
    }
    
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    if (dynamicFieldsContainer) {
      dynamicFieldsContainer.innerHTML = ''; // Limpiar campos de una apertura anterior

      const standardStaticFieldLabels = [
        'Responsable', 
        'Descripción'
        // Ensure these labels exactly match the textContent of the <label> elements for
        // document-responsible and document-description in upload.handlebars
      ];

      if (fieldsToCollect && fieldsToCollect.length > 0) {
        fieldsToCollect.forEach((fieldName, index) => {
          if (standardStaticFieldLabels.includes(fieldName)) return; // Skip if static

          const fieldDiv = document.createElement('div');
          fieldDiv.className = 'mb-4'; // Each field in its own div, can be md:col-span-1 if two per row

          const label = document.createElement('label');
          const fieldId = `dynamic-field-${fieldName.replace(/\s+/g, '-').toLowerCase()}-${index}`;
          label.htmlFor = fieldId;
          label.textContent = fieldName;

          const input = document.createElement('input');
          input.type = 'text'; // Default to text
          input.id = fieldId;
          input.name = fieldId; // Use fieldId as name for FormData
          input.dataset.fieldName = fieldName; // Add data attribute for easier targeting
          input.className = 'w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500';
          input.placeholder = `Ingrese ${fieldName}`;

          // Make 'archivo kmz' optional
          if (fieldName.toLowerCase() === 'archivo kmz') {
            input.required = false;
            label.className = 'block text-gray-700 font-medium mb-2'; // Not required
          } else {
            input.required = true;
            label.className = 'block text-gray-700 font-medium mb-2 required-field'; // Required
          }

          fieldDiv.appendChild(label);
          fieldDiv.appendChild(input);
          dynamicFieldsContainer.appendChild(fieldDiv);
        });
      }
    }

    if (uploadModal) uploadModal.classList.remove('hidden');
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
      if (this.files.length > 0) {
        const selectedFile = this.files[0];
        if (processAiBtn) {
          if (selectedFile.type === "application/pdf") {
            processAiBtn.classList.remove('hidden');
            processAiBtn.disabled = false;
          } else {
            processAiBtn.classList.add('hidden');
            processAiBtn.disabled = true;
          }
        }
        if (selectedFileText) {
          selectedFileText.textContent = `Archivo seleccionado: ${selectedFile.name}`;
          selectedFileText.classList.remove('hidden');
        }
      } else {
        if (processAiBtn) {
          processAiBtn.classList.add('hidden');
          processAiBtn.disabled = true;
        }
        if (selectedFileText) {
          selectedFileText.classList.add('hidden');
        }
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
        const droppedFile = fileInput.files[0];
        if (processAiBtn) {
          if (droppedFile.type === "application/pdf") {
            processAiBtn.classList.remove('hidden');
            processAiBtn.disabled = false;
          } else {
            processAiBtn.classList.add('hidden');
            processAiBtn.disabled = true;
          }
        }
        selectedFileText.textContent = `Archivo seleccionado: ${droppedFile.name}`;
        selectedFileText.classList.remove('hidden');
      }
    });
  }

  // Mejorar el manejo del envío del formulario
  if (uploadForm) {
    uploadForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(); // Initialize FormData here

      // Get references to elements that are definitely part of the static form
      const responsiblePersonElement = document.getElementById('document-responsible');
      const documentDescriptionElement = document.getElementById('document-description');
      const typeIdElement = document.getElementById('document-type-id'); // Hidden
      const propertyIdElement = document.getElementById('property-id');   // Hidden
      const documentTypeNameElement = document.getElementById('document-type-name'); // New
      // fileInput is from outer scope

      const missingFieldsMessages = [];

      // Validate static required fields
      if (!responsiblePersonElement) {
        missingFieldsMessages.push('Falta el campo: Responsable (elemento HTML no encontrado).');
      } else if (!responsiblePersonElement.value.trim()) {
        missingFieldsMessages.push('Responsable es requerido.');
      }
      
      if (!fileInput) {
        missingFieldsMessages.push('Falta el campo: Archivo (elemento HTML no encontrado).');
      } else if (!fileInput.files || fileInput.files.length === 0) {
        missingFieldsMessages.push('Archivo es requerido.');
      }

      // Validate existence of hidden fields (sanity check)
      // if (!typeIdElement) missingFieldsMessages.push('Falta el campo oculto: Tipo de Documento ID.'); // No longer primary, but good to keep if used elsewhere
      if (!propertyIdElement) missingFieldsMessages.push('Falta el campo oculto: ID de Predio.');
      
      // Crucial Validation for documentTypeNameElement
      if (!documentTypeNameElement || !documentTypeNameElement.value) {
        // missingFieldsMessages.push('Nombre del tipo de documento no capturado. Asegúrese que el campo oculto document-type-name exista y tenga valor.');
        // Using alert directly as per subtask description for this specific critical error
        alert('Error: Nombre del tipo de documento no capturado. Asegúrese que el campo oculto document-type-name exista y tenga valor.');
        if (submitUploadBtn) {
            submitUploadBtn.disabled = false;
            submitUploadBtn.textContent = 'Subir Documento';
        }
        return;
      }


      // Note: Dynamic fields added by `openUploadModal` have their own `required` attribute.
      // The browser will enforce those. If any dynamic field is required and empty,
      // the 'submit' event might not even fire, or this code could be extended
      // to iterate over dynamic fields and check their `input.validity.valid`.
      // For now, relying on browser validation for dynamic required fields.

      if (missingFieldsMessages.length > 0) {
        alert(`Por favor corrija los siguientes errores:\n\n- ${missingFieldsMessages.join('\n- ')}`);
        return;
      }
      
      const file = fileInput.files[0];

      // Calcular el hash del archivo
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Crear FormData con todos los metadatos
      // formData.append('documentTypeId', typeIdElement.value); // Removed as per subtask
      formData.append('documentTypeNameForUpload', documentTypeNameElement.value); // Added
      formData.append('propertyId', propertyIdElement.value);
      formData.append('documentFile', file); 
      formData.append('responsiblePerson', responsiblePersonElement.value.trim());
      
      if (documentDescriptionElement) { // Append description if element exists and has a value (optional)
        formData.append('documentDescription', documentDescriptionElement.value.trim());
      }
      formData.append('fileHash', hashHex);
      formData.append('userId', JSON.parse(localStorage.getItem('user'))?.uid || 'unknown');
      formData.append('uploadDate', new Date().toISOString());

      // Collect data from dynamic fields
      const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
      if (dynamicFieldsContainer) {
        const dynamicInputs = dynamicFieldsContainer.querySelectorAll('input, textarea, select');
        dynamicInputs.forEach(input => {
          if (input.name && input.value) {
            formData.append(input.name, input.value);
          }
        });
      }

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
        const fileRef = storageRef.child(`documents/${propertyIdElement.value}/${hashHex}/${file.name}`);
        
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

  if (processAiBtn) {
    processAiBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      const file = fileInput.files[0];

      if (!file) {
        alert('Por favor, seleccione un archivo PDF primero.');
        return;
      }
      if (file.type !== "application/pdf") {
        alert('La función "Procesar con IA" solo está disponible para archivos PDF.');
        return;
      }

      const documentTypeName = document.getElementById('document-type-name').value;
      const fieldsToCollect = JSON.parse(processAiBtn.dataset.fieldsToCollect || '[]');

      // Loading indicator (start)
      processAiBtn.disabled = true;
      processAiBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';

      const aiFormData = new FormData();
      aiFormData.append('documentFile', file);
      aiFormData.append('fieldsToCollect', JSON.stringify(fieldsToCollect));
      aiFormData.append('documentTypeName', documentTypeName);

      try {
        const response = await fetch('/api/documentos/process-ai', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: aiFormData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido en el servidor' }));
          throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        const extractedData = await response.json();

        if (extractedData && typeof extractedData === 'object') {
          for (const fieldNameFromAI in extractedData) {
            if (Object.prototype.hasOwnProperty.call(extractedData, fieldNameFromAI)) {
              const value = extractedData[fieldNameFromAI];
              let fieldPopulated = false;

              // Check standard static fields first (case-insensitive for key from AI)
              if (fieldNameFromAI.toLowerCase() === 'descripción' || fieldNameFromAI.toLowerCase() === 'descripcion') {
                const descriptionField = document.getElementById('document-description');
                if (descriptionField) { descriptionField.value = value; fieldPopulated = true; }
              } else if (fieldNameFromAI.toLowerCase() === 'responsable') {
                const responsibleField = document.getElementById('document-responsible');
                if (responsibleField) { responsibleField.value = value; fieldPopulated = true; }
              }

              if (fieldPopulated) continue; // If populated in static field, move to next AI field

              // Try to populate dynamic fields
              const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
              if (dynamicFieldsContainer) {
                // Attempt to find the input field by its data-field-name attribute
                // This requires dynamic inputs to have 'data-field-name' matching the keys from AI
                const inputField = dynamicFieldsContainer.querySelector(`[data-field-name="${fieldNameFromAI}"]`);
                if (inputField) {
                  inputField.value = value;
                } else {
                  console.warn(`No se encontró un campo dinámico para los datos extraídos: "${fieldNameFromAI}"`);
                }
              }
            }
          }
        }
        alert('Documento procesado con IA. Por favor revise los campos y complete la subida.');

      } catch (error) {
        console.error('Error en Procesar con IA:', error);
        alert(`Error en el procesamiento con IA: ${error.message}`);
      } finally {
        processAiBtn.disabled = false;
        processAiBtn.innerHTML = '<i class="fas fa-cogs mr-2"></i> Procesar con IA';
      }
    });
  }
});
