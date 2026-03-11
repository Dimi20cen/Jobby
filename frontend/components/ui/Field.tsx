import { ChangeEvent, ReactNode } from 'react';

type BaseProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  className?: string;
};

type InputProps = BaseProps & {
  type?: 'text' | 'date' | 'url';
};

type TextareaProps = BaseProps & {
  rows?: number;
};

type SelectProps = Omit<BaseProps, 'required'> & {
  options: Array<{ label: string; value: string }>;
};

function wrapLabel(label: string, description: string | undefined, className: string | undefined, child: ReactNode) {
  return (
    <label className={className}>
      <span className="field-label-row">
        <span>{label}</span>
        {description ? <small className="field-hint">{description}</small> : null}
      </span>
      {child}
    </label>
  );
}

export function InputField({ label, value, onChange, required, description, className, type = 'text' }: InputProps) {
  return wrapLabel(
    label,
    description,
    className,
    <input
      type={type}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      required={required}
    />
  );
}

export function TextareaField({ label, value, onChange, rows, description, className }: TextareaProps) {
  return wrapLabel(
    label,
    description,
    className,
    <textarea
      rows={rows}
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
    />
  );
}

export function SelectField({ label, value, onChange, options, description, className }: SelectProps) {
  return wrapLabel(
    label,
    description,
    className,
    <select value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
