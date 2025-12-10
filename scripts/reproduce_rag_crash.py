import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.rag import RAGService
import asyncio

async def test_rag():
    print("1. Initializing RAGService...")
    rag = RAGService()
    print("2. RAGService initialized. Embedding text...")
    embedding = await rag.embed_text("Hello world")
    print(f"3. Embedding successful. Length: {len(embedding)}")

if __name__ == "__main__":
    try:
        asyncio.run(test_rag())
        print("✅ Test Passed")
    except Exception as e:
        print(f"❌ Test Failed: {e}")
