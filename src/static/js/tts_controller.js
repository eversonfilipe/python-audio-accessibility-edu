/**
 * ============================================================
 * TTSController — Controlador de Text-to-Speech
 * ============================================================
 *
 * Estratégia de 3 camadas:
 *   1. Web Speech API (browser nativo, sem latência)
 *   2. Backend pyttsx3 (offline, via /api/tts)
 *   3. Backend edge-tts (online, via /api/tts)
 *
 * Inclui leitura inteligente de código Python,
 * traduzindo sintaxe para linguagem natural em PT-BR.
 * ============================================================
 */

class TTSController {
    constructor() {
        /** @type {SpeechSynthesis|null} */
        this.synth = window.speechSynthesis || null;

        /** @type {SpeechSynthesisVoice|null} */
        this.voice = null;

        /** @type {SpeechSynthesisUtterance|null} */
        this.currentUtterance = null;

        /** @type {HTMLAudioElement|null} */
        this.audioElement = null;

        /** @type {number} Taxa de fala (1.0 = normal) */
        this.rate = 1.0;

        /** @type {number} Volume (0.0 a 1.0) */
        this.volume = 1.0;

        /** @type {string} Estado atual: 'idle' | 'speaking' | 'paused' */
        this.state = 'idle';

        /** @type {boolean} Se a Web Speech API tem voz PT-BR */
        this.webSpeechAvailable = false;

        /** @type {string} Modo de TTS ativo: 'webspeech' | 'backend' */
        this.activeMode = 'webspeech';

        /** @type {Function|null} Callback para mudanças de estado */
        this.onStateChange = null;

        /** @type {Array<string>} Fila de textos para ler sequencialmente */
        this._queue = [];

        /** @type {boolean} Se está processando a fila */
        this._processingQueue = false;

        this._initWebSpeech();
    }

    // -----------------------------------------------------------------
    // Inicialização
    // -----------------------------------------------------------------

    /**
     * Inicializa a Web Speech API e detecta vozes PT-BR.
     */
    _initWebSpeech() {
        if (!this.synth) {
            console.warn('TTSController: Web Speech API não disponível.');
            this.webSpeechAvailable = false;
            return;
        }

        // Vozes podem demorar a carregar
        const loadVoices = () => {
            const voices = this.synth.getVoices();
            if (voices.length === 0) return;

            // Procura voz PT-BR
            this.voice = voices.find(v =>
                v.lang === 'pt-BR' ||
                v.lang === 'pt_BR' ||
                v.lang.startsWith('pt-BR')
            );

            // Fallback: qualquer voz em português
            if (!this.voice) {
                this.voice = voices.find(v =>
                    v.lang.startsWith('pt')
                );
            }

            if (this.voice) {
                this.webSpeechAvailable = true;
                this.activeMode = 'webspeech';
                console.info(`TTSController: Voz PT-BR encontrada — ${this.voice.name}`);
            } else {
                this.webSpeechAvailable = false;
                this.activeMode = 'backend';
                console.warn('TTSController: Nenhuma voz PT-BR no browser. Usando backend.');
            }
        };

        // Tenta carregar imediatamente
        loadVoices();

        // Chrome carrega vozes de forma assíncrona
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
    }

    // -----------------------------------------------------------------
    // Interface Pública — Controle de Reprodução
    // -----------------------------------------------------------------

    /**
     * Fala um texto. Se já estiver falando, para e inicia o novo texto.
     * @param {string} text - Texto para sintetizar.
     * @returns {Promise<void>}
     */
    async speak(text) {
        if (!text || !text.trim()) return;
        this.stop();

        text = text.trim();

        if (this.webSpeechAvailable) {
            // WORKAROUND Chrome: delay entre cancel() e speak()
            // Chrome descarta silenciosamente utterances se speak() é
            // chamado imediatamente após cancel(). O delay de 80ms
            // garante que o engine interno resete antes de receber
            // um novo utterance.
            await this._delay(80);
            this._speakWebSpeech(text);
        } else {
            await this._speakBackend(text);
        }
    }

