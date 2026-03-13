import { InputField, SelectField, TextareaField } from '@/components/ui/Field';
import { ApplicationStatus, CreateApplicationRequest } from '@/types';

type Props = {
  form: CreateApplicationRequest;
  onFieldChange: <K extends keyof CreateApplicationRequest>(key: K, value: CreateApplicationRequest[K]) => void;
};

const statuses: ApplicationStatus[] = ['draft', 'applied', 'interview', 'offer', 'rejected', 'archived'];

export default function ApplicationFormFields({ form, onFieldChange }: Props) {
  return (
    <>
      <section className="form-section">
        <div className="form-grid">
          <InputField
            label="Company"
            value={form.company_name}
            onChange={(value) => onFieldChange('company_name', value)}
            required
          />
          <InputField
            label="Job Title"
            value={form.job_title}
            onChange={(value) => onFieldChange('job_title', value)}
            required
          />
          <InputField
            label="Location"
            value={form.location || ''}
            onChange={(value) => onFieldChange('location', value)}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(value) => onFieldChange('status', value as ApplicationStatus)}
            options={statuses.map((status) => ({ label: status, value: status }))}
          />
          <InputField
            label="Applied Date"
            className={form.status === 'applied' ? '' : 'field-muted'}
            value={form.applied_date || ''}
            onChange={(value) => onFieldChange('applied_date', value || null)}
            placeholder="2026-03-13"
            pattern="[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}"
            inputMode="numeric"
          />
        </div>
      </section>

      <section className="form-section">
        <TextareaField
          label="Job Description"
          value={form.job_description}
          onChange={(value) => onFieldChange('job_description', value)}
          rows={10}
        />
      </section>

      <details className="form-section extra-fields">
        <summary>Extra Info</summary>
        <div className="extra-fields-body">
          <InputField
            label="Job URL"
            type="url"
            value={form.job_url || ''}
            onChange={(value) => onFieldChange('job_url', value)}
          />
          <TextareaField
            label="CV Used"
            value={form.cv_used}
            onChange={(value) => onFieldChange('cv_used', value)}
            rows={8}
          />
          <TextareaField
            label="Notes"
            value={form.notes}
            onChange={(value) => onFieldChange('notes', value)}
            rows={7}
          />
        </div>
      </details>
    </>
  );
}
