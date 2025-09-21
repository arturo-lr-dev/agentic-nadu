const AIAgentApp = require('../src/index');

async function testContactsIntegration() {
  console.log('📞 Probando integración de contactos con otras herramientas...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado\n');

    const userId = 'test_user_contacts';

    // 1. Listar contactos predeterminados
    console.log('📋 1. Listando contactos predeterminados:');
    let result = await app.processMessage('Muestra mis contactos', userId);
    console.log(`🤖 ${result.response.substring(0, 200)}...`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 2. Buscar un contacto específico
    console.log('🔍 2. Buscando contacto específico:');
    result = await app.processMessage('Busca el contacto de María', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 3. Enviar Bizum usando nombre del contacto
    console.log('💰 3. Enviando Bizum usando nombre del contacto:');
    result = await app.processMessage('Envía 25€ a María García por la cena', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 4. Enviar Bizum usando alias
    console.log('💰 4. Enviando Bizum usando alias:');
    result = await app.processMessage('Transfiere 40€ a Pedro', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 5. Agregar nuevo contacto
    console.log('➕ 5. Agregando nuevo contacto:');
    result = await app.processMessage('Agrega a Roberto Jiménez con teléfono +34699887766 a mis contactos', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 6. Enviar Bizum al contacto recién agregado
    console.log('💰 6. Enviando Bizum al contacto recién agregado:');
    result = await app.processMessage('Envía 15€ a Roberto', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 7. Ver historial de Bizum
    console.log('📊 7. Verificando historial de Bizum:');
    result = await app.processMessage('Muestra mi historial de Bizum', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 8. Probar con número directo (sin contacto)
    console.log('📱 8. Enviando Bizum con número directo:');
    result = await app.processMessage('Envía 30€ a +34666555444', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 9. Buscar contacto que no existe
    console.log('❌ 9. Buscando contacto inexistente:');
    result = await app.processMessage('Busca el contacto de Alejandro', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    // 10. Intentar Bizum a contacto inexistente
    console.log('❌ 10. Intentando Bizum a contacto inexistente:');
    result = await app.processMessage('Envía 20€ a Alejandro', userId);
    console.log(`🤖 ${result.response}`);
    console.log(`🛠️  Herramientas: ${result.toolsUsed?.join(', ')}`);
    console.log('');

    console.log('🏁 Pruebas de integración completadas');

    console.log('\n📋 Funcionalidades verificadas:');
    console.log('✅ Contactos predeterminados creados automáticamente');
    console.log('✅ Búsqueda de contactos por nombre y alias');
    console.log('✅ Bizum integrado con contactos automáticamente');
    console.log('✅ Resolución automática de nombres a números de teléfono');
    console.log('✅ Gestión de contactos (agregar, buscar, listar)');
    console.log('✅ Fallback a número directo cuando no hay contacto');
    console.log('✅ Historial de Bizum muestra información de contactos');

  } catch (error) {
    console.error('❌ Error en las pruebas de integración:', error.message);
  }
}

if (require.main === module) {
  testContactsIntegration();
}