import requests

headers = {'Content-Type': 'application/json'}
params = {'key': 'AIzaSyAGFk8hB3I7xSC3SSEivZK2tTciAuvJkbo'}
json_data = {
    "contents": [{
        "role": "user",
        "parts": [
            {"text": "Create a high-quality image of a cat riding a bicycle through a futuristic city."}
        ]
    }],
    "responseModality": ["IMAGE", "TEXT"]
}
response = requests.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent',
    params=params,
    headers=headers,
    json=json_data,
)
print(response.json())