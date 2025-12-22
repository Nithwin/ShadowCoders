import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput, AVAILABLE_LANGUAGES } from '../ExamForm';
import { Settings, Info } from 'lucide-react';

interface ExamSettingsProps {
  register: UseFormRegister<ExamFormInput>;
  errors: FieldErrors<ExamFormInput>;
  watch: UseFormWatch<ExamFormInput>;
  setValue: UseFormSetValue<ExamFormInput>;
  showRandomize?: boolean;
  showNegativeMarking?: boolean;
}

export function ExamSettings({
  register,
  errors,
  watch,
  setValue,
  showRandomize = true,
  showNegativeMarking = true,
}: ExamSettingsProps) {
  const selectedLanguages = watch('allowedLanguages') || [];

  const toggleLanguage = (langValue: string) => {
    const current = selectedLanguages || [];
    if (current.includes(langValue)) {
      setValue('allowedLanguages', current.filter((l) => l !== langValue), { shouldDirty: true });
    } else {
      setValue('allowedLanguages', [...current, langValue], { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary">Exam Settings</h3>
          <p className="text-sm text-primary/60">Configure randomization, languages, and marking</p>
        </div>
      </div>

      {/* Additional Options */}
      {(showRandomize || showNegativeMarking) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showRandomize && (
            <div className="flex items-center gap-3">
              <input
                id="randomizeQuestions"
                type="checkbox"
                {...register('randomizeQuestions')}
                className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
              />
              <label htmlFor="randomizeQuestions" className="text-sm font-medium text-primary/80 cursor-pointer">
                Randomize Question Order
              </label>
            </div>
          )}
          <div className="flex items-start gap-3">
            <input
              id="releaseResults"
              type="checkbox"
              {...register('releaseResults')}
              className="mt-1 h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
            />
            <div className="flex flex-col">
              <label htmlFor="releaseResults" className="text-sm font-medium text-primary/80 cursor-pointer">
                Release Results Immediately
              </label>
              <span className="text-xs text-primary/60">
                If disabled, results are locked and hidden from students until you enable this.
              </span>
            </div>
          </div>
          {showNegativeMarking && (
            <div>
              <label htmlFor="negativeMarkPerWrong" className="block text-sm font-semibold text-primary mb-2">
                Negative Marking (per wrong answer)
              </label>
              <Input
                id="negativeMarkPerWrong"
                type="number"
                step="0.01"
                min="0"
                {...register('negativeMarkPerWrong')}
                placeholder="e.g. 0.25 (optional)"
                className="w-full"
              />
              {errors.negativeMarkPerWrong && (
                <p className="mt-1.5 text-sm text-red-500">{errors.negativeMarkPerWrong.message as string}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Allowed Programming Languages */}
      <div className="pt-4 border-t border-primary/10">
        <label className="block text-sm font-semibold text-primary mb-3">
          Allowed Programming Languages (for coding questions)
        </label>
        <p className="text-xs text-primary/60 mb-3">
          Select which programming languages students can use when solving coding questions. Leave empty to allow all languages.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <div key={lang.value} className="flex items-center gap-2">
              <input
                id={`lang-${lang.value}`}
                type="checkbox"
                checked={selectedLanguages.includes(lang.value)}
                onChange={() => toggleLanguage(lang.value)}
                className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
              />
              <label htmlFor={`lang-${lang.value}`} className="text-sm font-medium text-primary/80 cursor-pointer">
                {lang.label}
              </label>
            </div>
          ))}
        </div>
        <input type="hidden" {...register('allowedLanguages')} />
      </div>
    </div>
  );
}
