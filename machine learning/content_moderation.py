from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import base64

app = Flask(__name__)
CORS(app)
load_dotenv()

# Activating the virtual environment source .venv/bin/activate

class ContentModerator:
    def __init__(self):
        self.API_TOKEN = os.getenv("HUGGING_FACE_API_KEY")
        
        # API endpoints
        self.TEXT_API_URL = "https://api-inference.huggingface.co/models/unitary/toxic-bert"
        self.IMAGE_API_URL = "https://api-inference.huggingface.co/models/microsoft/resnet-50"
        
        # Headers for API requests
        self.headers = {"Authorization": f"Bearer {self.API_TOKEN}"}
        
        # Thresholds
        self.TEXT_THRESHOLD = 0.8
        self.IMAGE_THRESHOLD = 0.7

    def analyze_text(self, text):
        """
        Analyze text using Hugging Face API
        """
        try:
            payload = {"inputs": text}
            response = requests.post(self.TEXT_API_URL, headers=self.headers, json=payload)
            result = response.json()

            if isinstance(result, list):
                # Get the highest scoring toxic category
                scores = {item['label']: item['score'] for item in result[0]}
                max_score = max(scores.values())
                is_inappropriate = max_score > self.TEXT_THRESHOLD

                return {
                    'is_inappropriate': is_inappropriate,
                    'confidence': max_score,
                    'scores': scores,
                    'flagged_categories': [label for label, score in scores.items() if score > self.TEXT_THRESHOLD]
                }
            else:
                raise Exception(f"Unexpected API response: {result}")

        except Exception as e:
            print(f"Error analyzing text: {str(e)}")
            return {
                'is_inappropriate': False,
                'confidence': 0,
                'scores': {},
                'flagged_categories': [],
                'error': str(e)
            }

    def analyze_image(self, image_data):
        """
        Analyze image using Hugging Face API
        """
        try:
            # Handle base64 image data
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                # Extract base64 data
                image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data

            response = requests.post(
                self.IMAGE_API_URL,
                headers=self.headers,
                data=image_bytes
            )
            result = response.json()

            if isinstance(result, list):
                scores = {item['label']: item['score'] for item in result}
                max_score = max(scores.values())
                is_inappropriate = max_score > self.IMAGE_THRESHOLD

                return {
                    'is_inappropriate': is_inappropriate,
                    'confidence': max_score,
                    'scores': scores,
                    'flagged_categories': [label for label, score in scores.items() if score > self.IMAGE_THRESHOLD]
                }
            else:
                raise Exception(f"Unexpected API response: {result}")

        except Exception as e:
            print(f"Error analyzing image: {str(e)}")
            return {
                'is_inappropriate': False,
                'confidence': 0,
                'scores': {},
                'flagged_categories': [],
                'error': str(e)
            }

class ModeratorMetrics:
    def __init__(self):
        self.total_checks = 0
        self.flagged_content = 0
        self.text_checks = 0
        self.image_checks = 0
        self.category_counts = {}

    def update(self, content_type, result):
        self.total_checks += 1
        
        if content_type == 'text':
            self.text_checks += 1
        else:
            self.image_checks += 1

        if result['is_inappropriate']:
            self.flagged_content += 1

        for category in result['flagged_categories']:
            self.category_counts[category] = self.category_counts.get(category, 0) + 1

    def get_stats(self):
        return {
            'total_checks': self.total_checks,
            'flagged_content': self.flagged_content,
            'text_checks': self.text_checks,
            'image_checks': self.image_checks,
            'category_counts': self.category_counts,
            'flagged_percentage': (self.flagged_content / self.total_checks * 100) if self.total_checks > 0 else 0
        }

# Initialize the moderator and metrics
moderator = ContentModerator()
metrics = ModeratorMetrics()

@app.route('/api/moderate', methods=['POST'])
def moderate_content():
    try:
        data = request.json
        content_type = data.get('type')
        content = data.get('content')

        if not content_type or not content:
            return jsonify({
                'error': 'Missing content type or content'
            }), 400

        if content_type not in ['text', 'image']:
            return jsonify({
                'error': 'Invalid content type. Must be either "text" or "image"'
            }), 400

        # Perform moderation based on content type
        if content_type == 'text':
            result = moderator.analyze_text(content)
        else:  # image
            result = moderator.analyze_image(content)

        # Update metrics
        metrics.update(content_type, result)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    return jsonify(metrics.get_stats())

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)