# TaskFlow

Um gerenciador de tarefas pessoal, rápido e responsivo. O TaskFlow reúne prioridades, prazos, categorias e progresso em uma interface clara, com persistência local em SQLite.

## Principais recursos

- Painel com tarefas pendentes, para hoje, atrasadas e concluídas.
- Navegação rápida por contexto: visão geral, hoje, atrasadas, alta prioridade e concluídas.
- Criação rápida com descrição, categoria, prioridade e prazo opcionais.
- Edição, conclusão, reabertura e exclusão de tarefas.
- Busca por título ou descrição.
- Filtros combináveis por status, categoria, prioridade e prazo.
- Ordenação por criação, prazo, prioridade ou título.
- Tema claro/escuro persistente.
- Interface responsiva com menu próprio para celular.
- Estados de carregamento, mensagens vazias contextuais, toasts e confirmações próprias.
- Atalhos de teclado: `/` para buscar e `N` para criar uma tarefa.

## Tecnologias

- Backend: Python, Flask e SQLite.
- Frontend: HTML semântico, CSS e JavaScript sem frameworks.
- API REST em JSON.

## Estrutura

```text
.
├── back/
│   ├── app.py           # Servidor Flask e endpoints da API
│   ├── database.py      # Persistência, consultas, filtros e métricas
│   └── requirements.txt
├── front/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── iniciar.bat
└── README.md
```

O arquivo `back/tasks.db` é criado automaticamente e não deve ser apagado durante atualizações, pois contém as tarefas cadastradas.

## Como executar

### Windows — modo rápido

Dê dois cliques em `iniciar.bat`. O inicializador instala as dependências necessárias, inicia o servidor e abre o navegador.

### Pelo terminal

```bash
pip install -r back/requirements.txt
python back/app.py
```

Depois, acesse [http://127.0.0.1:5000](http://127.0.0.1:5000).

### Com Docker

```bash
docker build -t lista-de-tarefas .
docker run -p 80:80 lista-de-tarefas
```

Depois, acesse [http://localhost](http://localhost).

## API

| Método | Endpoint | Ação |
| --- | --- | --- |
| `GET` | `/api/tasks` | Lista e filtra tarefas |
| `POST` | `/api/tasks` | Cria uma tarefa |
| `GET` | `/api/tasks/{id}` | Obtém uma tarefa |
| `PUT` | `/api/tasks/{id}` | Atualiza uma tarefa |
| `PATCH` | `/api/tasks/{id}/toggle` | Alterna entre pendente e concluída |
| `DELETE` | `/api/tasks/{id}` | Exclui uma tarefa |
| `DELETE` | `/api/tasks/completed` | Exclui as concluídas |
| `GET` | `/api/stats` | Retorna métricas gerais |
| `GET` | `/api/categories` | Lista categorias disponíveis |

Filtros aceitos em `GET /api/tasks`: `status`, `category`, `priority`, `search`, `due` e `order_by`. O filtro `due` aceita `today`, `overdue`, `upcoming` ou `no_date`.

## Próxima evolução recomendada

A visão de produto mais ampla — projetos, usuários, Kanban, comentários e anexos — faz sentido como uma segunda etapa. Antes disso, esta versão consolida uma experiência pessoal completa e estável, preservando o banco e o fluxo existentes.
