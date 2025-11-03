"use client";

import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { occupation: string; ageRange: string }) => void;
};

const OCCUPATIONS = [
  { label: "Student", value: "student" },
  { label: "Researcher", value: "researcher" },
  { label: "Faculty / Staff", value: "faculty_staff" },
  { label: "Librarian", value: "librarian" },
  { label: "Community Member", value: "community" },
  { label: "Other", value: "other" },
];

const AGE_RANGES = [
  { label: "Under 18", value: "under_18" },
  { label: "18–24", value: "18_24" },
  { label: "25–34", value: "25_34" },
  { label: "35–44", value: "35_44" },
  { label: "45–54", value: "45_54" },
  { label: "55–64", value: "55_64" },
  { label: "65+", value: "65_plus" },
];

export default function DemographicsModal({ open, onClose, onSubmit }: Props) {
  const [occupation, setOccupation] = useState("");
  const [ageRange, setAgeRange] = useState("");

  useEffect(() => {
    if (!open) {
      setOccupation("");
      setAgeRange("");
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = occupation && ageRange;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-zinc-100 text-zinc-500 flex items-center justify-center"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
              <path d="M6.28 6.28a.75.75 0 011.06 0L10 8.94l2.66-2.66a.75.75 0 111.06 1.06L11.06 10l2.66 2.66a.75.75 0 11-1.06 1.06L10 11.06l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 10 6.28 7.34a.75.75 0 010-1.06z" />
            </svg>
          </button>

          <div className="px-6 pt-6 pb-4">
            <h2 className="text-xl font-semibold text-black">Welcome to Madison Book Library</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Before you begin, we'd like to collect some basic demographic information to better serve our community. This information is anonymous and helps us understand our users.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-zinc-700">Occupation / Role</label>
                <div className="mt-2 relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-800 pr-10"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                  >
                    <option value="" disabled>
                      Select your occupation
                    </option>
                    {OCCUPATIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                      <path d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.04 1.08l-4.23 3.97a.75.75 0 01-1.04 0L5.25 8.27a.75.75 0 01-.02-1.06z" />
                    </svg>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700">Age Range</label>
                <div className="mt-2 relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-800 pr-10"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                  >
                    <option value="" disabled>
                      Select your age range
                    </option>
                    {AGE_RANGES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                      <path d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.04 1.08l-4.23 3.97a.75.75 0 01-1.04 0L5.25 8.27a.75.75 0 01-.02-1.06z" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={() => canSubmit && onSubmit({ occupation, ageRange })}
              disabled={!canSubmit}
              className="w-full rounded-xl bg-zinc-500 text-white px-4 py-3 disabled:opacity-50"
            >
              Continue to Library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}