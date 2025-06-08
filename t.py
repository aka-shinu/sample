import requests

headers = {
    'Content-Type': 'application/json',
}

params = {
    'key': 'AIzaSyAGFk8hB3I7xSC3SSEivZK2tTciAuvJkbo',
}

json_data = {
    'contents': [
        {
            'parts': [
                {
                    'text': 'Explain how AI works in a few words',
                },
            ],
        },
    ],
}

response = requests.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    params=params,
    headers=headers,
    json=json_data,
)
print(response.json())