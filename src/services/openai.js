const axios = require('axios');
const { config } = require('../config');
const { logger } = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.apiKey = config.openai.apiKey;
    this.baseURL = config.openai.baseURL;
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
    this.temperature = config.openai.temperature;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  async createChatCompletion(messages, tools = null, toolChoice = 'auto') {
    try {
      const payload = {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = toolChoice;
      }

      logger.info('Sending request to OpenAI', {
        model: this.model,
        messageCount: messages.length,
        toolsCount: tools?.length || 0,
      });

      const response = await this.client.post('/chat/completions', payload);

      logger.info('Received response from OpenAI', {
        finishReason: response.data.choices[0]?.finish_reason,
        usage: response.data.usage,
      });

      return response.data;
    } catch (error) {
      logger.error('OpenAI API error', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  async streamChatCompletion(messages, tools = null, toolChoice = 'auto') {
    try {
      const payload = {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: true,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = toolChoice;
      }

      logger.info('Starting streaming request to OpenAI', {
        model: this.model,
        messageCount: messages.length,
      });

      const response = await this.client.post('/chat/completions', payload, {
        responseType: 'stream',
      });

      return response.data;
    } catch (error) {
      logger.error('OpenAI streaming error', {
        error: error.message,
        status: error.response?.status,
      });
      throw new Error(`OpenAI Streaming Error: ${error.message}`);
    }
  }

  parseStreamChunk(chunk) {
    const { logger } = require('../utils/logger');

    const chunkStr = chunk.toString();
    logger.debug('Raw chunk received:', {
      length: chunkStr.length,
      content: chunkStr
    });

    const lines = chunkStr.split('\n');
    const results = [];

    logger.debug(`Processing ${lines.length} lines from chunk`);

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        logger.debug('Processing data line:', data);

        if (data === '[DONE]') {
          logger.debug('Found DONE signal');
          results.push({ type: 'done' });
          continue;
        }

        if (data === '') {
          logger.debug('Empty data line, skipping');
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          logger.debug('Parsed JSON:', parsed);

          const choice = parsed.choices?.[0];
          logger.debug('Choice object:', choice);

          if (choice) {
            const delta = choice.delta;
            logger.debug('Delta object:', delta);

            if (delta.content) {
              logger.debug('Found content in delta:', delta.content);
              results.push({
                type: 'content',
                content: delta.content,
                finish_reason: choice.finish_reason
              });
            }

            if (delta.tool_calls) {
              logger.debug('Found tool_calls in delta:', delta.tool_calls);
              results.push({
                type: 'tool_calls',
                tool_calls: delta.tool_calls,
                finish_reason: choice.finish_reason
              });
            }

            if (choice.finish_reason && !delta.content && !delta.tool_calls) {
              logger.debug('Found finish_reason without content:', choice.finish_reason);
              results.push({
                type: 'done',
                finish_reason: choice.finish_reason
              });
            }
          }
        } catch (parseError) {
          logger.warn('Error parsing JSON data:', {
            error: parseError.message,
            data: data
          });
        }
      }
    }

    logger.debug(`Returning ${results.length} parsed results:`, results);
    return results;
  }

  formatMessages(userMessage, systemPrompt = null, conversationHistory = []) {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push(...conversationHistory);

    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  formatToolsForOpenAI(tools) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}

module.exports = OpenAIService;