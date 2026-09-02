import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tasks.db')

def get_db_connection():
    """Retorna uma conexão com o banco de dados SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa as tabelas do banco de dados se não existirem."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'Geral',
            priority TEXT DEFAULT 'Média',
            due_date TEXT,
            completed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def get_all_tasks(status=None, category=None, priority=None, search=None, order_by=None):
    """
    Lista todas as tarefas com base em filtros opcionais:
    - status: 'all', 'pending', 'completed'
    - category: string
    - priority: 'Baixa', 'Média', 'Alta'
    - search: texto de busca no título ou descrição
    - order_by: 'created_desc', 'created_asc', 'due_date', 'priority', 'title'
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM tasks WHERE 1=1"
    params = []

    if status == 'pending':
        query += " AND completed = 0"
    elif status == 'completed':
        query += " AND completed = 1"

    if category and category.lower() != 'todas':
        query += " AND category = ?"
        params.append(category)

    if priority and priority.lower() != 'todas':
        query += " AND priority = ?"
        params.append(priority)

    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        search_term = f"%{search.strip()}%"
        params.extend([search_term, search_term])

    # Ordenação
    if order_by == 'due_date':
        # Tarefas sem data de entrega vão para o final
        query += " ORDER BY completed ASC, CASE WHEN due_date IS NULL OR due_date = '' THEN 1 ELSE 0 END, due_date ASC, id DESC"
    elif order_by == 'priority':
        query += """
            ORDER BY completed ASC,
            CASE priority
                WHEN 'Alta' THEN 1
                WHEN 'Média' THEN 2
                WHEN 'Baixa' THEN 3
                ELSE 4
            END ASC, id DESC
        """
    elif order_by == 'title':
        query += " ORDER BY completed ASC, title COLLATE NOCASE ASC"
    elif order_by == 'created_asc':
        query += " ORDER BY completed ASC, id ASC"
    else:  # default 'created_desc'
        query += " ORDER BY completed ASC, id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    tasks = [dict(row) for row in rows]
    conn.close()
    return tasks

def get_task_by_id(task_id):
    """Busca uma tarefa específica pelo ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_task(title, description='', category='Geral', priority='Média', due_date=None):
    """Cria uma nova tarefa e retorna os dados inseridos."""
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    category = category.strip() if category else 'Geral'
    priority = priority if priority in ['Baixa', 'Média', 'Alta'] else 'Média'
    due_date = due_date.strip() if due_date else None

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (title, description, category, priority, due_date, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ''', (title.strip(), description.strip(), category, priority, due_date, now, now))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return get_task_by_id(new_id)

def update_task(task_id, title, description='', category='Geral', priority='Média', due_date=None, completed=None):
    """Atualiza dados de uma tarefa existente."""
    existing = get_task_by_id(task_id)
    if not existing:
        return None

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    title = title.strip() if title else existing['title']
    description = description.strip() if description is not None else existing['description']
    category = category.strip() if category else existing['category']
    priority = priority if priority in ['Baixa', 'Média', 'Alta'] else existing['priority']
    due_date = due_date.strip() if due_date else None
    
    if completed is None:
        completed = existing['completed']
    else:
        completed = 1 if completed else 0

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE tasks
        SET title = ?, description = ?, category = ?, priority = ?, due_date = ?, completed = ?, updated_at = ?
        WHERE id = ?
    ''', (title, description, category, priority, due_date, completed, now, task_id))
    conn.commit()
    conn.close()
    return get_task_by_id(task_id)

def toggle_task_status(task_id):
    """Alterna o status de concluído de uma tarefa."""
    existing = get_task_by_id(task_id)
    if not existing:
        return None

    new_status = 0 if existing['completed'] == 1 else 1
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE tasks
        SET completed = ?, updated_at = ?
        WHERE id = ?
    ''', (new_status, now, task_id))
    conn.commit()
    conn.close()
    return get_task_by_id(task_id)

def delete_task(task_id):
    """Exclui uma tarefa pelo ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def delete_completed_tasks():
    """Exclui todas as tarefas concluídas."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE completed = 1")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count

def get_stats():
    """Retorna métricas gerais das tarefas."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')

    cursor.execute("SELECT COUNT(*) FROM tasks")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM tasks WHERE completed = 1")
    completed = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM tasks WHERE completed = 0")
    pending = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM tasks WHERE completed = 0 AND due_date IS NOT NULL AND due_date != '' AND due_date < ?", (today,))
    overdue = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM tasks WHERE completed = 0 AND priority = 'Alta'")
    high_priority = cursor.fetchone()[0]

    conn.close()

    completion_rate = round((completed / total * 100), 1) if total > 0 else 0

    return {
        'total': total,
        'completed': completed,
        'pending': pending,
        'overdue': overdue,
        'high_priority': high_priority,
        'completion_rate': completion_rate
    }

def get_categories():
    """Retorna lista de categorias distintas cadastradas."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL AND category != '' ORDER BY category ASC")
    rows = cursor.fetchall()
    conn.close()
    
    categories = [row[0] for row in rows]
    defaults = ['Geral', 'Trabalho', 'Estudos', 'Pessoal', 'Finanças', 'Saúde']
    for cat in defaults:
        if cat not in categories:
            categories.append(cat)
    return sorted(categories)
