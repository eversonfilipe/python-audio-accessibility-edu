/**
 * ============================================================
 * Tutor Panel — Lógica CRUD para Gerenciamento de Aulas
 * ============================================================
 *
 * Funcionalidades:
 *   - Listar aulas existentes
 *   - Criar aula a partir de template
 *   - Editar aula (formulário visual + JSON direto)
 *   - Excluir aula com confirmação
 *   - Notificações toast
 * ============================================================
 */

(function () {
    'use strict';

    // -----------------------------------------------------------------
    // Estado da Aplicação
    // -----------------------------------------------------------------
    let currentLessonId = null;
    let currentLessonData = null;

    // -----------------------------------------------------------------
    // Cache DOM
    // -----------------------------------------------------------------
    const DOM = {
        lessonsList: document.getElementById('lessons-list'),
        tutorStatus: document.getElementById('tutor-status'),
        // Botões
        btnNewLesson: document.getElementById('btn-new-lesson'),
        btnReload: document.getElementById('btn-reload-lessons'),
        btnSave: document.getElementById('btn-save-lesson'),
        btnAddSlide: document.getElementById('btn-add-slide'),
        btnCloseEditor: document.getElementById('btn-close-editor'),
        btnToggleJson: document.getElementById('btn-toggle-json'),
        btnApplyJson: document.getElementById('btn-apply-json'),
        btnFormatJson: document.getElementById('btn-format-json'),
        // Modal Criar
        modalCreate: document.getElementById('modal-create'),
        createLessonId: document.getElementById('create-lesson-id'),
        createTemplateType: document.getElementById('create-template-type'),
        btnConfirmCreate: document.getElementById('btn-confirm-create'),
        btnCancelCreate: document.getElementById('btn-cancel-create'),
        // Modal Excluir
        modalDelete: document.getElementById('modal-delete'),
        modalDeleteMessage: document.getElementById('modal-delete-message'),
        btnConfirmDelete: document.getElementById('btn-confirm-delete'),
        btnCancelDelete: document.getElementById('btn-cancel-delete'),
        // Editor
        editorSection: document.getElementById('editor-section'),
        editorLessonName: document.getElementById('editor-lesson-name'),
        editorLessonTitle: document.getElementById('editor-lesson-title'),
        editorLessonSubject: document.getElementById('editor-lesson-subject'),
        editorSlides: document.getElementById('editor-slides'),
        editorWarnings: document.getElementById('editor-warnings'),
        // JSON Editor
        jsonEditorWrapper: document.getElementById('json-editor-wrapper'),
        jsonEditor: document.getElementById('json-editor'),
        jsonStatus: document.getElementById('json-status'),
    };

    // -----------------------------------------------------------------
    // Toast / Notifications
    // -----------------------------------------------------------------
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3200);
    }

    function setStatus(text) {
        if (DOM.tutorStatus) {
            DOM.tutorStatus.textContent = text;
            setTimeout(() => { DOM.tutorStatus.textContent = ''; }, 4000);
        }
    }

    // -----------------------------------------------------------------
    // API Helpers
    // -----------------------------------------------------------------
    async function apiGet(url) {
        const res = await fetch(url);
        return res.json();
    }

    async function apiPost(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return { status: res.status, data: await res.json() };
    }

    async function apiPut(url, body) {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return { status: res.status, data: await res.json() };
    }

    async function apiDelete(url) {
        const res = await fetch(url, { method: 'DELETE' });
        return { status: res.status, data: await res.json() };
    }

    // -----------------------------------------------------------------
    // Renderização — Lista de Aulas
    // -----------------------------------------------------------------
    async function loadLessonsList() {
        try {
            const data = await apiGet('/api/lessons');
            renderLessonsList(data.lessons || []);
        } catch (error) {
            console.error('Erro ao carregar aulas:', error);
            showToast('Erro ao carregar lista de aulas.', 'error');
        }
    }

    function renderLessonsList(lessons) {
        if (!DOM.lessonsList) return;

        if (lessons.length === 0) {
            DOM.lessonsList.innerHTML = `
                <div class="tutor-empty">
                    <span class="tutor-empty__icon" aria-hidden="true">📭</span>
                    Nenhuma aula cadastrada. Clique em "Nova Aula" para começar.
                </div>
            `;
            return;
        }

        const subjectIcons = {
            python: '🐍',
            html: '🌐',
            css: '🎨',
            javascript: '⚡',
            js: '⚡',
            geral: '📚',
        };

        DOM.lessonsList.innerHTML = lessons.map(lesson => {
            const icon = subjectIcons[lesson.subject] || '📚';
            return `
                <div class="tutor-lesson-item" role="listitem" data-lesson-id="${lesson.id}">
                    <span class="tutor-lesson-item__icon" aria-hidden="true">${icon}</span>
                    <div class="tutor-lesson-item__info">
                        <span class="tutor-lesson-item__title">${escapeHtml(lesson.title)}</span>
                        <span class="tutor-lesson-item__meta">
                            ID: ${lesson.id} · ${lesson.slide_count} slide(s) · ${lesson.subject}
                        </span>
                    </div>
                    <div class="tutor-lesson-item__actions">
                        <button class="btn btn--primary" onclick="window._tutorEditLesson('${lesson.id}')"
                                aria-label="Editar aula ${escapeHtml(lesson.title)}">
                            ✏️ Editar
                        </button>
                        <button class="btn btn--accent" onclick="window._tutorDeleteLesson('${lesson.id}', '${escapeHtml(lesson.title)}')"
                                aria-label="Excluir aula ${escapeHtml(lesson.title)}">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // -----------------------------------------------------------------
    // CRUD — Criar Aula
    // -----------------------------------------------------------------
    function openCreateModal() {
        DOM.createLessonId.value = '';
        DOM.createTemplateType.value = 'python';
        DOM.modalCreate.style.display = 'flex';
        DOM.createLessonId.focus();
    }

    function closeCreateModal() {
        DOM.modalCreate.style.display = 'none';
    }

    async function confirmCreate() {
        const lessonId = DOM.createLessonId.value.trim();
        const templateType = DOM.createTemplateType.value;

        if (!lessonId) {
            showToast('Informe o ID da aula.', 'error');
            DOM.createLessonId.focus();
            return;
        }

        try {
            const { status, data } = await apiPost('/api/lessons', {
                id: lessonId,
                template: templateType,
            });

            if (data.success) {
                showToast(`Aula "${lessonId}" criada com sucesso!`, 'success');
                closeCreateModal();
                await loadLessonsList();
                // Abre no editor automaticamente
                const sanitizedId = data.lesson?._id || lessonId;
                openEditor(sanitizedId, data.lesson);
            } else {
                showToast(data.error || 'Erro ao criar aula.', 'error');
            }
        } catch (error) {
            console.error('Erro ao criar aula:', error);
            showToast('Erro de conexão ao criar aula.', 'error');
        }
    }

    // -----------------------------------------------------------------
    // CRUD — Editar Aula
    // -----------------------------------------------------------------
    async function editLesson(lessonId) {
        try {
            const data = await apiGet(`/api/lessons/${lessonId}`);
            if (data.success && data.lesson) {
                openEditor(lessonId, data.lesson);
            } else {
                showToast('Aula não encontrada.', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar aula:', error);
            showToast('Erro ao carregar aula para edição.', 'error');
        }
    }

    function openEditor(lessonId, lessonData) {
        currentLessonId = lessonId;
        currentLessonData = JSON.parse(JSON.stringify(lessonData)); // deep clone

        // Remove campos internos para o editor
        delete currentLessonData._id;
        delete currentLessonData._filename;

        DOM.editorLessonName.textContent = lessonId;
        DOM.editorLessonTitle.value = currentLessonData.title || '';
        DOM.editorLessonSubject.value = currentLessonData.subject || 'geral';

        renderSlideEditors();
        updateJsonEditor();

        renderEditorQuestions(currentLessonData.questions || []);

        DOM.editorSection.style.display = 'block';
        DOM.editorWarnings.style.display = 'none';
        DOM.editorSection.scrollIntoView({ behavior: 'smooth' });

        setStatus(`Editando: ${lessonId}`);
    }

    function closeEditor() {
        currentLessonId = null;
        currentLessonData = null;
        DOM.editorSection.style.display = 'none';
        DOM.jsonEditorWrapper.style.display = 'none';
    }

    function renderSlideEditors() {
        if (!DOM.editorSlides) return;

        const slides = currentLessonData.slides || [];

        if (slides.length === 0) {
            DOM.editorSlides.innerHTML = `
                <div class="tutor-empty">
                    Nenhum slide. Clique em "Novo Slide" para adicionar.
                </div>`;
            return;
        }

        DOM.editorSlides.innerHTML = slides.map((slide, i) => `
            <div class="slide-editor-card" data-slide-index="${i}">
                <div class="slide-editor-card__header">
                    <span class="slide-editor-card__number">📄 Slide ${i + 1}</span>
                    <div class="slide-editor-card__actions">
                        ${i > 0 ? `<button class="btn btn--secondary" onclick="window._tutorMoveSlide(${i}, -1)" aria-label="Mover slide ${i + 1} para cima">⬆️</button>` : ''}
                        ${i < slides.length - 1 ? `<button class="btn btn--secondary" onclick="window._tutorMoveSlide(${i}, 1)" aria-label="Mover slide ${i + 1} para baixo">⬇️</button>` : ''}
                        <button class="btn btn--accent" onclick="window._tutorRemoveSlide(${i})" aria-label="Remover slide ${i + 1}">🗑️</button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="slide-title-${i}">Título:</label>
                    <input type="text" id="slide-title-${i}" class="input-accessible"
                           value="${escapeAttr(slide.title || '')}"
                           onchange="window._tutorUpdateSlideField(${i}, 'title', this.value)">
                </div>

                <div class="form-group">
                    <label for="slide-content-${i}">Conteúdo:</label>
                    <textarea id="slide-content-${i}" rows="4"
                              onchange="window._tutorUpdateSlideField(${i}, 'content', this.value)">${escapeHtml(slide.content || '')}</textarea>
                </div>

                <div class="form-group">
                    <label for="slide-code-${i}">Código (opcional):</label>
                    <textarea id="slide-code-${i}" rows="4" class="code-textarea"
                              onchange="window._tutorUpdateSlideField(${i}, 'code', this.value || null)">${escapeHtml(slide.code || '')}</textarea>
                </div>

                <div class="form-group">
                    <label for="slide-code-desc-${i}">Descrição do Código:</label>
                    <textarea id="slide-code-desc-${i}" rows="2"
                              onchange="window._tutorUpdateSlideField(${i}, 'code_description', this.value || null)">${escapeHtml(slide.code_description || '')}</textarea>
                </div>

                <div class="form-group">
                    <label for="slide-audio-desc-${i}">Audiodescrição (TTS):</label>
                    <textarea id="slide-audio-desc-${i}" rows="2"
                              onchange="window._tutorUpdateSlideField(${i}, 'audio_description', this.value || null)">${escapeHtml(slide.audio_description || '')}</textarea>
                </div>

                <div class="form-group">
                    <label for="slide-notes-${i}">Notas do Tutor (não exibidas):</label>
                    <textarea id="slide-notes-${i}" rows="2"
                              onchange="window._tutorUpdateSlideField(${i}, 'notes', this.value || null)">${escapeHtml(slide.notes || '')}</textarea>
                </div>
            </div>
        `).join('');
    }

    // -----------------------------------------------------------------
    // Slide Operations
    // -----------------------------------------------------------------
    function updateSlideField(slideIndex, field, value) {
        if (!currentLessonData || !currentLessonData.slides[slideIndex]) return;
        currentLessonData.slides[slideIndex][field] = value;
        updateJsonEditor();
    }

    function addSlide() {
        if (!currentLessonData) return;

        const slides = currentLessonData.slides || [];
        const newId = slides.length > 0
            ? Math.max(...slides.map(s => s.id || 0)) + 1
            : 1;

        slides.push({
            id: newId,
            title: 'Novo Slide',
            content: 'Conteúdo do slide.',
            code: null,
            code_description: null,
            audio_description: `Slide ${newId}. Título: Novo Slide.`,
            image_alt: null,
            notes: '',
        });

        currentLessonData.slides = slides;
        renderSlideEditors();
        updateJsonEditor();
        showToast(`Slide ${newId} adicionado.`, 'info');

        // Scroll para o novo slide
        const lastCard = DOM.editorSlides.lastElementChild;
        if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth' });
    }

    function removeSlide(index) {
        if (!currentLessonData || !currentLessonData.slides) return;
        if (currentLessonData.slides.length <= 1) {
            showToast('A aula deve ter pelo menos 1 slide.', 'error');
            return;
        }

        currentLessonData.slides.splice(index, 1);
        // Re-numera IDs
        currentLessonData.slides.forEach((s, i) => { s.id = i + 1; });
        renderSlideEditors();
        updateJsonEditor();
        showToast('Slide removido.', 'info');
    }

    function moveSlide(index, direction) {
        if (!currentLessonData || !currentLessonData.slides) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= currentLessonData.slides.length) return;

        const slides = currentLessonData.slides;
        [slides[index], slides[newIndex]] = [slides[newIndex], slides[index]];
        // Re-numera IDs
        slides.forEach((s, i) => { s.id = i + 1; });
        renderSlideEditors();
        updateJsonEditor();
    }

    // -----------------------------------------------------------------
    // CRUD — Salvar Aula
    // -----------------------------------------------------------------
    async function saveLesson() {
        if (!currentLessonId || !currentLessonData) return;

        // Coleta metadados do formulário
        currentLessonData.title = DOM.editorLessonTitle.value.trim() || 'Sem título';
        currentLessonData.subject = DOM.editorLessonSubject.value;

        const questionsData = getQuestionsData();
        currentLessonData.questions = questionsData;

        try {
            const { status, data } = await apiPut(
                `/api/lessons/${currentLessonId}`,
                currentLessonData
            );

            if (data.success) {
                showToast('Aula salva com sucesso!', 'success');
                setStatus('Salvo ✅');

                // Mostra avisos se houver
                if (data.warnings && data.warnings.length > 0) {
                    DOM.editorWarnings.style.display = 'block';
                    DOM.editorWarnings.innerHTML = `
                        <strong>⚠️ Avisos de validação:</strong>
                        <ul>${data.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
                    `;
                } else {
                    DOM.editorWarnings.style.display = 'none';
                }

                await loadLessonsList();
            } else {
                showToast(data.error || 'Erro ao salvar aula.', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('Erro de conexão ao salvar.', 'error');
        }
    }

    // -----------------------------------------------------------------
    // CRUD — Excluir Aula
    // -----------------------------------------------------------------
    let pendingDeleteId = null;

    function deleteLesson(lessonId, lessonTitle) {
        pendingDeleteId = lessonId;
        DOM.modalDeleteMessage.textContent =
            `Tem certeza que deseja excluir a aula "${lessonTitle}" (${lessonId})? Esta ação não pode ser desfeita.`;
        DOM.modalDelete.style.display = 'flex';
        DOM.btnConfirmDelete.focus();
    }

    function closeDeleteModal() {
        DOM.modalDelete.style.display = 'none';
        pendingDeleteId = null;
    }

    async function confirmDelete() {
        if (!pendingDeleteId) return;

        try {
            const { status, data } = await apiDelete(`/api/lessons/${pendingDeleteId}`);
            if (data.success) {
                showToast('Aula excluída com sucesso.', 'success');

                // Fecha editor se estava editando essa aula
                if (currentLessonId === pendingDeleteId) {
                    closeEditor();
                }

                closeDeleteModal();
                await loadLessonsList();
            } else {
                showToast(data.error || 'Erro ao excluir.', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir:', error);
            showToast('Erro de conexão ao excluir.', 'error');
        }
    }

    // -----------------------------------------------------------------
    // JSON Editor
    // -----------------------------------------------------------------
    function toggleJsonEditor() {
        const visible = DOM.jsonEditorWrapper.style.display !== 'none';
        DOM.jsonEditorWrapper.style.display = visible ? 'none' : 'block';
        if (!visible) {
            updateJsonEditor();
            DOM.jsonEditor.focus();
        }
    }

    function updateJsonEditor() {
        if (!currentLessonData || !DOM.jsonEditor) return;
        DOM.jsonEditor.value = JSON.stringify(currentLessonData, null, 4);
        validateJson();
    }

    function formatJson() {
        try {
            const parsed = JSON.parse(DOM.jsonEditor.value);
            DOM.jsonEditor.value = JSON.stringify(parsed, null, 4);
            setJsonStatus('JSON formatado ✅', 'valid');
        } catch (e) {
            setJsonStatus(`Erro de JSON: ${e.message}`, 'error');
        }
    }

    function applyJson() {
        try {
            const parsed = JSON.parse(DOM.jsonEditor.value);

            if (!parsed.title || !parsed.slides) {
                setJsonStatus('JSON deve ter "title" e "slides".', 'error');
                return;
            }

            currentLessonData = parsed;
            DOM.editorLessonTitle.value = parsed.title || '';
            DOM.editorLessonSubject.value = parsed.subject || 'geral';
            renderSlideEditors();
            setJsonStatus('JSON aplicado ✅', 'valid');
            showToast('JSON aplicado ao editor. Lembre-se de salvar!', 'info');
        } catch (e) {
            setJsonStatus(`Erro: ${e.message}`, 'error');
            showToast('JSON inválido. Corrija o erro antes de aplicar.', 'error');
        }
    }

    function validateJson() {
        try {
            JSON.parse(DOM.jsonEditor.value);
            setJsonStatus('✅ JSON válido', 'valid');
        } catch (e) {
            setJsonStatus(`❌ ${e.message}`, 'error');
        }
    }

    function setJsonStatus(text, type) {
        if (!DOM.jsonStatus) return;
        DOM.jsonStatus.textContent = text;
        DOM.jsonStatus.className = `json-status json-status--${type}`;
    }

    // -----------------------------------------------------------------
    // Utilitários
    // -----------------------------------------------------------------
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // -----------------------------------------------------------------
    // Event Listeners
    // -----------------------------------------------------------------

    // Toolbar
    DOM.btnNewLesson?.addEventListener('click', openCreateModal);
    DOM.btnReload?.addEventListener('click', async () => {
        try {
            const { data } = await apiPost('/api/lessons/reload');
            showToast(data.message || 'Aulas recarregadas.', 'success');
            await loadLessonsList();
        } catch (e) {
            showToast('Erro ao recarregar.', 'error');
        }
    });

    // Modal Criar
    DOM.btnConfirmCreate?.addEventListener('click', confirmCreate);
    DOM.btnCancelCreate?.addEventListener('click', closeCreateModal);

    // Enter no campo ID para criar
    DOM.createLessonId?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmCreate();
    });

    // Modal Excluir
    DOM.btnConfirmDelete?.addEventListener('click', confirmDelete);
    DOM.btnCancelDelete?.addEventListener('click', closeDeleteModal);

    // Editor
    DOM.btnSave?.addEventListener('click', saveLesson);
    DOM.btnAddSlide?.addEventListener('click', addSlide);
    DOM.btnCloseEditor?.addEventListener('click', closeEditor);

    // JSON Editor
    DOM.btnToggleJson?.addEventListener('click', toggleJsonEditor);
    DOM.btnApplyJson?.addEventListener('click', applyJson);
    DOM.btnFormatJson?.addEventListener('click', formatJson);
    DOM.jsonEditor?.addEventListener('input', validateJson);

    // Tab no JSON editor (permite indentação)
    DOM.jsonEditor?.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = e.target;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + 4;
        }
    });

    // Fechar modais com Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOM.modalCreate.style.display !== 'none') closeCreateModal();
            if (DOM.modalDelete.style.display !== 'none') closeDeleteModal();
        }
    });

    // -----------------------------------------------------------------
    // API Global (para onclick inline dos botões dinâmicos)
    // -----------------------------------------------------------------
    window._tutorEditLesson = editLesson;
    window._tutorDeleteLesson = deleteLesson;
    window._tutorUpdateSlideField = updateSlideField;
    window._tutorRemoveSlide = removeSlide;
    window._tutorMoveSlide = moveSlide;

    // -----------------------------------------------------------------
    // Inicialização
    // -----------------------------------------------------------------
    loadLessonsList();

    // ================================================================
    // SISTEMA DUELO - GERENCIAMENTO DE PERGUNTAS 
    // ================================================================
    let currentQuestions = [];

    function renderEditorQuestions(questions = []) {
        currentQuestions = questions;
        const container = document.getElementById('editor-questions');
        if (!container) return;
        
        container.innerHTML = '';
        
        currentQuestions.forEach((q, i) => {
            container.innerHTML += `
                <div class="slide-editor-card" 
                     style="background: var(--bg-primary); margin-top: 1.5rem; padding: 1.5rem; border:2px solid var(--accent); border-radius: 8px;">
                    <div style="display:flex; justify-content: space-between; align-items:center;">
                        <strong style="font-size: 1.2rem;">Atividade ${i+1}</strong>
                        <button class="btn btn--secondary" onclick="window._tutorRemoveQuestion(${i})">🗑 Remover</button>
                    </div>
                    <div class="form-group" style="margin-top:1rem;">
                        <label>Enunciado Textual (Contexto do Desafio P/ Alunas e Máquina):</label>
                        <textarea class="input-accessible q-text-input" rows="2" style="width: 100%; border-color: var(--secondary);">${escapeHtml(q.text || '')}</textarea>
                    </div>
                </div>
            `;
        });
    }

    const btnAddQuestion = document.getElementById('btn-add-question');
    if(btnAddQuestion){
        btnAddQuestion.addEventListener('click', () => {
            currentQuestions = getQuestionsData();
            currentQuestions.push({ id: 'questao_' + Date.now(), text: '' });
            renderEditorQuestions(currentQuestions);
        });
    }

    function getQuestionsData() {
        const container = document.getElementById('editor-questions');
        if (!container) return [];
        
        const cards = container.querySelectorAll('.slide-editor-card');
        const data = [];
        cards.forEach((card, i) => {
            const textArea = card.querySelector('.q-text-input');
            data.push({
                id: currentQuestions[i]?.id || ('questao_' + Date.now()),
                text: textArea.value.trim()
            });
        });
        return data;
    }

    window._tutorRemoveQuestion = function(index) {
        if(confirm('Tem certeza que deseja apagar essa atividade de pensamento?')) {
            currentQuestions = getQuestionsData();
            currentQuestions.splice(index, 1);
            renderEditorQuestions(currentQuestions);
        }
    }

    console.info(
        '%c⚙️ Painel do Tutor — Trilha TEC',
        'color: #FFD700; font-size: 14px; font-weight: bold;'
    );

})();
