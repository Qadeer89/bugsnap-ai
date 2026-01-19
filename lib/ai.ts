import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 60_000, // GPT-5 can be slow sometimes
});

type Mode = "image" | "gif" | "scenario";

/**
 * Generates a Jira-ready bug report from:
 * - image
 * - gif
 * - OR scenario text only
 */
export async function generateBugReport({
  imageBase64,
  scenario,
  intent,
  environment,
  browser,
  mode,
}: {
  imageBase64?: string;
  scenario?: string;
  intent?: string;
  environment?: string;
  browser?: string;
  mode: Mode;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const systemPrompt = `
You are BugSnap AI, a Principal QA Lead with 15+ years of experience in enterprise software testing.

Your job:
- Analyze the provided input (screenshot, GIF, or scenario)
- Think like a strict QA reviewer
- Generate a professional, production-grade, Jira-ready bug report

CRITICAL RULES:
- Be assertive and precise (no "maybe", "might", "possibly")
- Do NOT explain your reasoning
- Do NOT add any AI disclaimers
- Do NOT add extra sections
- Do NOT change section names
- Do NOT invent features that are not mentioned
- Output must follow EXACTLY this structure and order:

Title:
Preconditions:
Steps to Reproduce:
Expected Result:
Actual Result:
Severity:
Suspected Area:
`.trim();

  try {
    let input: any[];

    if (mode === "scenario") {
      // 🧠 SCENARIO MODE (TEXT ONLY)
      input = [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
${systemPrompt}

Context:
User intent: ${intent || "Not specified"}
Environment: ${environment || "QA"}
Browser/App: ${browser || "Not specified"}

Scenario description:
${scenario}

Instructions:
- Base the bug report ONLY on the scenario above
- Do NOT assume any UI details that are not stated
- Convert the scenario into clear, reproducible steps
- Generate the bug report in the EXACT format defined above.
              `.trim(),
            },
          ],
        },
      ];
    } else {
      // 🖼️ IMAGE / GIF MODE
      const visualHint =
        mode === "gif"
          ? "The attached file is a GIF representing a sequence of actions over time. Analyze it as a step-by-step flow."
          : "The attached file is a screenshot of the issue.";

      input = [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
${systemPrompt}

Context:
User intent: ${intent || "Not specified"}
Environment: ${environment || "QA"}
Browser/App: ${browser || "Not specified"}

Visual type:
${visualHint}

Instructions:
- Carefully analyze what is happening in the visual
- If it is a GIF, infer the user journey across multiple steps
- Generate a bug report in the EXACT format defined above.
              `.trim(),
            },
            {
              type: "input_image",
              image_url: imageBase64!,
            },
          ],
        },
      ];
    }

    // ✅ GPT-5 RESPONSES API (CORRECT)
    const response = await openai.responses.create({
      model: "gpt-5.1",
      input,
      max_output_tokens: 900,
    });

    // ✅ Official SDK helper
    const text = response.output_text || "";

    if (!text || text.length < 80) {
      throw new Error("Empty or invalid AI response");
    }

    return text.trim();
  } catch (err: any) {
    console.error("🔥 OpenAI GPT-5 Error:", err?.message || err);

    // 🛟 Graceful fallback
    return `
Title:
Unable to auto-generate bug

Preconditions:
N/A

Steps to Reproduce:
N/A

Expected Result:
N/A

Actual Result:
AI request failed or timed out.

Severity:
Minor

Suspected Area:
AI Service
`.trim();
  }
}

/**
 * Extracts title from AI bug text
 */
export function extractTitleFromBug(text: string): string {
  const match = text.match(/Title:\s*(.*)/i);
  if (match && match[1]) return match[1].trim();
  return "Untitled Bug";
}
