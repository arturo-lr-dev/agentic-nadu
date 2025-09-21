const Agent = require('./services/agent');
const { config, validateConfig } = require('./config');
const { logger } = require('./utils/logger');

class AIAgentApp {
  constructor() {
    this.agent = null;
  }

  async initialize() {
    try {
      validateConfig();

      this.agent = new Agent();

      logger.info('AI Agent initialized successfully', {
        agentName: config.agent.name,
        model: config.openai.model,
        toolsCount: this.agent.getAvailableTools().length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize AI Agent', { error: error.message });
      throw error;
    }
  }

  async processMessage(message, systemPrompt = null) {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    return await this.agent.processMessage(message, systemPrompt);
  }

  async chat() {
    const readline = require('readline');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`\n🤖 ${config.agent.name} is ready! Type 'exit' to quit.\n`);

    const askQuestion = () => {
      rl.question('You: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log('\n👋 Goodbye!');
          rl.close();
          return;
        }

        if (input.toLowerCase() === 'clear') {
          this.agent.clearHistory();
          console.log('\n🧹 Conversation history cleared.\n');
          askQuestion();
          return;
        }

        if (input.toLowerCase() === 'tools') {
          const tools = this.agent.getAvailableTools();
          console.log('\n🛠️  Available tools:');
          tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });
          console.log('');
          askQuestion();
          return;
        }

        if (input.trim() === '') {
          askQuestion();
          return;
        }

        try {
          console.log('\n🤔 Thinking...\n');

          const result = await this.processMessage(input);

          if (result.success) {
            console.log(`🤖 ${config.agent.name}: ${result.response}\n`);

            if (result.usage) {
              logger.debug('Token usage', result.usage);
            }
          } else {
            console.log(`❌ Error: ${result.error}\n`);
          }

        } catch (error) {
          console.log(`❌ Unexpected error: ${error.message}\n`);
          logger.error('Chat error', { error: error.message });
        }

        askQuestion();
      });
    };

    askQuestion();
  }

  getAgent() {
    return this.agent;
  }
}

async function main() {
  const app = new AIAgentApp();

  try {
    await app.initialize();

    const mode = process.argv[2];

    if (mode === 'chat') {
      await app.chat();
    } else {
      console.log('AI Agent Application');
      console.log('Usage:');
      console.log('  node src/index.js chat    - Start interactive chat mode');
      console.log('');
      console.log('Example programmatic usage:');
      console.log('  const app = new AIAgentApp();');
      console.log('  await app.initialize();');
      console.log('  const result = await app.processMessage("Hello, world!");');
    }

  } catch (error) {
    logger.error('Application startup failed', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AIAgentApp;