import os
from flask import Flask, request, jsonify, send_from_directory
import database

# Diretório da pasta frontend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'front'))

app = Flask(__name__, static_folder=FRONT_DIR, static_url_path='')

# Inicializa o banco de dados
database.init_db()

# Suporte a CORS para permitir chamadas do front se rodar em portas distintas
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.route('/api/<path:subpath>', methods=['OPTIONS'])
def options_handler(subpath):
    return ('', 204)

# Rota principal para servir o index.html
@app.route('/')
def index():
    return send_from_directory(FRONT_DIR, 'index.html')

# ==========================================================
# Rotas da API REST
# ==========================================================

@app.route('/api/tasks', methods=['GET'])
def list_tasks():
    """Retorna lista de tarefas com base em filtros opcionais."""
    status = request.args.get('status', 'all')
    category = request.args.get('category')
    priority = request.args.get('priority')
    search = request.args.get('search')
    order_by = request.args.get('order_by', 'created_desc')

    tasks = database.get_all_tasks(
        status=status,
        category=category,
        priority=priority,
        search=search,
        order_by=order_by
    )
    return jsonify({'success': True, 'data': tasks, 'count': len(tasks)})

@app.route('/api/tasks', methods=['POST'])
def add_task():
    """Cria uma nova tarefa."""
    data = request.get_json()
    if not data or not data.get('title') or not data.get('title').strip():
        return jsonify({'success': False, 'error': 'O título da tarefa é obrigatório.'}), 400

    title = data.get('title')
    description = data.get('description', '')
    category = data.get('category', 'Geral')
    priority = data.get('priority', 'Média')
    due_date = data.get('due_date')

    new_task = database.create_task(
        title=title,
        description=description,
        category=category,
        priority=priority,
        due_date=due_date
    )
    return jsonify({'success': True, 'data': new_task, 'message': 'Tarefa criada com sucesso!'}), 201

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """Retorna detalhes de uma tarefa específica."""
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Tarefa não encontrada.'}), 404
    return jsonify({'success': True, 'data': task})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def edit_task(task_id):
    """Atualiza uma tarefa existente."""
    data = request.get_json()
    if not data or not data.get('title') or not data.get('title').strip():
        return jsonify({'success': False, 'error': 'O título não pode ficar vazio.'}), 400

    updated_task = database.update_task(
        task_id=task_id,
        title=data.get('title'),
        description=data.get('description', ''),
        category=data.get('category', 'Geral'),
        priority=data.get('priority', 'Média'),
        due_date=data.get('due_date'),
        completed=data.get('completed')
    )

    if not updated_task:
        return jsonify({'success': False, 'error': 'Tarefa não encontrada.'}), 404

    return jsonify({'success': True, 'data': updated_task, 'message': 'Tarefa atualizada com sucesso!'})

@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task(task_id):
    """Alterna o status concluída / pendente da tarefa."""
    task = database.toggle_task_status(task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Tarefa não encontrada.'}), 404

    status_str = 'concluída' if task['completed'] == 1 else 'marcada como pendente'
    return jsonify({'success': True, 'data': task, 'message': f'Tarefa {status_str}!'})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def remove_task(task_id):
    """Exclui uma tarefa específica."""
    deleted = database.delete_task(task_id)
    if not deleted:
        return jsonify({'success': False, 'error': 'Tarefa não encontrada.'}), 404

    return jsonify({'success': True, 'message': 'Tarefa excluída com sucesso!'})

@app.route('/api/tasks/completed', methods=['DELETE'])
def clear_completed():
    """Exclui todas as tarefas concluídas."""
    count = database.delete_completed_tasks()
    return jsonify({'success': True, 'message': f'{count} tarefa(s) concluída(s) removida(s).', 'count': count})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retorna estatísticas gerais das tarefas."""
    stats = database.get_stats()
    return jsonify({'success': True, 'data': stats})

@app.route('/api/categories', methods=['GET'])
def list_categories():
    """Retorna as categorias disponíveis."""
    categories = database.get_categories()
    return jsonify({'success': True, 'data': categories})

if __name__ == '__main__':
    print("==================================================")
    print("🚀 Servidor TaskFlow iniciado com sucesso!")
    print("🌐 Acesse no navegador: http://127.0.0.1:5000")
    print("==================================================")
    app.run(debug=True, host='127.0.0.1', port=5000)
