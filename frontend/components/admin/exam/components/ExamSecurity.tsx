import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput } from '../ExamForm';

interface ExamSecurityProps {
  register: UseFormRegister<ExamFormInput>;
  errors: FieldErrors<ExamFormInput>;
}

export function ExamSecurity({ register, errors }: ExamSecurityProps) {
  return (
    <div className="pt-4 border-t border-primary/10">
      <h3 className="text-sm font-semibold text-primary mb-3">Security & Limits</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="maxAttempts" className="block text-sm font-semibold text-primary mb-2">
            Max Attempts
          </label>
          <Input
            id="maxAttempts"
            type="number"
            min="1"
            {...register('maxAttempts')}
            placeholder="Unlimited if empty"
            className="w-full"
          />
          <p className="text-xs text-primary/60 mt-1">Leave empty for unlimited attempts.</p>
          {errors.maxAttempts && (
            <p className="mt-1.5 text-sm text-red-500">{errors.maxAttempts.message as string}</p>
          )}
        </div>
        <div>
          <label htmlFor="maxTabSwitches" className="block text-sm font-semibold text-primary mb-2">
            Max Tab Switches
          </label>
          <Input
            id="maxTabSwitches"
            type="number"
            min="0"
            {...register('maxTabSwitches')}
            placeholder="Unlimited if empty"
            className="w-full"
          />
          <p className="text-xs text-primary/60 mt-1">Warning shown on switch. Auto-submit if exceeded.</p>
          {errors.maxTabSwitches && (
            <p className="mt-1.5 text-sm text-red-500">{errors.maxTabSwitches.message as string}</p>
          )}
        </div>
      </div>
    </div>
  );
}
