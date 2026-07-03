import React, { useCallback, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cx } from './feedUtils.js';

export default function ImageUploader({ files, onChange, disabled }) {
  const inputRef = useRef(null);

  const addFiles = useCallback(
    (incoming) => {
      const list = Array.from(incoming || []).filter((f) => f.type.startsWith('image/'));
      if (!list.length) return;
      onChange([...(files || []), ...list]);
    },
    [files, onChange]
  );

  const onDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    addFiles(e.dataTransfer?.files);
  };

  const removeAt = (idx) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  const previews = (files || []).map((f) => ({
    file: f,
    url: URL.createObjectURL(f),
  }));

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cx(
          'flex flex-wrap items-center gap-2',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-slate-100"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Add image
        </button>
        <span className="text-xs text-slate-500">or drag & drop</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {previews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {previews.map((p, idx) => (
            <div key={`${p.file.name}-${idx}`} className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-slate-700">
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-slate-950/80 text-slate-200 hover:bg-slate-950"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
