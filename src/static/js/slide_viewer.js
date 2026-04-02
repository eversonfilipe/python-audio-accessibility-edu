/**
 * ============================================================
 * SlideViewer — Visualizador e Navegador de Slides
 * ============================================================
 *
 * Gerencia a renderização de slides, navegação (anterior/próximo),
 * destaque de sintaxe CSS-only, e disparo automático de
 * audiodescrição ao mudar de slide.
 * ============================================================
 */

class SlideViewer {
    /**
     * @param {TTSController} ttsController - Instância do controlador TTS.
     */
    constructor(ttsController) {
        /** @type {TTSController} */
        this.tts = ttsController;

        /** @type {Object|null} Aula atual carregada */
        this.currentLesson = null;

        /** @type {number} Índice do slide atual (0-based) */
        this.currentSlideIndex = 0;

        /** @type {Function|null} Callback quando slide muda */
        this.onSlideChange = null;

        // Cache de elementos DOM
        this._elements = {
            welcomeScreen: document.getElementById('welcome-screen'),
            slideContainer: document.getElementById('slide-container'),
            slideNumber: document.getElementById('slide-number'),
            slideTitle: document.getElementById('slide-title-heading'),
            slideContent: document.getElementById('slide-content'),
            codeBlock: document.getElementById('code-block'),
            codeContent: document.getElementById('code-content'),
            codeDescription: document.getElementById('code-description'),
            codeDescriptionText: document.getElementById('code-description-text'),
            slideIndicator: document.getElementById('slide-indicator'),
            progressBar: document.getElementById('progress-bar'),
            progressFill: document.getElementById('progress-fill'),
            btnPrev: document.getElementById('btn-prev-slide'),
            btnNext: document.getElementById('btn-next-slide'),
            headerLessonInfo: document.getElementById('header-lesson-info'),
            lessonCards: document.getElementById('lesson-cards'),
        };
    }

    // -----------------------------------------------------------------
    // Carregamento de Aula
    // -----------------------------------------------------------------

