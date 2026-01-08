import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 25_000, // ⏱️ HARD TIMEOUT: 25 seconds
});

/**
 * Generates a Jira-ready bug report from screenshot + context
 */
export async function generateBugReport({
  imageBase64,
  intent,
  environment,
  browser,
}: {
  imageBase64: string;
  intent?: string;
  environment?: string;
  browser?: string;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 600, // 🛡️ HARD TOKEN LIMIT (cost control)

      messages: [
        {
          role: "system",
          content: `
You are BugSnap AI, a senior QA Lead with 10+ years of experience.

Your task:
- Analyze the screenshot
- Use QA best practices
- Generate a Jira-ready bug report

Rules:
- Be confident and precise
- Avoid words like "might", "maybe", "possibly"
- Follow professional QA structure
- Do NOT add explanations or AI disclaimers
          `.trim(),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
User intent: ${intent || "Not specified"}
Environment: ${environment || "QA"}
Browser/App: ${browser || "Not specified"}

Generate bug in EXACT format:

Title:
Preconditions:
Steps to Reproduce:
Expected Result:
Actual Result:
Severity:
Suspected Area:
              `.trim(),
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content || content.length < 50) {
      throw new Error("AI returned empty or invalid response");
    }

    return content;
  } catch (err: any) {
    console.error("🔥 OpenAI Error:", err?.message || err);

    // 🛟 Graceful fallback (never break UX)
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
