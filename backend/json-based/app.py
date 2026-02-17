import os
import sys


current_dir = os.path.dirname(os.path.abspath(__file__))

if current_dir not in sys.path:
    sys.path.append(current_dir)

from flask import Flask, request, jsonify
from flask_cors import CORS

from diagnose import (
    diagnose,
    get_differential_diagnosis,
    load_disease_profiles,
    load_symptom_library
)

app = Flask(__name__)
CORS(app)  


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "diagnosis-engine",
        "version": "1.0.0"
    })


@app.route("/api/symptoms", methods=["GET"])
def get_symptoms():
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
    try:
        disease_profiles = load_disease_profiles()
        category_filter = request.args.get("category", "").lower()
        
        diseases = []
        categories = set()
        
        for disease_id, disease_data in disease_profiles.items():
            category = disease_data.get("category", "General")
            categories.add(category)
            
            if category_filter and category.lower() != category_filter:
                continue
            
            symptom_names = list(disease_data.get("symptoms", {}).keys())
            
            diseases.append({
                "id": disease_id,
                "common_name": disease_data.get("common_name", disease_id),
                "category": category,
                "prevalence": disease_data.get("prevalence", 0.05),
                "symptom_count": len(symptom_names),
                "symptoms": symptom_names
            })
        
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
        
        options = data.get("options", {})
        top_n = options.get("top_n", 5)
        min_confidence = options.get("min_confidence", 10.0)
        
        top_n = max(1, min(20, int(top_n)))
        min_confidence = max(0, min(100, float(min_confidence)))
        
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

    try:
        symptom_library = load_symptom_library()
        
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

    try:
        disease_profiles = load_disease_profiles()
        
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

