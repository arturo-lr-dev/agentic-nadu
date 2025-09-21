class BaseTool {
  constructor(name, description, parameters) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }

  async execute(args) {
    throw new Error('execute method must be implemented by subclass');
  }

  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }

  validateArgs(args) {
    const { required = [] } = this.parameters;

    for (const requiredParam of required) {
      if (!(requiredParam in args)) {
        throw new Error(`Missing required parameter: ${requiredParam}`);
      }
    }

    return true;
  }
}

module.exports = BaseTool;