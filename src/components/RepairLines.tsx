import { MAX_REPAIR_LINES } from '../api/types';
import { HOURS_MAX, MONEY_MAX, emptyLine, lineTotals, type FormErrors, type RepairLine } from '../claim/claimForm';
import { formatHours, formatMoney } from '../lib/format';
import { Field, describedBy } from './Field';

interface Props {
  lines: RepairLine[];
  errors: FormErrors;
  onChange: (lines: RepairLine[]) => void;
}

const NUMBER_FIELDS: { field: keyof RepairLine; label: string; unit: 'hrs' | '$' }[] = [
  { field: 'mechanical', label: 'Mechanical labor', unit: 'hrs' },
  { field: 'body', label: 'Body repair labor', unit: 'hrs' },
  { field: 'refinish', label: 'Refinish', unit: 'hrs' },
  { field: 'paints', label: 'Paints & materials', unit: '$' },
  { field: 'parts', label: 'Parts cost', unit: '$' },
];

export function RepairLines({ lines, errors, onChange }: Props) {
  const update = (key: string, patch: Partial<RepairLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key));
  const totals = lineTotals(lines);

  return (
    <>
      <ol className="lines">
        {lines.map((line, i) => {
          const descId = `line-${line.key}-description`;
          const descErr = errors[`lines.${i}.description`];
          return (
            <li key={line.key} className="line">
              <div className="line__head">
                <h3 className="line__title">Repair line {i + 1}</h3>
                {lines.length > 1 && (
                  <button type="button" className="btn btn--link btn--danger" onClick={() => remove(line.key)}>
                    Remove
                  </button>
                )}
              </div>

              <Field id={descId} label="Description of repair and parts replaced" required error={descErr}>
                <textarea
                  id={descId}
                  rows={3}
                  maxLength={4000}
                  value={line.description}
                  aria-invalid={!!descErr}
                  aria-describedby={describedBy(descId, descErr)}
                  placeholder="e.g. Repair and refinish right rear door; replace RR door moulding 91112FL000"
                  onChange={(e) => update(line.key, { description: e.target.value })}
                />
              </Field>

              <div className="line__numbers">
                {NUMBER_FIELDS.map(({ field, label, unit }) => {
                  const id = `line-${line.key}-${field}`;
                  const err = errors[`lines.${i}.${field}`];
                  return (
                    <Field key={field} id={id} label={label} required error={err} className="field--compact">
                      <div className={`affix affix--${unit === '$' ? 'prefix' : 'suffix'}`}>
                        {unit === '$' && <span className="affix__unit" aria-hidden="true">$</span>}
                        <input
                          id={id}
                          inputMode="decimal"
                          autoComplete="off"
                          // "100.00" / "99,999.99": the range itself is enforced by validate().
                          maxLength={unit === 'hrs' ? 6 : 9}
                          title={unit === 'hrs' ? `Up to ${HOURS_MAX} hours` : `Up to $${MONEY_MAX.toLocaleString('en-US')}`}
                          placeholder="0.00"
                          value={line[field]}
                          aria-invalid={!!err}
                          aria-describedby={describedBy(id, err)}
                          onChange={(e) => update(line.key, { [field]: e.target.value })}
                        />
                        {unit === 'hrs' && <span className="affix__unit" aria-hidden="true">hrs</span>}
                      </div>
                    </Field>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {errors.lines && <p className="field__error" role="alert">{errors.lines}</p>}

      <button
        type="button"
        className="btn btn--secondary"
        disabled={lines.length >= MAX_REPAIR_LINES}
        onClick={() => onChange([...lines, emptyLine()])}
      >
        + Add another repair line
      </button>

      <dl className="totals" aria-label="Running totals">
        <div>
          <dt>Mechanical labor</dt>
          <dd>{formatHours(totals.mechanical)} hrs</dd>
        </div>
        <div>
          <dt>Body &amp; refinish labor</dt>
          <dd>{formatHours(totals.bodyRefinish)} hrs</dd>
        </div>
        <div>
          <dt>Paints &amp; materials</dt>
          <dd>{formatMoney(totals.paints)}</dd>
        </div>
        <div>
          <dt>Parts</dt>
          <dd>{formatMoney(totals.parts)}</dd>
        </div>
      </dl>
      <p className="note">
        Labor hours are priced at your dealership's warranty labor rate by SDC. The claim total is shown after submission.
      </p>
    </>
  );
}
