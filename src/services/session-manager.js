const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.dataDir = path.join(__dirname, '../../data/sessions');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  generateUserId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `user_${timestamp.slice(-8)}_${random}`;
  }

  createSession(userId = null) {
    const actualUserId = userId || this.generateUserId();

    const session = {
      userId: actualUserId,
      conversationHistory: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      metadata: {}
    };

    this.sessions.set(actualUserId, session);
    this.saveSession(actualUserId, session);

    logger.info('New session created', { userId: actualUserId });
    return actualUserId;
  }

  getSession(userId) {
    if (this.sessions.has(userId)) {
      // Actualizar última actividad
      const session = this.sessions.get(userId);
      session.lastActivity = new Date().toISOString();
      return session;
    }

    // Intentar cargar desde archivo
    const session = this.loadSession(userId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.sessions.set(userId, session);
      return session;
    }

    // Crear nueva sesión si no existe
    this.createSession(userId);
    return this.sessions.get(userId);
  }

  updateConversationHistory(userId, userMessage, assistantResponse) {
    const session = this.getSession(userId);

    session.conversationHistory.push(
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() }
    );

    // Mantener máximo 20 mensajes (10 intercambios)
    const maxHistoryLength = 20;
    if (session.conversationHistory.length > maxHistoryLength) {
      session.conversationHistory = session.conversationHistory.slice(-maxHistoryLength);
    }

    session.lastActivity = new Date().toISOString();
    this.saveSession(userId, session);

    logger.debug('Conversation history updated', {
      userId,
      historyLength: session.conversationHistory.length
    });
  }

  clearHistory(userId) {
    const session = this.getSession(userId);
    session.conversationHistory = [];
    session.lastActivity = new Date().toISOString();
    this.saveSession(userId, session);

    logger.info('Conversation history cleared', { userId });
  }

  getConversationHistory(userId) {
    const session = this.getSession(userId);
    return session.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  saveSession(userId, session) {
    try {
      const sessionFile = path.join(this.dataDir, `${userId}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
    } catch (error) {
      logger.error('Error saving session', { userId, error: error.message });
    }
  }

  loadSession(userId) {
    try {
      const sessionFile = path.join(this.dataDir, `${userId}.json`);

      if (!fs.existsSync(sessionFile)) {
        return null;
      }

      const data = fs.readFileSync(sessionFile, 'utf8');
      const session = JSON.parse(data);

      logger.debug('Session loaded from file', { userId });
      return session;
    } catch (error) {
      logger.error('Error loading session', { userId, error: error.message });
      return null;
    }
  }

  deleteSession(userId) {
    try {
      // Eliminar de memoria
      this.sessions.delete(userId);

      // Eliminar archivo
      const sessionFile = path.join(this.dataDir, `${userId}.json`);
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }

      logger.info('Session deleted', { userId });
      return true;
    } catch (error) {
      logger.error('Error deleting session', { userId, error: error.message });
      return false;
    }
  }

  getActiveSessions() {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    const activeSessions = [];

    for (const [userId, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.lastActivity);
      if (lastActivity > oneHourAgo) {
        activeSessions.push({
          userId,
          lastActivity: session.lastActivity,
          messageCount: session.conversationHistory.length,
          createdAt: session.createdAt
        });
      }
    }

    return activeSessions;
  }

  cleanupInactiveSessions() {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [userId, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.lastActivity);
      if (lastActivity < oneDayAgo) {
        this.sessions.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up inactive sessions', { count: cleanedCount });
    }

    return cleanedCount;
  }

  setSessionMetadata(userId, key, value) {
    const session = this.getSession(userId);
    session.metadata[key] = value;
    session.lastActivity = new Date().toISOString();
    this.saveSession(userId, session);
  }

  getSessionMetadata(userId, key) {
    const session = this.getSession(userId);
    return session.metadata[key];
  }

  getAllSessions() {
    const allSessions = [];

    // Obtener sesiones en memoria
    for (const [userId, session] of this.sessions.entries()) {
      allSessions.push({
        userId,
        status: 'active',
        lastActivity: session.lastActivity,
        messageCount: session.conversationHistory.length,
        createdAt: session.createdAt
      });
    }

    // Obtener sesiones en archivos que no están en memoria
    try {
      const files = fs.readdirSync(this.dataDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const userId = file.replace('.json', '');

          if (!this.sessions.has(userId)) {
            try {
              const sessionData = JSON.parse(fs.readFileSync(path.join(this.dataDir, file), 'utf8'));
              allSessions.push({
                userId,
                status: 'stored',
                lastActivity: sessionData.lastActivity,
                messageCount: sessionData.conversationHistory?.length || 0,
                createdAt: sessionData.createdAt
              });
            } catch (error) {
              logger.warn('Error reading session file', { file, error: error.message });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error reading sessions directory', { error: error.message });
    }

    return allSessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }
}

module.exports = SessionManager;