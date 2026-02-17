import os
import json
from pathlib import Path
from typing import Any


def load_json(filename: str) -> dict:
    base_path = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_path, filename)
    
    print(f"DEBUG: Attempting to load: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found at {file_path}")
        return {}


def load_disease_profiles() -> dict:
    profiles = load_json("disease_profiles.json")
    return {k: v for k, v in profiles.items() if not k.startswith("_")}


def load_symptom_library() -> dict:
    library = load_json("symptom_library.json")
    return {k: v for k, v in library.items() if not k.startswith("_")}


def match_expectation(expected: Any, actual: Any) -> float:
    if actual is None:
        return 0.0
    
    if isinstance(expected, list):
        if (len(expected) == 2 and 
            isinstance(expected[0], (int, float)) and 
            isinstance(expected[1], (int, float))):
            try:
                actual_num = float(actual)
                min_val, max_val = expected
                if min_val <= actual_num <= max_val:
                    return 1.0
                if actual_num < min_val:
                    distance = min_val - actual_num
                    return max(0.0, 1.0 - (distance / min_val) * 0.5)
                else:
                    distance = actual_num - max_val
                    return max(0.0, 1.0 - (distance / max_val) * 0.5)
            except (ValueError, TypeError):
                return 0.0
        else:
            if actual in expected:
                return 1.0
            return 0.0
    
    if isinstance(expected, bool):
        if isinstance(actual, bool):
            return 1.0 if actual == expected else 0.0
        if isinstance(actual, str):
            actual_bool = actual.lower() in ("true", "yes", "1")
            return 1.0 if actual_bool == expected else 0.0
        return 0.0
    
    if expected == actual:
        return 1.0
    
    if isinstance(expected, str) and isinstance(actual, str):
        if expected.lower() == actual.lower():
            return 1.0
        return 0.0
    
    return 0.0


def calculate_symptom_match_score(
    disease_symptom: dict,
    patient_symptom_data: dict
) -> float:
    expectations = disease_symptom.get("expectations", {})
    
    if not expectations:
        return 1.0
    
    total_weight = 0.0
    weighted_score = 0.0
    
    for key, expected_value in expectations.items():
        actual_value = patient_symptom_data.get(key)
        match_score = match_expectation(expected_value, actual_value)
        
        weight = 1.0
        total_weight += weight
        weighted_score += match_score * weight
    
    if total_weight == 0:
        return 1.0
    
    return weighted_score / total_weight


