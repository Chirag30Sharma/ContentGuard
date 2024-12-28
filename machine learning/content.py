from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import base64
from transformers import pipeline
import torch
from torchvision import models, transforms
from PIL import Image
import io

app = Flask(__name__)
CORS(app)
load_dotenv()

class ContentModerator:
    def __init__(self):
        # Load pre-trained models
        self.text_classifier = pipeline(
            "text-classification", 
            model="unitary/toxic-bert",
            device=-1  # CPU
        )
        
        # Load pre-trained ResNet model
        self.image_model = models.resnet50(pretrained=True)
        self.image_model.eval()
        
        # Image preprocessing
        self.image_transforms = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        
        # Thresholds
        self.TEXT_THRESHOLD = 0.8
        self.IMAGE_THRESHOLD = 0.7

    def analyze_text(self, text):
        """
        Analyze text using local toxic-bert model
        """
        try:
            result = self.text_classifier(text)
            
            if result:
                scores = {
                    'toxic': result[0]['score'] if result[0]['label'] == 'toxic' else 1 - result[0]['score']
                }
                max_score = scores['toxic']
                is_inappropriate = max_score > self.TEXT_THRESHOLD

                return {
                    'is_inappropriate': is_inappropriate,
                    'confidence': max_score,
                    'scores': scores,
                    'flagged_categories': ['toxic'] if is_inappropriate else []
                }
            else:
                raise Exception("Model returned no results")

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
        Analyze image using local ResNet model
        """
        try:
            # Handle base64 image data
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data

            # Open image and apply transformations
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            image_tensor = self.image_transforms(image).unsqueeze(0)

            # Get model predictions
            with torch.no_grad():
                outputs = self.image_model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)

            # Get top prediction
            max_prob, pred_idx = torch.max(probabilities, dim=0)
            max_score = max_prob.item()
            
            is_inappropriate = max_score > self.IMAGE_THRESHOLD

            return {
                'is_inappropriate': is_inappropriate,
                'confidence': max_score,
                'scores': {'inappropriate': max_score},
                'flagged_categories': ['inappropriate_content'] if is_inappropriate else []
            }

        except Exception as e:
            print(f"Error analyzing image: {str(e)}")
            return {
                'is_inappropriate': False,
                'confidence': 0,
                'scores': {},
                'flagged_categories': [],
                'error': str(e)
            }

# Rest of the code remains the same
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

        if content_type == 'text':
            result = moderator.analyze_text(content)
        else:
            result = moderator.analyze_image(content)

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