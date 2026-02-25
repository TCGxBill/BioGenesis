FROM python:3.11-slim

# HuggingFace Spaces metadata
LABEL maintainer="TCGxBill"

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HuggingFace Spaces requires port 7860
# Render uses PORT env var (defaults to 8000)
EXPOSE 7860

CMD ["python", "server.py"]
