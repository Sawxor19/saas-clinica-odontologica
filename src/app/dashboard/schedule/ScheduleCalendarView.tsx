"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { ScheduleDayView } from "@/app/dashboard/schedule/ScheduleDayView";

type Appointment = {
  id: string;
  patient_id: string;
  procedure_id: string;
  charge_amount?: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
};

type Props = {
  initialDate: string;
  appointments: Appointment[];
  patientOptions: Array<{ id: string; full_name: string; phone?: string | null }>;
  procedureOptions: Array<{ id: string; name: string; price: number }>;
  dentistOptions: Array<{ user_id: string; full_name: string }>;
  roomOptions: Array<{ id: string; name: string }>;
  timeZone: string;
};

export function ScheduleCalendarView({
  initialDate,
  appointments,
  patientOptions,
  procedureOptions,
  dentistOptions,
  roomOptions,
  timeZone,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const [year, month, day] = initialDate.split("-").map((value) => Number(value));
    return new Date(year, (month || 1) - 1, day || 1);
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div>
        <Calendar value={selectedDate} onSelect={setSelectedDate} />
      </div>
      <div className="lg:col-span-2">
        <ScheduleDayView
          date={selectedDate}
          appointments={appointments}
          patientOptions={patientOptions}
          procedureOptions={procedureOptions}
          dentistOptions={dentistOptions}
          roomOptions={roomOptions}
          timeZone={timeZone}
        />
      </div>
    </div>
  );
}
