FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home --shell /usr/sbin/nologin pulso
WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=pulso:pulso backend/ /app/backend/
COPY --chown=pulso:pulso scripts/db_schema.py /app/scripts/db_schema.py
COPY --chown=pulso:pulso scripts/bootstrap_db.sh /app/scripts/bootstrap_db.sh
COPY --chown=pulso:pulso deploy/production/initialize.py /app/scripts/initialize_production.py
RUN mkdir -p uploads private_publications && chown -R pulso:pulso uploads private_publications
USER pulso
EXPOSE 33159
HEALTHCHECK --interval=30s --timeout=8s --start-period=45s --retries=4 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:33159/api/health', timeout=5)"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "33159", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
