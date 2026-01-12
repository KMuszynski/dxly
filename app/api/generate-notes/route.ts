import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Types for visit data
interface VisitSymptom {
  symptom: string;
  duration?: string;
  notes?: string;
  followUpAnswers?: Record<string, string | number>;
}

interface VisitDiagnosis {
  diagnosis: string;
  notes?: string;
}

interface PatientInfo {
  date_of_birth: Date;
  gender: string;
  address: string;
}
interface GenerateNotesRequest {
  patientName: string | null;
  patient: PatientInfo | null;
  symptoms: VisitSymptom[];
  diagnoses: VisitDiagnosis[];
  visitDate: string;
  visitTime: string;
  existingNotes?: string;
  language?: string;
}

// LLM Provider interface - makes it easy to swap providers
interface LLMProvider {
  generateNotes(prompt: string): Promise<string>;
}

// Gemini provider implementation
class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateNotes(prompt: string): Promise<string> {
    // Try the v1beta endpoint first, fall back to v1 if needed
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    console.log("Calling Gemini API with model:", this.model);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      
      // If model not found, try fallback model
      if (response.status === 404) {
        console.log("Model not found, trying fallback model: gemini-pro");
        return this.generateWithFallback(prompt);
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Unexpected Gemini response:", JSON.stringify(data));
      throw new Error("No content generated");
    }

    return data.candidates[0].content.parts[0].text;
  }

  private async generateWithFallback(prompt: string): Promise<string> {
    // Try gemini-pro as fallback (widely available)
    const fallbackModel = "gemini-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini fallback API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("No content generated from fallback model");
    }

    return data.candidates[0].content.parts[0].text;
  }
}

// OpenAI provider implementation (for future use)
class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateNotes(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are a medical assistant helping doctors write clinical notes.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Factory to get the appropriate LLM provider
function getLLMProvider(): LLMProvider {
  // Check for OpenAI first (primary)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAIProvider(openaiKey);
  }

  // Fallback to Gemini if available
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new GeminiProvider(geminiKey);
  }

  throw new Error("No LLM API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY.");
}

// Build the prompt for note generation
function buildPrompt(data: GenerateNotesRequest): string {
  const { patientName, patient, symptoms, diagnoses, visitDate, visitTime, language } =
    data;

  const symptomsText = symptoms
    .map((s, i) => {
      let text = `${i + 1}. ${s.symptom}`;
      if (s.duration) text += ` (Duration: ${s.duration})`;
      if (s.notes) text += ` - Notes: ${s.notes}`;
      if (s.followUpAnswers && Object.keys(s.followUpAnswers).length > 0) {
        const followUps = Object.entries(s.followUpAnswers)
          .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
          .join(", ");
        text += ` | Follow-up: ${followUps}`;
      }
      return text;
    })
    .join("\n");

  const diagnosesText = diagnoses
    .map((d, i) => {
      let text = `${i + 1}. ${d.diagnosis}`;
      if (d.notes) text += ` - Notes: ${d.notes}`;
      return text;
    })
    .join("\n");

  const languageInstruction =
    language === "pl"
      ? "Write the notes in Polish (Polski)."
      : "Write the notes in English.";

      return `You are a professional medical scribe. Generate a formal medical epicrisis (clinical note) using the SOAP format based on the data below.

      [CONSTRAINTS]
      - Use professional medical terminology (e.g., 'patient reports' instead of 'patient said').
      - Strictly follow the SOAP structure (Subjective, Objective, Assessment, Plan).
      - Format: Plain text only. Use clear headers. Do NOT use Markdown symbols like **bold**, ##, or bullets (*).
      - ${languageInstruction}
      
      [VISIT CONTEXT]
      Date/Time: ${visitDate} ${visitTime}
      Patient: ${patient?.gender ?? 'Unknown'}, DOB: ${patient?.date_of_birth ?? 'Unknown'}
      
      [CLINICAL DATA]
      SYMPTOMS:
      ${symptomsText || "No symptoms recorded"}
      
      DIAGNOSES:
      ${diagnosesText || "No diagnoses recorded"}
      
      [SOAP INSTRUCTIONS]
      S: Present the anamnesis and chief complaints.
      O: Document specific symptom attributes, durations, and follow-up data.
      A: Summarize the clinical assessment based on the provided diagnoses.
      P: Outline the recommended follow-up or next steps.
      
      Generate the clinical note now:`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateNotesRequest = await request.json();

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: await cookies() });


    // Validate required fields
    if (!body.symptoms && !body.diagnoses) {
      return NextResponse.json(
        { error: "At least symptoms or diagnoses are required" },
        { status: 400 }
      );
    }

    // Get the LLM provider
    const provider = getLLMProvider();

    // Build the prompt
    const prompt = buildPrompt(body);
    //console.log(prompt);
    // Generate notes
    //const generatedNotes = await provider.generateNotes(prompt);

    return NextResponse.json({
      success: true,
      notes: await provider.generateNotes(prompt),
      //notes: "test",
    });
  } catch (error) {
    console.error("Error generating notes:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate notes";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

