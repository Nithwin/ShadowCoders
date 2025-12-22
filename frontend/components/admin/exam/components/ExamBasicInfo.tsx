import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput } from '../ExamForm';
import { FileText, Info } from 'lucide-react';

interface ExamBasicInfoProps {
  register: UseFormRegister<ExamFormInput>;
  errors: FieldErrors<ExamFormInput>;
}

export function ExamBasicInfo({ register, errors }: ExamBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
          <p className="text-sm text-primary/60">Set the exam title and description</p>
        </div>
      </div>

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
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {errors.title.message}
          </p>
        )}
        <p className="mt-1.5 text-xs text-primary/60">
          Choose a clear, descriptive title that students will recognize
        </p>
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
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {errors.description.message}
          </p>
        )}
        <p className="mt-1.5 text-xs text-primary/60">
          Add instructions, topics covered, or any important information for students
        </p>
      </div>
    </div>
  );
}
