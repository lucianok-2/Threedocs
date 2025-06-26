document.addEventListener('DOMContentLoaded', async () => {
    const propertyList = document.getElementById('property-list');
    const propertySearch = document.getElementById('property-search');
    const addPropertyBtn = document.getElementById('add-property-btn');
    const addPropertyModal = document.getElementById('add-property-modal');
    const closeAddModal = document.getElementById('close-add-modal');
    const addPropertyForm = document.getElementById('add-property-form');
    const editPropertyModal = document.getElementById('edit-property-modal');
    const closeEditModal = document.getElementById('close-edit-modal');
    const editPropertyForm = document.getElementById('edit-property-form');
    const cancelEditProperty = document.getElementById('cancel-edit-property');
    const cancelAddProperty = document.getElementById('cancel-add-property');

    const addPurchaseModel = document.getElementById('add-purchase-model');
    const addIntermediarySection = document.getElementById('add-intermediary-section');
    const editPurchaseModel = document.getElementById('edit-purchase-model');
    const editIntermediarySection = document.getElementById('edit-intermediary-section');

    // Función para validar RUT (sin dígito verificador)
    const validateRut = (rut) => {
        rut = rut.replace(/[^0-9Kk]/g, ''); // Eliminar caracteres no numéricos
        if (rut.length < 8 || rut.length > 9) return false;
        return true;
    };

    // Función para formatear RUT
    const formatRut = (rut) => {
        rut = rut.replace(/[^0-9Kk]/g, '');
        if (rut.length > 1) {
            return rut.slice(0, -1) + '-' + rut.slice(-1);
        }
        return rut;
    };

    // Event Listeners para formatear y validar RUT en tiempo real
    document.querySelectorAll('input[id$="-rut"]').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = formatRut(e.target.value);
        });
        input.addEventListener('blur', (e) => {
            if (e.target.value && !validateRut(e.target.value)) {
                alert('RUT inválido. Por favor, ingrese un RUT válido (sin dígito verificador).');
                e.target.value = '';
                e.target.focus();
            }
        });
    });

    // Toggle intermediary section based on purchase model
    const toggleIntermediarySection = (modelSelect, intermediarySection) => {
        if (modelSelect.value === 'Intermediario') {
            intermediarySection.classList.remove('hidden');
            intermediarySection.querySelectorAll('input').forEach(input => input.setAttribute('required', ''));
        } else {
            intermediarySection.classList.add('hidden');
            intermediarySection.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
        }
    };

    if (addPurchaseModel && addIntermediarySection) {
        addPurchaseModel.addEventListener('change', () => toggleIntermediarySection(addPurchaseModel, addIntermediarySection));
        toggleIntermediarySection(addPurchaseModel, addIntermediarySection); // Initial check
    }

    if (editPurchaseModel && editIntermediarySection) {
        editPurchaseModel.addEventListener('change', () => toggleIntermediarySection(editPurchaseModel, editIntermediarySection));
        toggleIntermediarySection(editPurchaseModel, editIntermediarySection); // Initial check
    }

    // Certification checkboxes logic
    const setupCertificationCheckboxes = (prefix) => {
        const certFsc = document.getElementById(`${prefix}-cert-fsc`);
        const certPefc = document.getElementById(`${prefix}-cert-pefc`);
        const certNone = document.getElementById(`${prefix}-cert-none`);
        const certFscCode = document.getElementById(`${prefix}-cert-fsc-code`);
        const certPefcCode = document.getElementById(`${prefix}-cert-pefc-code`);

        const updateCertificationInputs = () => {
            certFscCode.classList.toggle('hidden', !certFsc.checked);
            certPefcCode.classList.toggle('hidden', !certPefc.checked);

            if (certFsc.checked) certFscCode.setAttribute('required', ''); else certFscCode.removeAttribute('required');
            if (certPefc.checked) certPefcCode.setAttribute('required', ''); else certPefcCode.removeAttribute('required');
        };

        if (certFsc) certFsc.addEventListener('change', () => {
            if (certFsc.checked) certNone.checked = false;
            updateCertificationInputs();
        });
        if (certPefc) certPefc.addEventListener('change', () => {
            if (certPefc.checked) certNone.checked = false;
            updateCertificationInputs();
        });
        if (certNone) certNone.addEventListener('change', () => {
            if (certNone.checked) {
                if (certFsc) certFsc.checked = false;
                if (certPefc) certPefc.checked = false;
            }
            updateCertificationInputs();
        });
        updateCertificationInputs(); // Initial state
    };

    setupCertificationCheckboxes('add');
    setupCertificationCheckboxes('edit');

    // Show/Hide Modals
    window.showAddPropertyModal = () => {
        if (addPropertyModal) {
            addPropertyModal.classList.remove('hidden');
            addPropertyForm.reset();
            toggleIntermediarySection(addPurchaseModel, addIntermediarySection); // Reset intermediary section visibility
            setupCertificationCheckboxes('add'); // Reset certification inputs
        }
    };

    if (closeAddModal && addPropertyModal) {
        closeAddModal.addEventListener('click', () => addPropertyModal.classList.add('hidden'));
    }
    if (cancelAddProperty && addPropertyModal) {
        cancelAddProperty.addEventListener('click', () => addPropertyModal.classList.add('hidden'));
    }

    const showEditPropertyModal = (property) => {
        if (editPropertyModal) {
            editPropertyModal.classList.remove('hidden');
            document.getElementById('edit-property-name').value = property.name;
            document.getElementById('edit-purchase-model').value = property.purchaseModel;
            document.getElementById('edit-property-rol').value = property.rol;
            document.getElementById('edit-owner-rut').value = property.ownerRut;
            document.getElementById('edit-owner-name').value = property.ownerName;
            document.getElementById('edit-property-active').checked = property.active;

            // Set certifications
            document.getElementById('edit-cert-fsc').checked = property.certifications.includes('FSC');
            document.getElementById('edit-cert-pefc').checked = property.certifications.includes('PEFC');
            document.getElementById('edit-cert-none').checked = property.certifications.length === 0;
            document.getElementById('edit-cert-fsc-code').value = property.fscCode || '';
            document.getElementById('edit-cert-pefc-code').value = property.pefcCode || '';
            setupCertificationCheckboxes('edit'); // Update visibility of code inputs

            // Set intermediary info
            if (property.purchaseModel === 'Intermediario') {
                if (editIntermediarySection) {
                    editIntermediarySection.classList.remove('hidden');
                }
                document.getElementById('edit-intermediary-name').value = property.intermediaryName || '';
                document.getElementById('edit-intermediary-rut').value = property.intermediaryRut || '';
            } else {
                if (editIntermediarySection) {
                    editIntermediarySection.classList.add('hidden');
                }
            }

            editPropertyForm.dataset.propertyId = property._id; // Store property ID
        }
    };

    if (closeEditModal && editPropertyModal) {
        closeEditModal.addEventListener('click', () => editPropertyModal.classList.add('hidden'));
    }
    if (cancelEditProperty && editPropertyModal) {
        cancelEditProperty.addEventListener('click', () => editPropertyModal.classList.add('hidden'));
    }

    // Load Properties
    const loadProperties = async (searchTerm = '') => {
        if (!propertyList) return; // Ensure propertyList exists
        propertyList.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando predios...</p>';
        try {
            const response = await fetch('/api/properties');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let properties = await response.json();

            if (searchTerm) {
                properties = properties.filter(property =>
                    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    property.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    property.rol.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            propertyList.innerHTML = '';
            if (properties.length === 0) {
                propertyList.innerHTML = '<p class="text-gray-500 text-center py-4">No se encontraron predios.</p>';
                return;
            }

            properties.forEach(property => {
                const propertyItem = document.createElement('div');
                propertyItem.className = 'flex justify-between items-center p-3 hover:bg-gray-50 border-b last:border-b-0';
                propertyItem.innerHTML = `
                    <div>
                        <p class="text-sm font-medium text-gray-900">${property.name}</p>
                        <p class="text-xs text-gray-500">${property.ownerName} (${property.rol})</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="view-details-btn bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full" data-id="${property._id}">Ver Detalles</button>
                        <button class="edit-property-btn bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full" data-id="${property._id}">Editar</button>
                        <button class="delete-property-btn bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full" data-id="${property._id}">Eliminar</button>
                    </div>
                `;
                propertyList.appendChild(propertyItem);
            });

            // Add event listeners to new buttons
            document.querySelectorAll('.view-details-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const propertyId = e.target.dataset.id;
                    await loadPropertyDetails(propertyId);
                });
            });

            document.querySelectorAll('.edit-property-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const propertyId = e.target.dataset.id;
                    try {
                        const response = await fetch(`/api/properties/${propertyId}`);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const property = await response.json();
                        showEditPropertyModal(property);
                    } catch (error) {
                        console.error('Error loading property for edit:', error);
                        alert('Error al cargar los datos del predio para edición.');
                    }
                });
            });

            document.querySelectorAll('.delete-property-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const propertyId = e.target.dataset.id;
                    if (confirm('¿Está seguro de que desea eliminar este predio?')) {
                        try {
                            const response = await fetch(`/api/properties/${propertyId}`, {
                                method: 'DELETE',
                            });
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            alert('Predio eliminado exitosamente.');
                            loadProperties(); // Reload the list
                        } catch (error) {
                            console.error('Error deleting property:', error);
                            alert('Error al eliminar el predio.');
                        }
                    }
                });
            });

        } catch (error) {
            console.error('Error loading properties:', error);
            propertyList.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar los predios.</p>';
        }
    };

    // Search functionality
    if (propertySearch) {
        propertySearch.addEventListener('input', (e) => {
            loadProperties(e.target.value);
        });
    }

    // Add Property
    if (addPropertyForm) {
        addPropertyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const certifications = [];
            if (document.getElementById('add-cert-fsc').checked) certifications.push('FSC');
            if (document.getElementById('add-cert-pefc').checked) certifications.push('PEFC');

            const newProperty = {
                name: document.getElementById('add-property-name').value,
                purchaseModel: document.getElementById('add-purchase-model').value,
                rol: document.getElementById('add-property-rol').value,
                ownerRut: document.getElementById('add-owner-rut').value,
                ownerName: document.getElementById('add-owner-name').value,
                certifications: certifications,
                fscCode: document.getElementById('add-cert-fsc').checked ? document.getElementById('add-cert-fsc-code').value : '',
                pefcCode: document.getElementById('add-cert-pefc').checked ? document.getElementById('add-cert-pefc-code').value : '',
                intermediaryName: document.getElementById('add-purchase-model').value === 'Intermediario' ? document.getElementById('add-intermediary-name').value : '',
                intermediaryRut: document.getElementById('add-purchase-model').value === 'Intermediario' ? document.getElementById('add-intermediary-rut').value : '',
                active: document.getElementById('add-property-active').checked
            };

            try {
                const response = await fetch('/api/properties', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newProperty),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Error al añadir el predio: ${response.status} ${response.statusText}. Detalles: ${JSON.stringify(errorData)}`);
                }

                alert('Predio añadido exitosamente!');
                addPropertyModal.classList.add('hidden');
                loadProperties();
            } catch (error) {
                console.error('Error adding property:', error);
                alert(`Error al añadir el predio: ${error.message}`);
            }
        });
    }

    // Edit Property
    if (editPropertyForm) {
        editPropertyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const propertyId = editPropertyForm.dataset.propertyId;

            const certifications = [];
            if (document.getElementById('edit-cert-fsc').checked) certifications.push('FSC');
            if (document.getElementById('edit-cert-pefc').checked) certifications.push('PEFC');

            const updatedProperty = {
                nombre: document.getElementById('edit-property-name').value,
                modeloCompra: document.getElementById('edit-purchase-model').value,
                rol: document.getElementById('edit-property-rol').value,
                rutPropietario: document.getElementById('edit-owner-rut').value,
                nombrePropietario: document.getElementById('edit-owner-name').value,
                certificaciones: certifications,
                fscCode: document.getElementById('edit-cert-fsc').checked ? document.getElementById('edit-cert-fsc-code').value : '',
                pefcCode: document.getElementById('edit-cert-pefc').checked ? document.getElementById('edit-cert-pefc-code').value : '',
                intermediaryName: document.getElementById('edit-purchase-model').value === 'Intermediario' ? document.getElementById('edit-intermediary-name').value : '',
                intermediaryRut: document.getElementById('edit-purchase-model').value === 'Intermediario' ? document.getElementById('edit-intermediary-rut').value : '',
                activo: document.getElementById('edit-property-active').checked
            };

            try {
                const response = await fetch(`/api/properties/${propertyId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedProperty),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.log('Respuesta del servidor:', errorData);
                    throw new Error(`Error al actualizar el predio: ${response.status} ${response.statusText}. Detalles: ${JSON.stringify(errorData)}`);
                }

                alert('Predio actualizado exitosamente!');
                editPropertyModal.classList.add('hidden');
                loadProperties();
            } catch (error) {
                console.error('Error updating property:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Initial load
    loadProperties();
});

