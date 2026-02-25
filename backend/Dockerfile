# Use PyTorch base image — torch pre-installed, builds in ~20s instead of 124s
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

LABEL maintainer="TCGxBill"

WORKDIR /app

# Only install packages NOT already in the base image
COPY requirements.txt .
RUN pip install --no-cache-dir \
    torch-geometric \
    biopython \
    fastapi \
    uvicorn \
    python-multipart \
    pyyaml \
    scikit-learn \
    huggingface_hub \
    && rm -rf /root/.cache/pip

COPY . .

# HuggingFace Spaces requires port 7860
EXPOSE 7860

CMD ["python", "server.py"]
