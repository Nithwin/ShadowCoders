import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput, AVAILABLE_LANGUAGES } from '../ExamForm';

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
    <>
      {/* Additional Options */}
      {(showRandomize || showNegativeMarking) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
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
    </>
  );
}
