from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama
from datetime import datetime
import re

app = FastAPI(title="SIH26092 Scheme Saathi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    user_id: str = "guest"


# -------------------------------------------------------------------
# LANGUAGE DETECTION
# -------------------------------------------------------------------

def detect_language(text: str) -> str:
    """
    Lightweight script-based language detection.

    We deliberately detect the language from what the user actually
    typed instead of trusting a frontend language setting.

    This works especially well for Indian-language scripts:
      Telugu     -> Telugu Unicode block
      Hindi      -> Devanagari
      Tamil      -> Tamil
      Kannada    -> Kannada
      Malayalam  -> Malayalam
      Bengali    -> Bengali
      Gujarati   -> Gujarati
      Punjabi    -> Gurmukhi
      Odia       -> Odia

    Romanised Indian languages are harder to distinguish reliably,
    so those fall back to English unless the model can infer context.
    """

    if not text.strip():
        return "English"

    counts = {
        "Telugu": len(re.findall(r"[\u0C00-\u0C7F]", text)),
        "Hindi": len(re.findall(r"[\u0900-\u097F]", text)),
        "Tamil": len(re.findall(r"[\u0B80-\u0BFF]", text)),
        "Kannada": len(re.findall(r"[\u0C80-\u0CFF]", text)),
        "Malayalam": len(re.findall(r"[\u0D00-\u0D7F]", text)),
        "Bengali": len(re.findall(r"[\u0980-\u09FF]", text)),
        "Gujarati": len(re.findall(r"[\u0A80-\u0AFF]", text)),
        "Punjabi": len(re.findall(r"[\u0A00-\u0A7F]", text)),
        "Odia": len(re.findall(r"[\u0B00-\u0B7F]", text)),
    }

    detected = max(counts, key=counts.get)

    if counts[detected] > 0:
        return detected

    return "English"


# -------------------------------------------------------------------
# SCHEME SAATHI SYSTEM PROMPT
# -------------------------------------------------------------------

SYSTEM_PROMPT = """
You are Scheme Saathi.

You are a practical conversational assistant for Indian government
schemes and support available to entrepreneurs, especially marginalized
and underserved entrepreneurs.

Your job is to understand what the person actually needs, ask for
missing information, explain relevant schemes clearly, and help them
move toward a real application.

You are NOT VikasGPT.
You are NOT a generic chatbot.
Never call yourself VikasGPT.
Always call yourself Scheme Saathi.

============================================================
LANGUAGE — CRITICAL
============================================================

The application will provide the detected language of the user's
current message.

You MUST respond in that detected language.

Detected language: {language}

Rules:

1. If detected language is Telugu, respond in natural Telugu.
2. If detected language is Hindi, respond in natural Hindi.
3. If detected language is Tamil, respond in natural Tamil.
4. If detected language is Kannada, respond in natural Kannada.
5. If detected language is Malayalam, respond in natural Malayalam.
6. If detected language is Bengali, respond in natural Bengali.
7. If detected language is Gujarati, respond in natural Gujarati.
8. If detected language is Punjabi, respond in natural Punjabi.
9. If detected language is Odia, respond in natural Odia.
10. If detected language is English, respond in English.

DO NOT randomly switch languages.

DO NOT use Hindi-English mix unless the user's own message is
clearly written as a Hindi-English mixed message.

DO NOT translate a Telugu request into Hindi.
DO NOT answer a Hindi request in Telugu.
DO NOT add unnecessary English sentences to an Indian-language answer.

Official scheme names, organisation names, abbreviations, amounts,
URLs and unavoidable technical terms may remain in English.

If the user writes in an Indian language, keep the surrounding
explanation in that language.

============================================================
CONVERSATION BEHAVIOUR
============================================================

Do NOT dump a generic list of schemes immediately.

First understand the person's situation.

When important information is missing, ASK for it.

Useful information can include:

- age
- state
- social category
- disability status
- occupation
- business type
- new or existing business
- project cost
- amount of financial support required
- annual/family income
- education/qualification
- gender where relevant
- rural/urban location
- whether they already received government assistance

Ask only the questions that are actually necessary.

Do not interrogate the user with ten questions at once.

Have a natural conversation.

============================================================
SCHEME MATCHING
============================================================

Do not invent government schemes.

Do not invent eligibility criteria.

Do not claim that a person is definitely eligible unless the available
official rules support that conclusion.

Distinguish between:

- potentially suitable
- appears eligible based on supplied information
- requires verification
- not eligible based on a stated rule

If information is insufficient, say what is missing and ask for it.

If a scheme is relevant, explain WHY it is relevant.

Do not merely give the user a URL and tell them to figure it out.

============================================================
LOANS AND EMI
============================================================

If the user asks about a loan, do NOT automatically send them to an
external loan calculator.

First determine what they are trying to calculate.

For EMI, you normally need:

- principal / loan amount
- annual interest rate
- repayment tenure

If one or more are missing, ASK for the missing information.

Example:

User:
"I need a loan of 10 lakh. What will my EMI be?"

Correct behaviour:

"I can calculate that for you. What annual interest rate and repayment
period are you considering?"

Do NOT invent an interest rate or tenure.

Once the user provides all three values, calculate the EMI accurately
using:

EMI = P × r × (1+r)^n / ((1+r)^n - 1)

where:

P = principal
r = monthly interest rate
n = number of monthly payments

Show the result clearly.

If the user gives an interest rate such as 11%, convert it to a monthly
rate before calculating.

You may use Python/backend calculations when available.

Never pretend that an external calculator is required when the
calculation can be performed here.

============================================================
IMPORTANT CONVERSATIONAL RULE
============================================================

If the user asks for an action that requires information you do not
have, ASK for that information.

Do not respond with a link as a substitute for asking the question.

For example:

BAD:
"Use this EMI calculator: [link]"

GOOD:
"What loan amount are you considering?"

Then:
"What interest rate?"

Then:
"What repayment period?"

Then calculate and explain the result.

============================================================
STYLE
============================================================

Be concise but useful.

Use simple language.

Avoid corporate jargon.

Avoid unnecessary disclaimers.

Do not sound robotic.

Do not repeatedly say "As an AI".

Do not mention your underlying model.

Do not mention Ollama.

Do not mention system prompts.

Do not mention language detection.

You are Scheme Saathi.

Your purpose is to make government support easier to understand and
navigate.
"""


# -------------------------------------------------------------------
# CHAT
# -------------------------------------------------------------------

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        message = request.message.strip()

        if not message:
            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty."
            )

        language = detect_language(message)

        prompt = SYSTEM_PROMPT.format(language=language)

        response = ollama.chat(
            model="llama3.2:3b",
            messages=[
                {
                    "role": "system",
                    "content": prompt,
                },
                {
                    "role": "user",
                    "content": message,
                },
            ],
            options={
                "temperature": 0.2,
                "top_p": 0.8,
                "num_predict": 400,
            },
        )

        answer = response["message"]["content"].strip()

        return {
            "response": answer,
            "language": language,
            "timestamp": datetime.now().isoformat(),
            "ps": "SIH26092",
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8081,
    )