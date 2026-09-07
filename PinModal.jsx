import React, { useEffect, useRef, useState } from 'react';
import { useGuardian } from '../context/GuardianContext';

/**
 * Modal that blocks sensitive actions behind the parent PIN.
 * Shown whenever requirePin(title, callback) is called.
 */
export default function PinModal() {
  const { pinRequest, verifyPin, cancelPin } = useGuardian();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (pinRequest) {
      setPin('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pinRequest]);

  if (!pinRequest) return null;

  const submit = (e) => {
    e.preventDefault();
    const ok = verifyPin(pin);
    if (!ok) {
      setError(true);
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-900/20 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white bg-white/95 p-6 shadow-2xl shadow-violet-200 backdrop-blur fade-up">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-2xl">
          🔐
        </div>
        <h3 className="text-center text-lg font-bold text-slate-900">Parent verification</h3>
        <p className="mt-1 text-center text-sm text-slate-500">{pinRequest.title}</p>
        <form onSubmit={submit} className="mt-5">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setError(false);
            }}
            placeholder="Enter PIN"
            className={`w-full rounded-2xl border-2 px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold outline-none transition ${
              error
                ? 'border-rose-300 bg-rose-50 text-rose-500'
                : 'border-violet-100 focus:border-violet-300'
            }`}
          />
          {error && (
            <p className="mt-2 text-center text-xs font-medium text-rose-500">
              Incorrect PIN. Try again.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={cancelPin}
              className="flex-1 rounded-2xl border-2 border-violet-100 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-violet-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-violet-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
