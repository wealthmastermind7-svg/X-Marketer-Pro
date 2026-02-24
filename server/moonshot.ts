const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
const MODEL_ID = "kimi-k2.5";

const JSON_FORMAT_INSTRUCTION = `You MUST respond with valid JSON only (no markdown, no code fences, no extra text before or after the JSON). The JSON structure:

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
- Content type analysis`;

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

async function callAgentAPI(apiKey: string, messages: ChatMessage[]): Promise<any> {
  const body: any = {
    model: MODEL_ID,
    messages,
    temperature: 1,
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
    console.error("[X Marketer] API error:", response.status, errorText);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function runAgentLoop(apiKey: string, messages: ChatMessage[]): Promise<string> {
  let iterations = 0;
  const maxIterations = 15;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`[X Marketer] Agent call #${iterations}, messages: ${messages.length}`);

    const data = await callAgentAPI(apiKey, messages);
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No response from agent");
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
        throw new Error("No content in agent response");
      }
      console.log(`[X Marketer] Completed after ${iterations} agent calls`);
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

  console.log(`[X Marketer] Generating report via ${MODEL_ID}. Context: ${hasContext}, URLs: ${urls.length}`);

  const messages: ChatMessage[] = [];

  let prompt: string;

  if (hasContext) {
    prompt = `${context!.trim()}

Generate a complete daily X/Twitter marketing report for ${today}. Research the links and context I provided above, then deliver the report.

${JSON_FORMAT_INSTRUCTION}`;
  } else {
    prompt = `Generate today's daily X/Twitter marketing report for ${today}. Research the latest trends, draft viral tweet ideas, suggest optimal posting times, and provide a growth tip.

${JSON_FORMAT_INSTRUCTION}`;
  }

  if (images && images.length > 0) {
    const userContent: any[] = [
      { type: "text", text: prompt + `\n\nI've attached ${images.length} image(s) for additional context. Analyze them alongside your research.` },
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      })),
    ];
    messages.push({ role: "user", content: userContent });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  const rawContent = await runAgentLoop(apiKey, messages);

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
