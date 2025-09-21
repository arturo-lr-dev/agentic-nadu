const BaseTool = require('./base');
const fs = require('fs');
const path = require('path');

class BizumTool extends BaseTool {
  constructor() {
    super(
      'bizum',
      'Simula envíos de dinero mediante Bizum a contactos',
      {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Cantidad a enviar en euros (máximo 1000€)',
            minimum: 0.01,
            maximum: 1000
          },
          recipient: {
            type: 'string',
            description: 'Nombre del destinatario o número de teléfono'
          },
          concept: {
            type: 'string',
            description: 'Concepto del envío (opcional)',
            default: 'Bizum'
          },
          action: {
            type: 'string',
            description: 'Acción a realizar: send, request, history',
            enum: ['send', 'request', 'history'],
            default: 'send'
          }
        },
        required: ['amount', 'recipient']
      }
    );

    this.transactionFile = path.join(__dirname, '../../data/bizum_transactions.json');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.transactionFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.transactionFile)) {
      fs.writeFileSync(this.transactionFile, JSON.stringify([], null, 2));
    }
  }

  async execute(args) {
    const { amount, recipient, concept = 'Bizum', action = 'send' } = args;

    try {
      if (action === 'history') {
        return this.getTransactionHistory();
      }

      // Validaciones
      const validation = this.validateTransaction(amount, recipient);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Simular proceso de envío
      const transaction = {
        id: this.generateTransactionId(),
        type: action,
        amount: parseFloat(amount.toFixed(2)),
        recipient: recipient.trim(),
        concept: concept.trim(),
        timestamp: new Date().toISOString(),
        status: 'completed',
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES')
      };

      // Guardar transacción
      this.saveTransaction(transaction);

      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));

      const actionText = action === 'send' ? 'enviado' : 'solicitado';
      const preposition = action === 'send' ? 'a' : 'de';

      return {
        success: true,
        transaction: {
          id: transaction.id,
          amount: `${transaction.amount}€`,
          recipient: transaction.recipient,
          concept: transaction.concept,
          status: transaction.status,
          timestamp: `${transaction.date} ${transaction.time}`
        },
        message: `✅ Bizum ${actionText} correctamente`,
        details: `Has ${actionText} ${transaction.amount}€ ${preposition} ${transaction.recipient}`,
        reference: `Referencia: ${transaction.id}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Error en la transacción Bizum: ${error.message}`
      };
    }
  }

  validateTransaction(amount, recipient) {
    // Validar cantidad
    if (amount <= 0) {
      return { valid: false, error: 'La cantidad debe ser mayor que 0€' };
    }

    if (amount > 1000) {
      return { valid: false, error: 'El límite máximo por transacción es 1000€' };
    }

    if (amount < 0.01) {
      return { valid: false, error: 'La cantidad mínima es 0.01€' };
    }

    // Validar destinatario
    if (!recipient || recipient.trim().length === 0) {
      return { valid: false, error: 'Debe especificar un destinatario' };
    }

    if (recipient.trim().length < 2) {
      return { valid: false, error: 'El nombre del destinatario debe tener al menos 2 caracteres' };
    }

    // Validar si es un número de teléfono
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    const isPhone = phoneRegex.test(recipient.replace(/\s/g, ''));

    // Validar si es un nombre
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/;
    const isName = nameRegex.test(recipient.trim());

    if (!isPhone && !isName) {
      return {
        valid: false,
        error: 'El destinatario debe ser un nombre válido o un número de teléfono español'
      };
    }

    return { valid: true };
  }

  generateTransactionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BZ${timestamp.slice(-8)}${random}`;
  }

  saveTransaction(transaction) {
    try {
      let transactions = [];

      if (fs.existsSync(this.transactionFile)) {
        const data = fs.readFileSync(this.transactionFile, 'utf8');
        transactions = JSON.parse(data);
      }

      transactions.push(transaction);

      // Mantener solo las últimas 50 transacciones
      if (transactions.length > 50) {
        transactions = transactions.slice(-50);
      }

      fs.writeFileSync(this.transactionFile, JSON.stringify(transactions, null, 2));
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }

  getTransactionHistory() {
    try {
      if (!fs.existsSync(this.transactionFile)) {
        return {
          success: true,
          message: 'No hay transacciones registradas',
          transactions: []
        };
      }

      const data = fs.readFileSync(this.transactionFile, 'utf8');
      const transactions = JSON.parse(data);

      // Ordenar por fecha más reciente
      const sortedTransactions = transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10) // Últimas 10 transacciones
        .map(t => ({
          id: t.id,
          type: t.type === 'send' ? 'Envío' : 'Solicitud',
          amount: `${t.amount}€`,
          recipient: t.recipient,
          concept: t.concept,
          date: t.date,
          time: t.time,
          status: t.status === 'completed' ? 'Completado' : t.status
        }));

      return {
        success: true,
        message: `Últimas ${sortedTransactions.length} transacciones Bizum`,
        transactions: sortedTransactions
      };

    } catch (error) {
      return {
        success: false,
        error: `Error al obtener el historial: ${error.message}`
      };
    }
  }
}

module.exports = BizumTool;