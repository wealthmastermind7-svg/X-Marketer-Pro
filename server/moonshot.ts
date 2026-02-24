const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";

const SYSTEM_PROMPT = `You are X Marketer, a professional Twitter/X marketing strategist and content creator.

IMPORTANT RULES:
1. You have access to web search via the $web_search tool. You MUST use it whenever you need real information.
2. NEVER guess or fabricate what a product, app, or service does. If the user mentions any product, app, or website, you MUST search the web first to understand what it actually is.
3. When the user provides URLs, you MUST search for and visit those URLs to gather accurate information before creating any marketing content.
4. Base ALL tweet ideas, strategies, and recommendations on verified, real information only.

When generating a daily marketing report, respond with valid JSON only (no markdown, no code fences). The JSON structure:

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

Requirements:
- 4-5 trending topics with momentum indicators relevant to the user's niche
- 3-5 tweet/thread ideas that are viral-worthy, specific, and ready to post
- For "thread" type ideas, populate "threadTweets" with 4-6 tweets (each under 280 chars). "content" = thread opener. For non-thread types, "threadTweets" = empty array
- 3 optimal posting times with reasoning
- 1 detailed growth tip
- Content type analysis

If the user provides images, analyze what is visible and combine with web search results.`;

interface ImageAttachment {
  base64: string;
  mimeType: string;
}

interface ChatMessage {
  role: string;
  content: any;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s,'")\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

async function callMoonshotAPI(apiKey: string, messages: ChatMessage[]): Promise<any> {
  const body: any = {
    model: "kimi-latest",
    messages,
    temperature: 0.7,
    max_tokens: 4000,
    tools: [
      {
        type: "builtin_function",
        function: {
          name: "$web_search",
        },
      },
    ],
  };

  const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API error:", response.status, errorText);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function runToolCallLoop(apiKey: string, messages: ChatMessage[]): Promise<string> {
  let iterations = 0;
  const maxIterations = 15;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`[X Marketer] API call #${iterations}, messages: ${messages.length}`);

    const data = await callMoonshotAPI(apiKey, messages);
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No response from AI");
    }

    const finishReason = choice.finish_reason;

    if (finishReason === "tool_calls" && choice.message?.tool_calls) {
      console.log(`[X Marketer] Web search triggered (${choice.message.tool_calls.length} calls)`);
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const toolCallName = toolCall.function.name;
        const toolCallArguments = JSON.parse(toolCall.function.arguments);

        console.log(`[X Marketer] Searching: ${JSON.stringify(toolCallArguments).slice(0, 300)}`);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCallName,
          content: JSON.stringify(toolCallArguments),
        });
      }
    } else {
      const content = choice.message?.content;
      if (!content) {
        throw new Error("No content in AI response");
      }
      console.log(`[X Marketer] Completed after ${iterations} API calls`);
      return content;
    }
  }

  throw new Error("Too many tool call iterations");
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

  const hasContext = !!(context && context.trim());
  const urls = hasContext ? extractUrls(context!) : [];
  const hasUrls = urls.length > 0;

  console.log(`[X Marketer] Generating report. Context: ${hasContext}, URLs found: ${urls.length}`);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (hasUrls) {
    const researchPrompt = `I need to market this product. Here are the links:
${urls.map((u) => `- ${u}`).join("\n")}

${context!.trim()}

STEP 1: First, use web search to visit each of these URLs and research what this product/app actually does. Find out its real features, target audience, and value proposition. Also search for current Twitter/X trends related to this product's industry.

STEP 2: After you have gathered real information from the web, generate a complete daily X marketing report for ${today} based on what you found. The report must be valid JSON only — no other text before or after the JSON.

Remember: every tweet idea, trend, and strategy must be based on the REAL product information you found through web search. Do not make up features.`;

    let userContent: any;
    if (images && images.length > 0) {
      userContent = [
        { type: "text", text: researchPrompt + `\n\nThe user has also attached ${images.length} image(s) for additional context. Analyze them alongside your web search findings.` },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        })),
      ];
    } else {
      userContent = researchPrompt;
    }

    messages.push({ role: "user", content: userContent });
  } else if (hasContext) {
    let textMessage = `Generate today's daily X marketing report for ${today}.

USER'S FOCUS: "${context!.trim()}"

Search the web for current Twitter/X trends relevant to this focus area. Tailor ALL content specifically to what the user is focused on. Return valid JSON only.`;

    if (images && images.length > 0) {
      const userContent = [
        { type: "text", text: textMessage + `\n\nThe user attached ${images.length} image(s). Analyze them for additional context.` },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        })),
      ];
      messages.push({ role: "user", content: userContent });
    } else {
      messages.push({ role: "user", content: textMessage });
    }
  } else {
    let textMessage = `Generate today's daily X marketing report for ${today}. Search for the latest Twitter/X marketing trends, draft viral tweet ideas, suggest optimal posting times, and provide one powerful growth tip. Return valid JSON only.`;

    if (images && images.length > 0) {
      const userContent = [
        { type: "text", text: textMessage + `\n\nThe user attached ${images.length} image(s). Analyze them for additional context.` },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        })),
      ];
      messages.push({ role: "user", content: userContent });
    } else {
      messages.push({ role: "user", content: textMessage });
    }
  }

  const rawContent = await runToolCallLoop(apiKey, messages);

  let cleaned = rawContent.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    const report = JSON.parse(cleaned);
    report.generatedAt = new Date().toISOString();
    report.reportDate = report.reportDate || new Date().toISOString().split("T")[0];
    return report;
  } catch (parseError) {
    console.error("[X Marketer] Failed to parse response:", cleaned.slice(0, 500));
    throw new Error("Failed to parse AI response as JSON");
  }
}
