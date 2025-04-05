'use client'

import { useState, useEffect } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addWeeks } from 'date-fns';
import he from 'date-fns/locale/he';
import axios from 'axios';
import { heIL } from '@mui/x-date-pickers/locales';
import { heIL as coreHeIL } from '@mui/material/locale';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Checkbox, FormControlLabel } from '@mui/material';

const API_URL = "PASTE_YOUR_URL_HERE";
const allowedSlots = {
  0: ['14:00', '14:30', '15:00'], // Sunday
  1: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'], // Monday
  4: ['16:00', '16:30'] // Thursday
};

const durations = [30, 45, 60];

const theme = createTheme(
  {
    palette: {
      primary: { main: '#1976d2' }
    },
  },
  heIL, coreHeIL
);

export default function LessonScheduler() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [open, setOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState(30);
  const [isPackage, setIsPackage] = useState(false);
  const [cancelDate, setCancelDate] = useState('');
  const [vacationDates, setVacationDates] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setBookedSlots(data));
  }, []);

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <Button onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>חודש קודם</Button>
      <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy', { locale: he })}</h2>
      <Button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>חודש הבא</Button>
    </div>
  );

  const renderDays = () => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return <div className="grid grid-cols-7 text-center font-bold">{days.map((d) => <div key={d}>{d}</div>)}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const weekday = cloneDay.getDay();
        const dateStr = format(cloneDay, 'yyyy-MM-dd');
        const isVacation = vacationDates.includes(dateStr);
        const isAvailable = allowedSlots[weekday] && isSameMonth(day, currentMonth) && !isVacation;

        days.push(
          <div
            key={day.toString()}
            className={`p-2 h-20 border text-sm cursor-pointer ${isAvailable ? 'bg-green-100 hover:bg-green-300' : 'bg-gray-100'} ${isSameDay(day, selectedDate ?? new Date()) ? 'border-blue-500' : ''}`}
            onClick={() => isAvailable && handleDateClick(cloneDay)}
          >
            {format(day, 'd', { locale: he })}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div>{rows}</div>;
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const baseLesson = {
      studentName,
      phone,
      duration,
    };

    const baseDate = selectedDate!;
    const lessons = [];

    if (isPackage) {
      for (let i = 0; i < 8; i++) {
        const nextDate = addWeeks(baseDate, i);
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        if (cancelDate === dateStr || vacationDates.includes(dateStr)) continue;
        lessons.push({ ...baseLesson, date: dateStr, time: selectedTime });
      }
    } else {
      lessons.push({ ...baseLesson, date: format(baseDate, 'yyyy-MM-dd'), time: selectedTime });
    }

    for (const lesson of lessons) {
      await axios.post(API_URL, lesson);
    }

    setOpen(false);
  };

  const renderDialog = () => {
    if (!selectedDate) return null;
    const weekday = selectedDate.getDay();
    const times = allowedSlots[weekday] || [];
    const usedTimes = bookedSlots.map((r) => r[0] === format(selectedDate, 'yyyy-MM-dd') ? r[1] : null);
    const availableTimes = times.filter(t => !usedTimes.includes(t));

    return (
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>בחירת שיעור</DialogTitle>
        <DialogContent className="flex flex-col gap-2">
          <div>תאריך: {format(selectedDate, 'dd/MM/yyyy')}</div>
          <TextField select label="שעה" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
            {availableTimes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select label="משך" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {durations.map((d) => <MenuItem key={d} value={d}>{d} דקות</MenuItem>)}
          </TextField>
          <TextField label="שם תלמיד" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
          <TextField label="טלפון" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <FormControlLabel
            control={<Checkbox checked={isPackage} onChange={(e) => setIsPackage(e.target.checked)} />}
            label="חבילת 8 שיעורים"
          />
          {isPackage && (
            <TextField label="תאריך לביטול (אחד)" placeholder="YYYY-MM-DD" value={cancelDate} onChange={(e) => setCancelDate(e.target.value)} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSubmit}>שמור</Button>
          <Button onClick={() => setOpen(false)}>ביטול</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="p-4 max-w-4xl mx-auto">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
        {renderDialog()}
      </div>
    </ThemeProvider>
  );
}
