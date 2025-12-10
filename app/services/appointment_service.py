from datetime import date, time, datetime, timedelta
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.doctor import Doctor
from app.models.timeslot import TimeSlot
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.timeslot import AvailableSlot
from app.schemas.appointment import BookAppointmentRequest, BookAppointmentResponse


class AppointmentService:
    """Business logic for appointment booking"""

    async def get_available_slots(
        self, 
        db: AsyncSession, 
        entity_id: UUID, 
        target_date: Optional[date] = None,
        specialty_id: Optional[UUID] = None,
        doctor_id: Optional[UUID] = None
    ) -> List[AvailableSlot]:
        """Get available slots. If target_date is None, search next 7 days."""
        
        # Build query for doctors
        query = select(Doctor).options(
            selectinload(Doctor.specialty),
            selectinload(Doctor.time_slots),
            selectinload(Doctor.appointments)
        ).filter(Doctor.entity_id == entity_id, Doctor.is_active == True)
        
        if doctor_id:
            query = query.filter(Doctor.doctor_id == doctor_id)
        elif specialty_id:
            query = query.filter(Doctor.specialty_id == specialty_id)
        
        result = await db.execute(query)
        doctors = result.scalars().all()
        
        available_slots = []
        
        today = date.today()
        dates_to_check = [target_date] if target_date else [today + timedelta(days=i) for i in range(14)]
        
        for check_date in dates_to_check:
            # Optimization: If we already found enough slots (e.g. 5) and we are ignoring specific date, stop?
            # For now, let's just find the first day with potential slots or collect a reasonable amount
            if not target_date and len(available_slots) >= 10:
                break

            target_weekday = check_date.weekday()
            
            for doctor in doctors:
                # Get applicable time slots
                applicable_slots = []
                for slot in doctor.time_slots:
                    if not slot.is_active:
                        continue
                    if slot.is_recurring and slot.day_of_week == target_weekday:
                        applicable_slots.append(slot)
                    elif not slot.is_recurring and slot.specific_date == check_date:
                        applicable_slots.append(slot)
                
                # Get existing appointments for this date
                existing_appointments = [
                    appt for appt in doctor.appointments 
                    if appt.date == check_date and appt.status != AppointmentStatus.CANCELLED
                ]
                
                # Generate available slots based on time slots and consultation duration
                for slot in applicable_slots:
                    current_time = datetime.combine(check_date, slot.start_time)
                    end_time = datetime.combine(check_date, slot.end_time)
                    duration = timedelta(minutes=doctor.consultation_duration)
                    
                    while current_time + duration <= end_time:
                        slot_start = current_time.time()
                        slot_end = (current_time + duration).time()
                        
                        # Check if this slot overlaps with any existing appointment
                        is_available = True
                        for appt in existing_appointments:
                            appt_start = datetime.combine(check_date, appt.start_time)
                            appt_end = datetime.combine(check_date, appt.end_time)
                            slot_start_dt = current_time
                            slot_end_dt = current_time + duration
                            
                            # Check overlap
                            if not (slot_end_dt <= appt_start or slot_start_dt >= appt_end):
                                is_available = False
                                break
                        
                        if is_available:
                            # Only add future slots
                            if datetime.combine(check_date, slot_start) > datetime.now():
                                available_slots.append(AvailableSlot(
                                    doctor_id=doctor.doctor_id,
                                    doctor_name=f"{doctor.first_name} {doctor.last_name}",
                                    specialty_name=doctor.specialty.name if doctor.specialty else None,
                                    date=check_date,
                                    start_time=slot_start,
                                    end_time=slot_end
                                ))
                        
                        current_time += duration
        
        # Sort by date and time
        available_slots.sort(key=lambda x: (x.date, x.start_time))
        return available_slots[:15] # Limit to 15 suggestions

    async def book_appointment(
        self,
        db: AsyncSession,
        request: BookAppointmentRequest
    ) -> dict:
        """Book an appointment"""
        
        # Get doctor
        doctor = await db.get(Doctor, request.doctor_id)
        if not doctor:
            return {
                "success": False,
                "message": "Médecin non trouvé",
                "appointment_id": None,
                "doctor_name": None,
                "date": None,
                "start_time": None,
                "end_time": None
            }
        
        # Calculate end time based on consultation duration
        start_dt = datetime.combine(request.date, request.start_time)
        end_dt = start_dt + timedelta(minutes=doctor.consultation_duration)
        end_time = end_dt.time()
        
        # Check if slot is still available
        existing = await db.execute(
            select(Appointment).filter(
                Appointment.doctor_id == request.doctor_id,
                Appointment.date == request.date,
                Appointment.status != AppointmentStatus.CANCELLED
            )
        )
        existing_appointments = existing.scalars().all()
        
        for appt in existing_appointments:
            appt_start = datetime.combine(request.date, appt.start_time)
            appt_end = datetime.combine(request.date, appt.end_time)
            
            if not (end_dt <= appt_start or start_dt >= appt_end):
                return {
                    "success": False,
                    "message": "Ce créneau n'est plus disponible",
                    "appointment_id": None,
                    "doctor_name": None,
                    "date": None,
                    "start_time": None,
                    "end_time": None
                }
        
        # Create appointment
        appointment = Appointment(
            doctor_id=request.doctor_id,
            session_id=request.session_id,
            patient_name=request.patient_name,
            patient_email=request.patient_email,
            patient_phone=request.patient_phone,
            reason=request.reason,
            date=request.date,
            start_time=request.start_time,
            end_time=end_time,
            status=AppointmentStatus.PENDING
        )
        
        db.add(appointment)
        await db.commit()
        await db.refresh(appointment)
        
        # Return a dict directly to avoid Pydantic validation issues
        return {
            "success": True,
            "appointment_id": str(appointment.appointment_id),
            "message": f"Votre rendez-vous avec Dr. {doctor.first_name} {doctor.last_name} est confirmé.",
            "doctor_name": f"Dr. {doctor.first_name} {doctor.last_name}",
            "date": appointment.date.isoformat() if appointment.date else None,
            "start_time": appointment.start_time.isoformat() if appointment.start_time else None,
            "end_time": appointment.end_time.isoformat() if appointment.end_time else None
        }

    async def search_doctors(
        self,
        db: AsyncSession,
        entity_id: UUID,
        specialty_name: Optional[str] = None
    ) -> List[dict]:
        """Search doctors by specialty name (for chatbot)"""
        query = select(Doctor).options(
            selectinload(Doctor.specialty)
        ).filter(Doctor.entity_id == entity_id, Doctor.is_active == True)
        
        result = await db.execute(query)
        doctors = result.scalars().all()
        
        matching_doctors = []
        for doctor in doctors:
            if specialty_name:
                if doctor.specialty and specialty_name.lower() in doctor.specialty.name.lower():
                    matching_doctors.append({
                        "doctor_id": str(doctor.doctor_id),
                        "name": f"Dr. {doctor.first_name} {doctor.last_name}",
                        "specialty": doctor.specialty.name if doctor.specialty else None
                    })
            else:
                matching_doctors.append({
                    "doctor_id": str(doctor.doctor_id),
                    "name": f"Dr. {doctor.first_name} {doctor.last_name}",
                    "specialty": doctor.specialty.name if doctor.specialty else None
                })
        
        return matching_doctors


# Singleton
appointment_service = AppointmentService()
