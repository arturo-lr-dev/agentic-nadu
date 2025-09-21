# AI Agent Node.js

Un agente de IA escalable y configurable desarrollado en Node.js que se integra con la API de ChatGPT de OpenAI y soporta herramientas personalizadas.

## 🚀 Características

- **Integración con OpenAI**: Conexión robusta con la API de ChatGPT
- **Sistema de Herramientas**: Arquitectura extensible para agregar nuevas funcionalidades
- **Configuración por Variables de Entorno**: Totalmente configurable y migrable
- **Logging Estructurado**: Sistema de logs completo para monitoreo
- **Modo Interactivo**: Chat en tiempo real por consola
- **Escalable**: Arquitectura modular y bien organizada

## 📁 Estructura del Proyecto

```
├── src/
│   ├── config/           # Configuración de la aplicación
│   ├── services/         # Servicios principales (OpenAI, Agent)
│   ├── tools/            # Herramientas del agente
│   ├── utils/            # Utilidades (logger)
│   └── index.js          # Punto de entrada principal
├── docs/                 # Documentación
├── examples/             # Ejemplos de uso
├── .env.example          # Template de variables de entorno
├── package.json          # Dependencias y scripts
└── README.md            # Este archivo
```

## 🛠️ Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone <repository-url>
   cd ai-agent-nodejs
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   ```

   Edita el archivo `.env` con tus credenciales:
   ```env
   OPENAI_API_KEY=tu_api_key_de_openai
   OPENAI_MODEL=gpt-4o
   AGENT_NAME=MiAgente
   ```

## 🚦 Uso

### Modo Chat Interactivo

```bash
npm run chat
```

Comandos disponibles en el chat:
- `exit`: Salir del chat
- `clear`: Limpiar historial de conversación
- `tools`: Ver herramientas disponibles

### Uso Programático

```javascript
const AIAgentApp = require('./src/index');

async function main() {
  const app = new AIAgentApp();
  await app.initialize();

  const result = await app.processMessage("¿Cuál es el clima en Madrid?");
  console.log(result.response);
}

main();
```

### Scripts Disponibles

- `npm start`: Ejecutar la aplicación
- `npm run chat`: Modo chat interactivo
- `npm run dev`: Desarrollo con recarga automática
- `npm test`: Ejecutar tests
- `npm run test:auto`: Probar detección automática de herramientas
- `npm run example:basic`: Ejecutar ejemplo básico
- `npm run example:custom`: Ejecutar ejemplo de herramienta personalizada
- `npm run lint`: Verificar código

## 🔧 Herramientas Incluidas

### Calculator Tool
Realiza cálculos matemáticos básicos.

```javascript
// Ejemplo de uso
"Calcula 25 * 4 + 10"
```

### Weather Tool
Obtiene información meteorológica (requiere API key de OpenWeather).

```javascript
// Variables de entorno adicionales:
OPENWEATHER_API_KEY=tu_api_key
```

### Search Tool
Busca información en la web (requiere Google Custom Search API).

```javascript
// Variables de entorno adicionales:
SEARCH_API_KEY=tu_google_api_key
SEARCH_ENGINE_ID=tu_search_engine_id
```

## 🔨 Crear Herramientas Personalizadas

1. **Crear nueva herramienta**:
   ```javascript
   // src/tools/mi-herramienta.js
   const BaseTool = require('./base');

   class MiHerramienta extends BaseTool {
     constructor() {
       super(
         'mi_herramienta',
         'Descripción de mi herramienta',
         {
           type: 'object',
           properties: {
             parametro: {
               type: 'string',
               description: 'Descripción del parámetro'
             }
           },
           required: ['parametro']
         }
       );
     }

     async execute(args) {
       const { parametro } = args;

       // Lógica de la herramienta

       return {
         success: true,
         data: 'resultado'
       };
     }
   }

   module.exports = MiHerramienta;
   ```

2. **La herramienta se cargará automáticamente** al reiniciar la aplicación.

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Valor por Defecto |
|----------|-------------|-----------|-------------------|
| `OPENAI_API_KEY` | API Key de OpenAI | ✅ | - |
| `OPENAI_MODEL` | Modelo a usar | ❌ | `gpt-4o` |
| `OPENAI_BASE_URL` | URL base de la API | ❌ | `https://api.openai.com/v1` |
| `OPENAI_MAX_TOKENS` | Máximo de tokens | ❌ | `4000` |
| `OPENAI_TEMPERATURE` | Temperatura del modelo | ❌ | `0.7` |
| `AGENT_NAME` | Nombre del agente | ❌ | `AIAgent` |
| `AGENT_DESCRIPTION` | Descripción del agente | ❌ | `A powerful AI agent...` |
| `AGENT_MAX_ITERATIONS` | Máximo de iteraciones | ❌ | `10` |
| `NODE_ENV` | Entorno de ejecución | ❌ | `development` |
| `PORT` | Puerto de la aplicación | ❌ | `3000` |
| `LOG_LEVEL` | Nivel de logging | ❌ | `info` |

### Configuración de Logging

Los niveles de log disponibles son:
- `error`: Solo errores
- `warn`: Advertencias y errores
- `info`: Información general, advertencias y errores
- `debug`: Toda la información (desarrollo)

## 📚 API Reference

### Agent Class

#### `initialize()`
Inicializa el agente y carga las herramientas.

#### `processMessage(message, systemPrompt?)`
Procesa un mensaje del usuario y retorna la respuesta.

**Parámetros:**
- `message` (string): Mensaje del usuario
- `systemPrompt` (string, opcional): Prompt de sistema personalizado

**Retorna:**
```javascript
{
  success: boolean,
  response?: string,
  error?: string,
  iterations: number,
  usage?: object
}
```

#### `clearHistory()`
Limpia el historial de conversación.

#### `registerTool(tool)`
Registra una nueva herramienta.

#### `getAvailableTools()`
Obtiene la lista de herramientas disponibles.

## 🔄 Migración y Despliegue

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "start"]
```

### Variables de Entorno para Producción

```bash
NODE_ENV=production
LOG_LEVEL=warn
OPENAI_API_KEY=tu_api_key_produccion
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Ejecutar tests con coverage
npm run test:coverage
```

## 📋 Roadmap

- [ ] Soporte para streaming de respuestas
- [ ] Cache de respuestas
- [ ] Métricas y monitoreo
- [ ] API REST
- [ ] Interfaz web
- [ ] Soporte para múltiples proveedores de IA

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación en la carpeta `docs/`
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 🔗 Enlaces Útiles

- [Documentación de OpenAI API](https://platform.openai.com/docs)
- [Node.js Documentation](https://nodejs.org/docs)
- [Guía de Contribución](./CONTRIBUTING.md)