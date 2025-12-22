import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput } from '../ExamForm';
import { TimingMode, SectionLockPolicy } from '@/types';
import { Clock, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExamTimingProps {
  register: UseFormRegister<ExamFormInput>;
  errors: FieldErrors<ExamFormInput>;
  watch: UseFormWatch<ExamFormInput>;
}

export function ExamTiming({ register, errors, watch }: ExamTimingProps) {
  const startAtVal = watch('startAt');
  const endAtVal = watch('endAt');
  const dateOrderInvalid = startAtVal && endAtVal && new Date(startAtVal) >= new Date(endAtVal);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">Schedule & Timing</h3>
            <p className="text-sm text-primary/60">Configure when and how long the exam runs</p>
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startAt" className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              Start Time <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>When students can begin taking the exam</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Input
              id="startAt"
              type="datetime-local"
              {...register('startAt')}
              step="60"
              className="w-full"
            />
            {errors.startAt && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.startAt.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="endAt" className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              End Time <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>When the exam closes (no new attempts allowed)</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Input
              id="endAt"
              type="datetime-local"
              {...register('endAt')}
              step="60"
              className="w-full"
            />
            {errors.endAt && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.endAt.message}
              </p>
            )}
          </div>
        </div>
        {dateOrderInvalid && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <Info className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-600">Start time must be before end time.</p>
          </div>
        )}

        {/* Duration and Timing Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="durationMins" className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              Duration (minutes) <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How long students have to complete the exam</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Input
              id="durationMins"
              type="number"
              min={1}
              {...register('durationMins')}
              className="w-full"
              placeholder="e.g. 60"
            />
            {errors.durationMins && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.durationMins.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="timingMode" className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              Timing Mode <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Overall: One timer for entire exam<br/>Per Section: Separate timer per section<br/>Both: Both timers active</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <select
              id="timingMode"
              {...register('timingMode')}
              className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value={TimingMode.OVERALL_ONLY}>Overall Only</option>
              <option value={TimingMode.PER_SECTION_ONLY}>Per Section Only</option>
              <option value={TimingMode.BOTH}>Both</option>
            </select>
            {errors.timingMode && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.timingMode.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="sectionLockPolicy" className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              Section Lock Policy <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>None: Navigate freely<br/>Lock on Complete: Can't return after finishing<br/>Linear: Must go in order</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <select
              id="sectionLockPolicy"
              {...register('sectionLockPolicy')}
              className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value={SectionLockPolicy.NONE}>None</option>
              <option value={SectionLockPolicy.LOCK_ON_COMPLETE}>Lock on Complete</option>
              <option value={SectionLockPolicy.LINEAR_NO_BACKTRACK}>Linear (No Backtrack)</option>
            </select>
            {errors.sectionLockPolicy && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.sectionLockPolicy.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
