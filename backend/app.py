#!/usr/bin/env python3
"""
Flask API server for disease diagnosis based on symptoms.
Exposes REST endpoints for the diagnosis functionality.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from diagnose import diagnose
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes (adjust as needed for production)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'diagnosis-api'
    }), 200


@app.route('/api/diagnose', methods=['POST'])
def diagnose_endpoint():
    """
    Diagnose diseases based on symptoms.
    
    Request body:
        {
            "symptoms": ["fever", "headache", "nausea"],
            "top_n": 10  # optional, default is 10
        }
    
    Response:
        {
            "success": true,
            "results": [
                {
                    "disease": "meningitis",
                    "score": 142.92,
                    "match_count": 685,
                    "total_symptom_count": 4,
                    "frequency": 297,
                    "match_percentage": 59.05,
                    "case_count": 290,
                    "exact_matches": 30
                },
                ...
            ]
        }
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        symptoms = data.get('symptoms')
        if not symptoms:
            return jsonify({
                'success': False,
                'error': 'symptoms field is required'
            }), 400
        
        if not isinstance(symptoms, list):
            return jsonify({
                'success': False,
                'error': 'symptoms must be a list'
            }), 400
        
        if len(symptoms) == 0:
            return jsonify({
                'success': False,
                'error': 'symptoms list cannot be empty'
            }), 400
        
        # Get optional top_n parameter
        top_n = data.get('top_n', 10)
        if not isinstance(top_n, int) or top_n < 1 or top_n > 100:
            top_n = 10  # Default or sanitize
        
        # Call diagnosis function
        results = diagnose(symptoms, top_n=top_n)
        
        return jsonify({
            'success': True,
            'results': results,
            'symptoms_provided': symptoms,
            'results_count': len(results)
        }), 200
        
    except Exception as e:
        print(f"Error in diagnosis endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/diagnose', methods=['GET'])
def diagnose_get():
    """GET endpoint with query parameters (for testing)."""
    symptoms_str = request.args.get('symptoms')
    if not symptoms_str:
        return jsonify({
            'success': False,
            'error': 'symptoms query parameter is required (comma-separated)'
        }), 400
    
    symptoms = [s.strip() for s in symptoms_str.split(',')]
    top_n = request.args.get('top_n', 10, type=int)
    
    try:
        results = diagnose(symptoms, top_n=top_n)
        return jsonify({
            'success': True,
            'results': results,
            'symptoms_provided': symptoms,
            'results_count': len(results)
        }), 200
    except Exception as e:
        print(f"Error in diagnosis endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    # default to 5001
    port = int(os.environ.get('PORT', 5001))
    
    # Run in debug mode for development
    # Set FLASK_ENV=production for production
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    print(f"Starting Flask server on port {port}")
    print(f"Debug mode: {debug}")
    print(f"API endpoint: http://localhost:{port}/api/diagnose")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
