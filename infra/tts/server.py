"""
Wrapper FastAPI minimal autour de Piper TTS.

Endpoints :
  - GET  /health           : healthcheck
  - GET  /voices           : liste des voix dispo
  - POST /synthesize       : { text, voice? } -> audio MP3 stream

Usage interne uniquement (réseau Docker humanix_backend).
Pas d'authentification ici : la route Next.js /api/tts/synthesize fait
office de gardien (auth NextAuth + plan-gating Pro+ + cache disque).

Sécurité :
 - Pas de port exposé sur l'host
 - Limite 5000 caractères par requête (anti DoS)
 - Validation Pydantic du payload
 - Tourne en utilisateur non-root (cf. Dockerfile)
"""
import io
import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from piper import PiperVoice

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("humanix-tts")

MODELS_DIR = Path(os.environ.get("PIPER_MODELS_DIR", "/app/models"))
DEFAULT_VOICE = "fr_FR-siwis-medium"
MAX_TEXT_LEN = 5000

app = FastAPI(
    title="HumaniX TTS",
    description="Synthèse vocale neurale (Piper). Usage interne uniquement.",
    version="1.0.0",
    docs_url=None,  # Pas de doc OpenAPI exposée par défaut
    redoc_url=None,
)

# Cache des voix chargées (RAM ~50 Mo par voix)
_voice_cache: dict[str, PiperVoice] = {}


def get_voice(voice_id: str) -> PiperVoice:
    """Charge la voix Piper, avec cache mémoire."""
    if voice_id in _voice_cache:
        return _voice_cache[voice_id]

    model_path = MODELS_DIR / f"{voice_id}.onnx"
    config_path = MODELS_DIR / f"{voice_id}.onnx.json"
    if not model_path.exists() or not config_path.exists():
        raise HTTPException(404, f"voice not found: {voice_id}")

    log.info(f"Loading Piper voice {voice_id}…")
    voice = PiperVoice.load(str(model_path), config_path=str(config_path))
    _voice_cache[voice_id] = voice
    return voice


def list_available_voices() -> list[str]:
    """Scanne MODELS_DIR pour lister les voix disponibles."""
    if not MODELS_DIR.exists():
        return []
    return sorted(
        f.stem for f in MODELS_DIR.glob("*.onnx") if (f.with_suffix(".onnx.json")).exists()
    )


class SynthesizeReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LEN)
    voice: Optional[str] = None
    # Optionnel : sortie en wav (debug). Par défaut : mp3 (bande passante).
    format: str = Field("mp3", pattern="^(mp3|wav)$")


@app.get("/health")
async def health():
    voices = list_available_voices()
    return {
        "status": "ok",
        "service": "humanix-tts",
        "voices_count": len(voices),
        "default_voice": DEFAULT_VOICE,
    }


@app.get("/voices")
async def voices():
    return {"voices": list_available_voices(), "default": DEFAULT_VOICE}


@app.post("/synthesize")
async def synthesize(req: SynthesizeReq):
    voice_id = req.voice or DEFAULT_VOICE
    try:
        voice = get_voice(voice_id)
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Failed to load voice {voice_id}: {e}")
        raise HTTPException(500, "voice load failed")

    # Synthèse vers WAV en mémoire
    wav_buf = io.BytesIO()
    try:
        with open(os.devnull, "wb") as null:
            voice.synthesize(req.text, wav_buf)
    except Exception as e:
        log.exception(f"synthesize failed: {e}")
        raise HTTPException(500, "synthesis failed")

    wav_bytes = wav_buf.getvalue()

    if req.format == "wav":
        return StreamingResponse(
            io.BytesIO(wav_bytes),
            media_type="audio/wav",
            headers={"x-tts-voice": voice_id, "x-tts-format": "wav"},
        )

    # Conversion WAV -> MP3 via ffmpeg pipe (stdin/stdout)
    try:
        proc = subprocess.run(
            [
                "ffmpeg",
                "-loglevel", "error",
                "-f", "wav",
                "-i", "pipe:0",
                "-codec:a", "libmp3lame",
                "-q:a", "5",  # qualité ~128 kbps VBR
                "-f", "mp3",
                "pipe:1",
            ],
            input=wav_bytes,
            capture_output=True,
            timeout=15,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        log.error(f"ffmpeg failed: {e.stderr.decode(errors='replace')[:200]}")
        raise HTTPException(500, "transcoding failed")
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "transcoding timeout")

    return StreamingResponse(
        io.BytesIO(proc.stdout),
        media_type="audio/mpeg",
        headers={"x-tts-voice": voice_id, "x-tts-format": "mp3"},
    )


# Pré-chauffage : charge la voix par défaut au démarrage pour éviter la
# latence sur la première requête.
@app.on_event("startup")
async def warmup():
    try:
        get_voice(DEFAULT_VOICE)
        log.info(f"Warmup OK : default voice {DEFAULT_VOICE} loaded")
    except Exception as e:
        log.warning(f"Warmup failed (non-fatal) : {e}")
