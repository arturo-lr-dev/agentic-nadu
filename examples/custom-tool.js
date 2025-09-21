const AIAgentApp = require('../src/index');
const BaseTool = require('../src/tools/base');

class TimeTool extends BaseTool {
  constructor() {
    super(
      'time',
      'Obtiene la hora y fecha actual en diferentes formatos',
      {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Formato de tiempo deseado (iso, locale, timestamp)',
            enum: ['iso', 'locale', 'timestamp'],
            default: 'locale'
          },
          timezone: {
            type: 'string',
            description: 'Zona horaria (opcional)',
            default: 'local'
          }
        },
        required: []
      }
    );
  }

  async execute(args) {
    const { format = 'locale', timezone = 'local' } = args;
    const now = new Date();

    try {
      let result;

      switch (format) {
        case 'iso':
          result = now.toISOString();
          break;
        case 'timestamp':
          result = now.getTime();
          break;
        case 'locale':
        default:
          if (timezone !== 'local') {
            result = now.toLocaleString('es-ES', { timeZone: timezone });
          } else {
            result = now.toLocaleString('es-ES');
          }
          break;
      }

      return {
        success: true,
        currentTime: result,
        format: format,
        timezone: timezone === 'local' ? 'Sistema local' : timezone
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

async function customToolExample() {
  console.log('🔧 Ejemplo de herramienta personalizada\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();

    const timeTool = new TimeTool();
    app.getAgent().registerTool(timeTool);

    console.log('✅ Herramienta personalizada registrada\n');

    const examples = [
      "¿Qué hora es?",
      "Dame la hora en formato ISO",
      "¿Cuál es el timestamp actual?",
      "¿Qué hora es en Madrid?",
      "Muéstrame todas las herramientas disponibles"
    ];

    for (const userMessage of examples) {
      console.log(`👤 Usuario: ${userMessage}`);

      const result = await app.processMessage(userMessage);

      if (result.success) {
        console.log(`🤖 Agent: ${result.response}\n`);
      } else {
        console.log(`❌ Error: ${result.error}\n`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  customToolExample();
}