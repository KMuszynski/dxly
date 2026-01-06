"""
Flask API for Medical Diagnosis Engine

Endpoints:
- GET  /api/symptoms      - Get list of available symptoms with follow-up questions
- POST /api/diagnose      - Submit symptoms and get differential diagnosis
- GET  /api/diseases      - Get list of all diseases in the database
- GET  /api/health        - Health check endpoint
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from diagnose import (
    diagnose,
    get_differential_diagnosis,
    load_disease_profiles,
    load_symptom_library
)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "diagnosis-engine",
        "version": "1.0.0"
    })


@app.route("/api/symptoms", methods=["GET"])
def get_symptoms():
    """
    Get all available symptoms with their follow-up questions.
    
    Returns:
        JSON list of symptoms, each containing:
        - id: Symptom identifier (key name)
        - display_name: Human-readable name
        - global_follow_ups: Common questions for this symptom
        - unique_follow_ups: Symptom-specific questions
    """
    try:
        symptom_library = load_symptom_library()
        
        symptoms = []
        for symptom_id, symptom_data in symptom_library.items():
            symptoms.append({
                "id": symptom_id,
                "display_name": symptom_data.get("display_name", symptom_id),
                "global_follow_ups": symptom_data.get("global_follow_ups", []),
                "unique_follow_ups": symptom_data.get("unique_follow_ups", [])
            })
        
        # Sort alphabetically by display name
        symptoms.sort(key=lambda x: x["display_name"])
        
        return jsonify({
            "success": True,
            "count": len(symptoms),
            "symptoms": symptoms
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/diseases", methods=["GET"])
def get_diseases():
    """
    Get all diseases in the database.
    
    Query params:
        category (optional): Filter by disease category
    
    Returns:
        JSON list of diseases with their symptoms and expectations
    """
    try:
        disease_profiles = load_disease_profiles()
        category_filter = request.args.get("category", "").lower()
        
        diseases = []
        categories = set()
        
        for disease_id, disease_data in disease_profiles.items():
            category = disease_data.get("category", "General")
            categories.add(category)
            
            # Apply category filter if specified
            if category_filter and category.lower() != category_filter:
                continue
            
            # Get list of symptom names for this disease
            symptom_names = list(disease_data.get("symptoms", {}).keys())
            
            diseases.append({
                "id": disease_id,
                "common_name": disease_data.get("common_name", disease_id),
                "category": category,
                "prevalence": disease_data.get("prevalence", 0.05),
                "symptom_count": len(symptom_names),
                "symptoms": symptom_names
            })
        
        # Sort alphabetically
        diseases.sort(key=lambda x: x["common_name"])
        
        return jsonify({
            "success": True,
            "count": len(diseases),
            "categories": sorted(list(categories)),
            "diseases": diseases
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/diagnose", methods=["POST"])
def diagnose_endpoint():
    """
    Submit patient symptoms and receive differential diagnosis.
    
    Request body:
        {
            "symptoms": {
                "Symptom Name": {
                    "present": true,
                    "follow_up_key": "value",
                    ...
                },
                ...
            },
            "options": {
                "top_n": 5,           // Max number of results (default: 5)
                "min_confidence": 10  // Minimum confidence % (default: 10)
            }
        }
    
    Example request:
        {
            "symptoms": {
                "Ear Pain": {
                    "present": true,
                    "pain_character": "throbbing",
                    "location": "deep_internal",
                    "intensity": 7
                },
                "Fever": {
                    "present": true,
                    "pattern": "intermittent"
                }
            }
        }
    
    Returns:
        {
            "success": true,
            "input_symptoms": ["Ear Pain", "Fever"],
            "diagnosis_count": 3,
            "diagnoses": [
                {
                    "disease": "Acute Otitis Media",
                    "common_name": "Acute Otitis Media",
                    "category": "Otolaryngology",
                    "confidence": 85.5,
                    "matched_symptoms": [...],
                    "explanation": "..."
                },
                ...
            ]
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "Request body is required"
            }), 400
        
        symptoms = data.get("symptoms", {})
        
        if not symptoms:
            return jsonify({
                "success": False,
                "error": "At least one symptom is required"
            }), 400
        
        # Get options with defaults
        options = data.get("options", {})
        top_n = options.get("top_n", 5)
        min_confidence = options.get("min_confidence", 10.0)
        
        # Validate options
        top_n = max(1, min(20, int(top_n)))  # Clamp between 1 and 20
        min_confidence = max(0, min(100, float(min_confidence)))
        
        # Run diagnosis
        diagnoses = get_differential_diagnosis(
            patient_symptoms=symptoms,
            top_n=top_n,
            min_confidence=min_confidence
        )
        
        return jsonify({
            "success": True,
            "input_symptoms": list(symptoms.keys()),
            "diagnosis_count": len(diagnoses),
            "diagnoses": diagnoses
        })
    
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": f"Invalid input: {str(e)}"
        }), 400
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/symptom/<symptom_id>", methods=["GET"])
def get_symptom_details(symptom_id: str):
    """
    Get detailed information about a specific symptom.
    
    Args:
        symptom_id: The symptom identifier (e.g., "Ear Pain")
    
    Returns:
        Symptom details including all follow-up questions
    """
    try:
        symptom_library = load_symptom_library()
        
        # Try exact match first
        if symptom_id in symptom_library:
            symptom_data = symptom_library[symptom_id]
            return jsonify({
                "success": True,
                "symptom": {
                    "id": symptom_id,
                    "display_name": symptom_data.get("display_name", symptom_id),
                    "global_follow_ups": symptom_data.get("global_follow_ups", []),
                    "unique_follow_ups": symptom_data.get("unique_follow_ups", [])
                }
            })
        
        # Try case-insensitive match
        for key, data in symptom_library.items():
            if key.lower() == symptom_id.lower():
                return jsonify({
                    "success": True,
                    "symptom": {
                        "id": key,
                        "display_name": data.get("display_name", key),
                        "global_follow_ups": data.get("global_follow_ups", []),
                        "unique_follow_ups": data.get("unique_follow_ups", [])
                    }
                })
        
        return jsonify({
            "success": False,
            "error": f"Symptom '{symptom_id}' not found"
        }), 404
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/disease/<disease_id>", methods=["GET"])
def get_disease_details(disease_id: str):
    """
    Get detailed information about a specific disease.
    
    Args:
        disease_id: The disease identifier (e.g., "Acute Otitis Media")
    
    Returns:
        Disease details including all expected symptoms
    """
    try:
        disease_profiles = load_disease_profiles()
        
        # Try exact match first
        if disease_id in disease_profiles:
            disease_data = disease_profiles[disease_id]
            return jsonify({
                "success": True,
                "disease": {
                    "id": disease_id,
                    "common_name": disease_data.get("common_name", disease_id),
                    "category": disease_data.get("category", "General"),
                    "prevalence": disease_data.get("prevalence", 0.05),
                    "symptoms": disease_data.get("symptoms", {})
                }
            })
        
        # Try case-insensitive match
        for key, data in disease_profiles.items():
            if key.lower() == disease_id.lower():
                return jsonify({
                    "success": True,
                    "disease": {
                        "id": key,
                        "common_name": data.get("common_name", key),
                        "category": data.get("category", "General"),
                        "prevalence": data.get("prevalence", 0.05),
                        "symptoms": data.get("symptoms", {})
                    }
                })
        
        return jsonify({
            "success": False,
            "error": f"Disease '{disease_id}' not found"
        }), 404
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    print("=" * 60)
    print("Medical Diagnosis API Server")
    print("=" * 60)
    print("\nAvailable endpoints:")
    print("  GET  /api/health              - Health check")
    print("  GET  /api/symptoms            - List all symptoms")
    print("  GET  /api/symptom/<id>        - Get symptom details")
    print("  GET  /api/diseases            - List all diseases")
    print("  GET  /api/disease/<id>        - Get disease details")
    print("  POST /api/diagnose            - Submit symptoms for diagnosis")
    print("\n" + "=" * 60)
    
    app.run(host="0.0.0.0", port=5001, debug=True)

