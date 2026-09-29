from datetime import datetime
from typing import List, Optional
import os
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel

app = FastAPI(title="SIH26092 Scheme Saathi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[List[Message]] = None
    user_id: Optional[str] = "guest"
    language: Optional[str] = "en"
    language_name: Optional[str] = "English"


load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options={"api_version": "v1alpha"}
)


@app.get("/")
async def root():
    return {"message": "SIH26092 Scheme Saathi API is running"}


@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # 1. DYNAMIC SYSTEM INSTRUCTION BASED ON SELECTED LANGUAGE
        target_lang = request.language_name or "English"
        
        dynamic_system_instruction = f"""
You are Scheme Saathi, a practical conversational assistant for Indian government schemes and loans for entrepreneurs.

CRITICAL RULES:
1. ALWAYS respond strictly and entirely in {target_lang}. Do not reply in English unless {target_lang} is English.
2. DO NOT greet or repeat 'Hello! I am Scheme Saathi' if conversation history already exists.
3. DO NOT ask the user for interest rates or loan tenures for government schemes (Mudra / PMMY, Stand-Up India, PMEGP). Provide standard scheme options with default estimations (8.5% - 11.5% interest, up to 5 years tenure).
4. DO NOT re-ask questions if details (business type, loan amount, location) were already provided in past messages.
5. Provide clear, direct, actionable advice and bullet points for scheme options.
"""

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
                    parts=[types.Part.from_text(text=request.message.strip())],
                )
            )
        else:
            raise HTTPException(
                status_code=400, detail="No message content provided."
            )

        # 2. TRY PRIMARY GEMINI API
        try:
            response = client.models.generate_content(
                model="gemini-3.6-flash",  # note: standard identifier
                contents=gemini_contents,
                config=types.GenerateContentConfig(
                    system_instruction=dynamic_system_instruction,
                    temperature=0.2,
                    max_output_tokens=3000,
                ),
            )

            return {
                "response": response.text.strip(),
                "language": target_lang,
                "timestamp": datetime.now().isoformat(),
                "ps": "SIH26092",
            }

        except Exception as api_err:
            print(f"Gemini API failed/rate limited ({api_err}). Trying local Ollama fallback...")

            """
            
            # 3. FALLBACK TO LOCAL OLLAMA IF GEMINI FAILS
            ollama_messages = [{"role": "system", "content": dynamic_system_instruction}]
            
            if request.messages:
                for m in request.messages:
                    ollama_messages.append({"role": m.role, "content": m.content.strip()})
            elif request.message:
                ollama_messages.append({"role": "user", "content": request.message.strip()})

            async with httpx.AsyncClient(timeout=60.0) as http_client:
                ollama_res = await http_client.post(
                    "http://localhost:11434/api/chat",
                    json={
                        "model": "qwen2.5:1.5b",
                        "messages": ollama_messages,
                        "stream": False
                    }
                )
                ollama_res.raise_for_status()
                data = ollama_res.json()
                
                return {
                    "response": data["message"]["content"].strip(),
                    "language": target_lang,
                    "timestamp": datetime.now().isoformat(),
                    "ps": "SIH26092 (Local Fallback)",
                }
     """
    except Exception as e:
        print("Backend Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)