import sys
import json
import pytesseract
from pdf2image import convert_from_path
import re
from PIL import Image
import os
import logging
from typing import Dict, List, Optional, Any

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DocumentExtractor:
    """Clase principal para extracción de datos de documentos"""
    
    def __init__(self):
        self.supported_extensions = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'}
        
    def clean_text(self, text: str) -> str:
        """Limpia y normaliza el texto extraído"""
        if not text:
            return ""
        
        # Normalizar espacios y saltos de línea
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n+', '\n', text)
        
        # Corregir caracteres comunes mal reconocidos por OCR
        replacements = {
            'º': '°',
            '𝐨': '°',
            'N°': 'N°',
            'Nº': 'N°',
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
            
        return text.strip()

    def simple_regex_extract(self, text: str, field_name: str, 
                           regex_pattern: str, default_value: str = "") -> str:
        """Extrae datos usando expresiones regulares con mejor manejo de errores"""
        try:
            match = re.search(regex_pattern, text, re.IGNORECASE | re.DOTALL)
            if match and match.group(1):
                result = match.group(1).strip()
                # Limpiar caracteres no deseados
                result = re.sub(r'[^\w\s\-/.,°]+', '', result)
                return result if result else default_value
            return default_value
        except Exception as e:
            logger.warning(f"Error extracting {field_name}: {str(e)}")
            return default_value

    def extract_sii_data(self, text: str, fields_to_collect: List[str]) -> Dict[str, str]:
        """Extrae datos de documentos SII con patrones mejorados"""
        data = {}
        
        patterns = {
            "Rol del predio": [
                r"ROL(?:\s+DEL\s+PREDIO)?[:\s]*(\d+(?:\-\d+)*)",
                r"ROL[:\s]*(\d+(?:\-\d+)*)",
            ],
            "direccion": [
                r"DIRECCION\s+PREDIAL[:\s]*([^\n]+)",
                r"DIRECCION[:\s]*([^\n]+)",
            ],
            "comuna": [
                r"COMUNA[:\s]*([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|$)",
                r"COMUNA[:\s]*([^\n]+)",
            ],
            "Destino (Agricola o forestal)": [
                r"DESTINO\s+ACTUAL\s+DEL\s+BIEN\s+RAIZ[:\s]*([^\n]+)",
                r"DESTINO[:\s]*([^\n]+)",
            ],
            "Nombre del propietario": [
                r"NOMBRE\s+PROPIETARIO[:\s]*([^\n]+)",
                r"PROPIETARIO[:\s]*([^\n]+)",
            ],
            "Fecha de emisión": [
                r"FECHA\s+EMISION\s+CERTIFICADO[:\s]*(\d{1,2}/\d{1,2}/\d{4})",
                r"FECHA\s+EMISION[:\s]*(\d{1,2}/\d{1,2}/\d{4})",
            ]
        }
        
        for field in fields_to_collect:
            if field in patterns:
                for pattern in patterns[field]:
                    result = self.simple_regex_extract(text, field, pattern)
                    if result:
                        # Procesamiento especial para destino
                        if field == "Destino (Agricola o forestal)":
                            result_upper = result.upper()
                            if "AGRICOLA" in result_upper:
                                result = "AGRICOLA"
                            elif "FORESTAL" in result_upper:
                                result = "FORESTAL"
                        data[field] = result
                        break
                else:
                    data[field] = ""
            else:
                data[field] = ""
                
        return data

    def extract_plan_manejo_data(self, text: str, fields_to_collect: List[str]) -> Dict[str, str]:
        """Extrae datos de planes de manejo"""
        data = {}
        
        patterns = {
            "Rol de avalúo": [
                r"ROL\s+DE\s+AVALUO?S?[:\s]*(\d+(?:\-\d+)*)",
                r"ROL\s+AVALUO[:\s]*(\d+(?:\-\d+)*)",
            ],
            "comuna": [
                r"COMUNA[:\s]*([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|$)",
                r"COMUNA[:\s]*([^\n]+)",
            ],
            "Resolución N°": [
                r"RESOLUCION\s*(?:EXENTA)?\s*N[°º][:\s]*(\d+(?:\.\d+)*(?:/\d{4})?)",
                r"RESOLUCION\s*N[°º][:\s]*(\d+(?:\.\d+)*(?:/\d{4})?)",
            ],
            "Superficie aprobada": [
                r"SUPERFICIE\s+PREDIAL\s+A\s+MANEJAR\s*\(HA\)[:\s]*(\d+(?:[,\.]\d+)?)",
                r"SUPERFICIE[:\s]*(\d+(?:[,\.]\d+)?)\s*(?:HA|HECTAREAS)",
            ],
            "Fecha": [
                r"FECHA[:\s]*(\d{1,2}\s+DE\s+\w+\s+DE\s+\d{4})",
                r"FECHA[:\s]*(\d{1,2}/\d{1,2}/\d{4})",
            ]
        }
        
        return self._extract_with_patterns(text, fields_to_collect, patterns)

    def extract_faena_data(self, text: str, fields_to_collect: List[str]) -> Dict[str, str]:
        """Extrae datos de avisos de faena"""
        data = {}
        
        patterns = {
            "Fecha de aviso": [
                r"Fecha\s+de\s+Aviso[:\s]*(\d{1,2}/\d{1,2}/\d{4})",
                r"Fecha\s+Aviso[:\s]*(\d{1,2}/\d{1,2}/\d{4})",
            ],
            "Aviso N°": [
                r"Aviso\s+N[°º][:\s]*(\d+)",
                r"Aviso[:\s]*(\d+)",
            ],
            "predio": [
                r"Predio\s+o\s+Lugar[:\s]*([^\n]+)",
                r"Predio[:\s]*([^\n]+)",
            ],
            "comuna": [
                r"Comuna[:\s]*([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|$)",
                r"Comuna[:\s]*([^\n]+)",
            ]
        }
        
        return self._extract_with_patterns(text, fields_to_collect, patterns)

    def extract_escritura_data(self, text: str, fields_to_collect: List[str]) -> Dict[str, str]:
        """Extrae datos de escrituras"""
        data = {}
        
        patterns = {
            "N° Certificado": [
                r"CERTIFICADO\s+N[°º][:\s]*(\d+(?:\.\d+)*)",
                r"CERTIFICADO[:\s]*(\d+(?:\.\d+)*)",
            ],
            "Fojas (numero)": [
                r"FOJAS\s+N[°º][:\s]*([^\n]+)",
                r"FOJAS[:\s]*([^\n]+)",
            ],
            "Conservador de bienes raices": [
                r"CONSERVADOR\s+DE\s+BIENES\s+RAICES\s+DE[:\s]*([^\n]+)",
                r"CONSERVADOR[:\s]*([^\n]+)",
            ]
        }
        
        return self._extract_with_patterns(text, fields_to_collect, patterns)

    def _extract_with_patterns(self, text: str, fields_to_collect: List[str], 
                              patterns: Dict[str, List[str]]) -> Dict[str, str]:
        """Método auxiliar para extraer datos usando múltiples patrones"""
        data = {}
        
        for field in fields_to_collect:
            if field in patterns:
                for pattern in patterns[field]:
                    result = self.simple_regex_extract(text, field, pattern)
                    if result:
                        data[field] = result
                        break
                else:
                    data[field] = ""
            else:
                data[field] = ""
                
        return data

    def generic_extract(self, text: str, fields_to_collect: List[str]) -> Dict[str, str]:
        """Extracción genérica mejorada"""
        data = {}
        
        for field in fields_to_collect:
            try:
                # Escapar caracteres especiales
                safe_field_name = re.escape(field)
                
                # Patrones múltiples para mayor flexibilidad
                patterns = [
                    rf"{safe_field_name}\s*[:\-]?\s*([^\n]+)",
                    rf"{safe_field_name}\s*\n\s*([^\n]+)",
                    rf"{field}\s*[:\-]?\s*([^\n]+)",  # Sin escape para coincidencias exactas
                ]
                
                found = False
                for pattern in patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match and match.group(1).strip():
                        data[field] = match.group(1).strip()
                        found = True
                        break
                
                if not found:
                    data[field] = ""
                    
            except Exception as e:
                logger.warning(f"Error in generic extraction for {field}: {str(e)}")
                data[field] = ""
                
        return data

    def process_pdf(self, file_path: str) -> str:
        """Procesa archivos PDF con mejor manejo de errores"""
        try:
            images = convert_from_path(file_path, dpi=300, first_page=1, last_page=10)  # Limitar páginas
            full_text = ""
            
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1}/{len(images)}")
                
                # Configuración optimizada para documentos en español
                config = '--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ0123456789 .,:-/()'
                text_from_image = pytesseract.image_to_string(
                    image, 
                    lang='spa', 
                    config=config
                )
                full_text += text_from_image + "\n"
                
            return self.clean_text(full_text)
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            # Fallback: intentar como imagen
            try:
                full_text = pytesseract.image_to_string(
                    Image.open(file_path), 
                    lang='spa', 
                    config='--psm 6'
                )
                return self.clean_text(full_text)
            except Exception as e_img:
                raise Exception(f"Failed to process PDF or image: {str(e)}, {str(e_img)}")

    def process_image(self, file_path: str) -> str:
        """Procesa archivos de imagen"""
        try:
            config = '--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ0123456789 .,:-/()'
            text = pytesseract.image_to_string(
                Image.open(file_path), 
                lang='spa', 
                config=config
            )
            return self.clean_text(text)
        except Exception as e:
            raise Exception(f"Error processing image: {str(e)}")

    def extract_data(self, file_path: str, document_type_name: str, 
                    fields_to_collect: List[str]) -> Dict[str, Any]:
        """Método principal para extraer datos"""
        
        # Validar archivo
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext not in self.supported_extensions:
            raise ValueError(f"Unsupported file type: {file_ext}")

        # Extraer texto
        logger.info(f"Processing file: {file_path}")
        
        if file_ext == '.pdf':
            full_text = self.process_pdf(file_path)
        else:
            full_text = self.process_image(file_path)

        if not full_text.strip():
            logger.warning("No text extracted from document")

        # Extraer datos específicos
        logger.info(f"Extracting data for document type: {document_type_name}")
        
        extraction_methods = {
            "CONSULTA ANTECEDENTE BIEN RAÍZ (SII)": self.extract_sii_data,
            "RESOLUCIÓN PLAN DE MANEJO": self.extract_plan_manejo_data,
            "AVISO EJECUCIÓN DE FAENA": self.extract_faena_data,
            "ESCRITURA O TÍTULOS DE DOMINIO": self.extract_escritura_data,
        }
        
        if document_type_name in extraction_methods:
            extracted_data = extraction_methods[document_type_name](full_text, fields_to_collect)
        else:
            logger.info("Using generic extraction method")
            extracted_data = self.generic_extract(full_text, fields_to_collect)

        # Asegurar que todos los campos solicitados estén presentes
        for field in fields_to_collect:
            if field not in extracted_data:
                extracted_data[field] = ""

        return {
            "extracted_data": extracted_data,
            "full_text_length": len(full_text),
            "document_type": document_type_name
        }