// Global function to be accessible from Handlebars
window.loadPropertyDetails = async (propertyId) => {
    const propertyDetailsModal = document.getElementById('property-details-modal');
    const propertyDetailsContent = document.getElementById('property-details-content');

    if (!propertyDetailsModal || !propertyDetailsContent) {
        console.error('Property details modal or content element not found.');
        return;
    }

    propertyDetailsContent.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando detalles del predio...</p>';
    propertyDetailsModal.classList.remove('hidden');

    try {
        const response = await fetch(`/api/properties/${propertyId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const property = await response.json();

        const certificationsHtml = property.certifications.length > 0
            ? property.certifications.map(cert => `<span class="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">${cert}</span>`).join('')
            : '<span class="text-gray-500 text-xs">Ninguna</span>';

        propertyDetailsContent.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800 mb-4">${property.name}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p><strong class="font-semibold">Modelo de Compras:</strong> ${property.purchaseModel}</p>
                <p><strong class="font-semibold">Rol del Predio:</strong> ${property.rol}</p>
                <p><strong class="font-semibold">RUT Propietario:</strong> ${property.ownerRut}</p>
                <p><strong class="font-semibold">Nombre Propietario:</strong> ${property.ownerName}</p>
                ${property.purchaseModel === 'Intermediario' ? `
                    <p><strong class="font-semibold">Nombre Intermediario:</strong> ${property.intermediaryName || 'N/A'}</p>
                    <p><strong class="font-semibold">RUT Intermediario:</strong> ${property.intermediaryRut || 'N/A'}</p>
                ` : ''}
                <p><strong class="font-semibold">Certificaciones:</strong> ${certificationsHtml}</p>
                ${property.fscCode ? `<p><strong class="font-semibold">Código FSC:</strong> ${property.fscCode}</p>` : ''}
                ${property.pefcCode ? `<p><strong class="font-semibold">Código PEFC:</strong> ${property.pefcCode}</p>` : ''}
                <p><strong class="font-semibold">Estado:</strong> <span class="${property.active ? 'text-green-600' : 'text-red-600'}">${property.active ? 'Activo' : 'Inactivo'}</span></p>
            </div>
            <div class="mt-6 pt-4 border-t">
                <h4 class="text-lg font-semibold text-gray-800 mb-3">Documentos Asociados</h4>
                <p class="text-gray-500">Funcionalidad de documentos no implementada aún.</p>
            </div>
        `;

        const closePropertyDetailsModal = document.getElementById('close-property-details-modal');
        if (closePropertyDetailsModal) {
            closePropertyDetailsModal.addEventListener('click', () => {
                if (propertyDetailsModal) {
                    propertyDetailsModal.classList.add('hidden');
                }
            });
        }

    } catch (error) {
        console.error('Error loading property details:', error);
        propertyDetailsContent.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar los detalles del predio.</p>';
    }
};