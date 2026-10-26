FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    AUDIO_OUTPUT_DIR=/data/audios_prontos \
    AUDIO_TEMP_DIR=/tmp/audio \
    AUDIO_BEATS_DIR=/data/beats

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /data/audios_prontos /data/beats /tmp/audio \
    && chown -R app:app /app /data /tmp/audio
USER app
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "2", "--timeout", "120", "Servidor:app"]
