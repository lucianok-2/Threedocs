// Estas funciones son solo un esqueleto y deberán ser implementadas
// con la lógica real para cargar datos desde Firebase/Firestore

// Variable global para almacenar el predio actual
let currentPropertyId = null;

// Función para abrir el modal del predio
function openProperty(propertyId) {
    currentPropertyId = propertyId;
    // Mostrar el modal
    document.getElementById('propertyModal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Cargar datos del predio seleccionado
    fetch(`/api/predios/${propertyId}`)
        .then(response => response.json())
        .then(data => {
            // Actualizar la UI con los datos del predio
            document.getElementById('modalPropertyTitle').textContent = data.nombre || 'Predio sin nombre';
            document.getElementById('modalPropertyAddress').textContent = data.ubicacion || 'Sin dirección';
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
            
            // Obtener todos los tipos de documentos definidos
            const allDocumentTypes = {
                1: "CONSULTA ANTECEDENTE BIEN RAIZ (SII)",
                2: "RESOLUCIÓN PLAN DE MANEJO",
                3: "AVISO EJECUCION DE FAENA",
                4: "ESCRITURA O TITULOS DE DOMINIO",
                5: "CONTRATO COMPRA Y VENTA",
                6: "PLANO DEL PREDIO",
                7: "CONTRATO DE TRABAJO",
                8: "DERECHO A SABER",
                9: "ENTREGA EPP",
                10: "VARIOS",
                11: "REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD",
                12: "REGISTRO DE CAPACITACIÓN",
                13: "DOCTO. ADICIONAL"
            };
            
            // Crear un mapa de documentos existentes por tipo
            const existingDocsByType = {};
            documents.forEach(doc => {
                if (doc.tipo_documento) {
                    if (!existingDocsByType[doc.tipo_documento]) {
                        existingDocsByType[doc.tipo_documento] = [];
                    }
                    existingDocsByType[doc.tipo_documento].push(doc);
                }
            });
            
            // Mostrar todos los tipos de documentos, existentes o no
            Object.entries(allDocumentTypes).forEach(([typeId, docTypeName]) => {
                const existingDocs = existingDocsByType[parseInt(typeId)] || [];
                const estado = existingDocs.length > 0 ? 'completo' : 'faltante';
                const docCount = existingDocs.length;
                
                const docElement = document.createElement('div');
                docElement.className = `p-4 hover:bg-blue-50 cursor-pointer border-l-4 border-${getStatusColor(estado)}`;
                docElement.setAttribute('data-document-type', typeId);
                docElement.setAttribute('data-property-id', propertyId);
                
                // Agregar evento click para mostrar documentos del tipo
                docElement.onclick = () => showDocumentsByType(parseInt(typeId), docTypeName, propertyId);
                
                docElement.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-medium text-gray-800">${docTypeName}</h4>
                            <p class="text-sm text-gray-500">${docCount > 0 ? `${docCount} documento(s)` : 'Sin documentos'}</p>
                        </div>
                        <span class="bg-${getStatusBgColor(estado)} text-${getStatusTextColor(estado)} text-xs px-2 py-1 rounded-full">
                            ${getStatusLabel(estado)} ${docCount > 0 ? `(${docCount})` : ''}
                        </span>
                    </div>
                    <div class="flex items-center mt-2 text-sm text-gray-500">
                        <i class="fas fa-file-alt mr-2"></i>
                        <span>${docCount > 0 ? 'Hacer clic para ver documentos' : 'No hay documentos de este tipo'}</span>
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

// Nueva función para mostrar documentos por tipo
function showDocumentsByType(documentTypeId, documentTypeName, propertyId) {
    // Crear parámetros de consulta para filtrar por tipo, predio y usuario
    const params = new URLSearchParams({
        tipo_documento: documentTypeId,
        id_predio: propertyId
    });
    
    fetch(`/api/documentos/buscar?${params}`)
        .then(response => response.json())
        .then(documents => {
            // Mostrar modal o panel con la lista de documentos
            showDocumentsListModal(documents, documentTypeName);
        })
        .catch(error => {
            console.error('Error al cargar documentos por tipo:', error);
            alert('Error al cargar los documentos. Por favor, intenta de nuevo.');
        });
}

// Función para mostrar modal con lista de documentos
function showDocumentsListModal(documents, documentTypeName) {
    // Crear o mostrar modal para lista de documentos
    let documentsModal = document.getElementById('documentsListModal');
    
    if (!documentsModal) {
        // Crear el modal si no existe
        documentsModal = document.createElement('div');
        documentsModal.id = 'documentsListModal';
        documentsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        
        documentsModal.innerHTML = `
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h2 id="documentsModalTitle" class="text-2xl font-bold text-gray-800"></h2>
                        <button onclick="closeDocumentsListModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                <div class="p-6 overflow-y-auto max-h-[70vh]">
                    <div id="documentsListContent" class="space-y-4">
                        <!-- Aquí se cargarán los documentos -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(documentsModal);
    }
    
    // Actualizar título
    document.getElementById('documentsModalTitle').textContent = `Documentos: ${documentTypeName}`;
    
    // Mostrar documentos
    const documentsListContent = document.getElementById('documentsListContent');
    documentsListContent.innerHTML = '';
    
    if (documents.length === 0) {
        documentsListContent.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-file-alt text-gray-400 text-4xl mb-4"></i>
                <p class="text-gray-500">No hay documentos de este tipo</p>
            </div>
        `;
    } else {
        documents.forEach(doc => {
            const docElement = document.createElement('div');
            docElement.className = 'bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors';
            docElement.onclick = () => viewDocument(doc);
            
            docElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="flex-shrink-0">
                            <i class="fas ${getFileIcon(doc.tipo_archivo)} text-2xl text-blue-500"></i>
                        </div>
                        <div>
                            <h3 class="font-medium text-gray-800">${doc.nombre}</h3>
                            <p class="text-sm text-gray-500">
                                Subido el ${formatDate(doc.fecha_subida)} • ${formatFileSize(doc.tamano)}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="event.stopPropagation(); downloadDocument('${doc._id}')" 
                                class="text-blue-500 hover:text-blue-700 p-2">
                            <i class="fas fa-download"></i>
                        </button>
                        <button onclick="event.stopPropagation(); viewDocument(${JSON.stringify(doc).replace(/"/g, '&quot;')})" 
                                class="text-green-500 hover:text-green-700 p-2">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
            
            documentsListContent.appendChild(docElement);
        });
    }
    
    // Mostrar modal
    documentsModal.classList.remove('hidden');
}

// Función para cerrar modal de lista de documentos
function closeDocumentsListModal() {
    const documentsModal = document.getElementById('documentsListModal');
    if (documentsModal) {
        documentsModal.classList.add('hidden');
    }
}

// Función para ver un documento específico
function viewDocument(doc) {
    // Cerrar modal de lista
    closeDocumentsListModal();
    
    // Mostrar el documento en el visor principal
    document.getElementById('docType').textContent = doc.nombre;
    
    // Usar la URL directa del archivo si está disponible
    let fileUrl;
    if (doc.url_archivo) {
        fileUrl = doc.url_archivo;
    } else {
        // Construir URL correctamente usando el bucket de Firebase
        const bucketName = firebase.app().options.storageBucket;
        const encodedPath = encodeURIComponent(doc.ruta_archivo);
        fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
    }
    
    const iframe = document.getElementById('documentIframe');
    iframe.src = fileUrl;
    document.getElementById('documentPreviewContent').classList.remove('hidden');
    document.getElementById('preview-placeholder').classList.add('hidden');
}

// Función para descargar documento
function downloadDocument(documentId) {
    fetch(`/api/documentos/${documentId}/download`)
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Error al descargar el documento');
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `documento_${documentId}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            console.error('Error al descargar:', error);
            alert('Error al descargar el documento');
        });
}

// Función para obtener icono según tipo de archivo
function getFileIcon(mimeType) {
    if (!mimeType) return 'fa-file';
    
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('image')) return 'fa-file-image';
    if (mimeType.includes('word')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
    
    return 'fa-file';
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para mostrar un documento específico (función original mantenida para compatibilidad)
function showDocument(documentId) {
    fetch(`/api/documentos/${documentId}`)
        .then(response => response.json())
        .then(document => {
            document.getElementById('docType').textContent = document.nombre_tipo_documento || document.nombre;
            
            // Mostrar el documento desde Firebase Storage
            const iframe = document.getElementById('documentIframe');
            iframe.src = document.url_archivo;
            document.getElementById('documentPreviewContent').classList.remove('hidden');
            document.getElementById('preview-placeholder').classList.add('hidden');
        });
}

// Función para cerrar el modal
function closePropertyModal() {
    document.getElementById('propertyModal').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    currentPropertyId = null;
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
    
    // Cerrar modal de documentos al hacer clic fuera
    document.addEventListener('click', function(e) {
        const documentsModal = document.getElementById('documentsListModal');
        if (documentsModal && e.target === documentsModal) {
            closeDocumentsListModal();
        }
    });
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if(e.key === 'Escape') {
            closePropertyModal();
            closeDocumentsListModal();
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
                <img src="${property.imageUrl || '/images/5077814.png'}" alt="${property.nombre || 'Sin nombre'}" class="w-full h-48 object-cover">
                <div class="absolute top-2 right-2 bg-${statusColor} text-white px-2 py-1 rounded-full text-xs font-bold">${getPropertyStatus(property)}</div>
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-gray-800">${property.nombre || 'Sin nombre'}</h3>
                    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${property.rutPropietario || 'Sin RUT'}</span>
                </div>
                <p class="text-gray-600 mb-4">${property.ubicacion || 'Sin dirección'}</p>
                
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