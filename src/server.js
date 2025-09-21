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
        const { message, userId, systemPrompt } = req.body;

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

        // Usar userId del body o generar uno nuevo
        const result = await this.aiAgent.processMessage(message.trim(), userId, systemPrompt);

        res.json(result);

      } catch (error) {
        logger.error('API chat error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    this.app.post('/api/chat/stream', async (req, res) => {
      try {
        const { message, userId, systemPrompt } = req.body;

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

        // Configurar Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

        // Enviar conexión inicial
        res.write('data: {"type":"connected"}\n\n');

        try {
          // Usar el método de streaming del agente
          for await (const chunk of this.aiAgent.getAgent().processMessageStream(message.trim(), userId, systemPrompt)) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);

            if (chunk.isComplete) {
              break;
            }
          }
        } catch (streamError) {
          logger.error('Stream processing error', { error: streamError.message });
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: streamError.message,
            isComplete: true
          })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

      } catch (error) {
        logger.error('API chat stream error', { error: error.message });
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
        const { userId } = req.body;

        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        if (!userId) {
          return res.status(400).json({
            success: false,
            error: 'userId is required'
          });
        }

        this.aiAgent.getAgent().clearHistory(userId);
        res.json({
          success: true,
          message: 'Conversation history cleared',
          userId: userId
        });

      } catch (error) {
        logger.error('API clear history error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    this.app.get('/api/history/:userId?', (req, res) => {
      try {
        const { userId } = req.params;

        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        if (!userId) {
          return res.status(400).json({
            success: false,
            error: 'userId is required'
          });
        }

        const history = this.aiAgent.getAgent().getConversationHistory(userId);
        res.json({
          success: true,
          history: history,
          userId: userId
        });

      } catch (error) {
        logger.error('API history error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Endpoint para crear nueva sesión
    this.app.post('/api/session', (req, res) => {
      try {
        const { userId } = req.body;

        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        const newUserId = this.aiAgent.getAgent().createUserSession(userId);
        res.json({
          success: true,
          userId: newUserId,
          message: 'Session created successfully'
        });

      } catch (error) {
        logger.error('API create session error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Endpoint para obtener sesiones activas
    this.app.get('/api/sessions', (req, res) => {
      try {
        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        const activeSessions = this.aiAgent.getAgent().getActiveSessions();
        res.json({
          success: true,
          sessions: activeSessions
        });

      } catch (error) {
        logger.error('API sessions error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Endpoint para eliminar sesión
    this.app.delete('/api/session/:userId', (req, res) => {
      try {
        const { userId } = req.params;

        if (!this.aiAgent) {
          return res.status(503).json({
            success: false,
            error: 'AI Agent is not initialized'
          });
        }

        if (!userId) {
          return res.status(400).json({
            success: false,
            error: 'userId is required'
          });
        }

        const deleted = this.aiAgent.getAgent().deleteUserSession(userId);

        if (deleted) {
          res.json({
            success: true,
            message: 'Session deleted successfully',
            userId: userId
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Session not found'
          });
        }

      } catch (error) {
        logger.error('API delete session error', { error: error.message });
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