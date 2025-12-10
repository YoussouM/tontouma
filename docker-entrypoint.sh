#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! nc -z db 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Run initialization scripts
echo "Running database initialization..."
python scripts/init_db.py

echo "Seeding hospital data..."
python scripts/seed_hopital_fann.py

echo "Creating specialties..."
python scripts/create_specialties.py

echo "Seeding doctors and appointments..."
python scripts/seed_doctors_appointments.py

echo "All initialization complete! Starting the application..."

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port 8000
