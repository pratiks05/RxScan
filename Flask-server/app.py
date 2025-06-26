from flask import Flask, request, jsonify, render_template
import os
from werkzeug.utils import secure_filename
import google.generativeai as genai
import PIL.Image
from PIL import ImageEnhance, ImageFilter
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Your PrescriptionOCR class (copy the entire class from your paste.txt here)
class PrescriptionOCR:
    def __init__(self, api_key):
        """Initialize Prescription OCR with API key"""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def preprocess_image(self, image_path, enhance=True):
        """Preprocess prescription image for better OCR results"""
        image = PIL.Image.open(image_path) 
        
        if enhance:
            if image.mode != 'L':
                image = image.convert('L')
            
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(2.0)
            
            image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        return image
    
    def extract_prescription_details(self, image_path, enhance_image=True):
        """Extract detailed prescription information from doctor's handwriting"""
        try:
            if enhance_image:
                image = self.preprocess_image(image_path)
            else:
                image = PIL.Image.open(image_path)
            
            prompt = """
            You are a medical transcription expert. Analyze this prescription image and extract information in JSON format.
            
            Return ONLY a valid JSON object with this exact structure:
            {
                "doctor": {
                    "name": "doctor name or null",
                    "qualifications": "degrees/qualifications or null",
                    "registration_number": "reg number or null",
                    "clinic_name": "clinic/hospital name or null",
                    "address": "clinic address or null",
                    "phone": "phone number or null"
                },
                "patient": {
                    "name": "patient name or null",
                    "age": "age or null",
                    "gender": "gender or null",
                    "address": "patient address or null",
                    "prescription_date": "date or null"
                },
                "medications": [
                    {
                        "name": "medicine name",
                        "dosage": "strength/dosage",
                        "quantity": "quantity prescribed",
                        "frequency": "how often to take",
                        "duration": "how long to take",
                        "instructions": "special instructions",
                        "uncertain": false
                    }
                ],
                "additional_notes": {
                    "special_instructions": "any special instructions or null",
                    "follow_up": "follow-up date or instructions or null",
                    "warnings": "warnings or precautions or null"
                },
                "extraction_notes": "any unclear text or reading difficulties"
            }
            
            Rules:
            - Use null for any information that cannot be read or is not present
            - For uncertain readings, include the text and set "uncertain": true
            - Return ONLY the JSON object, no other text
            - Ensure all JSON syntax is correct
            """
            
            response = self.model.generate_content([prompt, image])
            
            # Try to parse the JSON response
            try:
                json_data = json.loads(response.text.strip())
                return {
                    'success': True,
                    'data': json_data,
                    'extraction_date': datetime.now().isoformat(),
                    'image_path': os.path.basename(image_path)
                }
            except json.JSONDecodeError:
                # If JSON parsing fails, return raw text as fallback
                return {
                    'success': True,
                    'data': {
                        'raw_response': response.text,
                        'note': 'Could not parse as JSON, returning raw text'
                    },
                    'extraction_date': datetime.now().isoformat(),
                    'image_path': os.path.basename(image_path)
                }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Error processing prescription: {str(e)}"
            }

# Flask app setup
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Get API key from environment variable
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables. Please set it in your .env file.")

# Initialize OCR with API key from environment
ocr = PrescriptionOCR(GEMINI_API_KEY)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Serve the main page with upload form"""
    return render_template('index.html')

@app.route('/api/extract', methods=['POST'])
def extract_prescription():
    """API endpoint to extract prescription details from uploaded image"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Check if file type is allowed
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Extract prescription details
        result = ocr.extract_prescription_details(filepath)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    print("Starting Prescription OCR Flask Server...")
    app.run(debug=True, host='0.0.0.0', port=5000)