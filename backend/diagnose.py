#!/usr/bin/env python3
"""
Function to predict diseases based on symptoms using the disease-symptom dataset.

This module provides a function to rank possible diseases given a list of symptoms.
The scoring algorithm considers:
- Number of matching symptoms
- Disease frequency (more common diseases get slight boost)
- Symptom correlation (single-symptom cases indicate higher correlation)
- Exact matches (all symptoms present)

Usage:
    from diagnose import diagnose
    
    symptoms = ["fever", "headache", "nausea"]
    results = diagnose(symptoms, top_n=5)
    
    for result in results:
        print(f"{result['disease']}: {result['score']}")
"""

import csv
import os
from collections import defaultdict
from typing import List, Dict, Tuple


def load_dataset(csv_path: str = None) -> Dict:
    """
    Load the disease-symptom dataset into memory.
    
    Returns:
        dict: Contains 'diseases', 'symptom_columns', and 'data_rows'
    """
    if csv_path is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(script_dir, "Disease and symptoms dataset.csv")
    
    diseases = []
    symptom_columns = []
    data_rows = []
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        
        # Read header
        header = next(reader)
        symptom_columns = header[1:]  # Skip 'diseases' column
        
        # Read data rows
        for row in reader:
            disease = row[0]
            symptoms = [int(val) for val in row[1:]]
            diseases.append(disease)
            data_rows.append(symptoms)
    
    return {
        'diseases': diseases,
        'symptom_columns': symptom_columns,
        'data_rows': data_rows
    }


def normalize_symptom_name(symptom: str) -> str:
    """Normalize symptom name for matching (lowercase, strip whitespace)."""
    return symptom.lower().strip()


def find_symptom_indices(symptoms: List[str], symptom_columns: List[str]) -> List[int]:
    """
    Find the column indices for the given symptoms.
    
    Args:
        symptoms: List of symptom names to find
        symptom_columns: List of all symptom column names from the dataset
    
    Returns:
        List of column indices where the symptoms are found
    """
    normalized_columns = [normalize_symptom_name(col) for col in symptom_columns]
    indices = []
    
    for symptom in symptoms:
        normalized = normalize_symptom_name(symptom)
        try:
            idx = normalized_columns.index(normalized)
            indices.append(idx)
        except ValueError:
            # Symptom not found - could print a warning here
            pass
    
    return indices


def diagnose(symptoms: List[str], top_n: int = 10, csv_path: str = None) -> List[Dict[str, any]]:
    """
    Predict diseases based on a list of symptoms.
    
    Args:
        symptoms: List of symptom names (strings)
        top_n: Number of top predictions to return (default: 10)
        csv_path: Optional path to CSV file (default: uses file in same directory)
    
    Returns:
        List of dictionaries, each containing:
            - 'disease': Disease name
            - 'score': Match score (higher is better)
            - 'match_count': Number of matched symptoms
            - 'total_symptom_count': Total number of symptoms in input
            - 'frequency': Number of times this disease appears in dataset
            - 'match_percentage': Percentage of input symptoms matched
    
    Example:
        >>> results = diagnose(["fever", "headache", "nausea"])
        >>> print(results[0]['disease'])  # Top predicted disease
    """
    # Load dataset
    dataset = load_dataset(csv_path)
    diseases = dataset['diseases']
    symptom_columns = dataset['symptom_columns']
    data_rows = dataset['data_rows']
    
    # Find column indices for input symptoms
    symptom_indices = find_symptom_indices(symptoms, symptom_columns)
    
    if not symptom_indices:
        return []
    
    # Score each disease
    disease_scores = defaultdict(lambda: {
        'total_score': 0.0,
        'match_count': 0,
        'case_count': 0,
        'exact_matches': 0,
        'single_symptom_matches': 0
    })
    
    # Count disease frequencies
    disease_frequencies = defaultdict(int)
    for disease in diseases:
        disease_frequencies[disease] += 1
    
    # Score each row
    for i, row_symptoms in enumerate(data_rows):
        disease = diseases[i]
        
        # Count how many input symptoms match this row
        matched_symptoms = sum(1 for idx in symptom_indices if idx < len(row_symptoms) and row_symptoms[idx] == 1)
        total_symptoms_in_row = sum(row_symptoms)
        
        if matched_symptoms == 0:
            continue
        
        disease_scores[disease]['case_count'] += 1
        
        # Calculate match score
        match_percentage = matched_symptoms / len(symptom_indices)
        
        # Base score: weighted by match percentage
        base_score = match_percentage * 100
        
        # Bonus for exact or near-exact matches
        if matched_symptoms == len(symptom_indices):
            disease_scores[disease]['exact_matches'] += 1
            base_score *= 2.0  # Exact match bonus
        
        # Bonus for high correlation (single symptom cases)
        if total_symptoms_in_row == 1 and matched_symptoms == 1:
            disease_scores[disease]['single_symptom_matches'] += 1
            base_score *= 1.5  # High correlation bonus
        
        # Weight by disease frequency (more common diseases get slight boost)
        frequency_weight = 1.0 + (disease_frequencies[disease] / 10000.0)
        
        # Add to total score
        disease_scores[disease]['total_score'] += base_score * frequency_weight
        disease_scores[disease]['match_count'] += matched_symptoms
    
    # Calculate final scores and prepare results
    results = []
    for disease, stats in disease_scores.items():
        # Average score per case
        avg_score = stats['total_score'] / stats['case_count'] if stats['case_count'] > 0 else 0
        
        # Weight by number of matching cases (more cases = higher confidence)
        confidence_weight = min(stats['case_count'] / 10.0, 2.0)  # Cap at 2x
        
        final_score = avg_score * confidence_weight
        
        match_percentage = (stats['match_count'] / (stats['case_count'] * len(symptom_indices))) * 100 if stats['case_count'] > 0 else 0
        
        results.append({
            'disease': disease,
            'score': round(final_score, 2),
            'match_count': stats['match_count'],
            'total_symptom_count': len(symptom_indices),
            'frequency': disease_frequencies[disease],
            'match_percentage': round(match_percentage, 2),
            'case_count': stats['case_count'],
            'exact_matches': stats['exact_matches']
        })
    
    # Sort by score (descending)
    results.sort(key=lambda x: x['score'], reverse=True)
    
    return results[:top_n]


if __name__ == "__main__":
    # Example usage
    test_symptoms = ["fever", "headache", "nausea", "vomiting"]
    print(f"Diagnosing symptoms: {test_symptoms}\n")
    
    results = diagnose(test_symptoms, top_n=10)
    
    print(f"Top {len(results)} predicted diseases:\n")
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['disease']}")
        print(f"   Score: {result['score']}")
        avg_symptoms_matched = (result['match_percentage'] / 100) * result['total_symptom_count']
        print(f"   Average match: {result['match_percentage']:.1f}% (on average, {avg_symptoms_matched:.1f} out of {result['total_symptom_count']} symptoms were present per case)")
        print(f"   Total symptom matches: {result['match_count']} across {result['case_count']} matching cases")
        print(f"   Disease appears {result['frequency']} times in dataset")
        if result['exact_matches'] > 0:
            print(f"   Exact matches: {result['exact_matches']} cases had ALL your symptoms")
        print()
