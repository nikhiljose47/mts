import OpenAI from 'openai';

let _client: OpenAI | null = null;

/** Returns the OpenAI client, throwing if the API key is not configured. */
export function getOpenAI(): OpenAI {
  if (!_client) {
    if (!process.env['OPENAI_API_KEY']) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    _client = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] });
  }
  return _client;
}
