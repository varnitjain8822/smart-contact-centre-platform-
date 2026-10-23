export function SegmentedControl<V extends string>({ name, legend, value, options, onChange }: {
  name: string; legend: string; value: V; options: { value: V; label: string }[]; onChange(v: V): void;
}) {
  return (
    <fieldset className="inline-flex rounded-pill border border-line bg-surface-2/70 p-1">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="relative">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)}
            className="peer absolute inset-0 cursor-pointer opacity-0" />
          <span className="flex min-h-10 min-w-11 items-center justify-center rounded-pill px-4 text-sm font-semibold text-ink-2 transition-colors
            peer-hover:text-ink peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-card
            peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
