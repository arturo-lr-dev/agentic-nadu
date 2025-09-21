const AIAgentApp = require('../src/index');

async function basicExample() {
  console.log('🚀 Iniciando ejemplo básico del AI Agent...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado correctamente\n');

    const examples = [
      "¡Hola! ¿Cómo estás?",
      "Calcula 15 * 23 + 100",
      "¿Qué herramientas tienes disponibles?",
      "Explícame qué es la inteligencia artificial"
    ];

    for (let i = 0; i < examples.length; i++) {
      const userMessage = examples[i];
      console.log(`👤 Usuario: ${userMessage}`);

      const result = await app.processMessage(userMessage);

      if (result.success) {
        console.log(`🤖 Agent: ${result.response}`);
        console.log(`📊 Iteraciones: ${result.iterations}`);

        if (result.usage) {
          console.log(`💰 Tokens usados: ${result.usage.total_tokens}`);
        }
      } else {
        console.log(`❌ Error: ${result.error}`);
      }

      console.log('─'.repeat(60) + '\n');

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Error en el ejemplo:', error.message);
  }
}

if (require.main === module) {
  basicExample();
}