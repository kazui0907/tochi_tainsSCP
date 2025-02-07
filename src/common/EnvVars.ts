/* eslint-disable n/no-process-env */

export default {
  PROFILE_DIR: process.env.PROFILE_DIR ?? './profiles/development',
  REINS_USERNAME: process.env.REINS_USERNAME ?? '',
  REINS_PASSWORD: process.env.REINS_PASSWORD ?? '',
  REQUEST_INTERVAL: parseInt(process.env.REQUEST_INTERVAL ?? '2000', 10),
  OpenAIAPIKey: process.env.OPENAI_API_KEY ?? '',
} as const;
