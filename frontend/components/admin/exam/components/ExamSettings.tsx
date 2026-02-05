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
  const dynamicTopics = watch('dynamicTopics') || [];
  const dynamicTopicsText = dynamicTopics.join(', ');

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

      {/* Exam Mode Selection */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary">
              Exam Mode
            </label>
            <p className="text-xs text-primary/60">
              Standard uses fixed questions. Dynamic generates questions per student.
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
            Adaptive
          </span>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="STANDARD"
              {...register('mode')}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <span className="text-sm">Standard (Fixed Questions)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="DYNAMIC"
              {...register('mode')}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <span className="text-sm">Dynamic (Adaptive Generation)</span>
          </label>
        </div>

        {/* Dynamic Settings */}
        {watch('mode') === 'DYNAMIC' && (
          <div className="mt-4 p-4 rounded-lg bg-white/60 border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Questions per Student
                </label>
                <Input
                  type="number"
                  {...register('dynamicQuestionCount')}
                  min={1}
                  max={20}
                  className="max-w-[150px]"
                />
                {errors.dynamicQuestionCount && (
                  <p className="mt-1 text-xs text-red-500">{errors.dynamicQuestionCount.message as string}</p>
                )}
                <p className="text-xs text-primary/60 mt-1">
                  Each student will get this many generated questions.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Topics (Comma separated)
                </label>
                <Input
                  placeholder="e.g. Arrays, Dynamic Programming, Strings"
                  value={dynamicTopicsText}
                  onChange={(e) => {
                    const val = e.target.value;
                    const topics = val.split(',').map(t => t.trim()).filter(Boolean);
                    setValue('dynamicTopics', topics, { 
                      shouldDirty: true,
                      shouldValidate: true 
                    });
                  }}
                />
                {errors.dynamicTopics && (
                  <p className="mt-1 text-xs text-red-500">{errors.dynamicTopics.message as string}</p>
                )}
                <p className="text-xs text-primary/60 mt-1">
                  Questions will be generated from these topics.
                </p>
              </div>
              
            </div>
          </div>
        )}
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