def main():
    """Función principal mejorada"""
    if len(sys.argv) != 4:
        error_msg = {
            "error": "Usage: python main.py <file_path> <document_type_name> '<fields_to_collect_json_string>'"
        }
        print(json.dumps(error_msg))
        sys.exit(1)

    file_path = sys.argv[1]
    document_type_name = sys.argv[2]
    fields_to_collect_str = sys.argv[3]
    
    try:
        fields_to_collect = json.loads(fields_to_collect_str)
        if not isinstance(fields_to_collect, list):
            raise ValueError("fields_to_collect must be a list")
            
    except (json.JSONDecodeError, ValueError) as e:
        error_msg = {"error": f"Invalid JSON string for fields_to_collect: {str(e)}"}
        print(json.dumps(error_msg))
        sys.exit(1)

    try:
        extractor = DocumentExtractor()
        result = extractor.extract_data(file_path, document_type_name, fields_to_collect)
        
        # Solo devolver los datos extraídos como salida principal
        print(json.dumps(result["extracted_data"], ensure_ascii=False, indent=2))
        
        # Log adicional para debugging
        logger.info(f"Successfully extracted data. Text length: {result['full_text_length']}")
        
    except Exception as e:
        error_msg = {"error": str(e)}
        print(json.dumps(error_msg))
        logger.error(f"Extraction failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()