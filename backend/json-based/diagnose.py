"""
Diagnosis Engine for Medical Symptom Analysis

This module implements a probabilistic scoring algorithm that matches
patient-reported symptoms against disease profiles to generate ranked
diagnostic suggestions.

Scoring Logic:
1. For each disease, we calculate how well the patient's symptoms match
2. Each matching symptom contributes: importance * expectation_match_score
3. Missing important symptoms create penalties
4. Negative importance indicates the ABSENCE of a symptom supports the diagnosis
5. Prevalence acts as a Bayesian prior, adjusting final scores
"""

import json
from pathlib import Path
from typing import Any


def load_json(filename: str) -> dict:
    """Load JSON file from the same directory as this script."""
    base_path = Path(__file__).parent
    with open(base_path / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def load_disease_profiles() -> dict:
    """Load disease profiles, excluding metadata."""
    profiles = load_json("disease_profiles.json")
    return {k: v for k, v in profiles.items() if not k.startswith("_")}


def load_symptom_library() -> dict:
    """Load symptom library, excluding metadata."""
    library = load_json("symptom_library.json")
    return {k: v for k, v in library.items() if not k.startswith("_")}


def match_expectation(expected: Any, actual: Any) -> float:
    """
    Calculate how well an actual value matches an expected value.
    
    Returns a score between 0.0 (no match) and 1.0 (perfect match).
    
    Match types:
    - List: actual value should be in the list
    - Range [min, max]: actual numeric value should fall within range
    - Exact: direct equality comparison
    """
    if actual is None:
        return 0.0
    
    # List match: actual should be one of the expected values
    if isinstance(expected, list):
        # Check if it's a range [min, max] (two numbers)
        if (len(expected) == 2 and 
            isinstance(expected[0], (int, float)) and 
            isinstance(expected[1], (int, float))):
            # This is a range
            try:
                actual_num = float(actual)
                min_val, max_val = expected
                if min_val <= actual_num <= max_val:
                    return 1.0
                # Partial credit for close values
                if actual_num < min_val:
                    distance = min_val - actual_num
                    return max(0.0, 1.0 - (distance / min_val) * 0.5)
                else:  # actual_num > max_val
                    distance = actual_num - max_val
                    return max(0.0, 1.0 - (distance / max_val) * 0.5)
            except (ValueError, TypeError):
                return 0.0
        else:
            # It's a list of acceptable string values
            if actual in expected:
                return 1.0
            return 0.0
    
    # Boolean match
    if isinstance(expected, bool):
        if isinstance(actual, bool):
            return 1.0 if actual == expected else 0.0
        # Handle string representations
        if isinstance(actual, str):
            actual_bool = actual.lower() in ("true", "yes", "1")
            return 1.0 if actual_bool == expected else 0.0
        return 0.0
    
    # Exact match for strings and numbers
    if expected == actual:
        return 1.0
    
    # Partial string matching (case-insensitive)
    if isinstance(expected, str) and isinstance(actual, str):
        if expected.lower() == actual.lower():
            return 1.0
        return 0.0
    
    return 0.0


def calculate_symptom_match_score(
    disease_symptom: dict,
    patient_symptom_data: dict
) -> float:
    """
    Calculate how well a patient's symptom data matches disease expectations.
    
    Args:
        disease_symptom: The disease's expectations for this symptom
        patient_symptom_data: The patient's reported values for this symptom
    
    Returns:
        Score between 0.0 and 1.0 indicating match quality
    """
    expectations = disease_symptom.get("expectations", {})
    
    if not expectations:
        # No specific expectations, presence alone is enough
        return 1.0
    
    total_weight = 0.0
    weighted_score = 0.0
    
    for key, expected_value in expectations.items():
        actual_value = patient_symptom_data.get(key)
        match_score = match_expectation(expected_value, actual_value)
        
        # Weight each expectation equally within a symptom
        weight = 1.0
        total_weight += weight
        weighted_score += match_score * weight
    
    if total_weight == 0:
        return 1.0
    
    return weighted_score / total_weight


def diagnose(patient_symptoms: dict) -> list[dict]:
    """
    Generate diagnostic suggestions based on patient symptoms.
    
    Args:
        patient_symptoms: Dictionary mapping symptom names to their details.
            Example:
            {
                "Cough": {
                    "present": True,
                    "cough_type": "productive",
                    "sputum_color": "yellow_green",
                    "onset": "gradual"
                },
                "Fever": {
                    "present": True,
                    "intensity": 8
                }
            }
    
    Returns:
        List of diagnosis suggestions, sorted by confidence score.
        Each entry contains:
        - disease: Name of the disease
        - common_name: Display name
        - confidence: Score between 0 and 100
        - matched_symptoms: List of symptoms that matched
        - missing_symptoms: Important symptoms not reported
        - explanation: Human-readable reasoning
    """
    disease_profiles = load_disease_profiles()
    patient_symptom_names = set(patient_symptoms.keys())
    
    results = []
    
    for disease_name, disease_data in disease_profiles.items():
        disease_symptoms = disease_data.get("symptoms", {})
        prevalence = disease_data.get("prevalence", 0.05)  # Default 5%
        
        if not disease_symptoms:
            continue
        
        total_score = 0.0
        max_possible_score = 0.0
        matched_symptoms = []
        missing_symptoms = []
        partially_matched = []
        negative_matches = []  # Symptoms whose absence supports diagnosis
        
        for symptom_name, symptom_config in disease_symptoms.items():
            importance = symptom_config.get("importance", 0.5)
            
            # Handle negative importance (absence of symptom supports diagnosis)
            if importance < 0:
                abs_importance = abs(importance)
                max_possible_score += abs_importance
                
                if symptom_name not in patient_symptom_names:
                    # Patient doesn't have this symptom - good for this diagnosis
                    total_score += abs_importance
                    negative_matches.append({
                        "symptom": symptom_name,
                        "note": symptom_config.get("note", f"Absence of {symptom_name} supports this diagnosis")
                    })
                else:
                    # Patient has this symptom - bad for this diagnosis
                    # No score added, acts as implicit penalty
                    pass
                continue
            
            max_possible_score += importance
            
            if symptom_name in patient_symptom_names:
                patient_data = patient_symptoms[symptom_name]
                
                # Calculate how well the patient's symptom matches expectations
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
                # Patient doesn't have this expected symptom
                if importance >= 0.7:
                    missing_symptoms.append({
                        "symptom": symptom_name,
                        "importance": round(importance * 100)
                    })
        
        # Calculate base confidence score (0-100)
        if max_possible_score > 0:
            base_confidence = (total_score / max_possible_score) * 100
        else:
            base_confidence = 0
        
        # Apply prevalence as a Bayesian prior adjustment
        # Higher prevalence diseases get a small boost
        prevalence_factor = 1.0 + (prevalence * 0.2)  # Up to 20% boost for common diseases
        
        # Calculate final confidence with prevalence adjustment
        confidence = min(100, base_confidence * prevalence_factor)
        
        # Require at least one matched symptom to consider this diagnosis
        if not matched_symptoms and not partially_matched and not negative_matches:
            continue
        
        # Build explanation
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
    
    # Sort by confidence (highest first)
    results.sort(key=lambda x: x["confidence"], reverse=True)
    
    return results


def get_differential_diagnosis(
    patient_symptoms: dict,
    top_n: int = 5,
    min_confidence: float = 10.0
) -> list[dict]:
    """
    Get top N differential diagnoses above minimum confidence threshold.
    
    Args:
        patient_symptoms: Dictionary of patient symptoms with details
        top_n: Maximum number of diagnoses to return
        min_confidence: Minimum confidence score to include
    
    Returns:
        List of top diagnostic suggestions
    """
    all_diagnoses = diagnose(patient_symptoms)
    
    # Filter by minimum confidence
    filtered = [d for d in all_diagnoses if d["confidence"] >= min_confidence]
    
    # Return top N
    return filtered[:top_n]


# Example usage and testing
if __name__ == "__main__":
    # Test case: Patient with ear pain symptoms suggesting Acute Otitis Media
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
    
    # Test case 2: Sore throat without cough (Strep indicator)
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

