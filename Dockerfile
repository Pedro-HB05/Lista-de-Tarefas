FROM python:3.10-slim

WORKDIR /app

# Instala ferramentas essenciais do sistema
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copia e instala as dependências (assumindo que o requirements.txt está na raiz ou ajuste o caminho se estiver dentro de back)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o projeto para dentro do contêiner
COPY . .

# Define a porta exigida pelo Azure
ENV PORT=80
EXPOSE 80

# ALTERAÇÃO PRINCIPAL: Entra na pasta back e executa o app.py de lá
WORKDIR /app/back
CMD ["python", "app.py"]
