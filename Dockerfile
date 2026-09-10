# ============================================
# Dockerfile - TaskFlow
# ============================================
FROM python:3.11-slim

# Evita criação de arquivos .pyc e garante logs em tempo real no console
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=80

WORKDIR /app

# Instala as dependências Python
COPY back/requirements.txt /app/back/requirements.txt
RUN pip install --no-cache-dir -r /app/back/requirements.txt

# Copia os arquivos do backend e frontend
COPY back /app/back
COPY front /app/front

# Expõe a porta padrão da aplicação
EXPOSE 80

# Inicia o servidor com Gunicorn (suportando a variável PORT do Azure se fornecida)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-80} --workers 2 --chdir /app/back app:app"]
