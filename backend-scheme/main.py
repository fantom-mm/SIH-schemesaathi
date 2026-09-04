from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel

app = FastAPI(title="SIH26092 Scheme Saathi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "SIH26092 Scheme Saathi API is running"}


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[List[Message]] = None
    user_id: Optional[str] = "guest"
    language: Optional[str] = "en"
    language_name: Optional[str] = "English"


BASE_SYSTEM_INSTRUCTION = """
You are Scheme Saathi, a practical conversational assistant for Indian government schemes and loans for entrepreneurs.

CRITICAL RULES:
1. ALWAYS respond strictly in English unless explicitly asked otherwise.
2. NEVER switch to Telugu or Hindi just because a state (like Telangana) is mentioned.
3. DO NOT greet or repeat 'Hello! I am Scheme Saathi' if conversation history already exists.
4. DO NOT ask the user for interest rates or loan tenures for government schemes (Mudra / PMMY, Stand-Up India, PMEGP). Provide standard scheme options with default estimations (8.5% - 11.5% interest, up to 5 years tenure).
5. DO NOT re-ask questions if details (business type, loan amount, location) were already provided in past messages.
6. Provide clear, direct, actionable advice and bullet points for scheme options.
"""

# Force HTTP options to handle the Interactions API version
client = genai.Client(
    api_key="AQ.Ab8RN6L6eDpJcBCA7H8jr2rPzIbQAaRsixxyBafF6S4OtgdpMg",
    http_options={"api_version": "v1alpha"}
)


@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        gemini_contents = []

        if request.messages and len(request.messages) > 0:
            for m in request.messages:
                g_role = "user" if m.role == "user" else "model"
                gemini_contents.append(
                    types.Content(
                        role=g_role,
                        parts=[types.Part.from_text(text=m.content.strip())],
                    )
                )
        elif request.message and request.message.strip():
            gemini_contents.append(
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=request.message.strip())
                    ],
                )
            )
        else:
            raise HTTPException(
                status_code=400, detail="No message content provided."
            )

        # Uses the exact required model identifier
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=gemini_contents,
            config=types.GenerateContentConfig(
                system_instruction=BASE_SYSTEM_INSTRUCTION,
                temperature=0.2,
                max_output_tokens=1000,
            ),
        )

        return {
            "response": response.text.strip(),
            "language": "English",
            "timestamp": datetime.now().isoformat(),
            "ps": "SIH26092",
        }

    except Exception as e:
        print("Backend Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8081)