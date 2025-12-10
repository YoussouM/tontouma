#!/usr/bin/env python
"""Test script to verify BookAppointmentResponse schema validation"""
from datetime import date, time
from uuid import UUID, uuid4

import sys
sys.path.insert(0, r"c:\Users\hp\Documents\Projets\TonToumaBot")

from app.schemas.appointment import BookAppointmentResponse

# Test 1: Response with all fields
print("Test 1: Response with all fields...")
try:
    response1 = BookAppointmentResponse(
        success=True,
        appointment_id=uuid4(),
        message="Test message",
        doctor_name="Dr. Test",
        date=date(2025, 12, 13),
        start_time=time(15, 0),
        end_time=time(15, 30)
    )
    print("✓ Test 1 passed")
    print(f"  {response1.model_dump_json()}")
except Exception as e:
    print(f"✗ Test 1 failed: {e}")

# Test 2: Response with None fields
print("\nTest 2: Response with None fields...")
try:
    response2 = BookAppointmentResponse(
        success=False,
        message="Error message"
    )
    print("✓ Test 2 passed")
    print(f"  {response2.model_dump_json()}")
except Exception as e:
    print(f"✗ Test 2 failed: {e}")

# Test 3: Response with mixed fields
print("\nTest 3: Response with mixed fields...")
try:
    response3 = BookAppointmentResponse(
        success=True,
        appointment_id=uuid4(),
        message="Success",
        doctor_name="Dr. Test",
        date=date(2025, 12, 13),
        start_time=None,
        end_time=None
    )
    print("✓ Test 3 passed")
    print(f"  {response3.model_dump_json()}")
except Exception as e:
    print(f"✗ Test 3 failed: {e}")

print("\n✅ All tests completed!")
