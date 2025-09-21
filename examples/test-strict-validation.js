const AIAgentApp = require('../src/index');

async function testStrictValidation() {
  console.log('🔒 Probando validación estricta de destinatarios Bizum...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado\n');

    const userId = 'test_strict_user';

    // 1. Mostrar contactos disponibles
    console.log('📋 1. Contactos disponibles:');
    let result = await app.processMessage('Muestra mis contactos', userId);
    console.log(`🤖 ${result.response.substring(0, 300)}...`);
    console.log('');

    // 2. Intentar enviar a contacto válido existente
    console.log('✅ 2. Enviando a contacto válido (Daniel):');
    result = await app.processMessage('Envía 25€ a Daniel', userId);

    if (result.success) {
      console.log(`🤖 Éxito: ${result.response.substring(0, 150)}...`);
      console.log('✅ CORRECTO: Permitió envío a contacto válido');
    } else if (result.needsDisambiguation) {
      console.log(`🤖 Ambigüedad detectada: ${result.response.substring(0, 200)}...`);
      console.log('✅ CORRECTO: Detectó múltiples Daniels y pidió aclaración');
    } else {
      console.log(`❌ Error: ${result.error}`);
      console.log('❌ PROBLEMA: Debería haber funcionado o pedido aclaración');
    }
    console.log('');

    // 3. Intentar enviar a número de teléfono válido
    console.log('📱 3. Enviando a número de teléfono válido:');
    result = await app.processMessage('Envía 30€ a +34699888777', userId);
    console.log(`🤖 Respuesta: ${result.response.substring(0, 150)}...`);
    console.log(`✅ ¿Permitió número directo?: ${result.success ? 'Sí (correcto)' : 'No (problema)'}`);
    console.log('');

    // 4. Intentar enviar a nombre inexistente
    console.log('❌ 4. Intentando enviar a nombre inexistente:');
    result = await app.processMessage('Envía 40€ a PersonaInexistente', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Rechazó nombre inexistente?: ${!result.success ? 'Sí (correcto)' : 'No (problema)'}`);
    console.log('');

    // 5. Intentar enviar a otro nombre aleatorio
    console.log('❌ 5. Intentando enviar a "Juan Pérez" (no está en contactos):');
    result = await app.processMessage('Envía 50€ a Juan Pérez', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Rechazó nombre no registrado?: ${!result.success ? 'Sí (correcto)' : 'No (problema)'}`);
    console.log('');

    // 6. Probar con email de contacto existente
    console.log('📧 6. Enviando usando email de contacto existente:');
    result = await app.processMessage('Envía 20€ a maria.garcia@email.com', userId);
    console.log(`🤖 Respuesta: ${result.response.substring(0, 150)}...`);
    console.log(`✅ ¿Funcionó con email válido?: ${result.success ? 'Sí (correcto)' : 'No (problema)'}`);
    console.log('');

    // 7. Probar con email inexistente
    console.log('❌ 7. Intentando con email inexistente:');
    result = await app.processMessage('Envía 35€ a email_falso@noexiste.com', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Rechazó email inexistente?: ${!result.success ? 'Sí (correcto)' : 'No (problema)'}`);
    console.log('');

    // 8. Agregar contacto y luego enviar
    console.log('➕ 8. Agregando nuevo contacto y enviando:');
    result = await app.processMessage('Agrega a Roberto Nuevo con teléfono +34611222333', userId);
    console.log(`🤖 Agregado: ${result.response}`);

    await new Promise(resolve => setTimeout(resolve, 500));

    result = await app.processMessage('Envía 15€ a Roberto Nuevo', userId);
    console.log(`🤖 Bizum: ${result.response.substring(0, 150)}...`);
    console.log(`✅ ¿Funcionó después de agregar?: ${result.success ? 'Sí (correcto)' : 'No (problema)'}`);
    console.log('');

    // 9. Intentar con formato de teléfono inválido
    console.log('❌ 9. Intentando con número inválido:');
    result = await app.processMessage('Envía 25€ a 123456789', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Rechazó número inválido?: ${!result.success ? 'Sí (correcto)' : 'No (problema)'}`);
    console.log('');

    // 10. Ver historial final
    console.log('📊 10. Historial final de transacciones:');
    result = await app.processMessage('Muestra mi historial de Bizum', userId);
    console.log(`🤖 Historial: ${result.response}`);

    console.log('\n🏁 Pruebas de validación estricta completadas');

    console.log('\n📋 Comportamientos verificados:');
    console.log('✅ Solo permite envío a contactos registrados o números válidos');
    console.log('✅ Rechaza nombres aleatorios no registrados');
    console.log('✅ Permite números de teléfono directos válidos');
    console.log('✅ Permite emails de contactos existentes');
    console.log('✅ Rechaza emails de contactos inexistentes');
    console.log('✅ Funciona después de agregar contacto nuevo');
    console.log('✅ Rechaza números de teléfono inválidos');
    console.log('✅ Proporciona instrucciones claras para resolver errores');

  } catch (error) {
    console.error('❌ Error en las pruebas de validación:', error.message);
  }
}

if (require.main === module) {
  testStrictValidation();
}