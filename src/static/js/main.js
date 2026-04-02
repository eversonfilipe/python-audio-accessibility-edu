/**
 * ============================================================
 * Main — Inicialização e Orquestração da Aplicação
 * ============================================================
 *
 * Ponto de entrada que:
 *   1. Inicializa os módulos (TTS, SlideViewer, Accessibility)
 *   2. Carrega a lista de aulas
 *   3. Conecta eventos de botões
 *   4. Configura o seletor de aulas
 * ============================================================
 */

(function () {
    'use strict';

    // -----------------------------------------------------------------
    // Inicialização dos Módulos
    // -----------------------------------------------------------------
    const ttsController = new TTSController();
    const slideViewer = new SlideViewer(ttsController);
    const accessibilityManager = new AccessibilityManager(ttsController, slideViewer);

    // -----------------------------------------------------------------
    // Carregamento Inicial
    // -----------------------------------------------------------------

    /**
     * Carrega a lista de aulas do backend e popula a interface.
     */
    async function loadLessons() {
        try {
            const response = await fetch('/api/lessons');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success) throw new Error('Falha ao carregar aulas');

            const lessons = data.lessons || [];

            // Popula o select
            const select = document.getElementById('lesson-select');
            if (select) {
                // Remove opções antigas (exceto a primeira)
                while (select.options.length > 1) {
                    select.remove(1);
                }
                lessons.forEach(lesson => {
                    const option = document.createElement('option');
                    option.value = lesson.id;
                    option.textContent = `${lesson.title} (${lesson.slide_count} slides)`;
                    select.appendChild(option);
                });
            }

            // Renderiza cards na tela de boas-vindas
            slideViewer.renderLessonCards(lessons);

            console.info(`Main: ${lessons.length} aula(s) carregada(s).`);

        } catch (error) {
            console.error('Main: Erro ao carregar aulas:', error);
            accessibilityManager.alert('Erro ao carregar lista de aulas. Recarregue a página.');
        }
    }

    // -----------------------------------------------------------------
    // Event Listeners — Botões
    // -----------------------------------------------------------------

    // Seletor de aula
    const lessonSelect = document.getElementById('lesson-select');
    if (lessonSelect) {
        lessonSelect.addEventListener('change', async (e) => {
            const lessonId = e.target.value;
            if (!lessonId) {
                slideViewer.showWelcome();
                return;
            }

            ttsController.stop();
            const success = await slideViewer.loadLesson(lessonId);
            if (success) {
                const slide = slideViewer.getCurrentSlide();
                if (slide) {
                    ttsController.speak(
                        `Aula carregada: ${slideViewer.currentLesson.title}. ` +
                        `${slideViewer.currentLesson.slides.length} slides. ` +
                        `${slide.audio_description || slide.title}.`
                    );
                }
                accessibilityManager.announce(`Aula carregada: ${slideViewer.currentLesson.title}`);
            } else {
                accessibilityManager.alert('Erro ao carregar a aula selecionada.');
            }
        });
    }

    // Botão Play
    const btnPlay = document.getElementById('btn-tts-play');
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (ttsController.state === 'paused') {
                ttsController.resume();
            } else {
                const texts = slideViewer.getFullSlideText();
                if (texts.length > 0) {
                    ttsController.speakQueue(texts);
                }
            }
        });
    }

    // Botão Pause
    const btnPause = document.getElementById('btn-tts-pause');
    if (btnPause) {
        btnPause.addEventListener('click', () => {
            ttsController.pause();
        });
    }

    // Botão Stop
    const btnStop = document.getElementById('btn-tts-stop');
    if (btnStop) {
        btnStop.addEventListener('click', () => {
            ttsController.stop();
            accessibilityManager.announce('Narração parada.');
        });
    }

    // Botão Velocidade -
    const btnSpeedDown = document.getElementById('btn-speed-down');
    if (btnSpeedDown) {
        btnSpeedDown.addEventListener('click', () => {
            accessibilityManager.decreaseTTSRate();
        });
    }

    // Botão Velocidade +
    const btnSpeedUp = document.getElementById('btn-speed-up');
    if (btnSpeedUp) {
        btnSpeedUp.addEventListener('click', () => {
            accessibilityManager.increaseTTSRate();
        });
    }

    // Botão Fonte -
    const btnFontDown = document.getElementById('btn-font-down');
    if (btnFontDown) {
        btnFontDown.addEventListener('click', () => {
            accessibilityManager.decreaseFontSize();
        });
    }

    // Botão Fonte +
    const btnFontUp = document.getElementById('btn-font-up');
    if (btnFontUp) {
        btnFontUp.addEventListener('click', () => {
            accessibilityManager.increaseFontSize();
        });
    }

    // Botão Slide Anterior
    const btnPrev = document.getElementById('btn-prev-slide');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            slideViewer.prevSlide();
        });
    }

    // Botão Próximo Slide
    const btnNext = document.getElementById('btn-next-slide');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            slideViewer.nextSlide();
        });
    }

    // Botão Ler Código
    const btnReadCode = document.getElementById('btn-read-code');
    if (btnReadCode) {
        btnReadCode.addEventListener('click', () => {
            ttsController.stop();
            const codeText = slideViewer.getCodeText();
            if (codeText) {
                ttsController.speak(codeText);
                accessibilityManager.announce('Lendo código.');
            }
        });
    }

    // Botão Ler Slide Inteiro
    const btnReadAll = document.getElementById('btn-read-all');
    if (btnReadAll) {
        btnReadAll.addEventListener('click', () => {
            ttsController.stop();
            const texts = slideViewer.getFullSlideText();
            if (texts.length > 0) {
                ttsController.speakQueue(texts);
                accessibilityManager.announce('Lendo slide inteiro.');
            }
        });
    }

    // =================================================================
    // Duelo de Lógica & Integração Auxiliar de Lógica Básica (IA)
    // =================================================================
    const btnOpenQa = document.getElementById('btn-open-qa');
    const btnQaBack = document.getElementById('btn-qa-back');
    const qaContainer = document.getElementById('qa-container');
    const slideContainer = document.getElementById('slide-container');

    if (btnOpenQa) {
        btnOpenQa.addEventListener('click', () => {
            slideContainer.style.display = 'none';
            qaContainer.style.display = 'block';
            accessibilityManager.announce('Tela aberta: Duelo de Lógica. Crie passo a passo o que a IA deve gerar em código.');
            ttsController.speak("Chegou o momento prático! Instrua a inteligência artificial utilizando lógica passo a passo em português.");
            renderQAMenu();
        });
    }

    if (btnQaBack) {
        btnQaBack.addEventListener('click', () => {
            qaContainer.style.display = 'none';
            slideContainer.style.display = 'block';
            accessibilityManager.announce('Retornando para os slides teóricos da aula.');
        });
    }

    window.renderQAMenu = function() {
        const questions = slideViewer.currentLesson?.questions || [];
        const qaList = document.getElementById('qa-list');
        qaList.innerHTML = '';

        if(questions.length === 0){
            qaList.innerHTML = '<p class="welcome-screen__subtitle">Nenhum desafio está anexado para esta aula.</p>';
            return;
        }

        questions.forEach((q, index) => {
            const num = index + 1;
            qaList.innerHTML += `
                <div class="slide-card" style="margin-top: 2rem;">
                    <h3 style="font-size: 1.5rem;">Desafio ${num}: ${q.text}</h3>
                    <label for="logic-input-${q.id}" style="display:block; margin-top: 1.5rem; font-weight: bold; font-size: 1.2rem;">
                        Escreva seu Pensamento Lógico para a Máquina:
                    </label>
                    <textarea id="logic-input-${q.id}" class="input-accessible" rows="3" 
                        placeholder="Ex: Crie uma caixa chamada 'idade', faça a máquina perguntar a idade do usuário e exibir o valor na tela."
                        style="width:100%; margin-top:0.5rem; border: 2px solid var(--primary); padding:1rem; font-size: 1.25rem;" 
                        aria-label="Caixa de texto para instrução. Descreva cada instrução simples para a IA gerar o código."></textarea>
                    
                    <button type="button" class="btn btn--primary" style="margin-top:1rem; margin-right:0.5rem;" onclick="window.startDictation('${q.id}')" aria-label="Ditar a lógica por voz para IA no Desafio ${num}">
                        🎤 Falar (Gravar Voz)
                    </button>
                    <button type="button" class="btn btn--accent" style="margin-top:1rem;" onclick="invokeIA('${q.id}', '${q.text.replace(/'/g, "\\'")}')" aria-label="Acionar IA para a criação do Desafio ${num}">
                        🪄 Materializar Código via IA
                    </button>
                    
                    <div id="loading-ai-${q.id}" style="display: none; margin-top: 1.5rem; justify-content: flex-start; align-items: center; background: var(--bg-primary); padding: 1rem; border-radius: 6px; border-left: 4px solid #FFD700;">
                        <span style="font-size: 2rem; margin-right: 1rem; animation: pulse 1s infinite;">⏳</span>
                        <span style="font-size: 1.2rem; font-weight: bold; color: var(--accent);">A Máquina (TinyLlama) está inferindo o seu código. Aguarde...</span>
                    </div>
                    
                    <div id="ai-result-${q.id}" class="code-block" style="display: none; margin-top: 2rem; border-color: var(--accent);">
                        <div class="code-block__header">
                            <span class="code-block__label">💻 Python Gerado pela IA</span>
                            <button type="button" class="btn btn--secondary" aria-label="Ler o código gerado em voz alta" onclick="ttsController.speak(document.getElementById('ai-code-${q.id}').innerText)">🔊 Ler Execução Códificada</button>
                        </div>
                        <pre tabindex="0"><code id="ai-code-${q.id}"></code></pre>
                        <div style="margin-top:1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);" aria-live="polite">
                            <strong>Explicação Lógica da Máquina:</strong> <span id="ai-exp-${q.id}" style="font-size: 1.1rem;"></span>
                            <button type="button" class="btn btn--secondary btn--icon" style="margin-left:auto;" onclick="ttsController.speak(document.getElementById('ai-exp-${q.id}').innerText)">🔊</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    window.invokeIA = async function(qId, contextText) {
        const instruction = document.getElementById(`logic-input-${qId}`).value;
        const resultBlock = document.getElementById(`ai-result-${qId}`);
        const codeSpan = document.getElementById(`ai-code-${qId}`);
        const expSpan = document.getElementById(`ai-exp-${qId}`);

        if(!instruction.trim()) {
            accessibilityManager.alert("Por favor, digite ou dite sua lógica antes de chamar a inteligência artificial.");
            return;
        }

        const loadingBlock = document.getElementById(`loading-ai-${qId}`);
        if(loadingBlock) loadingBlock.style.display = 'flex';
        resultBlock.style.display = 'none';

        accessibilityManager.announce("Conectando Lógica Básica ao Cérebro Neural. Aguardando a Geração...");
        
        try {
            const resp = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ instruction: instruction, context: contextText })
            });
            const data = await resp.json();
            
            if(loadingBlock) loadingBlock.style.display = 'none';
            
            if (data.success) {
                resultBlock.style.display = 'block';
                codeSpan.innerText = data.code;
                expSpan.innerText = data.explanation;
                accessibilityManager.announce("Código mágico criado. Acompanhando Feedback de Geração: " + data.explanation);
                window.ttsController?.speak("A materialização lógica foi bem-sucedida. O resultado em Programação gerado é: " + data.code);
            } else {
                accessibilityManager.alert("Erro ao decodificar processamento da IA: " + data.error);
            }
        } catch(e) {
            if(loadingBlock) loadingBlock.style.display = 'none';
            accessibilityManager.alert("Falha de Comunicação em Tempo Real com a Nuvem da IA.");
        }
    }

    // Variável para evitar gravações concorrentes
    window.isDictationRunning = false;

    // Função de Ditado (Reconhecimento de Voz usando Web Speech API)
    window.startDictation = function(qId) {
        if (window.isDictationRunning) {
            accessibilityManager.announce("Gravação de áudio já está em andamento.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            const msg = "Seu navegador não tem suporte a microfone. Use Google Chrome e autorize as permissões.";
            accessibilityManager.alert(msg);
            if (window.ttsController) window.ttsController.speak(msg);
            return;
        }

        window.isDictationRunning = true;
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = function() {
            const overlay = document.getElementById('recording-overlay');
            if (overlay) overlay.style.display = 'flex';
            
            const msg = "Microfone aberto. Pode falar.";
            accessibilityManager.announce(msg);
            if (window.ttsController) {
                window.ttsController.stop();
            }
        };
        
        recognition.onerror = function(event) {
            window.isDictationRunning = false;
            const overlay = document.getElementById('recording-overlay');
            if (overlay) overlay.style.display = 'none';

            if (event.error !== 'no-speech') {
                const msg = "Erro na captura de voz: " + event.error;
                accessibilityManager.alert(msg);
            } else {
                accessibilityManager.announce("Nenhuma voz detectada.");
            }
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const textArea = document.getElementById(`logic-input-${qId}`);
            if (textArea) {
                textArea.value = textArea.value + (textArea.value.endsWith(' ') || textArea.value.length === 0 ? '' : ' ') + transcript;
                const msg = "Voz ouvida: " + transcript;
                accessibilityManager.announce(msg);
                
                // Envio automático após 2 segundos para dar tempo à aluna de ouvir a captura
                setTimeout(() => {
                    if (window.invokeIA) {
                        window.invokeIA(qId, "Contexto de Desafio.");
                    }
                }, 1500);
            }
        };
        
        recognition.onspeechend = function() {
            accessibilityManager.announce("Processando fala...");
        };
        
        recognition.onend = function() {
            window.isDictationRunning = false;
            const overlay = document.getElementById('recording-overlay');
            if (overlay) overlay.style.display = 'none';
        };
        
        try {
            recognition.start();
        } catch (e) {
            window.isDictationRunning = false;
            console.error("Erro ao iniciar reconhecimento: ", e);
        }
    }

    // Função para Ler Integralmente a Tela do Duelo
    window.readDueloPage = function() {
        const qaContainer = document.getElementById('qa-container');
        if (!qaContainer || qaContainer.style.display === 'none') {
            accessibilityManager.announce("A seção de duelo não está ativa na tela.");
            return;
        }

        const cards = qaContainer.querySelectorAll('.slide-card');
        const textToRead = [];
        
        textToRead.push("Duelo de Lógica. Lendo os Desafios visíveis na tela.");
        
        cards.forEach((card, index) => {
            const title = card.querySelector('h3');
            if (title) textToRead.push(title.innerText);
            
            const textarea = card.querySelector('textarea');
            if (textarea && textarea.value.trim() !== "") {
                textToRead.push("Sua resposta capturada até o momento é: " + textarea.value);
            } else {
                textToRead.push("Você ainda não ditou ou digitou nenhuma resposta para este desafio.");
            }
            
            const aiCode = card.querySelector('code');
            if (aiCode && card.querySelector('.code-block').style.display !== 'none') {
                textToRead.push("A resposta codificada pela IA é: " + aiCode.innerText);
            }
        });
        
        if (textToRead.length > 0) {
            window.ttsController.speakQueue(textToRead);
        }
    }

    // -----------------------------------------------------------------
    // Inicialização
    // -----------------------------------------------------------------
    loadLessons();

    // Mensagem de boas-vindas no console
    console.info(
        '%c📚 Sistema de Acessibilidade Educacional — Trilha TEC',
        'color: #FFD700; font-size: 14px; font-weight: bold;'
    );
    console.info(
        '%cPressione H para ouvir os atalhos de teclado.',
        'color: #00E5FF; font-size: 12px;'
    );

})();
