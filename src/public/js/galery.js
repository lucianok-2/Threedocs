// Estas funciones son solo un esqueleto y deberán ser implementadas
// con la lógica real para cargar datos desde Firebase/Firestore

// Función para abrir el modal del predio
function openProperty(propertyId) {
    // Mostrar el modal
    document.getElementById('propertyModal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Cargar datos del predio seleccionado
    fetch(`/api/predios/${propertyId}`)
        .then(response => response.json())
        .then(data => {
            // Actualizar la UI con los datos del predio
            document.getElementById('modalPropertyTitle').textContent = data.nombre || data.name || 'Predio sin nombre';
            document.getElementById('modalPropertyAddress').textContent = data.ubicacion || data.address || 'Sin dirección';
            document.getElementById('modalPropertyRut').textContent = data.rutPropietario || 'Sin RUT';
            
            // Cargar los documentos del predio
            loadPropertyDocuments(propertyId);
        })
        .catch(error => {
            console.error('Error al cargar los datos del predio:', error);
            document.getElementById('modalPropertyTitle').textContent = 'Error al cargar el predio';
        });
}

// Función para cargar los documentos de un predio
function loadPropertyDocuments(propertyId) {
    // Cargar los documentos desde Firestore a través de la API
    fetch(`/api/predios/${propertyId}/documentos`)
        .then(response => response.json())
        .then(documents => {
            const documentsList = document.getElementById('documents-list');
            documentsList.innerHTML = '';
            
            if (documents.length === 0) {
                documentsList.innerHTML = '<div class="p-4 text-center text-gray-500">No hay documentos disponibles para este predio.</div>';
                return;
            }
            
            // Crear elementos para cada documento
            documents.forEach(doc => {
                const docElement = document.createElement('div');
                docElement.className = `p-4 hover:bg-blue-50 cursor-pointer border-l-4 border-${getStatusColor(doc.estado || 'faltante')}`;
                docElement.setAttribute('data-document-id', doc._id);
                docElement.onclick = () => showDocument(doc._id);
                
                docElement.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-medium text-gray-800">${doc.nombre || doc.name || 'Documento sin nombre'}</h4>
                            <p class="text-sm text-gray-500">${doc.tipo || doc.type || 'Sin tipo'}</p>
                        </div>
                        <span class="bg-${getStatusBgColor(doc.estado || 'faltante')} text-${getStatusTextColor(doc.estado || 'faltante')} text-xs px-2 py-1 rounded-full">${getStatusLabel(doc.estado || 'faltante')}</span>
                    </div>
                    <div class="flex items-center mt-2 text-sm text-gray-500">
                        <i class="fas fa-calendar-alt mr-2"></i>
                        <span>${formatDate(doc.fecha_creacion || doc.fecha || doc.uploadDate || new Date())}</span>
                    </div>
                `;
                
                documentsList.appendChild(docElement);
            });
        })
        .catch(error => {
            console.error('Error al cargar los documentos:', error);
            const documentsList = document.getElementById('documents-list');
            documentsList.innerHTML = '<div class="p-4 text-center text-red-500">Error al cargar los documentos. Por favor, intenta de nuevo.</div>';
        });
}

// Función para mostrar un documento específico
function showDocument(docId) {
    // Resetear todos los documentos
    document.querySelectorAll('[data-document-id]').forEach(el => {
        el.classList.remove('bg-blue-50');
    });
    
    // Resaltar el documento seleccionado
    document.querySelector(`[data-document-id="${docId}"]`).classList.add('bg-blue-50');
    
    // Mostrar información del documento seleccionado
    const docTitle = document.getElementById('documentTitle');
    const docIcon = document.getElementById('documentIcon');
    const docMessage = document.getElementById('documentMessage');
    const docPreview = document.getElementById('documentPreviewContent');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    
    // Cargar datos del documento desde Firestore
    fetch(`/api/documents/${docId}`)
        .then(response => response.json())
        .then(doc => {
            // Actualizar título y detalles
            docTitle.textContent = doc.name;
            
            // Ocultar el placeholder y mostrar la vista previa
            previewPlaceholder.classList.add('hidden');
            docPreview.classList.remove('hidden');
            
            // Actualizar detalles del documento
            document.getElementById('docType').textContent = doc.type;
            document.getElementById('docStatus').innerHTML = `<span class="bg-${getStatusBgColor(doc.status)} text-${getStatusTextColor(doc.status)} px-2 py-1 rounded-full text-xs">${doc.status}</span>`;
            document.getElementById('docDate').textContent = formatDate(doc.uploadDate);
            document.getElementById('docRut').textContent = doc.rutAsociado || '-';
            document.getElementById('docResponsible').textContent = doc.responsable || '-';
            document.getElementById('docNotes').textContent = doc.observaciones || '-';
            
            // Cargar el documento en el iframe (si es un PDF) o mostrar una vista previa adecuada
            const iframe = document.getElementById('documentIframe');
            iframe.src = doc.fileUrl;
        })
        .catch(error => {
            console.error('Error al cargar el documento:', error);
            previewPlaceholder.classList.remove('hidden');
            docPreview.classList.add('hidden');
            docMessage.textContent = 'Error al cargar el documento';
        });
}

// Función para cerrar el modal
function closePropertyModal() {
    document.getElementById('propertyModal').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// Funciones auxiliares para formatear datos
function getStatusColor(status) {
    if (!status) return 'gray-400';
    
    switch(status.toLowerCase()) {
        case 'aprobado':
        case 'completo': return 'green-600';
        case 'en revisión':
        case 'pendiente': return 'yellow-400';
        case 'rechazado':
        case 'faltante': return 'red-400';
        default: return 'gray-400';
    }
}

function getStatusBgColor(status) {
    if (!status) return 'gray-100';
    
    switch(status.toLowerCase()) {
        case 'aprobado':
        case 'completo': return 'green-100';
        case 'en revisión':
        case 'pendiente': return 'yellow-100';
        case 'rechazado':
        case 'faltante': return 'red-100';
        default: return 'gray-100';
    }
}

function getStatusTextColor(status) {
    if (!status) return 'gray-800';
    
    switch(status.toLowerCase()) {
        case 'aprobado':
        case 'completo': return 'green-800';
        case 'en revisión':
        case 'pendiente': return 'yellow-800';
        case 'rechazado':
        case 'faltante': return 'red-800';
        default: return 'gray-800';
    }
}

function getStatusLabel(status) {
    if (!status) return 'Faltante';
    
    switch(status.toLowerCase()) {
        case 'aprobado':
        case 'completo': return 'Completo';
        case 'en revisión':
        case 'pendiente': return 'Pendiente';
        case 'rechazado':
        case 'faltante': return 'Faltante';
        default: return status;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Cerrar modal al hacer clic fuera del contenido
    const propertyModal = document.getElementById('propertyModal');
    if (propertyModal) {
        propertyModal.addEventListener('click', function(e) {
            if(e.target === this) {
                closePropertyModal();
            }
        });
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if(e.key === 'Escape') {
            closePropertyModal();
        }
    });
    
    // Cargar los predios desde Firestore
    loadProperties();
    
    // Configurar eventos para filtros y ordenamiento
    const filterStatus = document.getElementById('filter-status');
    const sortBy = document.getElementById('sort-by');
    
    if (filterStatus) {
        filterStatus.addEventListener('change', function() {
            loadProperties();
        });
    }
    
    if (sortBy) {
        sortBy.addEventListener('change', function() {
            loadProperties();
        });
    }
});

// Función para cargar los predios
function loadProperties() {
    const filterStatus = document.getElementById('filter-status')?.value || 'all';
    const sortBy = document.getElementById('sort-by')?.value || 'name-asc';
    
    // Obtener los predios desde la API
    fetch('/api/predios')
        .then(response => response.json())
        .then(properties => {
            // Filtrar predios según el estado seleccionado
            let filteredProperties = properties;
            if (filterStatus !== 'all') {
                filteredProperties = properties.filter(property => {
                    // Implementar lógica de filtrado según tus necesidades
                    if (filterStatus === 'pending') {
                        return property.hasPendingDocs;
                    } else if (filterStatus === 'complete') {
                        return property.hasCompleteDocs && !property.hasPendingDocs && !property.hasMissingDocs;
                    }
                    return true;
                });
            }
            
            // Ordenar predios
            filteredProperties.sort((a, b) => {
                if (sortBy === 'name-asc') {
                    // Verificar si las propiedades name existen
                    const nameA = a.name || a.nombre || '';
                    const nameB = b.name || b.nombre || '';
                    return nameA.localeCompare(nameB);
                } else if (sortBy === 'name-desc') {
                    // Verificar si las propiedades name existen
                    const nameA = a.name || a.nombre || '';
                    const nameB = b.name || b.nombre || '';
                    return nameB.localeCompare(nameA);
                } else if (sortBy === 'date-desc') {
                    // Usar fecha de creación o fecha de subida si está disponible
                    const dateA = a.createdAt || a.fecha_creacion || a.fecha_subida || new Date(0);
                    const dateB = b.createdAt || b.fecha_creacion || b.fecha_subida || new Date(0);
                    return new Date(dateB) - new Date(dateA);
                }
                return 0;
            });
            
            // Actualizar contadores
            const propertiesCount = document.getElementById('properties-count');
            const totalProperties = document.getElementById('total-properties');
            if (propertiesCount) propertiesCount.textContent = filteredProperties.length;
            if (totalProperties) totalProperties.textContent = properties.length;
            
            // Renderizar los predios
            renderProperties(filteredProperties);
        })
        .catch(error => {
            console.error('Error al cargar los predios:', error);
            const propertiesGrid = document.getElementById('properties-grid');
            if (propertiesGrid) {
                propertiesGrid.innerHTML = `
                    <div class="col-span-full text-center py-10">
                        <p class="text-gray-500 text-lg">Error al cargar los predios. Por favor, intenta de nuevo más tarde.</p>
                    </div>
                `;
            }
        });
}

// Función para renderizar los predios en la UI
function renderProperties(properties) {
    const propertiesGrid = document.getElementById('properties-grid');
    if (!propertiesGrid) return;
    
    if (properties.length === 0) {
        propertiesGrid.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-gray-500 text-lg">No se encontraron predios que coincidan con los criterios de búsqueda.</p>
            </div>
        `;
        return;
    }
    
    // Limpiar el grid
    propertiesGrid.innerHTML = '';
    
    // Crear una tarjeta para cada predio
    properties.forEach(property => {
        // Calcular estado y colores
        const statusColor = getPropertyStatusColor(property);
        const completedDocs = property.completedDocs || 0;
        const totalDocs = property.totalDocs || 0;
        const pendingDocs = property.pendingDocs || 0;
        const missingDocs = property.missingDocs || 0;
        
        const propertyCard = document.createElement('div');
        propertyCard.className = 'document-card bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer';
        propertyCard.setAttribute('data-property-id', property._id);
        propertyCard.onclick = () => openProperty(property._id);
        
        propertyCard.innerHTML = `
            <div class="relative">
                <img src="${property.imageUrl || '/images/property-placeholder.jpg'}" alt="${property.name}" class="w-full h-48 object-cover">
                <div class="absolute top-2 right-2 bg-${statusColor} text-white px-2 py-1 rounded-full text-xs font-bold">${getPropertyStatus(property)}</div>
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-gray-800">${property.name}</h3>
                    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${property.rutPropietario || 'Sin RUT'}</span>
                </div>
                <p class="text-gray-600 mb-4">${property.address || 'Sin dirección'}</p>
                
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-sm text-gray-500">Documentos:</span>
                        <span class="ml-2 font-medium">${completedDocs}/${totalDocs}</span>
                    </div>
                    <div class="flex space-x-1">
                        ${completedDocs > 0 ? `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">${completedDocs} Completos</span>` : ''}
                        ${pendingDocs > 0 ? `<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">${pendingDocs} Pendientes</span>` : ''}
                        ${missingDocs > 0 ? `<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">${missingDocs} Faltantes</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        propertiesGrid.appendChild(propertyCard);
    });
}

// Función para determinar el estado general del predio
function getPropertyStatus(property) {
    if (property.status) return property.status;
    
    const completedDocs = property.completedDocs || 0;
    const totalDocs = property.totalDocs || 0;
    const pendingDocs = property.pendingDocs || 0;
    const missingDocs = property.missingDocs || 0;
    
    if (completedDocs === totalDocs && totalDocs > 0) {
        return 'Completo';
    } else if (pendingDocs > 0) {
        return 'En Proceso';
    } else if (missingDocs > 0) {
        return 'Incompleto';
    } else {
        return 'Sin Documentos';
    }
}

// Función para determinar el color del estado del predio
function getPropertyStatusColor(property) {
    const status = getPropertyStatus(property);
    
    switch(status.toLowerCase()) {
        case 'completo': return 'green-500';
        case 'en proceso': return 'yellow-500';
        case 'incompleto': return 'red-500';
        default: return 'gray-500';
    }
}