import { useState } from "react";

interface MiniCalendarProps {
  /** ISO date strings to highlight, e.g. ["2026-04-04T00:00:00.000Z"] */
  dates: (string | undefined)[];
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDate(iso: string): { year: number; month: number; day: number } {
  const d = new Date(iso);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function MiniCalendar({ dates }: MiniCalendarProps) {
  const validDates = dates.filter(Boolean) as string[];
  const parsed = validDates.map(parseDate);

  // Start at the month of the earliest highlighted date, or current month
  const earliest = parsed.length
    ? parsed.reduce((a, b) => (a.year * 12 + a.month < b.year * 12 + b.month ? a : b))
    : { year: new Date().getFullYear(), month: new Date().getMonth(), day: 1 };

  const [year, setYear] = useState(earliest.year);
  const [month, setMonth] = useState(earliest.month);

  // Only show nav arrows when dates span more than one month
  const uniqueMonths = new Set(parsed.map((d) => `${d.year}-${d.month}`));
  const showNav = uniqueMonths.size > 1;

  const highlightedDays = new Set(
    parsed
      .filter((d) => d.year === year && d.month === month)
      .map((d) => d.day)
  );

  const totalDays = daysInMonth(year, month);
  const startOffset = firstDayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal__header">
        {showNav ? (
          <button type="button" className="mini-cal__nav" onClick={prev} aria-label="Previous month">‹</button>
        ) : (
          <span className="mini-cal__nav-placeholder" />
        )}
        <span className="mini-cal__month-label">{MONTH_NAMES[month]} {year}</span>
        {showNav ? (
          <button type="button" className="mini-cal__nav" onClick={next} aria-label="Next month">›</button>
        ) : (
          <span className="mini-cal__nav-placeholder" />
        )}
      </div>

      <div className="mini-cal__grid">
        {DAY_LABELS.map((d) => (
          <span key={d} className="mini-cal__day-label">{d}</span>
        ))}
        {cells.map((day, idx) => (
          <span
            key={idx}
            className={
              day === null
                ? "mini-cal__cell mini-cal__cell--empty"
                : highlightedDays.has(day)
                ? "mini-cal__cell mini-cal__cell--highlighted"
                : "mini-cal__cell"
            }
          >
            {day ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
