import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput } from '../ExamForm';

interface ExamBasicInfoProps {
  register: UseFormRegister<ExamFormInput>;
  errors: FieldErrors<ExamFormInput>;
}

export function ExamBasicInfo({ register, errors }: ExamBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-primary mb-2">
          Exam Title <span className="text-red-500">*</span>
        </label>
        <Input
          id="title"
          {...register('title')}
          placeholder="e.g. Midterm Assessment - Data Structures"
          className="w-full"
        />
        {errors.title && (
          <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-primary mb-2">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          {...register('description')}
          className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
          placeholder="Optional exam description or instructions for students"
        />
        {errors.description && (
          <p className="mt-1.5 text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>
    </div>
  );
}
