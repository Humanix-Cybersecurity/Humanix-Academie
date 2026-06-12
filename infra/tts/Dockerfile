# Container TTS pour HumaniX Académie.
#
# CHOIX TECHNIQUE :
#  - Piper TTS (rhasspy/piper) : moteur neural CPU-only, voix FR officielle
#    fr_FR-siwis-medium, latence < 1 s par phrase, modèle ~60 Mo, RAM ~200 Mo.
#  - FastAPI (Python) : wrapper HTTP minimal avec endpoint POST /synthesize.
#  - Sortie WAV PCM 16 kHz mono, converti en MP3 par ffmpeg pour économiser
#    la bande passante (~10x plus léger que WAV).
#
# ALTERNATIVE DOCUMENTÉE (cf. compose) :
#  - Coqui XTTS v2 (daswer123/xtts-api-server) : qualité 9.5/10, voix clonable,
#    mais nécessite GPU (sinon 5-10 s/phrase CPU). À activer le jour où tu
#    prends une instance Scaleway GPU. Image dispo en commentaire.
#
# Sécurité : tourne en utilisateur non-root, pas de port exposé sur l'host
# (uniquement réseau Docker interne `humanix_backend`).

FROM python:3.11-slim AS base

# Dépendances système : ffmpeg pour le transcodage WAV→MP3 + libsndfile
# (requis par soundfile, dépendance indirecte de piper).
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        wget \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Utilisateur non-root
RUN groupadd -r tts && useradd -r -g tts -d /app -s /sbin/nologin tts

WORKDIR /app

# Dépendances Python - versions épinglées pour la reproductibilité
RUN pip install --no-cache-dir \
        fastapi==0.115.0 \
        uvicorn[standard]==0.32.0 \
        piper-tts==1.2.0

# Téléchargement du modèle de voix française officielle (Siwis = INRIA dataset).
# Alternative : fr_FR-tom-medium (voix masculine), fr_FR-mls-medium (multi-speaker).
RUN mkdir -p /app/models && \
    wget -q -O /app/models/fr_FR-siwis-medium.onnx \
        https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx && \
    wget -q -O /app/models/fr_FR-siwis-medium.onnx.json \
        https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json

COPY --chown=tts:tts server.py /app/server.py

USER tts

# Port interne, JAMAIS exposé sur l'host. Accessible uniquement par `app` via
# réseau humanix_backend (cf. docker-compose.yml).
EXPOSE 5500

# Healthcheck : ping de l'endpoint /health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD wget -qO- http://localhost:5500/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5500", "--workers", "1", "--log-level", "info"]
