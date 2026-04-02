/**
 * ============================================================
 * AccessibilityManager — Gerenciador de Acessibilidade
 * ============================================================
 *
 * Responsável por:
 *   - Atalhos de teclado globais
 *   - Gerenciamento de ARIA live regions
 *   - Ajuste dinâmico de tamanho de fonte
 *   - Anúncios de estado para leitores de tela
 * ============================================================
 */

class AccessibilityManager {
    /**
     * @param {TTSController} ttsController - Instância do TTS.
     * @param {SlideViewer} slideViewer - Instância do visualizador.
     */
    constructor(ttsController, slideViewer) {
        /** @type {TTSController} */
        this.tts = ttsController;

        /** @type {SlideViewer} */
        this.viewer = slideViewer;

        /** @type {number} Tamanho atual da fonte (rem) */
        this.fontSize = 1.25;

        /** @type {number} Taxa TTS atual */
        this.ttsRate = 1.0;

        // Elementos DOM
        this._ariaStatus = document.getElementById('aria-status');
        this._ariaAlert = document.getElementById('aria-alert');
        this._ttsStatusEl = document.getElementById('tts-status');
        this._speedIndicator = document.getElementById('speed-indicator');
        this._fontIndicator = document.getElementById('font-indicator');

        // Registra atalhos de teclado
        this._registerKeyboardShortcuts();

        // Registra callback de mudança de estado TTS
        this.tts.onStateChange = (state) => this._onTTSStateChange(state);
    }

    // -----------------------------------------------------------------
    // ARIA Live Regions
    // -----------------------------------------------------------------

    /**
     * Anuncia uma mensagem via ARIA live region (polite).
     * @param {string} message
     */
    announce(message) {
        if (!this._ariaStatus) return;
        // Limpa e reinsere para forçar o leitor de tela a anunciar
        this._ariaStatus.textContent = '';
        requestAnimationFrame(() => {
            this._ariaStatus.textContent = message;
        });
    }

    /**
     * Anuncia uma mensagem urgente via ARIA alert (assertive).
     * @param {string} message
     */
    alert(message) {
        if (!this._ariaAlert) return;
        this._ariaAlert.textContent = '';
        requestAnimationFrame(() => {
            this._ariaAlert.textContent = message;
        });
    }

    // -----------------------------------------------------------------
    // Tamanho da Fonte
    // -----------------------------------------------------------------

    /**
     * Aumenta o tamanho da fonte.
     */
    increaseFontSize() {
        if (this.fontSize >= 3.0) {
            this.announce('Tamanho máximo da fonte atingido.');
            return;
        }
        this.fontSize = Math.min(3.0, this.fontSize + 0.25);
        this._applyFontSize();
        this.announce(`Tamanho da fonte: ${this.fontSize}`);
    }

    /**
     * Diminui o tamanho da fonte.
     */
    decreaseFontSize() {
        if (this.fontSize <= 1.0) {
            this.announce('Tamanho mínimo da fonte atingido.');
            return;
        }
        this.fontSize = Math.max(1.0, this.fontSize - 0.25);
        this._applyFontSize();
        this.announce(`Tamanho da fonte: ${this.fontSize}`);
    }

    /**
     * Aplica o tamanho de fonte ao documento.
     * @private
     */
    _applyFontSize() {
        document.documentElement.style.fontSize = `${this.fontSize}rem`;
        if (this._fontIndicator) {
            this._fontIndicator.textContent = `${this.fontSize}×`;
        }
    }

    // -----------------------------------------------------------------
    // Velocidade TTS
    // -----------------------------------------------------------------

    /**
     * Aumenta a velocidade do TTS.
     */
    increaseTTSRate() {
        if (this.ttsRate >= 3.0) {
            this.announce('Velocidade máxima atingida.');
            return;
        }
        this.ttsRate = Math.min(3.0, this.ttsRate + 0.25);
        this.tts.setRate(this.ttsRate);
        this._updateSpeedIndicator();
        this.announce(`Velocidade: ${this.ttsRate}`);
    }

    /**
     * Diminui a velocidade do TTS.
     */
    decreaseTTSRate() {
        if (this.ttsRate <= 0.5) {
            this.announce('Velocidade mínima atingida.');
            return;
        }
        this.ttsRate = Math.max(0.5, this.ttsRate - 0.25);
        this.tts.setRate(this.ttsRate);
        this._updateSpeedIndicator();
        this.announce(`Velocidade: ${this.ttsRate}`);
    }

    /**
     * Atualiza o indicador visual de velocidade.
     * @private
     */
    _updateSpeedIndicator() {
        if (this._speedIndicator) {
            this._speedIndicator.textContent = `${this.ttsRate}×`;
        }
    }

    // -----------------------------------------------------------------
    // Atalhos de Teclado
    // -----------------------------------------------------------------

    /**
     * Registra todos os atalhos de teclado.
     * @private
     */
    _registerKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Previne múltiplas execuções se a pessoa segurar a tecla (causa flashing na tela do microfone)
            if (e.repeat) return;

            // Ignora se estiver digitando em um input/select/textarea
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            // Se o select está em foco, permite setas para navegação do select
            if (tag === 'select') {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return;
            }