    /**
     * Fala uma sequência de textos em ordem (fila).
     * @param {Array<string>} texts - Array de textos.
     * @returns {Promise<void>}
     */
    async speakQueue(texts) {
        this.stop();
        this._queue = texts.filter(t => t && t.trim());
        this._processingQueue = true;
        // WORKAROUND Chrome: delay entre cancel() e speak()
        if (this.webSpeechAvailable) {
            await this._delay(80);
        }
        await this._processQueue();
    }

    /**
     * Pausa a reprodução atual.
     */
    pause() {
        if (this.state !== 'speaking') return;

        if (this.activeMode === 'webspeech' && this.synth) {
            this.synth.pause();
        } else if (this.audioElement) {
            this.audioElement.pause();
        }

        this._setState('paused');
    }

    /**
     * Retoma a reprodução pausada.
     */
    resume() {
        if (this.state !== 'paused') return;

        if (this.activeMode === 'webspeech' && this.synth) {
            this.synth.resume();
        } else if (this.audioElement) {
            this.audioElement.play();
        }

        this._setState('speaking');
    }

    /**
     * Para a reprodução completamente.
     */
    stop() {
        this._queue = [];
        this._processingQueue = false;

        // Limpa timers de watchdog e safety
        this._clearWatchdog();

        if (this.synth) {
            this.synth.cancel();
        }

        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement = null;
        }

