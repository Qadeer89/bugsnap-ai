import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 25_000,
});

type Mode = "image" | "gif" | "scenario";

/**
 * Generates a Jira-ready bug report from:
 * - image
 * - gif (multi-step visual)
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

  try {
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

QUALITY BAR:
- Steps must be clear and reproducible
- Expected vs Actual must be specific and testable
- Severity must be justified by impact
- Suspected Area must be a concrete module (UI, Backend, API, Permissions, etc.)
- Assume this will be filed in a real enterprise Jira system
`.trim();

    let userMessage: any;

    if (mode === "scenario") {
      // 🧠 SCENARIO MODE (NO IMAGE)
      userMessage = {
        role: "user",
        content: `
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
- Generate the bug report in the EXACT format defined.
        `.trim(),
      };
    } else {
      // 🖼️ IMAGE / GIF MODE
      const visualHint =
        mode === "gif"
          ? "The attached file is a GIF representing a sequence of actions over time. Analyze it as a step-by-step flow, not as a single static screenshot."
          : "The attached file is a screenshot of the issue.";

      userMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: `
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
            type: "image_url",
            image_url: {
              url: imageBase64!,
            },
          },
        ],
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        userMessage,
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content || content.length < 80) {
      throw new Error("AI returned empty or invalid response");
    }

    return content.trim();
  } catch (err: any) {
    console.error("🔥 OpenAI Error:", err?.message || err);

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