            switch (e.key) {
                // --- Navegação de Slides ---
                case 'ArrowRight':
                case 'PageDown':
                    e.preventDefault();
                    this.viewer.nextSlide();
                    break;

                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.viewer.prevSlide();
                    break;

                // --- Controle TTS ---
                case ' ': // Espaço
                    e.preventDefault();
                    if (this.tts.state === 'idle') {
                        // Inicia leitura completa do slide
                        const texts = this.viewer.getFullSlideText();
                        if (texts.length > 0) {
                            this.tts.speakQueue(texts);
                        }
                    } else {
                        this.tts.togglePlayPause();
                    }
                    break;

                case 's':
                case 'S':
                    e.preventDefault();
                    this.tts.stop();
                    this.announce('Narração parada.');
                    break;

                // --- Leitura Específica ---
                case 'r':
                case 'R':
                    e.preventDefault();
                    this.tts.stop();
                    const fullTexts = this.viewer.getFullSlideText();
                    if (fullTexts.length > 0) {
                        this.tts.speakQueue(fullTexts);
                        this.announce('Lendo slide inteiro.');
                    }
                    break;

                case 'c':
                case 'C':
                    e.preventDefault();
                    this.tts.stop();
                    const codeText = this.viewer.getCodeText();
                    if (codeText) {
                        this.tts.speak(codeText);
                        this.announce('Lendo código.');
                    }
                    break;

                case 't':
                case 'T':
                    e.preventDefault();
                    this.tts.stop();
                    const titleText = this.viewer.getTitleText();
                    if (titleText) {
                        this.tts.speak(titleText);
                    }
                    break;

                // --- Velocidade TTS ---
                case '+':
                case '=':
                    e.preventDefault();
                    this.increaseTTSRate();
                    break;

                case '-':
                case '_':
                    e.preventDefault();
                    this.decreaseTTSRate();
                    break;

                // --- Tamanho da Fonte ---
                case 'f':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        this.increaseFontSize();
                    }
                    break;

                case 'F':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.decreaseFontSize();
                    }
                    break;

                // --- Ajuda ---
                case 'h':
                case 'H':
                    e.preventDefault();
                    this._announceHelp();
                    break;

                // --- Atalhos do Duelo de Lógica ---
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.tts.stop();
                    if (window.readDueloPage) {
                        window.readDueloPage();
                    }
                    break;
                    
                case 'g':
                case 'G':
                    e.preventDefault();
                    const qaContainer = document.getElementById('qa-container');
                    if (!qaContainer || qaContainer.style.display === 'none') {
                        this.announce("A seção de duelo não está ativa. Atalho sem efeito.");
                        break;
                    }
                    
                    const textAreas = qaContainer.querySelectorAll('textarea[id^="logic-input-"]');
                    if (textAreas.length > 0) {
                        const targetId = textAreas[0].id.replace('logic-input-', '');
                        if (window.startDictation) {
                            window.startDictation(targetId);
                        }
                    } else {
                        this.announce("Nenhum desafio encontrado para gravação.");
                    }
                    break;

                // --- Escape: voltar à tela de aulas ---
                case 'Escape':
                    e.preventDefault();
                    this.tts.stop();
                    this.viewer.showWelcome();
                    this.announce('Voltando à seleção de aulas.');
                    // Reseta select
                    const select = document.getElementById('lesson-select');
                    if (select) select.value = '';
                    break;
            }
        });
    }

    /**
     * Anuncia os atalhos de teclado disponíveis via TTS.
     * @private
     */
    _announceHelp() {
        const helpText =
            'Atalhos de teclado disponíveis. ' +
            'Setas esquerda e direita: navegar entre slides. ' +
            'Espaço: iniciar ou pausar narração. ' +
            'Letra S: parar narração. ' +
            'Letra R: ler slide inteiro. ' +
            'Letra C: ler apenas o código. ' +
            'Letra T: ler apenas o título. ' +
            'Tecla mais: aumentar velocidade. ' +
            'Tecla menos: diminuir velocidade. ' +
            'Letra F: aumentar fonte. ' +
            'Shift mais F: diminuir fonte. ' +
            'Escape: voltar à seleção de aulas. ' +
            'Letra D: ler toda a área de desafio do Duelo de Lógica. ' +
            'Letra G: Iniciar gravação de voz na tela de Duelo. ' +
            'Letra H: ouvir esta ajuda novamente.';

        this.tts.speak(helpText);
    }

    // -----------------------------------------------------------------
    // Estado TTS Visual
    // -----------------------------------------------------------------

    /**
     * Atualiza o indicador visual de estado do TTS.
     * @param {string} state - 'idle' | 'speaking' | 'paused'
     * @private
     */
    _onTTSStateChange(state) {
        if (!this._ttsStatusEl) return;

        // Remove classes anteriores
        this._ttsStatusEl.classList.remove(
            'tts-status--idle',
            'tts-status--speaking',
            'tts-status--paused'
        );

        // Atualiza botões
        const btnPlay = document.getElementById('btn-tts-play');
        const btnPause = document.getElementById('btn-tts-pause');
        const btnStop = document.getElementById('btn-tts-stop');

        switch (state) {
            case 'speaking':
                this._ttsStatusEl.classList.add('tts-status--speaking');
                this._ttsStatusEl.textContent = 'Narrando';
                if (btnPlay) btnPlay.disabled = true;
                if (btnPause) btnPause.disabled = false;
                if (btnStop) btnStop.disabled = false;
                break;

            case 'paused':
                this._ttsStatusEl.classList.add('tts-status--paused');
                this._ttsStatusEl.textContent = 'Pausado';
                if (btnPlay) btnPlay.disabled = false;
                if (btnPause) btnPause.disabled = true;
                if (btnStop) btnStop.disabled = false;
                break;

            case 'idle':
            default:
                this._ttsStatusEl.classList.add('tts-status--idle');
                this._ttsStatusEl.textContent = 'Pronto';
                if (btnPlay) btnPlay.disabled = false;
                if (btnPause) btnPause.disabled = true;
                if (btnStop) btnStop.disabled = true;
                break;
        }
    }
}

// Exporta como global
window.AccessibilityManager = AccessibilityManager;
