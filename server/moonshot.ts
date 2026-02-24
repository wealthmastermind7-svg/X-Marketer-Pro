const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";

const SYSTEM_PROMPT = `You are X Marketer, a professional Twitter/X marketing strategist and content creator.

You have access to web search. When the user provides URLs (App Store links, websites, social media profiles), you MUST use web search to visit those URLs and gather real information about the product/app/service before creating marketing content. NEVER guess or fabricate what a product does — always search first.

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
- 4-5 trending topics with momentum indicators relevant to the user's niche
- 3-5 tweet/thread ideas that are viral-worthy, specific, and ready to post
- IMPORTANT: For "thread" type ideas, you MUST populate the "threadTweets" array with 4-6 individual tweets that form the complete thread (each tweet under 280 chars). The "content" field should be the thread opener/hook. For non-thread types, "threadTweets" should be an empty array and "content" has the full tweet text
- 3 optimal posting times with reasoning
- 1 detailed growth tip
- Content type analysis

Use ONLY real, verified information about the user's product/app. Search the web to understand what they're marketing. Base all tweet ideas and strategies on actual product features you've confirmed through web search.

If the user provides images (screenshots, app previews, marketing materials), analyze what is visible in those images and combine it with web search results for the most accurate marketing strategy.`;

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

async function callKimiAPI(apiKey: string, messages: ChatMessage[], useTools: boolean): Promise<any> {
  const body: any = {
    model: "kimi-latest",
    messages,
    temperature: 0.7,
    max_tokens: 4000,
  };

  if (useTools) {
    body.tools = [
      {
        type: "builtin_function",
        function: {
          name: "$web_search",
        },
      },
    ];
  }

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
    console.error("Moonshot API error:", response.status, errorText);
    throw new Error(`Moonshot API error: ${response.status} - ${errorText}`);
  }

  return response.json();
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

  let textMessage = `Generate today's daily X marketing report for ${today}. Search for the latest Twitter/X trends, draft viral tweet ideas, suggest optimal posting times, and provide one powerful growth tip. Return valid JSON only.`;

  if (context && context.trim()) {
    textMessage = `Generate today's daily X marketing report for ${today}.

USER'S FOCUS/CONTEXT: "${context.trim()}"

INSTRUCTIONS:
- If the user provided any URLs (App Store links, websites, etc.), use web search to visit them and learn what the product/app actually does. Base your entire strategy on REAL information from those sources.
- Search the web for current Twitter/X trends relevant to the user's niche.
- Tailor ALL content (trends, tweet ideas, posting times, growth tips) specifically to the user's actual product/service based on what you find.
- The tweet ideas should reference real features and real value propositions.

Return valid JSON only.`;
  }

  if (images && images.length > 0) {
    textMessage += `\n\nThe user has attached ${images.length} image(s). Analyze what is visible in these images and combine with your web search results for the most accurate marketing strategy.`;
  }

  let userContent: any;
  if (images && images.length > 0) {
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

  const hasContext = !!(context && context.trim());
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  let finishReason: string | null = null;
  let finalContent: string | null = null;
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`Kimi API call #${iterations}, messages: ${messages.length}`);

    const data = await callKimiAPI(apiKey, messages, hasContext);
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No choice in Moonshot API response");
    }

    finishReason = choice.finish_reason;

    if (finishReason === "tool_calls" && choice.message?.tool_calls) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const toolCallName = toolCall.function.name;
        const toolCallArguments = JSON.parse(toolCall.function.arguments);

        console.log(`Kimi tool call: ${toolCallName}`, JSON.stringify(toolCallArguments).slice(0, 200));

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCallName,
          content: JSON.stringify(toolCallArguments),
        });
      }
    } else {
      finalContent = choice.message?.content;
      break;
    }
  }

  if (!finalContent) {
    throw new Error("No content in Moonshot API response after tool calls");
  }

  let cleaned = finalContent.trim();
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
    console.error("Failed to parse Moonshot response:", cleaned.slice(0, 500));
    throw new Error("Failed to parse AI response as JSON");
  }
}
