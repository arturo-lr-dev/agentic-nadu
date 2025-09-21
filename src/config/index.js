const dotenv = require('dotenv');

dotenv.config();

const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4000,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
  },
  agent: {
    name: process.env.AGENT_NAME || 'AIAgent',
    description: process.env.AGENT_DESCRIPTION || 'A powerful AI agent with tools',
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS) || 10,
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 60,
    requestsPerHour: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR) || 1000,
  },
};

function validateConfig() {
  const requiredFields = [
    'openai.apiKey',
  ];

  for (const field of requiredFields) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    if (!value) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }
}

module.exports = {
  config,
  validateConfig,
};