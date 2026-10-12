import { useRef, useState, type DragEvent } from 'react';
import { ATTACHMENT_LIMITS } from '../api/types';
import { fileProblem, newKey, type PickedFile } from '../claim/claimForm';
import { formatBytes } from '../lib/format';

interface Props {
  files: PickedFile[];
  error?: string;
  onChange: (files: PickedFile[]) => void;
}

const ACCEPT = '.jpg,.jpeg,.png,.heic,.pdf,image/jpeg,image/png,image/heic,application/pdf';

export function AttachmentPicker({ files, error, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);

  function add(list: FileList | null) {
    if (!list) return;
    const accepted: PickedFile[] = [];
    const problems: { name: string; reason: string }[] = [];
    const room = ATTACHMENT_LIMITS.maxFilesPerClaim - files.length;

    for (const file of Array.from(list)) {
      const reason = fileProblem(file);
      if (reason) problems.push({ name: file.name, reason });
      else if (accepted.length >= room)
        problems.push({ name: file.name, reason: `Limit of ${ATTACHMENT_LIMITS.maxFilesPerClaim} files reached.` });
      else
        accepted.push({
          key: newKey(),
          file,
          // Browsers can't render HEIC or PDF thumbnails; those show an icon instead.
          previewUrl: /^image\/(jpeg|png)$/.test(file.type) ? URL.createObjectURL(file) : null,
        });
    }
    setRejected(problems);
    if (accepted.length) onChange([...files, ...accepted]);
  }

  function remove(f: PickedFile) {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    onChange(files.filter((x) => x.key !== f.key));
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <svg className="dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="dropzone__text">
          Drag photos and documents here, or{' '}
          <button type="button" className="btn btn--link" onClick={() => input.current?.click()}>
            browse your files
          </button>
        </p>
        <p className="dropzone__hint">
          JPG, PNG, HEIC or PDF · up to {ATTACHMENT_LIMITS.maxFileSizeMb} MB each · {ATTACHMENT_LIMITS.maxFilesPerClaim} files max
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {rejected.length > 0 && (
        <ul className="rejected" role="alert">
          {rejected.map((r, i) => (
            <li key={i}>
              <strong>{r.name}</strong> was not added: {r.reason}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="field__error" role="alert">{error}</p>}

      {files.length > 0 && (
        <ul className="thumbs" aria-label="Files to upload">
          {files.map((f) => (
            <li key={f.key} className="thumb">
              {f.previewUrl ? (
                <img src={f.previewUrl} alt="" className="thumb__img" />
              ) : (
                <span className="thumb__icon" aria-hidden="true">
                  {f.file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'HEIC'}
                </span>
              )}
              <span className="thumb__meta">
                <span className="thumb__name" title={f.file.name}>
                  {f.file.name}
                </span>
                <span className="thumb__size">{formatBytes(f.file.size)}</span>
              </span>
              <button type="button" className="thumb__remove" onClick={() => remove(f)} aria-label={`Remove ${f.file.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
