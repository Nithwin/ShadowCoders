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
  const randomizeEnabled = watch('randomizeQuestions') || false;

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

      {/* Standard mode enforced on this form */}
      <input type="hidden" value="STANDARD" {...register('mode')} />

      {/* Additional Options */}
      {(showRandomize || showNegativeMarking) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showRandomize && (
            <div className="md:col-span-2 p-4 rounded-lg border border-primary/15 bg-primary/5">
              <div className="flex items-start gap-3">
                <input
                  id="randomizeQuestions"
                  type="checkbox"
                  {...register('randomizeQuestions')}
                  className="mt-1 h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
                />
                <div className="flex flex-col">
                  <label htmlFor="randomizeQuestions" className="text-sm font-semibold text-primary/90 cursor-pointer">
                    Randomize Question Order Per Student
                  </label>
                  <span className="text-xs text-primary/70 mt-1">
                    Each student gets a different question order. Correct answers and scoring stay mapped to question IDs, so grading remains accurate.
                  </span>
                  {randomizeEnabled && (
                    <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 w-fit">
                      Enabled: section-aware shuffle with per-attempt stable order
                    </div>
                  )}
                </div>
              </div>
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

      <div className="pt-2">
        <div className="p-3 rounded-lg border border-primary/15 bg-primary/5">
          <p className="text-xs font-semibold text-primary/80">Section-Wise Exam Builder</p>
          <p className="text-xs text-primary/70 mt-1">
            After saving, use the <b>Sections</b> tab to create custom sections like Grammar MCQ, Technical MCQ, Easy Coding, and Advanced Coding, then assign questions section-wise.
          </p>
        </div>
      </div>
    </div>
  );
}
