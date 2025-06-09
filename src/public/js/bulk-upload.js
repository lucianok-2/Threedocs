import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase-config.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Function to generate a unique ID
const generateUniqueId = () => {
    return '_' + Math.random().toString(36).substr(2, 9);
};

// Function to upload file to Firebase Storage    
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const propertySelect = document.getElementById('property-select');
    const bulkUploadButton = document.getElementById('bulk-upload-button');
    const documentSection = document.getElementById('document-section');

    // Crear input para archivos múltiples
    const bulkFileInput = document.createElement('input');
    bulkFileInput.type = 'file';
    bulkFileInput.accept = '.pdf';
    bulkFileInput.multiple = true;
    bulkFileInput.style.display = 'none';
    document.body.appendChild(bulkFileInput);

    // IMPORTANT: Replace with your actual Gemini API key
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

    // Initially hide the bulk upload button
    if (bulkUploadButton) {
        bulkUploadButton.style.display = 'none';
    }

    // Show/hide bulk upload button based on property selection
    if (propertySelect) {
        propertySelect.addEventListener('change', function () {
            const selectedProperty = this.value;

            if (selectedProperty && selectedProperty !== '') {
                // Show bulk upload button when property is selected
                if (bulkUploadButton) {
                    bulkUploadButton.style.display = 'flex';
                    console.log('✅ Predio seleccionado. Botón de carga masiva habilitado.');
                }

                // Show document section if it exists
                if (documentSection) {
                    documentSection.classList.remove('hidden');
                }
            } else {
                // Hide bulk upload button when no property is selected
                if (bulkUploadButton) {
                    bulkUploadButton.style.display = 'none';
                }

                // Hide document section
                if (documentSection) {
                    documentSection.classList.add('hidden');
                }
            }
        });
    }

    // Handle bulk upload button click
    if (bulkUploadButton) {
        bulkUploadButton.addEventListener('click', (e) => {
            e.preventDefault();

            const selectedProperty = propertySelect ? propertySelect.value : '';

            if (!selectedProperty || selectedProperty === '') {
                alert('Por favor, seleccione un predio antes de subir documentos.');
                return;
            }

            console.log('🚀 Iniciando carga masiva para el predio:', selectedProperty);
            bulkFileInput.click();
        });
    }

    // Function to convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    // Enhanced preprocessing for scanned documents
    const preprocessText = (text) => {
        if (!text) return '';

        return text
            .replace(/\s+/g, ' ')
            .replace(/\bIVl\b/g, 'IVI')
            .replace(/\bvI\b/g, 'VI')
            .replace(/\bl\b/g, 'I')
            .replace(/\bO\b/g, '0')
            .replace(/\brn\b/g, 'm')
            .replace(/\bvv\b/g, 'w')
            .replace(/\bcl\b/g, 'd')
            .replace(/ñ/g, 'ñ')
            .replace(/á/g, 'á').replace(/é/g, 'é').replace(/í/g, 'í').replace(/ó/g, 'ó').replace(/ú/g, 'ú')
            .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ.,;:!?¿¡()[\]{}"'\-\/]/g, '')
            .replace(/[.,;:!?¿¡]{2,}/g, match => match[0])
            .replace(/\s+([.,;:!?¿¡])/g, '$1')
            .replace(/([.,;:!?¿¡])\s+/g, '$1 ')
            .split('\n')
            .filter(line => {
                const cleanLine = line.trim();
                if (cleanLine.length === 0) return true;
                if (cleanLine.length < 2) return false;

                const specialChars = cleanLine.replace(/[a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s]/g, '');
                const isArtifact = (specialChars.length / cleanLine.length) > 0.6;
                const isScannedArtifact = /^[|_\-=\s]{3,}$/.test(cleanLine) ||
                    /^[.]{3,}$/.test(cleanLine) ||
                    /^[\/\\]{2,}$/.test(cleanLine);

                return !isArtifact && !isScannedArtifact;
            })
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    };

    // Document analysis functions
    const detectLanguage = (text) => {
        const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'del'];
        const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'];

        const words = text.toLowerCase().split(/\s+/);
        const spanishCount = words.filter(word => spanishWords.includes(word)).length;
        const englishCount = words.filter(word => englishWords.includes(word)).length;

        if (spanishCount > englishCount) return 'spanish';
        if (englishCount > spanishCount) return 'english';
        return 'unknown';
    };

    const detectScannedDocument = (text) => {
        const ocrIndicators = [
            /[Il1|]{2,}/,
            /[oO0]{2,}/,
            /\s[a-z]\s/g,
            /\b[A-Z]{1}[a-z]{1,2}\b/g
        ];

        let indicators = 0;
        ocrIndicators.forEach(regex => {
            if (regex.test(text)) indicators++;
        });

        const wordCount = text.split(/\s+/).length;
        const avgWordLength = text.replace(/\s/g, '').length / wordCount;

        return indicators > 1 || avgWordLength < 3;
    };

    const assessTextQuality = (text) => {
        if (!text || text.length < 10) return 'poor';

        const words = text.split(/\s+/);
        const validWords = words.filter(word => /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]{2,}$/.test(word));
        const qualityRatio = validWords.length / words.length;

        if (qualityRatio > 0.8) return 'excellent';
        if (qualityRatio > 0.6) return 'good';
        if (qualityRatio > 0.4) return 'fair';
        return 'poor';
    };

    const extractEmails = (text) => {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        return text.match(emailRegex) || [];
    };

    const extractPhones = (text) => {
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        return text.match(phoneRegex) || [];
    };

    const extractDates = (text) => {
        const dateRegex = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{1,2}\s+de\s+\w+\s+de\s+\d{4}\b/g;
        return text.match(dateRegex) || [];
    };

    const extractNumbers = (text) => {
        const numberRegex = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\b/g;
        return text.match(numberRegex) || [];
    };

    // Generate structured data for each document
    const generateStructuredData = (fileName, extractedText, processingTime, propertyId) => {
        const lines = extractedText.split('\n').filter(line => line.trim());

        const structuredData = {
            metadata: {
                fileName: fileName,
                propertyId: propertyId,
                fileSize: null,
                processedAt: new Date().toISOString(),
                processingTimeMs: processingTime,
                documentType: 'pdf',
                isScannedDocument: detectScannedDocument(extractedText),
                language: detectLanguage(extractedText),
                quality: assessTextQuality(extractedText)
            },
            content: {
                rawText: extractedText,
                wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length,
                lineCount: lines.length,
                possibleEmails: extractEmails(extractedText),
                possiblePhones: extractPhones(extractedText),
                possibleDates: extractDates(extractedText),
                possibleNumbers: extractNumbers(extractedText)
            },
            statistics: {
                characterCount: extractedText.length,
                averageWordsPerLine: lines.length > 0 ? (extractedText.split(/\s+/).length / lines.length).toFixed(2) : 0,
                hasNumericData: /\d/.test(extractedText),
                ocrConfidence: Math.round((extractedText.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,;:!?¿¡]/g, '').length / extractedText.length) * 100)
            }
        };

        return structuredData;
    };

    // Handle file selection and processing
    bulkFileInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        const selectedProperty = propertySelect ? propertySelect.value : '';

        if (files.length === 0) return;

        if (!selectedProperty) {
            alert('Error: No hay predio seleccionado.');
            return;
        }

        console.log(`🚀 Iniciando procesamiento de ${files.length} archivo(s) PDF para el predio: ${selectedProperty}`);

        // Show processing indicator
        const originalButtonText = bulkUploadButton.innerHTML;
        bulkUploadButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
        bulkUploadButton.disabled = true;

        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const startTime = Date.now();

            console.log(`📄 Procesando archivo ${i + 1}/${files.length}: ${file.name}`);

            try {
                // Convert PDF to base64
                console.log(`🔄 Convirtiendo ${file.name} a base64...`);
                const base64Data = await fileToBase64(file);

                // Prepare Gemini API request
                const requestBody = {
                    contents: [{
                        parts: [
                            {
                                text: `Analiza este documento PDF que puede contener imágenes escaneadas o texto digital. 
                  Extrae TODO el texto visible, incluyendo:
                  - Texto de imágenes escaneadas (OCR)
                  - Texto digital nativo
                  - Tablas y datos estructurados
                  - Encabezados y títulos
                  - Números, fechas y datos específicos
                  
                  Mantén la estructura original del documento lo más posible.
                  Devuelve SOLO el texto extraído, sin comentarios o explicaciones adicionales.`
                            },
                            {
                                inline_data: {
                                    mime_type: "application/pdf",
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192
                    }
                };

                console.log(`🤖 Enviando ${file.name} a Gemini API...`);

                // Call Gemini API
                const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Error procesando ${file.name}: ${response.status} ${response.statusText}`, errorText);
                    continue;
                }

                const result = await response.json();

                // Extract text from Gemini response
                let extractedText = '';
                if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
                    extractedText = result.candidates[0].content.parts[0].text || '';
                }

                if (!extractedText) {
                    console.warn(`⚠️ No se pudo extraer texto de ${file.name}`);
                    continue;
                }

                // Preprocess the extracted text
                console.log(`🧹 Limpiando texto extraído de ${file.name}...`);
                const cleanedText = preprocessText(extractedText);

                // Generate structured JSON
                const processingTime = Date.now() - startTime;
                console.log(`📊 Generando datos estructurados para ${file.name}...`);

                const structuredData = generateStructuredData(file.name, cleanedText, processingTime, selectedProperty);
                structuredData.metadata.fileSize = file.size;

                // Log the structured JSON to console
                console.log(`✅ Procesamiento completado para ${file.name}:`);
                console.log('📋 JSON ESTRUCTURADO:');
                console.log(JSON.stringify(structuredData, null, 2));
                console.log('─'.repeat(80));

                results.push(structuredData);

            } catch (error) {
                console.error(`💥 Excepción durante el procesamiento de ${file.name}:`, error);
            }
        }

        // Restore button state
        bulkUploadButton.innerHTML = originalButtonText;
        bulkUploadButton.disabled = false;

        // Final summary
        console.log(`🎉 Procesamiento completado. ${results.length}/${files.length} archivos procesados exitosamente.`);

        if (results.length > 0) {
            console.log('📊 RESUMEN DE TODOS LOS ARCHIVOS PROCESADOS:');
            console.log(JSON.stringify({
                summary: {
                    propertyId: selectedProperty,
                    totalFiles: files.length,
                    successfullyProcessed: results.length,
                    totalWords: results.reduce((sum, r) => sum + r.content.wordCount, 0),
                    totalCharacters: results.reduce((sum, r) => sum + r.statistics.characterCount, 0),
                    languages: [...new Set(results.map(r => r.metadata.language))],
                    processedAt: new Date().toISOString()
                },
                files: results
            }, null, 2));

            // Show success message
            alert(`✅ Procesamiento completado!\n\n${results.length} de ${files.length} archivos procesados exitosamente.\n\nRevisa la consola para ver los datos estructurados.`);
        } else {
            alert('❌ No se pudo procesar ningún archivo. Revisa la consola para más detalles.');
        }

        // Clear the file input for next selection
        bulkFileInput.value = '';
    });

    console.log('🔧 Bulk upload integration loaded successfully');
});

// Initialize Firebase
const firebaseConfig = window.firebaseConfig; // Get config from window object
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Gemini API
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.0-flash" });

// Convert file to GenerativePart
async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
}

// Process single PDF file
async function processPDFFile(file) {
    try {
        console.log(`📄 Procesando archivo: ${file.name}`);
        const pdfPart = await fileToGenerativePart(file);

        const prompt = `Extract and structure the following information from this PDF document into a clean, well-formatted JSON:
                           - Document type
                           - Date
                           - Key entities (people, companies)
                           - Main content/purpose
                           Remove any noise, fix OCR errors, and handle special characters appropriately.`;

        const result = await model.generateContent([prompt, pdfPart]);
        const processedText = result.response.text() ?? "No se pudo extraer texto del documento.";

        try {
            // Attempt to parse as JSON, if it's not already in JSON format
            const jsonResult = JSON.parse(processedText);
            console.log(`✅ JSON generado para ${file.name}:`, jsonResult);
            return jsonResult;
        } catch (e) {
            console.log(`⚠️ Texto procesado para ${file.name} (no en formato JSON):`, processedText);
            return { raw_text: processedText };
        }
    } catch (error) {
        console.error(`❌ Error procesando ${file.name}:`, error);
        return { error: error.message };
    }
}

// Handle file selection
bulkFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    console.log(`🚀 Iniciando procesamiento de ${files.length} archivo(s)...`);

    for (const file of files) {
        if (file.type !== 'application/pdf') {
            console.warn(`⚠️ Archivo ignorado - no es PDF: ${file.name}`);
            continue;
        }
        await processPDFFile(file);
    }

    // Clear input for future uploads
    e.target.value = '';
});
