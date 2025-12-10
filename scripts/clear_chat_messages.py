#!/usr/bin/env python
"""
Script pour vider tous les messages du chatbot
"""
import asyncio
import sys
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Add parent directory to path
sys.path.insert(0, str(__file__).rsplit("\\", 2)[0])

from app.core.config import settings
from app.models.chat import Message


async def clear_messages():
    """Delete all messages from the database"""
    
    # Create engine
    engine = create_async_engine(
        str(settings.SQLALCHEMY_DATABASE_URI),
        echo=False,
        future=True
    )
    
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )
    
    async with AsyncSessionLocal() as session:
        try:
            # Count messages before deletion
            result = await session.execute(select(Message))
            messages = result.scalars().all()
            count = len(messages)
            
            if count == 0:
                print("✓ Aucun message à supprimer.")
                return
            
            print(f"⚠ Suppression de {count} message(s)...")
            
            # Delete all messages
            await session.execute(delete(Message))
            await session.commit()
            
            print(f"✓ {count} message(s) supprimé(s) avec succès!")
            
        except Exception as e:
            print(f"✗ Erreur: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    print("🗑️  Nettoyage des messages du chatbot...")
    print("-" * 50)
    asyncio.run(clear_messages())
    print("-" * 50)
