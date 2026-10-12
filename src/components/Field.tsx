import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, with ids wired for screen readers via aria-describedby on the control. */
export function Field({ id, label, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={`field${error ? ' field--invalid' : ''}${className ? ` ${className}` : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required ? <span className="field__req" aria-hidden="true"> *</span> : <span className="field__opt"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const describedBy = (id: string, error?: string, hint?: unknown) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;