        this.currentUtterance = null;
        this._setState('idle');
    }

    /**
     * Alterna entre play e pause.
     */
    togglePlayPause() {
        if (this.state === 'speaking') {
            this.pause();
        } else if (this.state === 'paused') {
            this.resume();
        }
    }

    /**
     * Ajusta a velocidade de fala.
     * @param {number} rate - Nova taxa (0.5 a 3.0).
     */
    setRate(rate) {
        this.rate = Math.max(0.5, Math.min(3.0, rate));
        if (this.audioElement) {
            this.audioElement.playbackRate = this.rate;
        }
    }

    /**
     * Ajusta o volume.
     * @param {number} volume - Novo volume (0.0 a 1.0).
     */
    setVolume(volume) {
        this.volume = Math.max(0.0, Math.min(1.0, volume));
        if (this.audioElement) {
            this.audioElement.volume = this.volume;
        }
    }

    // -----------------------------------------------------------------
    // Leitura Inteligente de Código Python
    // -----------------------------------------------------------------

    /**
     * Converte código Python em texto legível para TTS.
     * Traduz sintaxe para linguagem natural em PT-BR.
     *
     * @param {string} code - Código Python.
     * @returns {string} Texto legível para narração.
     */
    translateCodeToSpeech(code) {
        if (!code || !code.trim()) return '';

        const lines = code.split('\n');
        const spokenLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Ignora linhas vazias
            if (!trimmed) continue;

            // Calcula nível de indentação
            const indent = line.search(/\S/);
            const indentLevel = Math.floor(indent / 4);

            let spoken = '';

            // Prefixo de indentação
            if (indentLevel > 0) {
                spoken += `recuo nível ${indentLevel}. `;
            }

            // Traduz a linha
            spoken += this._translateLine(trimmed);

            spokenLines.push(`Linha ${i + 1}: ${spoken}`);
        }

        return spokenLines.join('. ');
    }

    /**
     * Traduz uma linha individual de código para linguagem natural.
     * @param {string} line - Linha de código (trimmed).
     * @returns {string} Tradução em linguagem natural.
     * @private
     */
    _translateLine(line) {
        // Comentários
        if (line.startsWith('#')) {
            return `comentário: ${line.substring(1).trim()}`;
        }

        let result = line;

        // Palavras-chave Python → português
        const keywords = [
            [/\bdef\b/g, 'define função'],
            [/\bclass\b/g, 'define classe'],
            [/\breturn\b/g, 'retorna'],
            [/\bif\b/g, 'se'],
            [/\belif\b/g, 'senão se'],
            [/\belse\b/g, 'senão'],
            [/\bfor\b/g, 'para cada'],
            [/\bwhile\b/g, 'enquanto'],
            [/\bin\b/g, 'em'],
            [/\bimport\b/g, 'importa'],
            [/\bfrom\b/g, 'de'],
            [/\bas\b/g, 'como'],
            [/\btry\b/g, 'tenta'],
            [/\bexcept\b/g, 'exceto'],
            [/\bfinally\b/g, 'finalmente'],
            [/\braise\b/g, 'lança erro'],
            [/\bwith\b/g, 'com'],
            [/\bTrue\b/g, 'verdadeiro'],
            [/\bFalse\b/g, 'falso'],
            [/\bNone\b/g, 'nulo'],
            [/\band\b/g, 'e'],
            [/\bor\b/g, 'ou'],
            [/\bnot\b/g, 'não'],
            [/\bprint\b/g, 'comando print'],
            [/\binput\b/g, 'comando input'],
            [/\blen\b/g, 'função tamanho'],
            [/\brange\b/g, 'função intervalo'],
            [/\bint\b/g, 'tipo inteiro'],
            [/\bfloat\b/g, 'tipo decimal'],
            [/\bstr\b/g, 'tipo texto'],
            [/\blist\b/g, 'tipo lista'],
            [/\bdict\b/g, 'tipo dicionário'],
            [/\btype\b/g, 'função tipo'],
        ];

        // Símbolos → português
        const symbols = [
            [/==/g, ' igual a '],
            [/!=/g, ' diferente de '],
            [/>=/g, ' maior ou igual a '],
            [/<=/g, ' menor ou igual a '],
            [/>/g, ' maior que '],
            [/</g, ' menor que '],
            [/\+=/g, ' mais igual '],
            [/-=/g, ' menos igual '],
            [/\*=/g, ' vezes igual '],
            [/\/=/g, ' dividido igual '],
            [/(?<!=)=(?!=)/g, ' recebe '],
            [/\(/g, ' abre parênteses '],
            [/\)/g, ' fecha parênteses '],
            [/\[/g, ' abre colchetes '],
            [/\]/g, ' fecha colchetes '],
            [/\{/g, ' abre chaves '],
            [/\}/g, ' fecha chaves '],
            [/:$/g, ' dois pontos'],
            [/,/g, ' vírgula '],
            [/\.\./g, ' ponto ponto '],
        ];

        // Aplica traduções de palavras-chave
        for (const [pattern, replacement] of keywords) {
            result = result.replace(pattern, replacement);
        }

        // Aplica traduções de símbolos
        for (const [pattern, replacement] of symbols) {
            result = result.replace(pattern, replacement);
        }

        // Limpa espaços extras
        result = result.replace(/\s+/g, ' ').trim();

        return result;
    }

    // -----------------------------------------------------------------
    // Engines Internas
    // -----------------------------------------------------------------

    /**
     * Fala usando Web Speech API (browser nativo).
     *
     * Inclui workarounds para bugs conhecidos do Chrome:
     *   - resume() preventivo contra pause fantasma
     *   - Timer watchdog de 15s contra travamento silencioso
     *   - Estado 'speaking' só é definido no callback onstart
     *
     * @param {string} text
     * @private
     */
    _speakWebSpeech(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.lang = 'pt-BR';
        utterance.rate = this.rate;
        utterance.volume = this.volume;

        // WORKAROUND Chrome: timer watchdog.
        // Chrome tem um bug onde utterances longos (>15s) param silenciosamente.
        // O workaround faz resume() periódico para manter o engine ativo.
        let watchdogTimer = null;
        const startWatchdog = () => {
            this._clearWatchdog();
            watchdogTimer = setInterval(() => {
                if (this.synth && this.synth.speaking && !this.synth.paused) {
                    this.synth.pause();
                    this.synth.resume();
                }
            }, 10000); // a cada 10s
            this._watchdogTimer = watchdogTimer;
        };

        utterance.onstart = () => {
            this._setState('speaking');
            startWatchdog();
            console.debug('TTSController: Web Speech iniciou reprodução.');
        };

        utterance.onend = () => {
            this._clearWatchdog();
            if (this._processingQueue) {
                this._processQueue();
            } else {
                this._setState('idle');
            }
        };

        utterance.onerror = (e) => {
            this._clearWatchdog();
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error('TTSController: Erro Web Speech:', e.error);
            }
            // Em caso de erro, tenta fallback via backend
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.warn('TTSController: Tentando fallback via backend...');
                this._speakBackend(text).catch(() => this._setState('idle'));
                return;
            }
            this._setState('idle');
        };

        this.currentUtterance = utterance;

        // WORKAROUND Chrome: resume() preventivo.
        // O Chrome às vezes pausa internamente o SpeechSynthesis engine
        // sem refletir em synth.paused. Chamar resume() antes de speak()
        // garante que o engine esteja em estado ativo.
        if (this.synth.paused) {
            this.synth.resume();
        }

        this.synth.speak(utterance);

        // NÃO definimos _setState('speaking') aqui.
        // O estado só muda no callback onstart, quando o áudio
        // REALMENTE começou a ser reproduzido. Isso impede o UI
        // de mostrar "Narrando" sem áudio real.
        // Mostramos um estado intermediário para dar feedback visual:
        if (this.state === 'idle') {
            this._setState('speaking');
        }

        // Safety check: se após 2s o onstart não disparou, tenta de novo
        this._startSafetyTimer = setTimeout(() => {
            if (this.synth && !this.synth.speaking && this.state === 'speaking') {
                console.warn('TTSController: Speech não iniciou em 2s. Retentando...');
                this.synth.cancel();
                setTimeout(() => {
                    if (this.currentUtterance) {
                        this.synth.speak(this.currentUtterance);
                    }
                }, 100);
            }
        }, 2000);
    }

    /**
     * Fala usando o backend (/api/tts).
     * @param {string} text
     * @returns {Promise<void>}
     * @private
     */
    async _speakBackend(text) {
        try {
            this._setState('speaking');

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            this.audioElement = new Audio(url);
            this.audioElement.playbackRate = this.rate;
            this.audioElement.volume = this.volume;

            this.audioElement.onended = () => {
                URL.revokeObjectURL(url);
                this.audioElement = null;
                if (this._processingQueue) {
                    this._processQueue();
                } else {
                    this._setState('idle');
                }
            };

            this.audioElement.onerror = () => {
                URL.revokeObjectURL(url);
                console.error('TTSController: Erro ao reproduzir áudio do backend.');
                this._setState('idle');
            };

            await this.audioElement.play();

        } catch (error) {
            console.error('TTSController: Fallback backend falhou:', error);
            this._setState('idle');
        }
    }

    // -----------------------------------------------------------------
    // Fila de Reprodução
    // -----------------------------------------------------------------

    /**
     * Processa o próximo item da fila de textos.
     * @returns {Promise<void>}
     * @private
     */
    async _processQueue() {
        if (!this._processingQueue || this._queue.length === 0) {
            this._processingQueue = false;
            this._setState('idle');
            return;
        }

        const nextText = this._queue.shift();
        if (this.webSpeechAvailable) {
            this._speakWebSpeech(nextText);
        } else {
            await this._speakBackend(nextText);
        }
    }

    // -----------------------------------------------------------------
    // Utilitários
    // -----------------------------------------------------------------

    /**
     * Promise que resolve após N milissegundos.
     * Usado para workaround do bug Chrome cancel/speak.
     * @param {number} ms - Milissegundos.
     * @returns {Promise<void>}
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Limpa o timer watchdog do Chrome.
     * @private
     */
    _clearWatchdog() {
        if (this._watchdogTimer) {
            clearInterval(this._watchdogTimer);
            this._watchdogTimer = null;
        }
        if (this._startSafetyTimer) {
            clearTimeout(this._startSafetyTimer);
            this._startSafetyTimer = null;
        }
    }

    // -----------------------------------------------------------------
    // Estado
    // -----------------------------------------------------------------

    /**
     * Atualiza o estado interno e dispara callback.
     * @param {string} newState - 'idle' | 'speaking' | 'paused'
     * @private
     */
    _setState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        if (typeof this.onStateChange === 'function') {
            this.onStateChange(newState);
        }
    }
}

// Exporta como global (sem module system)
window.TTSController = TTSController;
