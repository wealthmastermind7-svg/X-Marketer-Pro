import { TwitterApi } from "twitter-api-v2";

function getClient(): TwitterApi {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("X/Twitter API credentials not configured");
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret: accessTokenSecret,
  });
}

export async function postTweet(content: string): Promise<{ id: string; text: string }> {
  const client = getClient();
  const result = await client.v2.tweet(content);
  return { id: result.data.id, text: result.data.text };
}

export async function postThread(tweets: string[]): Promise<{ ids: string[]; texts: string[] }> {
  if (tweets.length === 0) throw new Error("Thread must have at least one tweet");

  const client = getClient();
  const ids: string[] = [];
  const texts: string[] = [];

  const first = await client.v2.tweet(tweets[0]);
  ids.push(first.data.id);
  texts.push(first.data.text);

  let lastId = first.data.id;

  for (let i = 1; i < tweets.length; i++) {
    const reply = await client.v2.reply(tweets[i], lastId);
    ids.push(reply.data.id);
    texts.push(reply.data.text);
    lastId = reply.data.id;
  }

  return { ids, texts };
}

export async function verifyCredentials(): Promise<{ username: string; name: string }> {
  const client = getClient();
  const me = await client.v2.me();
  return { username: me.data.username, name: me.data.name };
}
