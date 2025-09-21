class ChatApp {
    constructor() {
        this.baseURL = '/api';
        this.isLoading = false;
        this.agentName = 'Santander';
        this.isRecording = false;
        this.recognition = null;
        this.userId = null;

        this.initializeElements();
        this.bindEvents();
        this.initializeSession();
        this.loadAgentInfo();
        this.autoResizeTextarea();
        this.checkMicrophonePermission();
        this.initializeSpeechRecognition();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.agentNameElement = document.getElementById('agent-name');
        this.statusText = document.getElementById('status-text');
        this.clearHistoryButton = document.getElementById('clear-history');
        this.showToolsButton = document.getElementById('show-tools');
        this.audioButton = document.getElementById('audio-button');
        this.transcriptionStatus = document.getElementById('transcription-status');
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.sendMessage());

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.chatInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });

        this.clearHistoryButton.addEventListener('click', () => this.clearHistory());
        this.showToolsButton.addEventListener('click', () => this.showTools());

        // Audio button events - agregando click para testing
        this.audioButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.isRecording) {
                this.testSpeechRecognition();
            }
        });

        this.audioButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.audioButton.addEventListener('mouseup', () => this.stopRecording());
        this.audioButton.addEventListener('mouseleave', () => this.stopRecording());

        this.audioButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.audioButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });
    }

    autoResizeTextarea() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }

    async loadAgentInfo() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();

            if (data.agent && data.agent.name) {
                this.agentName = data.agent.name;
                this.updateHeaderTitle();
            }

            this.updateStatus('Conectado', 'connected');
        } catch (error) {
            console.error('Error loading agent info:', error);
            this.updateStatus('Desconectado', 'disconnected');
        }
    }

    updateHeaderTitle() {
        let title = this.agentName || 'Santander Assistant';
        if (this.userId) {
            const shortId = this.userId.substring(0, 8) + '...';
            title += ` (${shortId})`;
        }
        this.agentNameElement.textContent = title;
    }

    updateStatus(text, status) {
        this.statusText.textContent = text;
        const statusDot = document.querySelector('.status-dot');

        statusDot.style.background = status === 'connected' ? 'rgba(255,255,255,0.8)' :
                                   status === 'loading' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)';
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isLoading) return;

        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.autoResizeTextarea();
        this.setLoading(true);

        try {
            const response = await fetch(`${this.baseURL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    userId: this.userId
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Actualizar userId si es nuevo
                if (data.userId && !this.userId) {
                    this.userId = data.userId;
                    this.saveUserSession();
                    this.updateHeaderTitle();
                }

                this.addMessage(data.response, 'assistant', {
                    iterations: data.iterations,
                    toolsUsed: data.toolsUsed,
                    usage: data.usage
                });
            } else {
                this.showError(data.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Error de conexión. Por favor, intenta de nuevo.');
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(content, sender, metadata = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;

        if (metadata && sender === 'assistant') {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'message-info';

            const infoParts = [];
            if (metadata.iterations) infoParts.push(`Iteraciones: ${metadata.iterations}`);
            if (metadata.toolsUsed && metadata.toolsUsed.length > 0) {
                infoParts.push(`Herramientas: ${metadata.toolsUsed.join(', ')}`);
            }
            if (metadata.usage && metadata.usage.total_tokens) {
                infoParts.push(`Tokens: ${metadata.usage.total_tokens}`);
            }

            if (infoParts.length > 0) {
                infoDiv.textContent = infoParts.join(' • ');
                messageContent.appendChild(infoDiv);
            }
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.sendButton.disabled = loading;
        this.audioButton.disabled = loading || this.isRecording;
        this.typingIndicator.style.display = loading ? 'flex' : 'none';

        if (loading) {
            this.updateStatus('Procesando...', 'loading');
            this.scrollToBottom();
        } else {
            this.updateStatus('Conectado', 'connected');
        }
    }

    showError(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = `Error: ${message}`;

        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    async clearHistory() {
        if (!confirm('¿Estás seguro de que quieres limpiar el historial de conversación?')) {
            return;
        }

        if (!this.userId) {
            this.showError('No hay sesión activa para limpiar');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/clear-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.userId }),
            });

            const data = await response.json();

            if (data.success) {
                const messages = this.chatMessages.querySelectorAll('.message, .error-message');
                messages.forEach(message => message.remove());

                this.addMessage('Historial limpiado. ¡Empecemos de nuevo!', 'assistant');
            } else {
                this.showError(data.error || 'Error al limpiar el historial');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showError('Error de conexión al limpiar el historial');
        }
    }

    async showTools() {
        try {
            const response = await fetch(`${this.baseURL}/tools`);
            const data = await response.json();

            if (data.success && data.tools) {
                const toolsList = data.tools.map(tool =>
                    `• ${tool.name}: ${tool.description}`
                ).join('\n');

                this.addMessage(
                    `Herramientas disponibles:\n\n${toolsList}`,
                    'assistant'
                );
            } else {
                this.showError(data.error || 'Error al obtener las herramientas');
            }
        } catch (error) {
            console.error('Error loading tools:', error);
            this.showError('Error de conexión al obtener las herramientas');
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    initializeSpeechRecognition() {
        // Verificar soporte con logs de debug
        console.log('Checking speech recognition support...');
        console.log('webkitSpeechRecognition available:', 'webkitSpeechRecognition' in window);
        console.log('SpeechRecognition available:', 'SpeechRecognition' in window);

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            try {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();

                // Configuración más robusta
                this.recognition.continuous = false;
                this.recognition.interimResults = true;
                this.recognition.lang = 'es-ES';
                this.recognition.maxAlternatives = 1;

                console.log('Speech recognition initialized successfully');

                this.recognition.onstart = () => {
                    console.log('Speech recognition started');
                    this.isRecording = true;
                    this.audioButton.classList.add('recording');
                    this.audioButton.innerHTML = '🔴';
                    this.audioButton.disabled = true;
                    this.showTranscriptionStatus('Escuchando...');
                };

                this.recognition.onresult = (event) => {
                    console.log('Speech recognition result:', event);
                    let transcript = '';
                    let isFinal = false;

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        transcript += result[0].transcript;
                        if (result.isFinal) {
                            isFinal = true;
                        }
                    }

                    console.log('Transcript:', transcript, 'isFinal:', isFinal);

                    if (isFinal) {
                        this.chatInput.value = transcript.trim();
                        this.autoResizeTextarea();
                        this.showTranscriptionStatus('Transcripción completada');
                        setTimeout(() => this.hideTranscriptionStatus(), 2000);
                    } else {
                        this.showTranscriptionStatus(`Transcribiendo: "${transcript}"`);
                    }
                };

                this.recognition.onend = () => {
                    console.log('Speech recognition ended');
                    this.isRecording = false;
                    this.audioButton.classList.remove('recording');
                    this.audioButton.innerHTML = '🎤';
                    this.audioButton.disabled = false;
                };

                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error, event);
                    this.isRecording = false;
                    this.audioButton.classList.remove('recording');
                    this.audioButton.innerHTML = '🎤';
                    this.audioButton.disabled = false;

                    let errorMessage = 'Error en el reconocimiento de voz';
                    switch(event.error) {
                        case 'no-speech':
                            errorMessage = 'No se detectó audio. Intenta de nuevo.';
                            break;
                        case 'audio-capture':
                            errorMessage = 'Error al acceder al micrófono';
                            break;
                        case 'not-allowed':
                            errorMessage = 'Permiso denegado. Permite el acceso al micrófono.';
                            break;
                        case 'network':
                            errorMessage = 'Error de conexión';
                            break;
                        case 'aborted':
                            errorMessage = 'Grabación cancelada';
                            break;
                        default:
                            errorMessage = `Error: ${event.error}`;
                    }

                    this.showTranscriptionStatus(errorMessage);
                    setTimeout(() => this.hideTranscriptionStatus(), 4000);
                };

                // Test inicial para verificar que funciona
                this.audioButton.title = 'Mantén presionado para grabar (funcional)';

            } catch (error) {
                console.error('Error initializing speech recognition:', error);
                this.audioButton.disabled = true;
                this.audioButton.title = 'Error al inicializar reconocimiento de voz';
            }
        } else {
            console.warn('Speech recognition not supported in this browser');
            this.audioButton.disabled = true;
            this.audioButton.title = 'Reconocimiento de voz no disponible en este navegador';
            this.audioButton.style.opacity = '0.5';
        }
    }

    startRecording() {
        console.log('Attempting to start recording...', {
            hasRecognition: !!this.recognition,
            isRecording: this.isRecording,
            isLoading: this.isLoading,
            buttonDisabled: this.audioButton.disabled
        });

        if (!this.recognition) {
            console.error('No speech recognition available');
            this.showTranscriptionStatus('Reconocimiento de voz no disponible');
            setTimeout(() => this.hideTranscriptionStatus(), 2000);
            return;
        }

        if (this.isRecording) {
            console.log('Already recording, ignoring start request');
            return;
        }

        if (this.isLoading) {
            console.log('App is loading, ignoring start request');
            return;
        }

        try {
            console.log('Starting speech recognition...');
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);

            let errorMessage = 'Error al iniciar grabación';
            if (error.name === 'InvalidStateError') {
                errorMessage = 'Reconocimiento ya activo. Espera un momento.';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Permiso denegado para el micrófono';
            }

            this.showTranscriptionStatus(errorMessage);
            setTimeout(() => this.hideTranscriptionStatus(), 3000);
        }
    }

    stopRecording() {
        console.log('Attempting to stop recording...', {
            hasRecognition: !!this.recognition,
            isRecording: this.isRecording
        });

        if (this.recognition && this.isRecording) {
            try {
                console.log('Stopping speech recognition...');
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
                // Forzar reset del estado si hay error
                this.isRecording = false;
                this.audioButton.classList.remove('recording');
                this.audioButton.innerHTML = '🎤';
                this.audioButton.disabled = false;
            }
        }
    }

    showTranscriptionStatus(message) {
        this.transcriptionStatus.textContent = message;
        this.transcriptionStatus.classList.add('show');
    }

    hideTranscriptionStatus() {
        this.transcriptionStatus.classList.remove('show');
    }

    async checkMicrophonePermission() {
        try {
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                console.log('Microphone permission status:', permission.state);

                permission.onchange = () => {
                    console.log('Microphone permission changed to:', permission.state);
                    this.updateMicrophoneButtonState(permission.state);
                };

                this.updateMicrophoneButtonState(permission.state);
            }
        } catch (error) {
            console.log('Could not check microphone permission:', error);
        }
    }

    updateMicrophoneButtonState(permissionState) {
        switch (permissionState) {
            case 'granted':
                this.audioButton.style.opacity = '1';
                this.audioButton.title = 'Clic para probar o mantén presionado para grabar';
                break;
            case 'denied':
                this.audioButton.style.opacity = '0.5';
                this.audioButton.title = 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.';
                break;
            case 'prompt':
                this.audioButton.style.opacity = '0.8';
                this.audioButton.title = 'Haz clic para permitir acceso al micrófono';
                break;
        }
    }

    testSpeechRecognition() {
        console.log('Testing speech recognition...');

        if (!this.recognition) {
            this.showTranscriptionStatus('Reconocimiento de voz no inicializado');
            setTimeout(() => this.hideTranscriptionStatus(), 2000);
            return;
        }

        this.showTranscriptionStatus('Iniciando prueba de grabación...');

        // Grabación corta de 3 segundos para probar
        this.startRecording();

        setTimeout(() => {
            if (this.isRecording) {
                this.stopRecording();
                this.showTranscriptionStatus('Prueba completada');
                setTimeout(() => this.hideTranscriptionStatus(), 2000);
            }
        }, 3000);
    }

    async initializeSession() {
        // Intentar recuperar sesión existente del localStorage
        const savedUserId = localStorage.getItem('santander_userId');

        if (savedUserId) {
            console.log('Found saved session:', savedUserId);
            this.userId = savedUserId;
            this.updateHeaderTitle();
            await this.loadSessionHistory();
        } else {
            console.log('No saved session, will create new on first message');
        }
    }

    async loadSessionHistory() {
        if (!this.userId) return;

        try {
            const response = await fetch(`${this.baseURL}/history/${this.userId}`);
            const data = await response.json();

            if (data.success && data.history && data.history.length > 0) {
                console.log('Loading session history:', data.history.length, 'messages');

                // Limpiar mensajes existentes excepto el mensaje de bienvenida
                const messages = this.chatMessages.querySelectorAll('.message');
                messages.forEach((message, index) => {
                    if (index > 0) { // Mantener solo el primer mensaje de bienvenida
                        message.remove();
                    }
                });

                // Cargar historial
                data.history.forEach(msg => {
                    this.addMessage(msg.content, msg.role);
                });
            }
        } catch (error) {
            console.error('Error loading session history:', error);
        }
    }

    saveUserSession() {
        if (this.userId) {
            localStorage.setItem('santander_userId', this.userId);
            console.log('Session saved:', this.userId);
        }
    }

    clearUserSession() {
        this.userId = null;
        localStorage.removeItem('santander_userId');
        console.log('Session cleared from localStorage');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});