import os
import sys
from datetime import datetime

# Garante que o diretório back esteja no sys.path para importações consistentes
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, request, jsonify, send_from_directory
import database

# Diretório da pasta frontend
FRONT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'front'))

app = Flask(__name__, static_folder=FRONT_DIR, static_url_path='')

# Inicializa o banco de dados
database.init_db()

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
    due = request.args.get('due')

    tasks = database.get_all_tasks(
        status=status,
        category=category,
        priority=priority,
        search=search,
        order_by=order_by,
        due=due
    )
    return jsonify({'success': True, 'data': tasks, 'count': len(tasks)})

@app.route('/api/tasks', methods=['POST'])
def add_task():
    """Cria uma nova tarefa."""
    data = request.get_json(silent=True)
    if not data or not data.get('title') or not data.get('title').strip():
        return jsonify({'success': False, 'error': 'O título da tarefa é obrigatório.'}), 400

    title = data.get('title').strip()
    description = data.get('description', '')
    category = data.get('category', 'Geral')
    priority = data.get('priority', 'Média')
    due_date = data.get('due_date')

    validation_error = validate_task_data(title, description, category, due_date)
    if validation_error:
        return jsonify({'success': False, 'error': validation_error}), 400

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
    data = request.get_json(silent=True)
    if not data or not data.get('title') or not data.get('title').strip():
        return jsonify({'success': False, 'error': 'O título não pode ficar vazio.'}), 400

    title = data.get('title').strip()
    description = data.get('description', '')
    category = data.get('category', 'Geral')
    due_date = data.get('due_date')
    validation_error = validate_task_data(title, description, category, due_date)
    if validation_error:
        return jsonify({'success': False, 'error': validation_error}), 400

    updated_task = database.update_task(
        task_id=task_id,
        title=title,
        description=description,
        category=category,
        priority=data.get('priority', 'Média'),
        due_date=due_date,
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


def validate_task_data(title, description, category, due_date):
    """Valida os campos compartilhados entre criação e edição."""
    if len(title) > 160:
        return 'O título deve ter no máximo 160 caracteres.'
    if len(description or '') > 3000:
        return 'A descrição deve ter no máximo 3.000 caracteres.'
    if len(category or '') > 50:
        return 'A categoria deve ter no máximo 50 caracteres.'
    if due_date:
        try:
            datetime.strptime(due_date, '%Y-%m-%d')
        except (TypeError, ValueError):
            return 'A data de entrega é inválida.'
    return None


@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Recurso não encontrado.'}), 404
    return send_from_directory(FRONT_DIR, 'index.html')


@app.errorhandler(500)
def server_error(_error):
    return jsonify({'success': False, 'error': 'Ocorreu um erro interno. Tente novamente.'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0' if os.environ.get('PORT') else '127.0.0.1')
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    print("==================================================")
    print("🚀 Servidor TaskFlow iniciado com sucesso!")
    print(f"🌐 Acesse no navegador: http://{host}:{port}")
    print("==================================================")
    app.run(debug=debug, host=host, port=port)
