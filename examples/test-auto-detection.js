const AIAgentApp = require('../src/index');

async function testAutoDetection() {
  console.log('🧪 Probando detección automática de herramientas...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado\n');

    const testCases = [
      {
        input: "¿Cuánto es 25 * 34 + 12?",
        expectedTool: "calculator",
        description: "Debería usar calculadora automáticamente"
      },
      {
        input: "¿Qué tiempo hace en Barcelona?",
        expectedTool: "weather",
        description: "Debería usar herramienta del clima automáticamente"
      },
      {
        input: "Busca información sobre inteligencia artificial",
        expectedTool: "search",
        description: "Debería usar herramienta de búsqueda automáticamente"
      },
      {
        input: "Calcula el 15% de 240",
        expectedTool: "calculator",
        description: "Debería usar calculadora para porcentajes"
      },
      {
        input: "¿Hola, cómo estás?",
        expectedTool: "none",
        description: "No debería usar herramientas para saludos"
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      console.log(`📋 Test ${i + 1}: ${testCase.description}`);
      console.log(`👤 Usuario: "${testCase.input}"`);
      console.log(`🎯 Herramienta esperada: ${testCase.expectedTool}`);

      const startTime = Date.now();
      const result = await app.processMessage(testCase.input);
      const endTime = Date.now();

      if (result.success) {
        console.log(`🤖 Respuesta: ${result.response}`);
        console.log(`⏱️  Tiempo: ${endTime - startTime}ms`);
        console.log(`🔄 Iteraciones: ${result.iterations}`);
        console.log(`🛠️  Herramientas usadas: ${result.toolsUsed?.length > 0 ? result.toolsUsed.join(', ') : 'ninguna'}`);

        if (result.usage) {
          console.log(`💰 Tokens: ${result.usage.total_tokens}`);
        }

        // Verificar si usó las herramientas correctas
        const toolsUsed = result.toolsUsed || [];
        const shouldUseTools = testCase.expectedTool !== "none";
        const expectedTool = testCase.expectedTool;

        if (shouldUseTools) {
          if (toolsUsed.includes(expectedTool)) {
            console.log("✅ CORRECTO: Usó la herramienta esperada");
          } else if (toolsUsed.length > 0) {
            console.log(`⚠️  PARCIAL: Usó herramientas (${toolsUsed.join(', ')}) pero no la esperada (${expectedTool})`);
          } else {
            console.log(`❌ ERROR: No usó herramientas cuando debería haber usado ${expectedTool}`);
          }
        } else {
          if (toolsUsed.length === 0) {
            console.log("✅ CORRECTO: No usó herramientas innecesariamente");
          } else {
            console.log(`⚠️  ADVERTENCIA: Usó herramientas (${toolsUsed.join(', ')}) cuando no era necesario`);
          }
        }

      } else {
        console.log(`❌ Error: ${result.error}`);
      }

      console.log('─'.repeat(80));
      console.log('');

      // Esperar un poco entre pruebas
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('🏁 Pruebas completadas');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

if (require.main === module) {
  testAutoDetection();
}