// Objeto para almacenar las funciones de ayuda para modales
window.modalHelpers = {
  // Modal para añadir propiedad
  showAddPropertyModal: function() {
    const modal = document.getElementById('add-property-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  },
  
  closeAddPropertyModal: function() {
    const modal = document.getElementById('add-property-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },
  
  // Modal para editar propiedad
  showEditPropertyModal: function(propertyId) {
    const modal = document.getElementById('edit-property-modal');
    if (modal) {
      modal.classList.remove('hidden');
      // Guardar el ID de la propiedad para usarlo al guardar
      modal.dataset.propertyId = propertyId;
    }
  },
  
  closeEditPropertyModal: function() {
    const modal = document.getElementById('edit-property-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },
  
  // Modal para subir documentos
  openUploadModal: function(typeId, typeName, propertyId) {
    const modal = document.getElementById('upload-modal');
    if (modal) {
      document.getElementById('modal-title').textContent = `Subir Documento: ${typeName}`;
      document.getElementById('document-type-id').value = typeId;
      // Store the document type name in a new hidden input or update if exists
      let typeNameElement = document.getElementById('document-type-name');
      if (!typeNameElement) {
        
        console.error('Hidden input with ID "document-type-name" not found. Please add it to the upload modal HTML.');
        
      }
      // Set the value regardless of whether it was found or not, to adhere to the subtask's intent.
      // If the element isn't there, this line will cause an error if typeNameElement is null.
      // So, we ensure it's at least attempted if the element is expected.
      if (document.getElementById('document-type-name')) {
          document.getElementById('document-type-name').value = typeName;
      } // else, it's handled by the console error above.
      
      document.getElementById('property-id').value = propertyId;
      
      // Limpiar el formulario
      const form = document.getElementById('upload-form');
      if (form) {
        form.reset();
      }
      
      const selectedFileText = document.getElementById('selected-file');
      if (selectedFileText) {
        selectedFileText.classList.add('hidden');
        selectedFileText.textContent = '';
      }
      
      modal.classList.remove('hidden');
    }
  },
  
  closeUploadModal: function() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
};

// Función para alternar la sección de intermediario
function toggleIntermediarySection() {
  const purchaseModel = document.getElementById('purchase-model');
  const intermediarySection = document.getElementById('intermediary-section');
  
  if (purchaseModel && intermediarySection) {
    if (purchaseModel.value === 'Intermediario') {
      intermediarySection.classList.remove('hidden');
    } else {
      intermediarySection.classList.add('hidden');
    }
  }
}

// Función para mostrar el modal de añadir propiedad
function showAddPropertyModal() {
  if (window.modalHelpers) {
    window.modalHelpers.showAddPropertyModal();
  }
}

// Función para mostrar un modal
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

// Función para ocultar un modal
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Función para cerrar modales cuando se hace clic fuera de ellos
document.addEventListener('click', function(event) {
  const modals = document.querySelectorAll('.fixed.inset-0.bg-gray-900.bg-opacity-50');
  modals.forEach(modal => {
    if (event.target === modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });
});