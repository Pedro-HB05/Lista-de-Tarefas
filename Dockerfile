FROM python:3.10-slim

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copia o requirements.txt (se ele estiver na raiz ou dentro de back, ajuste aqui)
# Se o requirements.txt estiver dentro da pasta back, mude para: COPY back/requirements.txt .
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o projeto para dentro de /app
COPY . .

# Porta padrão exigida pelo Azure
ENV PORT=80
EXPOSE 80

# Executa o app.py entrando na pasta back, mas mantendo a raiz como contexto
CMD ["python", "back/app.py"]
