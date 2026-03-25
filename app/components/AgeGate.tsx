import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "ageVerified";
const EXPIRY_DAYS = 30;

function isVerified(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return false;
    return Date.now() - ts < EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function AgeGate() {
  // Start hidden (SSR); reveal or dismiss after mount
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isVerified()) setVisible(true);
  }, []);

  if (!visible) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);

    if (
      isNaN(m) || isNaN(d) || isNaN(y) ||
      m < 1 || m > 12 ||
      d < 1 || d > 31 ||
      y < 1900 || year.length !== 4
    ) {
      setError("Please enter a valid date of birth.");
      return;
    }

    const dob = new Date(y, m - 1, d);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      setError("You must be 18 years of age or older to access this site.");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
    setVisible(false);
  }

  function handleMonthChange(val: string) {
    const cleaned = val.replace(/\D/g, "").slice(0, 2);
    setMonth(cleaned);
    if (cleaned.length === 2) dayRef.current?.focus();
  }

  function handleDayChange(val: string) {
    const cleaned = val.replace(/\D/g, "").slice(0, 2);
    setDay(cleaned);
    if (cleaned.length === 2) yearRef.current?.focus();
  }

  function handleYearChange(val: string) {
    setYear(val.replace(/\D/g, "").slice(0, 4));
  }

  return (
    <div className="age-gate__backdrop" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate__panel">
        <div className="age-gate__logo-mark" aria-hidden="true">18+</div>
        <h2 className="age-gate__title" id="age-gate-title">Age Verification Required</h2>
        <p className="age-gate__body">
          This site contains content related to firearms and requires you to be
          18 years of age or older to enter. Please enter your date of birth to continue.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <p className="age-gate__label">Date of Birth</p>
          <div className="age-gate__inputs">
            <div className="age-gate__field">
              <input
                className={`age-gate__input${error ? " is-error" : ""}`}
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                aria-label="Birth month"
                autoFocus
              />
            </div>
            <span className="age-gate__sep">/</span>
            <div className="age-gate__field">
              <input
                ref={dayRef}
                className={`age-gate__input${error ? " is-error" : ""}`}
                type="text"
                inputMode="numeric"
                placeholder="DD"
                maxLength={2}
                value={day}
                onChange={(e) => handleDayChange(e.target.value)}
                aria-label="Birth day"
              />
            </div>
            <span className="age-gate__sep">/</span>
            <div className="age-gate__field age-gate__field--year">
              <input
                ref={yearRef}
                className={`age-gate__input${error ? " is-error" : ""}`}
                type="text"
                inputMode="numeric"
                placeholder="YYYY"
                maxLength={4}
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                aria-label="Birth year"
              />
            </div>
          </div>

          {error && <p className="age-gate__error">{error}</p>}

          <button type="submit" className="btn btn--outline age-gate__btn">
            Enter Site
          </button>
        </form>

        <p className="age-gate__disclaimer">
          By entering, you confirm you are 18 or older.
        </p>
      </div>
    </div>
  );
}
