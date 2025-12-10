#!/usr/bin/env python
"""Get credentials for Dr. Abdoulaye Mbaye"""
import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, r"c:\Users\hp\Documents\Projets\TonToumaBot")

from app.core.database import AsyncSessionLocal
from app.models.doctor import Doctor
from app.models.specialty import Specialty


async def get_doctor_credentials():
    """Fetch Dr. Abdoulaye Mbaye credentials"""
    async with AsyncSessionLocal() as db:
        # Query for doctor
        stmt = select(Doctor).where(
            (Doctor.first_name.ilike("Abdoulaye")) & 
            (Doctor.last_name.ilike("Mbaye"))
        )
        result = await db.execute(stmt)
        doctor = result.scalars().first()
        
        if not doctor:
            print("❌ Doctor not found")
            return
        
        print("✅ Dr. Abdoulaye Mbaye found!")
        print("-" * 50)
        print(f"Doctor ID:  {doctor.doctor_id}")
        print(f"Name:       Dr. {doctor.first_name} {doctor.last_name}")
        print(f"Email:      {doctor.email}")
        print(f"Phone:      {doctor.phone}")
        print(f"Password:   password123")
        print(f"Entity ID:  {doctor.entity_id}")
        print(f"Active:     {doctor.is_active}")
        print(f"Consultation Duration: {doctor.consultation_duration} min")
        print("-" * 50)


if __name__ == "__main__":
    asyncio.run(get_doctor_credentials())
