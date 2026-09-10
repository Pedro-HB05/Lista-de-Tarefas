document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';
    const $ = (id) => document.getElementById(id);
    const state = { status: 'all', category: 'todas', priority: 'todas', due: 'all', sort: 'created_desc', search: '', tasks: [], stats: {}, view: 'all' };
    let searchTimer;
    let confirmResolver;

    const viewCopy = {
        all: ['Visão geral', 'Acompanhe o que importa e mantenha o ritmo.'],
        today: ['Tarefas de hoje', 'Seu foco para hoje, sem distrações.'],
        overdue: ['Tarefas atrasadas', 'Resolva primeiro o que já passou do prazo.'],
        high: ['Alta prioridade', 'As tarefas que mais precisam da sua atenção.'],
        completed: ['Tarefas concluídas', 'Revise tudo o que você já realizou.'],
        pending: ['Tarefas pendentes', 'Organize os próximos passos do seu dia.']
    };

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }

    async function api(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, options);
        let payload;
        try { payload = await response.json(); } catch { payload = { success: false, error: 'Resposta inválida do servidor.' }; }
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Não foi possível concluir a operação.');
        return payload;
    }

    function initTheme() {
        const saved = localStorage.getItem('taskflow_theme');
        const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = saved || preferred;
    }

    function toggleTheme() {
        const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('taskflow_theme', theme);
    }

    function setDateLabel() {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
        $('currentDate').textContent = formatted.toLocaleUpperCase('pt-BR');
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'error' ? '<path d="M12 8v4M12 16h.01"/><circle cx="12" cy="12" r="9"/>' : '<path d="m7 12 3 3 7-7"/><circle cx="12" cy="12" r="9"/>';
        toast.innerHTML = `<span class="toast-icon"><svg viewBox="0 0 24 24">${icon}</svg></span><span>${escapeHtml(message)}</span>`;
        $('toastContainer').appendChild(toast);
        setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 220); }, 3300);
    }

    function renderSkeletons() {
        $('emptyState').classList.add('hidden');
        $('tasksList').innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton-card"><span class="skeleton-circle"></span><div class="skeleton-content"><span class="skeleton-line"></span><span class="skeleton-line short"></span></div></div>').join('');
    }

    function buildQuery() {
        const params = new URLSearchParams({ order_by: state.sort });
        if (state.status !== 'all') params.set('status', state.status);
        if (state.category !== 'todas') params.set('category', state.category);
        if (state.priority !== 'todas') params.set('priority', state.priority);
        if (state.due !== 'all') params.set('due', state.due);
        if (state.search.trim()) params.set('search', state.search.trim());
        return params;
    }

    async function loadTasks({ skeleton = false } = {}) {
        if (skeleton) renderSkeletons();
        try {
            const data = await api(`/api/tasks?${buildQuery()}`);
            state.tasks = data.data;
            renderTasks();
        } catch (error) {
            state.tasks = [];
            renderTasks();
            showToast(error.message, 'error');
        }
    }

    async function loadStats() {
        try {
            const { data } = await api('/api/stats');
            state.stats = data;
            $('statPending').textContent = data.pending;
            $('statToday').textContent = data.due_today || 0;
            $('statOverdue').textContent = data.overdue;
            $('statCompleted').textContent = data.completed;
            $('completionLabel').textContent = `${data.completion_rate}% do total`;
            $('navTotal').textContent = data.total;
            $('navToday').textContent = data.due_today || 0;
            $('navOverdue').textContent = data.overdue;
            $('navHigh').textContent = data.high_priority;
            $('navCompleted').textContent = data.completed;
            $('sidebarProgressPercent').textContent = `${data.completion_rate}%`;
            $('sidebarProgressBar').style.width = `${data.completion_rate}%`;
            $('sidebarProgressText').textContent = data.total ? `${data.completed} de ${data.total} tarefas concluídas.` : 'Comece concluindo sua primeira tarefa.';
            $('panelFooter').classList.toggle('hidden', data.total === 0);
            $('footerSummary').textContent = `${data.pending} pendente${data.pending === 1 ? '' : 's'} · ${data.completed} concluída${data.completed === 1 ? '' : 's'}`;
        } catch (error) { console.error(error); }
    }

    async function loadCategories() {
        try {
            const { data } = await api('/api/categories');
            const filter = $('categoryFilter');
            const current = state.category;
            filter.innerHTML = '<option value="todas">Todas as categorias</option>';
            $('categoryList').innerHTML = '';
            data.forEach(category => {
                filter.add(new Option(category, category));
                $('categoryList').appendChild(new Option('', category));
            });
            filter.value = current;
        } catch (error) { console.error(error); }
    }

    function dueInfo(dateString) {
        if (!dateString) return null;
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const days = Math.round((date - today) / 86400000);
        if (days < 0) return { text: `Atrasada há ${Math.abs(days)} dia${days === -1 ? '' : 's'}`, className: 'overdue' };
        if (days === 0) return { text: 'Vence hoje', className: 'today' };
        if (days === 1) return { text: 'Vence amanhã', className: 'tomorrow' };
        return { text: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', ''), className: '' };
    }

    function renderTasks() {
        const list = $('tasksList');
        list.innerHTML = '';
        const filtered = hasFilters();
        $('activeFilterRow').classList.toggle('hidden', !filtered);
        $('resultCount').textContent = `${state.tasks.length} ${state.tasks.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}`;

        if (!state.tasks.length) {
            $('emptyState').classList.remove('hidden');
            const empty = emptyMessage();
            $('emptyTitle').textContent = empty[0];
            $('emptyText').textContent = empty[1];
            $('emptyActionBtn').textContent = filtered ? 'Limpar filtros' : 'Criar uma tarefa';
            return;
        }
        $('emptyState').classList.add('hidden');
        state.tasks.forEach(task => {
            const due = dueInfo(task.due_date);
            const card = document.createElement('article');
            card.className = `task-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
            card.dataset.id = task.id;
            card.innerHTML = `
                <button class="check-button" aria-label="${task.completed ? 'Reabrir' : 'Concluir'} tarefa" title="${task.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}"><svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg></button>
                <div class="task-body">
                    <div class="task-title-row"><h2 class="task-title">${escapeHtml(task.title)}</h2></div>
                    ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                    <div class="task-meta">
                        <span class="badge badge-category"><svg viewBox="0 0 24 24"><path d="M20 13 13 20 4 11V4h7l9 9Z"/><path d="M8 8h.01"/></svg>${escapeHtml(task.category || 'Geral')}</span>
                        <span class="badge badge-priority priority-badge-${task.priority}">${escapeHtml(task.priority)}</span>
                        ${due ? `<span class="badge badge-date ${due.className}"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>${escapeHtml(due.text)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions"><button class="task-action edit" title="Editar tarefa" aria-label="Editar tarefa"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button><button class="task-action delete" title="Excluir tarefa" aria-label="Excluir tarefa"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg></button></div>`;
            card.querySelector('.check-button').addEventListener('click', () => toggleTask(task.id, card));
            card.querySelector('.edit').addEventListener('click', () => openEdit(task));
            card.querySelector('.delete').addEventListener('click', () => deleteTask(task));
            card.querySelector('.task-body').addEventListener('dblclick', () => openEdit(task));
            list.appendChild(card);
        });
    }

    function hasFilters() {
        return state.search.trim() || state.status !== 'all' || state.category !== 'todas' || state.priority !== 'todas' || state.due !== 'all';
    }

    function emptyMessage() {
        if (state.search.trim()) return ['Nenhum resultado encontrado', 'Tente outro termo ou remova os filtros aplicados.'];
        if (state.due === 'overdue') return ['Tudo em dia!', 'Você não tem nenhuma tarefa atrasada.'];
        if (state.due === 'today') return ['Agenda livre hoje', 'Nenhuma tarefa com vencimento para hoje.'];
        if (state.status === 'completed') return ['Nenhuma tarefa concluída', 'As tarefas finalizadas aparecerão aqui.'];
        if (hasFilters()) return ['Nenhuma tarefa neste filtro', 'Ajuste os filtros para visualizar outros resultados.'];
        return ['Comece com uma tarefa', 'Anote o que precisa ser feito e tire isso da cabeça.'];
    }

    function resetFilters({ preserveView = false } = {}) {
        state.status = 'all'; state.category = 'todas'; state.priority = 'todas'; state.due = 'all'; state.search = '';
        if (!preserveView) state.view = 'all';
        $('searchInput').value = ''; $('categoryFilter').value = 'todas'; $('priorityFilter').value = 'todas'; $('dueFilter').value = 'all';
        syncTabs(); syncView();
    }

    function applyView(view) {
        resetFilters({ preserveView: true });
        state.view = view;
        if (view === 'today') state.due = 'today';
        if (view === 'overdue') state.due = 'overdue';
        if (view === 'high') state.priority = 'Alta';
        if (view === 'completed') state.status = 'completed';
        if (view === 'pending') state.status = 'pending';
        $('priorityFilter').value = state.priority; $('dueFilter').value = state.due;
        syncTabs(); syncView(); loadTasks({ skeleton: true }); closeSidebar();
    }

    function syncView() {
        const [title, subtitle] = viewCopy[state.view] || viewCopy.all;
        $('viewTitle').textContent = title; $('viewSubtitle').textContent = subtitle;
        document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === state.view));
    }

    function syncTabs() {
        document.querySelectorAll('.tab-button').forEach(tab => tab.classList.toggle('active', tab.dataset.status === state.status));
    }

    function focusNewTask() {
        $('quickAddCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => $('taskTitle').focus(), 250);
    }

    async function refreshAll() { await Promise.all([loadTasks(), loadStats(), loadCategories()]); }

    async function toggleTask(id, card) {
        card.style.pointerEvents = 'none';
        try { const data = await api(`/api/tasks/${id}/toggle`, { method: 'PATCH' }); showToast(data.message); await Promise.all([loadTasks(), loadStats()]); }
        catch (error) { showToast(error.message, 'error'); card.style.pointerEvents = ''; }
    }

    async function deleteTask(task) {
        const accepted = await askConfirm('Excluir tarefa?', `“${task.title}” será removida permanentemente.`, 'Excluir');
        if (!accepted) return;
        try { const data = await api(`/api/tasks/${task.id}`, { method: 'DELETE' }); showToast(data.message); await refreshAll(); }
        catch (error) { showToast(error.message, 'error'); }
    }

    function openEdit(task) {
        $('editTaskId').value = task.id; $('editTaskTitle').value = task.title || ''; $('editTaskDesc').value = task.description || '';
        $('editTaskCategory').value = task.category || 'Geral'; $('editTaskPriority').value = task.priority || 'Média'; $('editTaskDueDate').value = task.due_date || '';
        $('editModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; setTimeout(() => $('editTaskTitle').focus(), 30);
    }

    function closeEdit() { $('editModal').classList.add('hidden'); document.body.style.overflow = ''; $('editTaskForm').reset(); }

    function askConfirm(title, text, action) {
        $('confirmTitle').textContent = title; $('confirmText').textContent = text; $('confirmActionBtn').textContent = action;
        $('confirmModal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
        return new Promise(resolve => { confirmResolver = resolve; });
    }

    function finishConfirm(result) {
        $('confirmModal').classList.add('hidden'); document.body.style.overflow = ''; if (confirmResolver) confirmResolver(result); confirmResolver = null;
    }

    function openSidebar() { $('sidebar').classList.add('open'); $('sidebarOverlay').classList.add('visible'); document.body.style.overflow = 'hidden'; }
    function closeSidebar() { $('sidebar').classList.remove('open'); $('sidebarOverlay').classList.remove('visible'); document.body.style.overflow = ''; }

    $('createTaskForm').addEventListener('submit', async event => {
        event.preventDefault(); const submit = event.submitter; const title = $('taskTitle').value.trim(); if (!title) return;
        submit.disabled = true; submit.textContent = 'Salvando...';
        const payload = { title, description: $('taskDesc').value.trim(), category: $('taskCategory').value.trim() || 'Geral', priority: $('taskPriority').value, due_date: $('taskDueDate').value || null };
        try {
            const data = await api('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            showToast(data.message); event.target.reset(); $('taskCategory').value = 'Geral'; $('taskPriority').value = 'Média'; $('formDetails').classList.remove('open'); $('toggleDetailsBtn').setAttribute('aria-expanded', 'false'); await refreshAll(); $('taskTitle').focus();
        } catch (error) { showToast(error.message, 'error'); }
        finally { submit.disabled = false; submit.textContent = 'Adicionar'; }
    });

    $('editTaskForm').addEventListener('submit', async event => {
        event.preventDefault(); const button = event.submitter; button.disabled = true; button.textContent = 'Salvando...';
        const payload = { title: $('editTaskTitle').value.trim(), description: $('editTaskDesc').value.trim(), category: $('editTaskCategory').value.trim() || 'Geral', priority: $('editTaskPriority').value, due_date: $('editTaskDueDate').value || null };
        try { const data = await api(`/api/tasks/${$('editTaskId').value}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); closeEdit(); showToast(data.message); await refreshAll(); }
        catch (error) { showToast(error.message, 'error'); }
        finally { button.disabled = false; button.textContent = 'Salvar alterações'; }
    });

    $('toggleDetailsBtn').addEventListener('click', () => { const open = !$('formDetails').classList.contains('open'); $('formDetails').classList.toggle('open', open); $('toggleDetailsBtn').setAttribute('aria-expanded', String(open)); });
    $('newTaskBtn').addEventListener('click', focusNewTask); $('emptyActionBtn').addEventListener('click', () => hasFilters() ? (resetFilters(), loadTasks()) : focusNewTask());
    $('themeToggleBtn').addEventListener('click', toggleTheme); $('openSidebarBtn').addEventListener('click', openSidebar); $('closeSidebarBtn').addEventListener('click', closeSidebar); $('sidebarOverlay').addEventListener('click', closeSidebar);
    document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => applyView(item.dataset.view)));
    document.querySelectorAll('[data-stat-view]').forEach(card => card.addEventListener('click', () => applyView(card.dataset.statView)));
    document.querySelectorAll('.tab-button').forEach(tab => tab.addEventListener('click', () => { state.status = tab.dataset.status; state.view = tab.dataset.status === 'all' ? 'all' : tab.dataset.status; syncTabs(); syncView(); loadTasks(); }));
    $('categoryFilter').addEventListener('change', event => { state.category = event.target.value; loadTasks(); });
    $('priorityFilter').addEventListener('change', event => { state.priority = event.target.value; loadTasks(); });
    $('dueFilter').addEventListener('change', event => { state.due = event.target.value; loadTasks(); });
    $('sortFilter').addEventListener('change', event => { state.sort = event.target.value; loadTasks(); });
    $('searchInput').addEventListener('input', event => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.search = event.target.value; loadTasks(); }, 280); });
    $('clearFiltersBtn').addEventListener('click', () => { resetFilters(); loadTasks(); });
    $('closeModalBtn').addEventListener('click', closeEdit); $('cancelEditBtn').addEventListener('click', closeEdit); $('editModal').addEventListener('click', event => { if (event.target === $('editModal')) closeEdit(); });
    $('cancelConfirmBtn').addEventListener('click', () => finishConfirm(false)); $('confirmActionBtn').addEventListener('click', () => finishConfirm(true)); $('confirmModal').addEventListener('click', event => { if (event.target === $('confirmModal')) finishConfirm(false); });
    $('clearCompletedBtn').addEventListener('click', async () => {
        const accepted = await askConfirm('Limpar tarefas concluídas?', `${state.stats.completed || 0} tarefa(s) concluída(s) serão removidas.`, 'Limpar todas'); if (!accepted) return;
        try { const data = await api('/api/tasks/completed', { method: 'DELETE' }); showToast(data.message); await refreshAll(); } catch (error) { showToast(error.message, 'error'); }
    });
    document.addEventListener('keydown', event => {
        const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (event.key === '/' && !typing) { event.preventDefault(); $('searchInput').focus(); }
        if (event.key.toLowerCase() === 'n' && !typing && !$('editModal').classList.contains('hidden')) return;
        if (event.key.toLowerCase() === 'n' && !typing) { event.preventDefault(); focusNewTask(); }
        if (event.key === 'Escape') { if (!$('confirmModal').classList.contains('hidden')) finishConfirm(false); else if (!$('editModal').classList.contains('hidden')) closeEdit(); else closeSidebar(); }
    });

    initTheme(); setDateLabel(); renderSkeletons(); syncView(); Promise.all([loadTasks(), loadStats(), loadCategories()]);
});
