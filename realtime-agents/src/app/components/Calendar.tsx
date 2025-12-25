'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDateString } from '@/app/lib/utils';

interface CalendarProps {
  datesWithEntries?: Set<string>;
  onDateSelect?: (date: Date, dateString: string) => void;
  allowFutureDates?: boolean;
  initialDate?: Date;
}

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Calendar({
  datesWithEntries = new Set(),
  onDateSelect,
  allowFutureDates = false,
  initialDate,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => initialDate || new Date());

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateString(today), [today]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const { startingDayOfWeek, daysInMonth } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      startingDayOfWeek: firstDay.getDay(),
      daysInMonth: lastDay.getDate(),
    };
  }, [year, month]);

  const calendarGrid = useMemo(() => {
    const grid: (number | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      grid.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(day);
    }

    const remainder = grid.length % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        grid.push(null);
      }
    }

    return grid;
  }, [startingDayOfWeek, daysInMonth]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  }, []);

  const handleDateClick = useCallback((day: number) => {
    const dateObj = new Date(year, month, day);
    const dateStr = formatDateString(dateObj);
    onDateSelect?.(dateObj, dateStr);
  }, [year, month, onDateSelect]);

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="w-full">
      {/* Header with month navigation */}
      <header className="pb-8 px-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="w-12 h-12 rounded-full flex items-center justify-center text-amber-900/80 hover:bg-amber-100 hover:text-amber-700 transition-all duration-300 backdrop-blur-sm border border-amber-200/50 hover:border-amber-300/70 shadow-md hover:shadow-lg hover:scale-105 bg-white/80"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h1 className="font-serif text-4xl md:text-5xl text-amber-900/90 font-semibold tracking-tight">{monthName}</h1>
            <p className="text-amber-800/75 text-lg mt-2 font-serif font-normal">{year}</p>
          </div>

          <button
            onClick={() => navigateMonth('next')}
            className="w-12 h-12 rounded-full flex items-center justify-center text-amber-900/80 hover:bg-amber-100 hover:text-amber-700 transition-all duration-300 backdrop-blur-sm border border-amber-200/50 hover:border-amber-300/70 shadow-md hover:shadow-lg hover:scale-105 bg-white/80"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Calendar grid */}
      <div className="max-w-xl mx-auto">
        {/* Day name headers */}
        <div className="grid grid-cols-7 mb-4">
          {DAY_NAMES.map((dayName, i) => (
            <div
              key={i}
              className="text-center text-sm font-bold text-amber-800/70 py-3 font-serif tracking-wide"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarGrid.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(year, month, day);
            const isToday = dateStr === todayStr;
            const hasEntry = datesWithEntries.has(dateStr);
            const isFuture = dateObj > today;
            const isDisabled = isFuture && !allowFutureDates;

            return (
              <button
                key={dateStr}
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                className={cn(
                  "aspect-square rounded-3xl flex flex-col items-center justify-center transition-all duration-300 relative group backdrop-blur-sm",
                  isToday && "bg-gradient-to-br from-primary via-primary to-primary-hover text-white shadow-xl shadow-primary/40 ring-2 ring-primary/50 scale-105",
                  !isToday && !isDisabled && "bg-white/70 hover:bg-white/90 border-2 border-primary/15 hover:border-primary/40 hover:shadow-lg hover:scale-105 active:scale-100",
                  isDisabled && "opacity-30 cursor-not-allowed bg-white/40"
                )}
                aria-label={`${day} ${monthName} ${year}${hasEntry ? ', has entry' : ''}`}
              >
                <span
                  className={cn(
                    "text-base font-bold font-serif",
                    isToday && "text-white",
                    !isToday && !isDisabled && "text-amber-900/85 group-hover:text-amber-700",
                    isDisabled && "text-amber-800/40"
                  )}
                >
                  {day}
                </span>

                {hasEntry && (
                  <span
                    className={cn(
                      "absolute bottom-2 w-2 h-2 rounded-full shadow-sm",
                      isToday ? "bg-white/90 ring-1 ring-white/50" : "bg-amber-500 ring-1 ring-amber-300/40"
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Calendar;

