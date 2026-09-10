# Usa uma imagem oficial leve do Python
FROM python:3.10-slim

# Define a pasta de trabalho dentro do contêiner
WORKDIR /app

# Instala as dependências do sistema se necessário
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copia e instala as dependências do Python primeiro (otimiza o cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código do projeto para dentro do contêiner
COPY . .

# O Azure exige que a aplicação responda na porta 80 por padrão
ENV PORT=80
EXPOSE 80

# Inicia o servidor Flask escutando em todas as interfaces (0.0.0.0) na porta 80
CMD ["python", "app.py"]
