import { TwitterApi } from "twitter-api-v2";

export interface TwitterCredentials {
  accessToken: string;
  accessSecret: string;
}

const oauthTokenStore = new Map<string, { secret: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of oauthTokenStore.entries()) {
    if (now - val.createdAt > 10 * 60 * 1000) {
      oauthTokenStore.delete(key);
    }
  }
}, 60 * 1000);

function getAppCredentials() {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("X API app credentials not configured");
  }
  return { appKey, appSecret };
}

function getUserClient(creds: TwitterCredentials): TwitterApi {
  const { appKey, appSecret } = getAppCredentials();
  return new TwitterApi({
    appKey,
    appSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
}

export async function getOAuthRequestToken(callbackUrl: string): Promise<{ url: string; oauthToken: string }> {
  const { appKey, appSecret } = getAppCredentials();
  const client = new TwitterApi({ appKey, appSecret });
  const authLink = await client.generateAuthLink(callbackUrl, { linkMode: "authorize" });
  oauthTokenStore.set(authLink.oauth_token, { secret: authLink.oauth_token_secret, createdAt: Date.now() });
  return { url: authLink.url, oauthToken: authLink.oauth_token };
}

export async function handleOAuthCallback(
  oauthToken: string,
  oauthVerifier: string
): Promise<{ accessToken: string; accessSecret: string; username: string }> {
  const stored = oauthTokenStore.get(oauthToken);
  if (!stored) {
    throw new Error("OAuth session expired. Please try connecting again.");
  }
  oauthTokenStore.delete(oauthToken);

  const { appKey, appSecret } = getAppCredentials();
  const tempClient = new TwitterApi({
    appKey,
    appSecret,
    accessToken: oauthToken,
    accessSecret: stored.secret,
  });

  const { accessToken, accessSecret, screenName } = await tempClient.login(oauthVerifier);
  return { accessToken, accessSecret, username: screenName };
}

export async function postTweet(content: string, creds: TwitterCredentials): Promise<{ id: string; text: string }> {
  const client = getUserClient(creds);
  const result = await client.v2.tweet(content);
  return { id: result.data.id, text: result.data.text };
}

export async function postThread(tweets: string[], creds: TwitterCredentials): Promise<{ ids: string[]; texts: string[] }> {
  if (tweets.length === 0) throw new Error("Thread must have at least one tweet");

  const client = getUserClient(creds);
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

export async function verifyUserCredentials(creds: TwitterCredentials): Promise<{ username: string; name: string }> {
  const client = getUserClient(creds);
  const me = await client.v2.me();
  return { username: me.data.username, name: me.data.name };
}
