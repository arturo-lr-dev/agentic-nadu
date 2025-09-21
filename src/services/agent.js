const OpenAIService = require('./openai');
const ToolRegistry = require('../tools/registry');
const SessionManager = require('./session-manager');
const { logger } = require('../utils/logger');
const { config } = require('../config');

class Agent {
  constructor() {
    this.openaiService = new OpenAIService();
    this.toolRegistry = new ToolRegistry();
    this.sessionManager = new SessionManager();
    this.maxIterations = config.agent.maxIterations;

    this.initializeTools();
  }

  initializeTools() {
    const path = require('path');
    const toolsDir = path.join(__dirname, '../tools');
    this.toolRegistry.loadToolsFromDirectory(toolsDir);
  }

  async processMessage(userMessage, userId = null, systemPrompt = null) {
    try {
      // Generar o usar userId existente
      const actualUserId = userId || this.sessionManager.generateUserId();

      // Obtener historial de conversación del usuario
      const conversationHistory = this.sessionManager.getConversationHistory(actualUserId);

      logger.info('Processing user message', {
        userId: actualUserId,
        messageLength: userMessage.length,
        historyLength: conversationHistory.length
      });

      const messages = this.openaiService.formatMessages(
        userMessage,
        systemPrompt || this.getDefaultSystemPrompt(),
        conversationHistory
      );

      const tools = this.openaiService.formatToolsForOpenAI(
        this.toolRegistry.getAllSchemas()
      );

      let iteration = 0;
      let currentMessages = [...messages];
      let toolsUsed = [];

      while (iteration < this.maxIterations) {
        iteration++;
        logger.debug(`Agent iteration ${iteration}`);

        const response = await this.openaiService.createChatCompletion(
          currentMessages,
          tools.length > 0 ? tools : null
        );

        const choice = response.choices[0];
        const message = choice.message;

        currentMessages.push(message);

        if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
          const toolCallNames = message.tool_calls.map(call => call.function.name);
          toolsUsed.push(...toolCallNames);

          const toolResults = await this.executeToolCalls(message.tool_calls, actualUserId);
          currentMessages.push(...toolResults);
          continue;
        }

        // Actualizar historial de conversación para este usuario
        this.sessionManager.updateConversationHistory(actualUserId, userMessage, message.content);

        return {
          success: true,
          response: message.content,
          userId: actualUserId,
          iterations: iteration,
          toolsUsed: [...new Set(toolsUsed)], // Remove duplicates
          usage: response.usage,
        };
      }

      logger.warn('Agent reached maximum iterations', { maxIterations: this.maxIterations });

      return {
        success: false,
        error: 'Maximum iterations reached',
        iterations: iteration,
        toolsUsed: [...new Set(toolsUsed)],
        userId: actualUserId,
      };

    } catch (error) {
      logger.error('Error processing message', { error: error.message, userId: actualUserId });
      return {
        success: false,
        error: error.message,
        toolsUsed: [],
        userId: actualUserId,
      };
    }
  }

  async executeToolCalls(toolCalls, userId) {
    const toolResults = [];

    for (const toolCall of toolCalls) {
      try {
        const { name: toolName, arguments: toolArgs } = toolCall.function;
        const parsedArgs = JSON.parse(toolArgs);

        // Inyectar userId en los argumentos de la herramienta
        parsedArgs.userId = userId;

        logger.info(`Executing tool: ${toolName}`, { args: parsedArgs, userId });

        const result = await this.toolRegistry.executeTool(toolName, parsedArgs);

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });

      } catch (error) {
        logger.error(`Tool execution failed: ${toolCall.function.name}`, {
          error: error.message,
        });

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: false,
            error: error.message,
          }),
        });
      }
    }

    return toolResults;
  }

  // Método eliminado - ahora se maneja en SessionManager

  getDefaultSystemPrompt() {
    const tools = this.toolRegistry.getAll();
    const toolDescriptions = tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');

    return `You are ${config.agent.name}, ${config.agent.description}.

You have access to powerful tools that you MUST use when appropriate. Always analyze the user's request to determine if any tools are needed.

IMPORTANT: You should AUTOMATICALLY use tools when:
- Mathematical calculations are requested (use calculator tool)
- Weather information is needed (use weather tool)
- Web search or current information is required (use search tool)
- Bizum transfers or payment requests are mentioned (use bizum tool)
- Any external data or computation is needed

Available tools:
${toolDescriptions}

EXAMPLES of when to use tools:
- "What's 15 * 23?" → Use calculator tool
- "What's the weather in Madrid?" → Use weather tool
- "Search for latest AI news" → Use search tool
- "How much is 100 + 50?" → Use calculator tool
- "What's the temperature in Tokyo?" → Use weather tool
- "Envía 25€ a Arturo" → Use bizum tool
- "Quiero hacer un Bizum de 50 euros a María" → Use bizum tool
- "Solicita 30€ a Pedro" → Use bizum tool
- "Muestra mi historial de Bizum" → Use bizum tool

Always use the most appropriate tool for the user's request. If multiple tools are needed, use them in logical sequence. Be proactive in using tools rather than asking permission.

Respond naturally and conversationally, but always use tools when they can provide better, more accurate, or more current information than your training data.`;
  }

  clearHistory(userId) {
    this.sessionManager.clearHistory(userId);
    logger.info('Conversation history cleared', { userId });
  }

  getConversationHistory(userId) {
    return this.sessionManager.getConversationHistory(userId);
  }

  createUserSession(userId = null) {
    return this.sessionManager.createSession(userId);
  }

  deleteUserSession(userId) {
    return this.sessionManager.deleteSession(userId);
  }

  getActiveSessions() {
    return this.sessionManager.getActiveSessions();
  }

  getAllSessions() {
    return this.sessionManager.getAllSessions();
  }

  registerTool(tool) {
    this.toolRegistry.register(tool);
  }

  unregisterTool(toolName) {
    this.toolRegistry.unregister(toolName);
  }

  getAvailableTools() {
    return this.toolRegistry.getAllSchemas();
  }
}

module.exports = Agent;