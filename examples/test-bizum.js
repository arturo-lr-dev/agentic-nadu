const AIAgentApp = require('../src/index');

async function testBizum() {
  console.log('💳 Probando herramienta Bizum...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado\n');

    const testCases = [
      "Envía 25€ a Arturo",
      "Quiero hacer un Bizum de 50 euros a María por la cena",
      "Solicita 30€ a Pedro",
      "Transfiere 100 a Ana",
      "Envía 2000€ a Juan", // Debería fallar por límite
      "Bizum de 0€ a Carlos", // Debería fallar por cantidad
      "Muestra mi historial de Bizum",
      "¿Cuáles son mis últimas transacciones Bizum?"
    ];

    for (let i = 0; i < testCases.length; i++) {
      const userMessage = testCases[i];

      console.log(`📋 Test ${i + 1}:`);
      console.log(`👤 Usuario: "${userMessage}"`);

      const startTime = Date.now();
      const result = await app.processMessage(userMessage);
      const endTime = Date.now();

      if (result.success) {
        console.log(`🤖 Respuesta: ${result.response}`);
        console.log(`🛠️  Herramientas usadas: ${result.toolsUsed?.length > 0 ? result.toolsUsed.join(', ') : 'ninguna'}`);
        console.log(`⏱️  Tiempo: ${endTime - startTime}ms`);

        if (result.toolsUsed?.includes('bizum')) {
          console.log("✅ CORRECTO: Usó la herramienta Bizum");
        } else if (userMessage.toLowerCase().includes('bizum') ||
                   userMessage.toLowerCase().includes('envía') ||
                   userMessage.toLowerCase().includes('transfiere') ||
                   userMessage.toLowerCase().includes('solicita') ||
                   userMessage.toLowerCase().includes('historial')) {
          console.log("❌ ERROR: Debería haber usado la herramienta Bizum");
        } else {
          console.log("ℹ️  INFO: No era necesario usar Bizum");
        }

      } else {
        console.log(`❌ Error: ${result.error}`);
      }

      console.log('─'.repeat(80));
      console.log('');

      // Esperar un poco entre pruebas
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('🏁 Pruebas de Bizum completadas');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

if (require.main === module) {
  testBizum();
}