const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
const AGENT_SESSION_KEY = "agent:main:subagent:673d211b-aea1-44a8-9df9-0ab6c367b4ab";

const SYSTEM_PROMPT = `You are X Marketer, a professional Twitter/X marketing strategist and content creator. You are connected to session: ${AGENT_SESSION_KEY}

When asked to generate a daily marketing report, you MUST respond with valid JSON only (no markdown, no code fences). The JSON must follow this exact structure:

{
  "reportDate": "YYYY-MM-DD",
  "trends": [
    {"topic": "string", "momentum": "rising|peaking|declining", "relevance": "high|medium|low", "description": "short description"}
  ],
  "tweetIdeas": [
    {"type": "hook|thread|tip|poll|storytelling", "content": "the actual tweet text (for single tweets)", "threadTweets": ["tweet 1 text", "tweet 2 text", "tweet 3 text"], "estimatedEngagement": "high|medium", "notes": "why this works"}
  ],
  "postingTimes": [
    {"time": "HH:MM AM/PM", "timezone": "EST", "reason": "why this time is optimal"}
  ],
  "growthTip": {
    "title": "short title",
    "description": "detailed actionable growth strategy",
    "expectedImpact": "what results to expect"
  },
  "contentAnalysis": {
    "topPerformingType": "string",
    "recommendation": "string"
  }
}

Always provide:
- 4-5 trending topics with momentum indicators
- 3-5 tweet/thread ideas that are viral-worthy, specific, and ready to post
- IMPORTANT: For "thread" type ideas, you MUST populate the "threadTweets" array with 4-6 individual tweets that form the complete thread (each tweet under 280 chars). The "content" field should be the thread opener/hook. For non-thread types, "threadTweets" should be an empty array and "content" has the full tweet text
- 3 optimal posting times with reasoning
- 1 detailed growth tip
- Content type analysis

Make content specific, actionable, and tailored for maximum engagement. Be bold and creative with tweet ideas. Focus on current social media dynamics and growth hacking strategies.

If the user provides images (screenshots, app previews, marketing materials), analyze them carefully and incorporate visual insights into your recommendations. Reference what you see in the images when crafting tweet ideas and strategies.`;

interface ImageAttachment {
  base64: string;
  mimeType: string;
}

export async function generateDailyReport(context?: string, images?: ImageAttachment[]): Promise<any> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY is not configured");
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let textMessage = `Generate today's daily X marketing report for ${today}. Analyze current Twitter/X trends, draft viral tweet ideas, suggest optimal posting times, and provide one powerful growth tip. Return valid JSON only.`;

  if (context && context.trim()) {
    textMessage = `Generate today's daily X marketing report for ${today}.

USER'S FOCUS/CONTEXT: "${context.trim()}"

IMPORTANT: Tailor ALL content (trends, tweet ideas, posting times, growth tips) specifically to the user's context above. The trends should be relevant to their niche. The tweet ideas should be crafted for their specific audience and goals. The growth tip should be actionable for their situation. Make everything hyper-relevant to what they're marketing or focused on.

Return valid JSON only.`;
  }

  if (images && images.length > 0) {
    textMessage += `\n\nThe user has attached ${images.length} image(s) for additional context. Analyze these images and incorporate what you see into your marketing recommendations, tweet ideas, and strategies. If they show an app, product, or brand, tailor the content specifically for that.`;
  }

  const hasImages = images && images.length > 0;
  const model = hasImages ? "kimi-latest" : "kimi-latest";

  let userContent: any;
  if (hasImages) {
    userContent = [
      { type: "text", text: textMessage },
      ...images.map((img) => ({
        type: "image_url",
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
        },
      })),
    ];
  } else {
    userContent = textMessage;
  }

  const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Moonshot API error:", response.status, errorText);
    throw new Error(`Moonshot API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in Moonshot API response");
  }

  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    const report = JSON.parse(cleaned);
    report.generatedAt = new Date().toISOString();
    report.reportDate = report.reportDate || new Date().toISOString().split("T")[0];
    return report;
  } catch (parseError) {
    console.error("Failed to parse Moonshot response:", cleaned);
    throw new Error("Failed to parse AI response as JSON");
  }
}
