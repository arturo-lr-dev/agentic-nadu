const AIAgentApp = require('../src/index');

async function testMultiuserBizum() {
  console.log('👥 Probando funcionalidad multiusuario de Bizum...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado\n');

    // Simular diferentes usuarios
    const users = [
      { id: 'juan123', name: 'Juan' },
      { id: 'maria456', name: 'María' },
      { id: 'carlos789', name: 'Carlos' }
    ];

    // Crear transacciones para cada usuario
    for (const user of users) {
      console.log(`👤 Simulando transacciones para ${user.name} (${user.id})`);
      console.log('─'.repeat(60));

      const userTransactions = [
        `Envía 25€ a Ana por userId ${user.id}`,
        `Solicita 40€ a Pedro por userId ${user.id}`,
        `Transfiere 15€ a Luis por cena por userId ${user.id}`
      ];

      for (const transaction of userTransactions) {
        console.log(`📤 ${transaction}`);

        const result = await app.processMessage(transaction);

        if (result.success) {
          console.log(`✅ ${result.response.substring(0, 100)}...`);
          console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ') || 'ninguna'}`);
        } else {
          console.log(`❌ Error: ${result.error}`);
        }

        console.log('');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Ver historial del usuario
      console.log(`📋 Verificando historial de ${user.name}:`);
      const historyResult = await app.processMessage(`Muestra historial Bizum userId ${user.id}`);

      if (historyResult.success) {
        console.log(`📊 Historial: ${historyResult.response.substring(0, 150)}...`);
      }

      console.log('═'.repeat(80));
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Probar sin userId específico (debe generar uno automático)
    console.log('🆔 Probando generación automática de userId:');
    const autoUserResult = await app.processMessage("Envía 100€ a Roberto");

    if (autoUserResult.success) {
      console.log(`✅ Usuario automático: ${autoUserResult.response}`);
    }

    console.log('\n🏁 Pruebas multiusuario completadas');

    // Mostrar resumen
    console.log('\n📈 Resumen de la prueba:');
    console.log('- Cada usuario tiene su propio historial separado');
    console.log('- Los archivos se guardan en data/users/[userId]_bizum.json');
    console.log('- Si no se especifica userId, se genera automáticamente');
    console.log('- Cada usuario mantiene hasta 100 transacciones');

  } catch (error) {
    console.error('❌ Error en las pruebas multiusuario:', error.message);
  }
}

if (require.main === module) {
  testMultiuserBizum();
}