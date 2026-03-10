import { ChangeEvent, ReactNode } from 'react';

type BaseProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

type InputProps = BaseProps & {
  type?: 'text' | 'date' | 'url';
};

type TextareaProps = BaseProps & {
  rows?: number;
};

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
};

function wrapLabel(label: string, child: ReactNode) {
  return (
    <label>
      {label}
      {child}
    </label>
  );
}

export function InputField({ label, value, onChange, required, type = 'text' }: InputProps) {
  return wrapLabel(
    label,
    <input
      type={type}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      required={required}
    />
  );
}

export function TextareaField({ label, value, onChange, rows }: TextareaProps) {
  return wrapLabel(
    label,
    <textarea
      rows={rows}
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
    />
  );
}

export function SelectField({ label, value, onChange, options }: SelectProps) {
  return wrapLabel(
    label,
    <select value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