def diagnose(patient_symptoms: dict) -> list[dict]:
    disease_profiles = load_disease_profiles()
    patient_symptom_names = set(patient_symptoms.keys())
    
    results = []
    
    for disease_name, disease_data in disease_profiles.items():
        disease_symptoms = disease_data.get("symptoms", {})
        prevalence = disease_data.get("prevalence", 0.05)
        
        if not disease_symptoms:
            continue
        
        total_score = 0.0
        max_possible_score = 0.0
        matched_symptoms = []
        missing_symptoms = []
        partially_matched = []
        negative_matches = []
        
        for symptom_name, symptom_config in disease_symptoms.items():
            importance = symptom_config.get("importance", 0.5)
            
            if importance < 0:
                abs_importance = abs(importance)
                max_possible_score += abs_importance
                
                if symptom_name not in patient_symptom_names:
                    total_score += abs_importance
                    negative_matches.append({
                        "symptom": symptom_name,
                        "note": symptom_config.get("note", f"Absence of {symptom_name} supports this diagnosis")
                    })
                else:
                    pass
                continue
            
            max_possible_score += importance
            
            if symptom_name in patient_symptom_names:
                patient_data = patient_symptoms[symptom_name]
                
                match_quality = calculate_symptom_match_score(symptom_config, patient_data)
                symptom_score = importance * match_quality
                total_score += symptom_score
                
                if match_quality >= 0.8:
                    matched_symptoms.append({
                        "symptom": symptom_name,
                        "match_quality": round(match_quality * 100),
                        "importance": round(importance * 100)
                    })
                elif match_quality > 0:
                    partially_matched.append({
                        "symptom": symptom_name,
                        "match_quality": round(match_quality * 100),
                        "importance": round(importance * 100)
                    })
            else:
                if importance >= 0.7:
                    missing_symptoms.append({
                        "symptom": symptom_name,
                        "importance": round(importance * 100)
                    })
        
        if max_possible_score > 0:
            base_confidence = (total_score / max_possible_score) * 100
        else:
            base_confidence = 0
        
        prevalence_factor = 1.0 + (prevalence * 0.2)
        
        confidence = min(100, base_confidence * prevalence_factor)
        
        if not matched_symptoms and not partially_matched and not negative_matches:
            continue
        
        explanation_parts = []
        if matched_symptoms:
            symptom_list = ", ".join([m["symptom"] for m in matched_symptoms])
            explanation_parts.append(f"Strong match on: {symptom_list}")
        if partially_matched:
            symptom_list = ", ".join([m["symptom"] for m in partially_matched])
            explanation_parts.append(f"Partial match on: {symptom_list}")
        if negative_matches:
            for nm in negative_matches:
                explanation_parts.append(nm["note"])
        if missing_symptoms:
            symptom_list = ", ".join([m["symptom"] for m in missing_symptoms])
            explanation_parts.append(f"Consider checking for: {symptom_list}")
        
        results.append({
            "disease": disease_name,
            "common_name": disease_data.get("common_name", disease_name),
            "category": disease_data.get("category", "General"),
            "confidence": round(confidence, 1),
            "matched_symptoms": matched_symptoms,
            "partially_matched": partially_matched,
            "missing_symptoms": missing_symptoms,
            "negative_matches": negative_matches,
            "explanation": " | ".join(explanation_parts)
        })
    
    results.sort(key=lambda x: x["confidence"], reverse=True)
    
    return results


def get_differential_diagnosis(
    patient_symptoms: dict,
    top_n: int = 5,
    min_confidence: float = 10.0
) -> list[dict]:
    all_diagnoses = diagnose(patient_symptoms)
    
    filtered = [d for d in all_diagnoses if d["confidence"] >= min_confidence]
    
    # Return top N
    return filtered[:top_n]


# Example usage and testing
if __name__ == "__main__":
    test_symptoms = {
        "Ear Pain": {
            "present": True,
            "pain_character": "throbbing",
            "location": "deep_internal",
            "intensity": 7,
            "discharge": "none"
        },
        "Fever": {
            "present": True,
            "pattern": "intermittent"
        }
    }
    
    print("=" * 60)
    print("Test Case: Ear Pain + Fever")
    print("=" * 60)
    
    results = get_differential_diagnosis(test_symptoms, top_n=5)
    
    for i, diagnosis in enumerate(results, 1):
        print(f"\n{i}. {diagnosis['common_name']} ({diagnosis['category']})")
        print(f"   Confidence: {diagnosis['confidence']}%")
        print(f"   {diagnosis['explanation']}")
    
    test_symptoms_2 = {
        "Sore Throat": {
            "present": True,
            "physical_signs": "white_patches",
            "swallowing_pain": "severe",
            "intensity": 8
        },
        "Fever": {
            "present": True,
            "onset": "sudden"
        }
    }
    
    print("\n" + "=" * 60)
    print("Test Case: Sore Throat + Fever (no cough)")
    print("=" * 60)
    
    results = get_differential_diagnosis(test_symptoms_2, top_n=5)
    
    for i, diagnosis in enumerate(results, 1):
        print(f"\n{i}. {diagnosis['common_name']} ({diagnosis['category']})")
        print(f"   Confidence: {diagnosis['confidence']}%")
        print(f"   {diagnosis['explanation']}")

