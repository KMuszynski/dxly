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


    dataset = load_dataset(csv_path)
    diseases = dataset['diseases']
    symptom_columns = dataset['symptom_columns']
    data_rows = dataset['data_rows']
    

    symptom_indices = find_symptom_indices(symptoms, symptom_columns)
    
    if not symptom_indices:
        return []
    

    disease_scores = defaultdict(lambda: {
        'total_score': 0.0,
        'match_count': 0,
        'case_count': 0,
        'exact_matches': 0,
        'single_symptom_matches': 0
    })
    

    disease_frequencies = defaultdict(int)
    for disease in diseases:
        disease_frequencies[disease] += 1
    

    for i, row_symptoms in enumerate(data_rows):
        disease = diseases[i]
        

        matched_symptoms = sum(1 for idx in symptom_indices if idx < len(row_symptoms) and row_symptoms[idx] == 1)
        total_symptoms_in_row = sum(row_symptoms)
        
        if matched_symptoms == 0:
            continue
        
        disease_scores[disease]['case_count'] += 1
        

        match_percentage = matched_symptoms / len(symptom_indices)
        

        base_score = match_percentage * 100
        

        if matched_symptoms == len(symptom_indices):
            disease_scores[disease]['exact_matches'] += 1
            base_score *= 2.0  
        

        if total_symptoms_in_row == 1 and matched_symptoms == 1:
            disease_scores[disease]['single_symptom_matches'] += 1
            base_score *= 1.5  
        

        frequency_weight = 1.0 + (disease_frequencies[disease] / 10000.0)
        

        disease_scores[disease]['total_score'] += base_score * frequency_weight
        disease_scores[disease]['match_count'] += matched_symptoms
    
    results = []
    for disease, stats in disease_scores.items():
        avg_score = stats['total_score'] / stats['case_count'] if stats['case_count'] > 0 else 0
        
        confidence_weight = min(stats['case_count'] / 10.0, 2.0)  
        
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
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    return results[:top_n]


if __name__ == "__main__":
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
