# Backend API Server

Flask API server for disease diagnosis based on symptoms.

## Setup

1. **Create and activate virtual environment:**

   ```bash
   # Create venv (already created)
   python3 -m venv venv

   # Activate venv
   # On macOS/Linux:
   source venv/bin/activate

   # On Windows:
   # venv\Scripts\activate
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Ensure the CSV file is in the backend folder:**
   - The file `Disease and symptoms dataset.csv` should be in the same directory as `app.py`

## Running the Server

Start the Flask server:

```bash
python3 app.py
```

Or with a specific port:

```bash
PORT=5001 python3 app.py
```

The server will start on `http://localhost:5000` by default (or the port specified in the `PORT` environment variable).

## API Endpoints

### POST `/api/diagnose`

Diagnose diseases based on symptoms.

**Request:**

```json
{
  "symptoms": ["fever", "headache", "nausea", "vomiting"],
  "top_n": 10
}
```

**Response:**

```json
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
  ],
  "symptoms_provided": ["fever", "headache", "nausea", "vomiting"],
  "results_count": 10
}
```

### GET `/api/diagnose`

Alternative GET endpoint for testing (query parameters).

**Example:**

```
GET http://localhost:5000/api/diagnose?symptoms=fever,headache,nausea&top_n=5
```

### GET `/health`

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "service": "diagnosis-api"
}
```

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:5000/api/diagnose \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["fever", "headache"], "top_n": 5}'
```

### Using JavaScript (Fetch)

```javascript
const response = await fetch("http://localhost:5000/api/diagnose", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    symptoms: ["fever", "headache", "nausea"],
    top_n: 10,
  }),
});

const data = await response.json();
console.log(data.results);
```

### Using Python Requests

```python
import requests

response = requests.post('http://localhost:5000/api/diagnose', json={
    'symptoms': ['fever', 'headache', 'nausea'],
    'top_n': 10
})

data = response.json()
print(data['results'])
```

## CORS

CORS is enabled by default for development. For production, you should configure CORS to only allow requests from your frontend domain.

## Environment Variables

- `PORT` - Port to run the server on (default: 5000)
- `FLASK_ENV` - Set to `production` for production mode (disables debug mode)
