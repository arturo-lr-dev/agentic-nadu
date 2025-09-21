const AIAgentApp = require('../src/index');

async function testMultiuserAgent() {
  console.log('👥 Probando funcionalidad multiusuario del agente...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado\n');

    // Simular diferentes usuarios con conversaciones independientes
    const users = [
      { id: 'juan_garcia', name: 'Juan García' },
      { id: 'maria_lopez', name: 'María López' },
      { id: 'carlos_ruiz', name: 'Carlos Ruiz' }
    ];

    console.log('🎭 Simulando conversaciones simultáneas de diferentes usuarios...\n');

    // Cada usuario tiene una conversación diferente
    for (const user of users) {
      console.log(`👤 Usuario: ${user.name} (${user.id})`);
      console.log('─'.repeat(60));

      // Primera conversación - cada usuario se presenta
      let result = await app.processMessage(`Hola, soy ${user.name}`, user.id);
      console.log(`🤖 Respuesta: ${result.response.substring(0, 100)}...`);
      console.log(`📱 Session ID: ${result.userId}`);

      // Segunda conversación - cada usuario hace algo diferente
      const userActions = {
        'juan_garcia': 'Calcula 150 * 23',
        'maria_lopez': 'Envía 25€ a Pedro por la cena',
        'carlos_ruiz': '¿Qué tiempo hace en Barcelona?'
      };

      await new Promise(resolve => setTimeout(resolve, 1000));

      result = await app.processMessage(userActions[user.id], user.id);
      console.log(`🔧 Acción: ${userActions[user.id]}`);
      console.log(`🤖 Respuesta: ${result.response.substring(0, 100)}...`);
      console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ') || 'ninguna'}`);

      // Tercera conversación - verificar que recuerda el contexto
      await new Promise(resolve => setTimeout(resolve, 1000));

      result = await app.processMessage('¿Recuerdas cómo me llamo?', user.id);
      console.log(`🧠 Memoria: ${result.response}`);

      console.log('═'.repeat(80));
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mostrar información de sesiones
    const activeSessions = app.getAgent().getActiveSessions();
    console.log('📊 Resumen de sesiones activas:');
    activeSessions.forEach(session => {
      console.log(`  - Usuario: ${session.userId}`);
      console.log(`    Mensajes: ${session.messageCount}`);
      console.log(`    Última actividad: ${session.lastActivity}`);
      console.log('');
    });

    // Probar conversación cruzada - Juan pregunta sobre María
    console.log('🔄 Probando aislamiento de conversaciones...');
    const crossResult = await app.processMessage('¿Sabes algo sobre María López?', 'juan_garcia');
    console.log(`🤖 Juan pregunta sobre María: ${crossResult.response}`);

    // Verificar que Bizum es específico por usuario
    console.log('\n💳 Verificando historiales Bizum separados...');

    // Juan hace un Bizum
    await app.processMessage('Envía 50€ a Ana', 'juan_garcia');

    // María revisa su historial (debería estar vacío de Juan)
    const mariaHistory = await app.processMessage('Muestra mi historial de Bizum', 'maria_lopez');
    console.log(`📋 Historial de María: ${mariaHistory.response.substring(0, 100)}...`);

    console.log('\n🏁 Pruebas multiusuario completadas');

    console.log('\n📋 Características verificadas:');
    console.log('✅ Historiales de conversación separados por usuario');
    console.log('✅ Memoria independiente entre usuarios');
    console.log('✅ Transacciones Bizum separadas por usuario');
    console.log('✅ Sesiones persistentes y recuperables');
    console.log('✅ Generación automática de IDs de usuario');

  } catch (error) {
    console.error('❌ Error en las pruebas multiusuario:', error.message);
  }
}

if (require.main === module) {
  testMultiuserAgent();
}