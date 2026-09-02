# 📋 TaskFlow - Sistema Completo de Lista de Tarefas

Um sistema de gerenciamento de tarefas moderno, responsivo e 100% funcional construído com **Python (Flask + SQLite)** no backend e **HTML5, CSS3 moderno e Vanilla JavaScript** no frontend.

---

## 📁 Estrutura do Projeto

O projeto está organizado estritamente nas pastas `front/` e `back/`:

```
lista de tarefas/
│
├── back/                       # Backend em Python
│   ├── app.py                  # Servidor Flask e rotas da API RESTful
│   ├── database.py             # Gerenciamento do banco SQLite (CRUD e métricas)
│   ├── requirements.txt        # Dependências Python (Flask)
│   └── tasks.db                # Banco de dados SQLite persistente (criado automaticamente)
│
├── front/                      # Frontend da aplicação
│   ├── index.html              # Estrutura HTML5 semântica e acessível
│   ├── css/
│   │   └── style.css           # Estilização moderna com Tema Claro / Escuro
│   └── js/
│       └── app.js              # Lógica do front, integração com a API e filtros
│
├── iniciar.bat                 # Inicializador automático para Windows (1 clique)
└── README.md                   # Documentação do projeto
```

---

## ✨ Funcionalidades

### 🔹 Backend (`back/`)
- **API RESTful completa**:
  - `GET /api/tasks` — Listagem com filtros por status (`all`, `pending`, `completed`), categoria, prioridade, busca textual e ordenação.
  - `POST /api/tasks` — Criação de tarefa com título, descrição, categoria, prioridade e data de entrega.
  - `GET /api/tasks/<id>` — Consulta detalhada de uma tarefa.
  - `PUT /api/tasks/<id>` — Atualização completa de tarefa.
  - `PATCH /api/tasks/<id>/toggle` — Alternância rápida de conclusão.
  - `DELETE /api/tasks/<id>` — Remoção de tarefa individual.
  - `DELETE /api/tasks/completed` — Limpeza em lote de tarefas concluídas.
  - `GET /api/stats` — Métricas em tempo real (total, pendentes, concluídas, atrasadas, taxa de conclusão).
  - `GET /api/categories` — Lista dinâmica de categorias cadastradas.
- **Persistência SQLite**: Dados salvos localmente no arquivo `back/tasks.db`.
- **Suporte a CORS integrado**: Funciona servido diretamente pelo Flask ou com servidores de frontend independentes (Live Server, Vite, etc.).

### 🔹 Frontend (`front/`)
- **Design Moderno**: Layout fluido, cards com sombras suaves e microinterações.
- **Tema Claro / Escuro (Dark Mode)**: Alternância com 1 clique e persistência no `localStorage`.
- **Dashboard de Métricas**: Cards informativos com contagem de tarefas e barra de progresso animada.
- **Filtros e Busca**:
  - Abas: Todas / Pendentes / Concluídas.
  - Busca em tempo real com debounce por texto.
  - Filtros dinâmicos por Categoria e Prioridade.
  - Ordenação por data de criação, prazo, prioridade ou ordem alfabética.
- **Modal de Edição**: Edição completa sem recarregar a página.
- **Notificações Toast**: Feedback imediato para qualquer ação realizada.

---

## 🚀 Como Executar

### Opção 1: Inicialização em 1 Clique (Windows)
Basta dar um duplo-clique no arquivo:
```
iniciar.bat
```
O script detecta o Python, instala as dependências se necessário, abre o navegador padrão automaticamente em `http://127.0.0.1:5000` e inicia o servidor.

---

### Opção 2: Pelo Terminal / Linha de Comando

1. Abra o terminal na pasta do projeto.
2. Instale as dependências:
   ```bash
   pip install -r back/requirements.txt
   ```
3. Inicie o servidor:
   ```bash
   python back/app.py
   ```
4. Abra o navegador e acesse:
   ```
   http://127.0.0.1:5000
   ```
