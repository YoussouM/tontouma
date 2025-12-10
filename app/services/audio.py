import os
import uuid
import shutil
from typing import Tuple, List
from openai import AsyncOpenAI
from app.core.config import settings

class AudioService:
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)
        
        print("Initializing OpenAI Client for Audio...")
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Models
        self.stt_model = "whisper-1"
        self.tts_model = "tts-1"
        self.tts_voice = "nova" # alloy, echo, fable, onyx, nova, shimmer

    async def save_upload_file(self, upload_file) -> str:
        file_path = os.path.join(self.upload_dir, f"{uuid.uuid4()}.wav")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return file_path

    async def transcribe(self, file_path: str) -> str:
        """Transcribe audio using OpenAI Whisper API"""
        with open(file_path, "rb") as audio_file:
            transcript = await self.client.audio.transcriptions.create(
                model=self.stt_model, 
                file=audio_file,
                language="fr" # Hint for better accuracy
            )
        return transcript.text

    async def get_speaker_embedding(self, file_path: str) -> Tuple[str, List[float]]:
        # Mock implementation - OpenAI doesn't provide speaker embeddings
        fingerprint = str(uuid.uuid4())
        emb_vector = [0.0] * 256
        return fingerprint, emb_vector

    async def text_to_speech(self, text: str) -> str:
        """Generate speech using OpenAI TTS API"""
        filename = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(self.upload_dir, filename)
        
        response = await self.client.audio.speech.create(
            model=self.tts_model,
            voice=self.tts_voice,
            input=text
        )
        
        response.stream_to_file(file_path)
        return file_path
