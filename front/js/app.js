/**
 * TaskFlow - Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // URL base da API (funciona rodando direto pelo Flask ou via Live Server / Front separado)
    const API_BASE = window.location.origin && window.location.origin.includes(':5000') ? '' : 'http://127.0.0.1:5000';

    // Estado da Aplicação
    const state = {
        currentStatus: 'all',
        category: 'todas',
        priority: 'todas',
        sortBy: 'created_desc',
        searchQuery: '',
        tasks: []
    };

    // Elementos DOM
    const tasksListEl = document.getElementById('tasksList');
    const emptyStateEl = document.getElementById('emptyState');
    const createTaskForm = document.getElementById('createTaskForm');
    const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
    const formDetailsEl = document.getElementById('formDetails');
    const toggleDetailsIcon = document.getElementById('toggleDetailsIcon');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const categoryFilter = document.getElementById('categoryFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const sortFilter = document.getElementById('sortFilter');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const statusTabs = document.querySelectorAll('.tab-btn');

    // Estatísticas
    const statTotalEl = document.getElementById('statTotal');
    const statPendingEl = document.getElementById('statPending');
    const statCompletedEl = document.getElementById('statCompleted');
    const statOverdueEl = document.getElementById('statOverdue');
    const progressBarEl = document.getElementById('progressBar');
    const progressPercentEl = document.getElementById('progressPercent');

    // Modal de Edição
    const editModal = document.getElementById('editModal');
    const editTaskForm = document.getElementById('editTaskForm');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editTaskIdInput = document.getElementById('editTaskId');
    const editTaskTitleInput = document.getElementById('editTaskTitle');
    const editTaskDescInput = document.getElementById('editTaskDesc');
    const editTaskCategoryInput = document.getElementById('editTaskCategory');
    const editTaskPriorityInput = document.getElementById('editTaskPriority');
    const editTaskDueDateInput = document.getElementById('editTaskDueDate');

    // Tema
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIconSun = document.getElementById('themeIconSun');
    const themeIconMoon = document.getElementById('themeIconMoon');

    // Container de Toasts
    const toastContainer = document.getElementById('toastContainer');

    /* ==========================================================
       Inicialização e Tema
       ========================================================== */

    function initTheme() {
        const savedTheme = localStorage.getItem('taskflow_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcons(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('taskflow_theme', newTheme);
        updateThemeIcons(newTheme);
    }

    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            themeIconSun.classList.add('hidden');
            themeIconMoon.classList.remove('hidden');
        } else {
            themeIconSun.classList.remove('hidden');
            themeIconMoon.classList.add('hidden');
        }
    }

    /* ==========================================================
       Toasts (Notificações Flutuantes)
       ========================================================== */

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        } else {
            iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fadeOut');
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }

    /* ==========================================================
       Utilitários de Formatação
       ========================================================== */

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    function formatDueDate(dateStr) {
        if (!dateStr) return null;

        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        
        const dueYear = parseInt(parts[0], 10);
        const dueMonth = parseInt(parts[1], 10) - 1;
        const dueDay = parseInt(parts[2], 10);

        const dueDate = new Date(dueYear, dueMonth, dueDay);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const formattedDate = `${String(dueDay).padStart(2, '0')}/${String(dueMonth + 1).padStart(2, '0')}/${dueYear}`;

        if (diffDays < 0) {
            return {
                text: `Atrasada (${formattedDate})`,
                statusClass: 'overdue'
            };
        } else if (diffDays === 0) {
            return {
                text: 'Vence hoje',
                statusClass: 'today'
            };
        } else if (diffDays === 1) {
            return {
                text: 'Vence amanhã',
                statusClass: 'tomorrow'
            };
        } else {
            return {
                text: formattedDate,
                statusClass: 'future'
            };
        }
    }

    /* ==========================================================
       Comunicação com a API REST
       ========================================================== */

    async function loadTasks() {
        try {
            const params = new URLSearchParams();
            if (state.currentStatus !== 'all') params.append('status', state.currentStatus);
            if (state.category !== 'todas') params.append('category', state.category);
            if (state.priority !== 'todas') params.append('priority', state.priority);
            if (state.searchQuery.trim()) params.append('search', state.searchQuery.trim());
            params.append('order_by', state.sortBy);

            const res = await fetch(`${API_BASE}/api/tasks?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                state.tasks = data.data;
                renderTasks();
            } else {
                showToast(data.error || 'Erro ao carregar tarefas', 'error');
            }
        } catch (err) {
            console.error('Falha na requisição:', err);
            showToast('Erro de conexão com o servidor', 'error');
        }
    }

    async function loadStats() {
        try {
            const res = await fetch(`${API_BASE}/api/stats`);
            const data = await res.json();

            if (data.success) {
                const s = data.data;
                statTotalEl.textContent = s.total;
                statPendingEl.textContent = s.pending;
                statCompletedEl.textContent = s.completed;
                statOverdueEl.textContent = s.overdue;

                progressBarEl.style.width = `${s.completion_rate}%`;
                progressPercentEl.textContent = `${s.completion_rate}%`;
            }
        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
        }
    }

    async function loadCategories() {
        try {
            const res = await fetch(`${API_BASE}/api/categories`);
            const data = await res.json();

            if (data.success) {
                const currentVal = categoryFilter.value;
                categoryFilter.innerHTML = '<option value="todas">Todas as Categorias</option>';
                
                const dataList = document.getElementById('categoryList');
                if (dataList) dataList.innerHTML = '';

                data.data.forEach(cat => {
                    // Preenche o filtro
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    categoryFilter.appendChild(opt);

                    // Preenche a datalist de sugestões
                    if (dataList) {
                        const dlOpt = document.createElement('option');
                        dlOpt.value = cat;
                        dataList.appendChild(dlOpt);
                    }
                });

                categoryFilter.value = currentVal;
            }
        } catch (err) {
            console.error('Erro ao carregar categorias:', err);
        }
    }

    /* ==========================================================
       Renderização da Lista de Tarefas
       ========================================================== */

    function renderTasks() {
        tasksListEl.innerHTML = '';

        if (!state.tasks || state.tasks.length === 0) {
            emptyStateEl.classList.remove('hidden');
            return;
        }

        emptyStateEl.classList.add('hidden');

        state.tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card ${task.completed ? 'completed' : ''}`;
            card.dataset.id = task.id;

            const isDone = task.completed === 1;
            const priorityClass = task.priority === 'Alta' ? 'badge-priority-alta' : 
                                 task.priority === 'Baixa' ? 'badge-priority-baixa' : 
                                 'badge-priority-media';
            
            const dueInfo = formatDueDate(task.due_date);

            card.innerHTML = `
                <div class="task-checkbox-container">
                    <button class="custom-checkbox" title="${isDone ? 'Desmarcar como concluída' : 'Marcar como concluída'}" aria-label="Toggle conclusão">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                </div>

                <div class="task-body">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}

                    <div class="task-meta">
                        ${task.category ? `
                            <span class="badge badge-category">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                </svg>
                                ${escapeHtml(task.category)}
                            </span>
                        ` : ''}

                        <span class="badge ${priorityClass}">
                            ${task.priority === 'Alta' ? '● Alta' : task.priority === 'Baixa' ? '● Baixa' : '● Média'}
                        </span>

                        ${dueInfo ? `
                            <span class="badge badge-date ${dueInfo.statusClass}">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                ${escapeHtml(dueInfo.text)}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <div class="task-actions">
                    <button class="action-btn edit-btn" title="Editar Tarefa">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" title="Excluir Tarefa">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            // Event Listeners no Card
            const checkboxBtn = card.querySelector('.custom-checkbox');
            checkboxBtn.addEventListener('click', () => handleToggleTask(task.id));

            const editBtn = card.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => openEditModal(task));

            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => handleDeleteTask(task.id, task.title));

            tasksListEl.appendChild(card);
        });
    }

    /* ==========================================================
       Manipuladores de Ações (Ações CRUD)
       ========================================================== */

    // Criar Nova Tarefa
    createTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('taskTitle');
        const descInput = document.getElementById('taskDesc');
        const catInput = document.getElementById('taskCategory');
        const prioInput = document.getElementById('taskPriority');
        const dueInput = document.getElementById('taskDueDate');

        const title = titleInput.value.trim();
        if (!title) return;

        const payload = {
            title: title,
            description: descInput.value.trim(),
            category: catInput.value.trim() || 'Geral',
            priority: prioInput.value || 'Média',
            due_date: dueInput.value || null
        };

        try {
            const res = await fetch(`${API_BASE}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'success');
                titleInput.value = '';
                descInput.value = '';
                dueInput.value = '';
                
                // Recarrega lista, estatísticas e categorias
                await loadTasks();
                await loadStats();
                await loadCategories();
            } else {
                showToast(data.error || 'Erro ao criar tarefa', 'error');
            }
        } catch (err) {
            console.error('Erro na criação:', err);
            showToast('Erro ao se comunicar com o servidor', 'error');
        }
    });

    // Alternar Conclusão
    async function handleToggleTask(taskId) {
        try {
            const res = await fetch(`${API_BASE}/api/tasks/${taskId}/toggle`, { method: 'PATCH' });
            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'info');
                await loadTasks();
                await loadStats();
            } else {
                showToast(data.error || 'Erro ao alterar status', 'error');
            }
        } catch (err) {
            console.error('Erro ao alternar status:', err);
            showToast('Erro ao alternar status', 'error');
        }
    }

    // Excluir Tarefa
    async function handleDeleteTask(taskId, taskTitle) {
        if (!confirm(`Deseja realmente excluir a tarefa "${taskTitle}"?`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'success');
                await loadTasks();
                await loadStats();
                await loadCategories();
            } else {
                showToast(data.error || 'Erro ao excluir tarefa', 'error');
            }
        } catch (err) {
            console.error('Erro ao excluir:', err);
            showToast('Erro ao tentar excluir a tarefa', 'error');
        }
    }

    // Limpar Concluídas
    clearCompletedBtn.addEventListener('click', async () => {
        if (!confirm('Deseja realmente remover todas as tarefas concluídas?')) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/tasks/completed`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'success');
                await loadTasks();
                await loadStats();
                await loadCategories();
            } else {
                showToast(data.error || 'Erro ao limpar concluídas', 'error');
            }
        } catch (err) {
            console.error('Erro ao limpar:', err);
            showToast('Erro de conexão', 'error');
        }
    });

    /* ==========================================================
       Modal de Edição
       ========================================================== */

    function openEditModal(task) {
        editTaskIdInput.value = task.id;
        editTaskTitleInput.value = task.title || '';
        editTaskDescInput.value = task.description || '';
        editTaskCategoryInput.value = task.category || 'Geral';
        editTaskPriorityInput.value = task.priority || 'Média';
        editTaskDueDateInput.value = task.due_date || '';

        editModal.classList.remove('hidden');
        editTaskTitleInput.focus();
    }

    function closeEditModal() {
        editModal.classList.add('hidden');
        editTaskForm.reset();
    }

    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskId = editTaskIdInput.value;
        const payload = {
            title: editTaskTitleInput.value.trim(),
            description: editTaskDescInput.value.trim(),
            category: editTaskCategoryInput.value.trim() || 'Geral',
            priority: editTaskPriorityInput.value,
            due_date: editTaskDueDateInput.value || null
        };

        if (!payload.title) {
            showToast('O título não pode estar vazio.', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'success');
                closeEditModal();
                await loadTasks();
                await loadStats();
                await loadCategories();
            } else {
                showToast(data.error || 'Erro ao atualizar tarefa', 'error');
            }
        } catch (err) {
            console.error('Erro ao atualizar:', err);
            showToast('Erro de comunicação ao salvar', 'error');
        }
    });

    /* ==========================================================
       Eventos de Interface (Filtros, Busca e Abas)
       ========================================================== */

    // Alternar detalhes do formulário
    toggleDetailsBtn.addEventListener('click', () => {
        const isCollapsed = formDetailsEl.classList.contains('collapsed');
        if (isCollapsed) {
            formDetailsEl.classList.remove('collapsed');
            toggleDetailsIcon.style.transform = 'rotate(180deg)';
        } else {
            formDetailsEl.classList.add('collapsed');
            toggleDetailsIcon.style.transform = 'rotate(0deg)';
        }
    });

    // Abas de Status
    statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentStatus = tab.dataset.status;
            loadTasks();
        });
    });

    // Filtros Dropdown
    categoryFilter.addEventListener('change', (e) => {
        state.category = e.target.value;
        loadTasks();
    });

    priorityFilter.addEventListener('change', (e) => {
        state.priority = e.target.value;
        loadTasks();
    });

    sortFilter.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        loadTasks();
    });

    // Busca com Debounce
    let searchDebounceTimer = null;
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            state.searchQuery = val;
            loadTasks();
        }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        loadTasks();
    });

    // Botão de Tema
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Atalhos de teclado (ESC para fechar modal)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
            closeEditModal();
        }
    });

    /* ==========================================================
       Carga Inicial
       ========================================================== */
    initTheme();
    loadCategories();
    loadStats();
    loadTasks();
});
