const express = require('express');
const cors = require('cors');
const path = require('path');
const AIAgentApp = require('./index');
const { config } = require('./config');
const { logger } = require('./utils/logger');

class APIServer {
  constructor() {
    this.app = express();
    this.aiAgent = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.static(path.join(__dirname, '../public')));

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  setupRoutes() {
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        agent: {
          name: config.agent.name,
          initialized: !!this.aiAgent
        }
      });
    });

    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message, systemPrompt } = req.body;

        if (!message || typeof message !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Message is required and must be a string'
          });
        }

        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        const result = await this.aiAgent.processMessage(message.trim(), systemPrompt);

        res.json(result);

      } catch (error) {
        logger.error('API chat error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    this.app.get('/api/tools', (req, res) => {
      try {
        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        const tools = this.aiAgent.getAgent().getAvailableTools();
        res.json({
          success: true,
          tools: tools
        });

      } catch (error) {
        logger.error('API tools error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    this.app.post('/api/clear-history', (req, res) => {
      try {
        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        this.aiAgent.getAgent().clearHistory();
        res.json({
          success: true,
          message: 'Conversation history cleared'
        });

      } catch (error) {
        logger.error('API clear history error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    this.app.get('/api/history', (req, res) => {
      try {
        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        const history = this.aiAgent.getAgent().getConversationHistory();
        res.json({
          success: true,
          history: history
        });

      } catch (error) {
        logger.error('API history error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });

    this.app.use((error, req, res, next) => {
      logger.error('Unhandled API error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  async initialize() {
    try {
      this.aiAgent = new AIAgentApp();
      await this.aiAgent.initialize();

      logger.info('API Server AI Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize AI Agent for API', { error: error.message });
      throw error;
    }
  }

  async start() {
    try {
      await this.initialize();

      const port = config.app.port;

      this.server = this.app.listen(port, () => {
        logger.info(`🚀 API Server running on http://localhost:${port}`);
        logger.info(`🤖 Agent: ${config.agent.name}`);
        logger.info(`📱 Web interface available at http://localhost:${port}`);
      });

      return this.server;
    } catch (error) {
      logger.error('Failed to start API server', { error: error.message });
      throw error;
    }
  }

  async stop() {
    if (this.server) {
      this.server.close();
      logger.info('API Server stopped');
    }
  }
}

async function main() {
  const server = new APIServer();

  try {
    await server.start();
  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = APIServer;