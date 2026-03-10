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
          type="date"
          value={form.applied_date || ''}
          onChange={(value) => onFieldChange('applied_date', value || null)}
        />
        <InputField
          label="Job URL"
          type="url"
          value={form.job_url || ''}
          onChange={(value) => onFieldChange('job_url', value)}
        />
      </div>

      <TextareaField
        label="Job Description"
        value={form.job_description}
        onChange={(value) => onFieldChange('job_description', value)}
      />
      <TextareaField
        label="CV Used"
        value={form.cv_used}
        onChange={(value) => onFieldChange('cv_used', value)}
      />
      <TextareaField
        label="Notes"
        value={form.notes}
        onChange={(value) => onFieldChange('notes', value)}
      />
    </>
  );
}
