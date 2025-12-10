"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import { TimeSlot } from "@/types";

const DAYS_OF_WEEK = [
    "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"
];

const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

interface Appointment {
    appointment_id: string;
    patient_name: string;
    patient_email: string;
    patient_phone: string;
    date: string;
    start_time: string;
    end_time: string;
    reason: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
}

export default function DoctorSchedulePage() {
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const [slotForm, setSlotForm] = useState({
        day_of_week: 0,
        start_time: "09:00",
        end_time: "12:00"
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const doctorId = localStorage.getItem("doctor_id");
        if (!doctorId) return;

        setIsLoading(true);
        try {
            const [slotsRes, apptsRes] = await Promise.all([
                api.get<TimeSlot[]>(`/timeslots?doctor_id=${doctorId}`),
                api.get<Appointment[]>(`/appointments?doctor_id=${doctorId}`)
            ]);
            setTimeSlots(slotsRes.data || []);
            setAppointments(apptsRes.data || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        const doctorId = localStorage.getItem("doctor_id");
        if (!doctorId) return;

        try {
            await api.post("/timeslots", {
                doctor_id: doctorId,
                day_of_week: slotForm.day_of_week,
                start_time: slotForm.start_time,
                end_time: slotForm.end_time,
                is_recurring: true
            });
            setShowForm(false);
            setSlotForm({ day_of_week: 0, start_time: "09:00", end_time: "12:00" });
            fetchData();
        } catch (error) {
            console.error("Failed to create time slot", error);
            alert("Erreur lors de la création du créneau");
        }
    };

    const handleDeleteSlot = async (slotId: string) => {
        if (!confirm("Supprimer ce créneau ?")) return;
        try {
            await api.delete(`/timeslots/${slotId}`);
            fetchData();
        } catch (error) {
            console.error("Failed to delete time slot", error);
        }
    };

    const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
        try {
            await api.put(`/appointments/${appointmentId}`, { status });
            fetchData();
        } catch (error) {
            console.error("Failed to update appointment", error);
        }
    };

    // Calendar functions
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const getAppointmentsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return appointments.filter(apt => apt.date === dateStr);
    };

    const getSlotsForDate = (date: Date) => {
        // JS: getDay() -> 0 = Sunday, 1 = Monday ...
        // Our DAYS_OF_WEEK index: 0 = Lundi (Monday)
        const jsDay = date.getDay();
        const weekdayIndex = (jsDay + 6) % 7; // convert to 0=Monday

        const dateStr = date.toISOString().split('T')[0];

        return timeSlots.filter(slot => {
            if (!slot) return false;
            // recurring weekly slots
            if (slot.is_recurring && slot.day_of_week === weekdayIndex) return true;
            // one-off slots (assumes slot.specific_date in YYYY-MM-DD or null)
            if (!slot.is_recurring && slot.specific_date === dateStr) return true;
            return false;
        }).sort((a,b) => a.start_time.localeCompare(b.start_time));
    };

    const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    // Get slots by day
    const slotsByDay = DAYS_OF_WEEK.map((day, index) => ({
        day,
        index,
        slots: timeSlots.filter((s) => s.is_recurring && s.day_of_week === index)
    }));

    // Calendar grid
    const calendarDays = [];
    const firstDay = getFirstDayOfMonth(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);

    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    // Selected date derived data
    const slotsForSelected = selectedDate ? getSlotsForDate(selectedDate) : [];
    const apptsForSelected = selectedDate ? getAppointmentsForDate(selectedDate) : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Planning du médecin</h1>
                    <p className="text-muted-foreground">
                        Gérez vos créneaux et rendez-vous
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un créneau
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Chargement...</div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left: Calendar */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Calendar Widget */}
                        <Card className="overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white pb-4">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={previousMonth}
                                        className="text-white hover:bg-blue-600"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <h2 className="text-xl font-semibold">
                                        {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={nextMonth}
                                        className="text-white hover:bg-blue-600"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                {/* Days header */}
                                <div className="grid grid-cols-7 gap-2 mb-2">
                                    {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map(day => (
                                        <div key={day} className="text-center font-semibold text-sm text-muted-foreground">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                {/* Calendar grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {calendarDays.map((date, index) => {
                                        const appts = date ? getAppointmentsForDate(date) : [];
                                        const isToday = date && new Date().toDateString() === date.toDateString();
                                        const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();

                                        return (
                                            <div
                                                key={index}
                                                onClick={() => date && setSelectedDate(date)}
                                                className={`
                                                    h-24 p-2 rounded border cursor-pointer transition-all
                                                    ${!date ? 'bg-muted opacity-30' : ''}
                                                    ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                                                    ${isSelected ? 'bg-blue-100 border-blue-600' : 'hover:bg-gray-50'}
                                                    ${appts.length > 0 ? 'ring-2 ring-amber-400' : ''}
                                                `}
                                            >
                                                {date && (
                                                    <div className="h-full flex flex-col">
                                                        <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                                                            {date.getDate()}
                                                        </span>
                                                        {appts.length > 0 && (
                                                            <div className="flex-1 flex items-end">
                                                                <div className="text-xs bg-amber-100 text-amber-800 px-1 py-0.5 rounded whitespace-nowrap">
                                                                    {appts.length} RDV
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Selected Date Details: slots + appointments */}
                        {selectedDate && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CalendarIcon className="h-5 w-5" />
                                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Left: Available slots for the selected date */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Créneaux disponibles</h4>
                                            {slotsForSelected.length === 0 ? (
                                                <p className="text-muted-foreground">Aucun créneau défini pour cette date</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {slotsForSelected.map(slot => {
                                                        const isBooked = apptsForSelected.some(a => a.start_time === slot.start_time && a.end_time === slot.end_time);
                                                        return (
                                                            <div key={slot.slot_id} className={`flex items-center justify-between p-2 rounded border ${isBooked ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                                                                <div>
                                                                    <div className="font-mono text-sm">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</div>
                                                                    <div className="text-xs text-muted-foreground">{slot.is_recurring ? 'Récurrent' : (slot.specific_date || '')}</div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isBooked ? (
                                                                        <span className="text-xs text-red-600">Occupé</span>
                                                                    ) : (
                                                                        <Button size="sm" onClick={() => alert(`Ce créneau ${slot.start_time} réservé manuellement (implémenter)`)}>
                                                                            Réserver
                                                                        </Button>
                                                                    )}
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.slot_id)}>
                                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Appointments list for the selected date */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Rendez-vous</h4>
                                                {apptsForSelected.length === 0 ? (
                                                    <p className="text-muted-foreground">Aucun rendez-vous ce jour</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {apptsForSelected.map(apt => (
                                                            <div key={apt.appointment_id} className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-transparent hover:shadow-md transition-shadow">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div>
                                                                        <h4 className="font-semibold text-sm">{apt.patient_name}</h4>
                                                                        <p className="text-xs text-muted-foreground">{apt.patient_email}</p>
                                                                    </div>
                                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                                        apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                        apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {apt.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm font-mono text-blue-600 mb-2">{apt.start_time} - {apt.end_time}</p>
                                                                <p className="text-sm text-gray-700 mb-2"><strong>Motif:</strong> {apt.reason}</p>
                                                                <p className="text-xs text-gray-500 mb-2"><strong>Téléphone:</strong> {apt.patient_phone}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right: Slots for selected date and summary */}
                    <div className="space-y-4">
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Créneaux pour la date sélectionnée
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {!selectedDate ? (
                                    <p className="text-sm text-muted-foreground">Sélectionnez une date dans le calendrier pour voir les créneaux disponibles.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {slotsForSelected.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Aucun créneau défini pour cette date</p>
                                        ) : (
                                            slotsForSelected.map(slot => {
                                                const isBooked = apptsForSelected.some(a => a.start_time === slot.start_time && a.end_time === slot.end_time);
                                                return (
                                                    <div key={slot.slot_id} className={`flex items-center justify-between p-2 rounded border ${isBooked ? 'bg-red-50 border-red-200' : 'bg-white'} `}>
                                                        <div>
                                                            <div className="font-mono text-sm">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</div>
                                                            <div className="text-xs text-muted-foreground">{slot.is_recurring ? 'Récurrent' : (slot.specific_date || '')}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isBooked ? (
                                                                <span className="text-xs text-red-600">Occupé</span>
                                                            ) : (
                                                                <Button size="sm" onClick={() => alert(`Réserver ${slot.start_time} (implémenter)`)}>
                                                                    Réserver
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.slot_id)}>
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Appointments Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Résumé</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total rendez-vous:</span>
                                    <span className="font-semibold">{appointments.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">En attente:</span>
                                    <span className="font-semibold text-amber-600">
                                        {appointments.filter(a => a.status === 'pending').length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Confirmés:</span>
                                    <span className="font-semibold text-green-600">
                                        {appointments.filter(a => a.status === 'confirmed').length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Complétés:</span>
                                    <span className="font-semibold text-blue-600">
                                        {appointments.filter(a => a.status === 'completed').length}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Add Slot Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <CardTitle>Ajouter un créneau</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleAddSlot} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Jour de la semaine</Label>
                                    <select
                                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                                        value={slotForm.day_of_week}
                                        onChange={(e) => setSlotForm({ ...slotForm, day_of_week: parseInt(e.target.value) })}
                                    >
                                        {DAYS_OF_WEEK.map((day, index) => (
                                            <option key={index} value={index}>
                                                {day}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Heure début</Label>
                                        <Input
                                            type="time"
                                            value={slotForm.start_time}
                                            onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Heure fin</Label>
                                        <Input
                                            type="time"
                                            value={slotForm.end_time}
                                            onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                                        Annuler
                                    </Button>
                                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                                        Créer
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
