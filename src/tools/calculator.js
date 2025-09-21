const BaseTool = require('./base');

class CalculatorTool extends BaseTool {
  constructor() {
    super(
      'calculator',
      'Performs mathematical calculations with basic arithmetic operations',
      {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")',
          },
        },
        required: ['expression'],
      }
    );
  }

  async execute(args) {
    const { expression } = args;

    try {
      if (!this.isValidExpression(expression)) {
        throw new Error('Invalid mathematical expression');
      }

      const result = this.evaluateExpression(expression);

      return {
        success: true,
        result,
        expression,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        expression,
      };
    }
  }

  isValidExpression(expression) {
    const validPattern = /^[0-9+\-*/().\s]+$/;
    return validPattern.test(expression);
  }

  evaluateExpression(expression) {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

    try {
      return Function('"use strict"; return (' + sanitized + ')')();
    } catch (error) {
      throw new Error('Failed to evaluate expression');
    }
  }
}

module.exports = CalculatorTool;