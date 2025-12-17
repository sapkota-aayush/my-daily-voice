import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  /** Set of date strings (YYYY-MM-DD) that have entries */
  datesWithEntries?: Set<string>;
  /** Callback when a date is selected */
  onDateSelect?: (date: Date, dateString: string) => void;
  /** Whether to allow selecting future dates */
  allowFutureDates?: boolean;
  /** Initial date to display (defaults to today) */
  initialDate?: Date;
}

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * A minimal, warm calendar component that:
 * - Works dynamically for any month/year
 * - Handles leap years automatically via JS Date
 * - Shows entry indicators as dots
 * - Highlights today's date
 * - Supports month navigation
 */
export function Calendar({
  datesWithEntries = new Set(),
  onDateSelect,
  allowFutureDates = false,
  initialDate,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => initialDate || new Date());

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateString(today), [today]);

  // Current view month/year
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Month calculations - JS Date handles all edge cases including leap years
  const { startingDayOfWeek, daysInMonth } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // Day 0 of next month = last day of current
    return {
      startingDayOfWeek: firstDay.getDay(), // 0 = Sunday
      daysInMonth: lastDay.getDate(),
    };
  }, [year, month]);

  // Build calendar grid with proper empty cells
  const calendarGrid = useMemo(() => {
    const grid: (number | null)[] = [];

    // Empty cells before first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      grid.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(day);
    }

    // Fill remaining cells to complete last row (optional, for consistent height)
    const remainder = grid.length % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        grid.push(null);
      }
    }

    return grid;
  }, [startingDayOfWeek, daysInMonth]);

  // Navigate months
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  }, []);

  // Handle date click
  const handleDateClick = useCallback((day: number) => {
    const dateObj = new Date(year, month, day);
    const dateStr = formatDateString(dateObj);
    onDateSelect?.(dateObj, dateStr);
  }, [year, month, onDateSelect]);

  // Format display
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="w-full">
      {/* Header with month navigation */}
      <header className="pb-6 px-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h1 className="font-display text-3xl text-foreground">{monthName}</h1>
            <p className="text-muted-foreground text-sm mt-1">{year}</p>
          </div>

          <button
            onClick={() => navigateMonth('next')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Calendar grid */}
      <div className="max-w-md mx-auto">
        {/* Day name headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES.map((dayName, i) => (
            <div
              key={i}
              className="text-center text-xs text-muted-foreground font-medium py-2"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((day, i) => {
            // Empty cell
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
                  "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-200 relative",
                  isToday && "bg-primary/10 ring-2 ring-primary/30",
                  !isToday && !isDisabled && "hover:bg-secondary/60 active:scale-95",
                  isDisabled && "opacity-30 cursor-not-allowed"
                )}
                aria-label={`${day} ${monthName} ${year}${hasEntry ? ', has entry' : ''}`}
              >
                <span
                  className={cn(
                    "text-base font-medium",
                    isToday && "text-primary",
                    !isToday && "text-foreground"
                  )}
                >
                  {day}
                </span>

                {/* Entry indicator dot */}
                {hasEntry && (
                  <span
                    className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary/60"
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

/**
 * Formats a Date object to YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default Calendar;

