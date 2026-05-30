# PDF fill microservice (FastAPI + pypdf) — built from the repo root.
FROM python:3.12-slim
WORKDIR /app

COPY pdf_service/requirements.txt ./pdf_service/requirements.txt
RUN pip install --no-cache-dir -r pdf_service/requirements.txt

# pdf_service bundles the USCIS forms + field maps it needs under pdf_service/assets.
COPY pdf_service ./pdf_service

ENV PYTHONPATH=/app
# uvicorn binds to the PORT env var Railway injects.
CMD ["sh", "-c", "uvicorn pdf_service.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
