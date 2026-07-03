import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { normalizeApiError } from '../../../services/errors';
import ImageUploader from './ImageUploader';
import { buildPollPayload, createOrgFeedEntry } from './feedPayload.js';
import { composerInputClass, cx } from './feedUtils.js';

export default function CreatePollCard({ visibility, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiryDate, setExpiryDate] = useState('');
  const [notifyEmployees, setNotifyEmployees] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const optionTexts = options.map((o) => o.trim()).filter(Boolean);
      if (optionTexts.length < 2) throw new Error('Add at least two poll options.');
      const payload = buildPollPayload({
        content: question,
        visibilityTab: visibility,
        optionTexts,
        expiryDate,
        notifyEmployees,
        isAnonymous,
      });
      return createOrgFeedEntry(payload, images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social', 'feed', visibility] });
      setQuestion('');
      setOptions(['', '']);
      setExpiryDate('');
      setNotifyEmployees(false);
      setIsAnonymous(false);
      setImages([]);
      setError('');
      onSuccess?.();
    },
    onError: (e) => {
      if (e instanceof Error && e.message && !e.isAxiosError) {
        setError(e.message);
      } else {
        setError(normalizeApiError(e).message);
      }
    },
  });

  const visibilityLabel = visibility === 'organization' ? 'Organization' : 'Department';

  const updateOption = (idx, val) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  };

  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (idx) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const valid =
    question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;

  return (
    <div className="mt-3 space-y-3">
      <input
        type="text"
        value={question}
        placeholder="Poll question"
        onChange={(e) => setQuestion(e.target.value)}
        className={composerInputClass}
      />
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 transition-all duration-200"
            style={{ animation: 'fadeIn 0.2s ease' }}
          >
            <input
              type="text"
              value={opt}
              placeholder={`Option ${idx + 1}`}
              onChange={(e) => updateOption(idx, e.target.value)}
              className={cx(composerInputClass, 'flex-1')}
            />
            {options.length > 2 ? (
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                aria-label="Remove option"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900/60"
        >
          <Plus className="h-3.5 w-3.5" />
          Add option
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-slate-400">
          Expiry date
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={cx(composerInputClass, 'mt-1')}
          />
        </label>
        <div className="flex flex-col justify-end gap-2 text-xs text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyEmployees}
              onChange={(e) => setNotifyEmployees(e.target.checked)}
              className="rounded border-slate-600"
            />
            Notify employees
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-slate-600"
            />
            Anonymous poll
          </label>
        </div>
      </div>
      <ImageUploader files={images} onChange={setImages} disabled={mutation.isPending} />
      <div className="flex items-center justify-between">
        <span className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-300">
          {visibilityLabel}
        </span>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900/60"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
        >
          {mutation.isPending ? 'Posting…' : 'Post'}
        </button>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