    /**
     * Carrega uma aula pelo ID via API.
     * @param {string} lessonId - Identificador da aula.
     * @returns {Promise<boolean>} Sucesso ou falha.
     */
    async loadLesson(lessonId) {
        try {
            const response = await fetch(`/api/lessons/${lessonId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.success || !data.lesson) {
                throw new Error(data.error || 'Aula não encontrada');
            }

            this.currentLesson = data.lesson;
            this.currentSlideIndex = 0;

            // Mostra área de slides, esconde boas-vindas
            this._elements.welcomeScreen.style.display = 'none';
            this._elements.slideContainer.style.display = 'flex';

            // Atualiza header
            this._elements.headerLessonInfo.textContent = this.currentLesson.title;

            // Renderiza primeiro slide
            this.renderCurrentSlide();

            return true;

        } catch (error) {
            console.error('SlideViewer: Erro ao carregar aula:', error);
            return false;
        }
    }

    /**
     * Volta para a tela de boas-vindas.
     */
    showWelcome() {
        this.currentLesson = null;
        this.currentSlideIndex = 0;
        this._elements.welcomeScreen.style.display = 'flex';
        this._elements.slideContainer.style.display = 'none';
        this._elements.headerLessonInfo.textContent =
            'Programa Trilha TEC — Florescendo Talentos';
    }

    // -----------------------------------------------------------------
    // Navegação
    // -----------------------------------------------------------------

    /**
     * Avança para o próximo slide.
     */
    nextSlide() {
        if (!this.currentLesson) return;
        const slides = this.currentLesson.slides || [];
        if (this.currentSlideIndex < slides.length - 1) {
            this.currentSlideIndex++;
            this.renderCurrentSlide();
            this._announceSlideChange();
        }
    }

    /**
     * Volta para o slide anterior.
     */
    prevSlide() {
        if (!this.currentLesson) return;
        if (this.currentSlideIndex > 0) {
            this.currentSlideIndex--;
            this.renderCurrentSlide();
            this._announceSlideChange();
        }
    }

    /**
     * Vai para um slide específico.
     * @param {number} index - Índice do slide (0-based).
     */
    goToSlide(index) {
        if (!this.currentLesson) return;
        const slides = this.currentLesson.slides || [];
        if (index >= 0 && index < slides.length) {
            this.currentSlideIndex = index;
            this.renderCurrentSlide();
            this._announceSlideChange();
        }
    }

    // -----------------------------------------------------------------
    // Renderização
    // -----------------------------------------------------------------

    /**
     * Renderiza o slide atual no DOM.
     */
    renderCurrentSlide() {
        if (!this.currentLesson) return;

        const slides = this.currentLesson.slides || [];
        const slide = slides[this.currentSlideIndex];
        if (!slide) return;

        const totalSlides = slides.length;
        const slideNum = this.currentSlideIndex + 1;

        // Número e indicador do slide
        const label = `Slide ${slideNum} de ${totalSlides}`;
        this._elements.slideNumber.textContent = label;
        this._elements.slideNumber.setAttribute('aria-label', label);
        this._elements.slideIndicator.textContent = label;

        // Título
        this._elements.slideTitle.textContent = slide.title || 'Sem título';

        // Conteúdo texto
        this._elements.slideContent.innerHTML = this._formatContent(slide.content || '');

        // Bloco de código
        if (slide.code && slide.code.trim()) {
            this._elements.codeBlock.style.display = 'block';
            const codeEl = this._elements.codeContent.querySelector('code') ||
                           this._elements.codeContent;
            codeEl.innerHTML = this._highlightPython(slide.code);
        } else {
            this._elements.codeBlock.style.display = 'none';
        }

        // Descrição do código
        if (slide.code_description && slide.code_description.trim()) {
            this._elements.codeDescription.style.display = 'block';
            this._elements.codeDescriptionText.textContent = slide.code_description;
        } else {
            this._elements.codeDescription.style.display = 'none';
        }

        // Progress bar
        const progress = totalSlides > 1
            ? ((slideNum - 1) / (totalSlides - 1)) * 100
            : 100;
        this._elements.progressFill.style.width = `${progress}%`;
        this._elements.progressBar.setAttribute('aria-valuenow', Math.round(progress));

        // Estado dos botões de navegação
        this._elements.btnPrev.disabled = this.currentSlideIndex === 0;
        this._elements.btnNext.disabled = this.currentSlideIndex === totalSlides - 1;

        // Exibição Inteligente do Botão Duelo
        const btnOpenQa = document.getElementById('btn-open-qa');
        if (btnOpenQa) {
            const questions = this.currentLesson.questions || [];
            if (this.currentSlideIndex === totalSlides - 1 && questions.length > 0) {
                btnOpenQa.style.display = 'inline-block';
            } else {
                btnOpenQa.style.display = 'none';
            }
        }

        // Callback
        if (typeof this.onSlideChange === 'function') {
            this.onSlideChange(slide, slideNum, totalSlides);
        }
    }

    /**
     * Renderiza cards de aulas na tela de boas-vindas.
     * @param {Array} lessons - Lista de aulas do /api/lessons.
     */
    renderLessonCards(lessons) {
        const container = this._elements.lessonCards;
        if (!container) return;

        container.innerHTML = '';

        if (lessons.length === 0) {
            container.innerHTML = `
                <div class="error-message" role="alert">
                    Nenhuma aula encontrada. Adicione arquivos .json na pasta src/lessons/.
                </div>
            `;
            return;
        }

        const subjectLabels = {
            python: '🐍 Python',
            html: '🌐 HTML',
            css: '🎨 CSS',
            javascript: '⚡ JavaScript',
            js: '⚡ JavaScript',
            geral: '📚 Geral',
        };

        lessons.forEach(lesson => {
            const card = document.createElement('button');
            card.className = 'lesson-card';
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label',
                `Abrir aula: ${lesson.title}. ${lesson.slide_count} slides.`);
            card.dataset.lessonId = lesson.id;

            const subjectLabel = subjectLabels[lesson.subject] || `📚 ${lesson.subject}`;

            card.innerHTML = `
                <span class="lesson-card__subject">${subjectLabel}</span>
                <span class="lesson-card__title">${lesson.title}</span>
                <span class="lesson-card__meta">${lesson.slide_count} slide(s)</span>
            `;

            card.addEventListener('click', () => {
                this._onLessonCardClick(lesson.id);
            });

            container.appendChild(card);
        });
    }

    // -----------------------------------------------------------------
    // Leitura de Slides
    // -----------------------------------------------------------------

    /**
     * Retorna o slide atual.
     * @returns {Object|null}
     */
    getCurrentSlide() {
        if (!this.currentLesson) return null;
        return this.currentLesson.slides[this.currentSlideIndex] || null;
    }

    /**
     * Gera texto completo do slide para leitura TTS.
     * Inclui audiodescrição + conteúdo + código.
     * @returns {Array<string>} Array de textos para fila do TTS.
     */
    getFullSlideText() {
        const slide = this.getCurrentSlide();
        if (!slide) return [];

        const texts = [];
        const slides = this.currentLesson.slides || [];
        const slideNum = this.currentSlideIndex + 1;
        const totalSlides = slides.length;

        // 1. Audiodescrição (posiciona o estudante)
        if (slide.audio_description) {
            texts.push(slide.audio_description);
        } else {
            texts.push(`Slide ${slideNum} de ${totalSlides}. Título: ${slide.title}.`);
        }

        // 2. Conteúdo textual
        if (slide.content) {
            texts.push(slide.content);
        }

        // 3. Código (traduzido)
        if (slide.code && slide.code.trim()) {
            const codeIntro = slide.code_description
                ? `Código: ${slide.code_description}. Aqui está o código: `
                : 'Código: ';
            const codeSpoken = this.tts.translateCodeToSpeech(slide.code);
            texts.push(codeIntro + codeSpoken);
        }

        return texts;
    }

    /**
     * Retorna apenas o texto do título para leitura.
     * @returns {string}
     */
    getTitleText() {
        const slide = this.getCurrentSlide();
        if (!slide) return '';
        const slides = this.currentLesson.slides || [];
        return `Slide ${this.currentSlideIndex + 1} de ${slides.length}: ${slide.title}`;
    }

    /**
     * Retorna texto do código traduzido para leitura.
     * @returns {string}
     */
    getCodeText() {
        const slide = this.getCurrentSlide();
        if (!slide || !slide.code) return 'Este slide não contém código.';
        let text = '';
        if (slide.code_description) {
            text += `Descrição do código: ${slide.code_description}. `;
        }
        text += this.tts.translateCodeToSpeech(slide.code);
        return text;
    }

    // -----------------------------------------------------------------
    // Helpers Internos
    // -----------------------------------------------------------------

    /**
     * Formata conteúdo de texto para HTML (converte \n em <p>).
     * @param {string} content
     * @returns {string} HTML formatado.
     * @private
     */
    _formatContent(content) {
        if (!content) return '';

        // Escapa HTML
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Converte parágrafos (dupla quebra de linha)
        const paragraphs = escaped.split(/\n\n+/);
        return paragraphs
            .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    /**
     * Aplica syntax highlighting simples via CSS classes ao código Python.
     * @param {string} code - Código Python.
     * @returns {string} HTML com spans coloridos.
     * @private
     */
    _highlightPython(code) {
        // Escapa HTML primeiro
        let html = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Comentários
        html = html.replace(/(#.*)$/gm,
            '<span class="comment">$1</span>');

        // Strings (aspas simples e duplas)
        html = html.replace(/(&quot;.*?&quot;|'[^']*'|"[^"]*")/g,
            '<span class="string">$1</span>');

        // Strings com aspas triplas (simplificado)
        html = html.replace(/(&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;|&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;)/g,
            '<span class="string">$1</span>');

        // Números
        html = html.replace(/\b(\d+\.?\d*)\b/g,
            '<span class="number">$1</span>');

        // Palavras-chave Python
        const keywords = [
            'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while',
            'in', 'import', 'from', 'as', 'try', 'except', 'finally',
            'raise', 'with', 'pass', 'break', 'continue', 'yield',
            'lambda', 'global', 'nonlocal', 'assert', 'del',
            'True', 'False', 'None', 'and', 'or', 'not', 'is',
        ];
        const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        html = html.replace(kwPattern,
            '<span class="keyword">$1</span>');

        // Funções built-in
        const builtins = [
            'print', 'input', 'len', 'range', 'int', 'float', 'str',
            'list', 'dict', 'set', 'tuple', 'type', 'isinstance',
            'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
            'abs', 'max', 'min', 'sum', 'round', 'open', 'super',
        ];
        const builtinPattern = new RegExp(`\\b(${builtins.join('|')})(?=\\s*\\()`, 'g');
        html = html.replace(builtinPattern,
            '<span class="builtin">$1</span>');

        // Nomes de funções definidas
        html = html.replace(
            /(<span class="keyword">def<\/span>\s+)(\w+)/g,
            '$1<span class="function">$2</span>'
        );

        return html;
    }

    /**
     * Anuncia mudança de slide via TTS.
     * @private
     */
    _announceSlideChange() {
        const slide = this.getCurrentSlide();
        if (!slide) return;

        const slideNum = this.currentSlideIndex + 1;
        const total = this.currentLesson.slides.length;

        // Audiodescrição automática ao mudar de slide
        if (slide.audio_description) {
            this.tts.speak(slide.audio_description);
        } else {
            this.tts.speak(`Slide ${slideNum} de ${total}. ${slide.title}.`);
        }
    }

    /**
     * Handler de clique em card de aula.
     * @param {string} lessonId
     * @private
     */
    async _onLessonCardClick(lessonId) {
        const success = await this.loadLesson(lessonId);
        if (success) {
            // Atualiza o select
            const select = document.getElementById('lesson-select');
            if (select) select.value = lessonId;

            // Anuncia a aula carregada
            const slide = this.getCurrentSlide();
            if (slide) {
                this.tts.speak(
                    `Aula carregada: ${this.currentLesson.title}. ` +
                    `${this.currentLesson.slides.length} slides. ` +
                    `${slide.audio_description || slide.title}.`
                );
            }
        }
    }
}

// Exporta como global
window.SlideViewer = SlideViewer;
