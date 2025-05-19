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