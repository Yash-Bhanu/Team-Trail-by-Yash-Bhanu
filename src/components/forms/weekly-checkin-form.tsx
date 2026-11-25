'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/form-controls';
import { toast } from 'sonner';

export function WeeklyCheckinForm({ teamId }: { teamId: string }) {
  const [completedWork, setCompletedWork] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockerDescription, setBlockerDescription] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState<number>(4);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/teams/${teamId}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedWork,
          isBlocked,
          blockerDescription: isBlocked ? blockerDescription : null,
          confidenceLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit check-in');
        return;
      }

      toast.success('Weekly check-in submitted!');
      setCompletedWork('');
      setIsBlocked(false);
      setBlockerDescription('');
    } catch {
      toast.error('Network error submitting check-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="completedWork">1. What did you complete this week?</Label>
        <Textarea
          id="completedWork"
          required
          maxLength={2000}
          value={completedWork}
          onChange={(e) => setCompletedWork(e.target.value)}
          placeholder="Briefly summarize your progress this week..."
          className="mt-1.5"
        />
        <p className="mt-1 text-right text-[11px] text-slate-400">{completedWork.length}/2000</p>
      </div>

      <div className="flex items-center gap-2.5">
        <input
          id="isBlocked"
          type="checkbox"
          checked={isBlocked}
          onChange={(e) => setIsBlocked(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
        />
        <Label htmlFor="isBlocked">2. Are you currently blocked?</Label>
      </div>

      {isBlocked && (
        <div>
          <Label htmlFor="blockerDescription">3. What assistance do you require?</Label>
          <Textarea
            id="blockerDescription"
            maxLength={1000}
            value={blockerDescription}
            onChange={(e) => setBlockerDescription(e.target.value)}
            placeholder="Describe what is blocking you so your mentor can help..."
            className="mt-1.5"
          />
        </div>
      )}

      <div>
        <Label>4. How confident are you about completing your assigned work? (1–5)</Label>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Confidence level">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setConfidenceLevel(n)}
              aria-pressed={confidenceLevel === n}
              className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
                confidenceLevel === n
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Submitting…' : 'Submit Weekly Check-in'}
      </Button>
    </form>
  );
}
