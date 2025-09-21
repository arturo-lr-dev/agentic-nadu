const { logger } = require('../utils/logger');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    if (!tool.name) {
      throw new Error('Tool must have a name');
    }

    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} is being overwritten`);
    }

    this.tools.set(tool.name, tool);
    logger.info(`Registered tool: ${tool.name}`);
  }

  unregister(toolName) {
    if (this.tools.has(toolName)) {
      this.tools.delete(toolName);
      logger.info(`Unregistered tool: ${toolName}`);
    }
  }

  get(toolName) {
    return this.tools.get(toolName);
  }

  has(toolName) {
    return this.tools.has(toolName);
  }

  getAll() {
    return Array.from(this.tools.values());
  }

  getAllSchemas() {
    return this.getAll().map(tool => tool.getSchema());
  }

  async executeTool(toolName, args) {
    const tool = this.get(toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      tool.validateArgs(args);
      logger.info(`Executing tool: ${toolName}`, { args });

      const result = await tool.execute(args);

      logger.info(`Tool executed successfully: ${toolName}`);
      return result;
    } catch (error) {
      logger.error(`Tool execution failed: ${toolName}`, {
        error: error.message,
        args,
      });
      throw error;
    }
  }

  loadToolsFromDirectory(directory) {
    const fs = require('fs');
    const path = require('path');

    try {
      const files = fs.readdirSync(directory);

      for (const file of files) {
        if (file.endsWith('.js') && file !== 'base.js' && file !== 'registry.js') {
          const toolPath = path.join(directory, file);
          const ToolClass = require(toolPath);

          if (typeof ToolClass === 'function') {
            const tool = new ToolClass();
            this.register(tool);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load tools from directory', {
        directory,
        error: error.message,
      });
    }
  }
}

module.exports = ToolRegistry;