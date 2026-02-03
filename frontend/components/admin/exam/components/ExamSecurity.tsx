import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput } from '../ExamForm';
import { Shield, Info, HelpCircle, Eye, Camera } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExamSecurityProps {
  register: UseFormRegister<ExamFormInput>;
  errors: FieldErrors<ExamFormInput>;
  watch?: UseFormWatch<ExamFormInput>;
}

export function ExamSecurity({ register, errors, watch }: ExamSecurityProps) {
  const enableProctoring = watch?.('enableProctoring');
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">Security & Limits</h3>
            <p className="text-sm text-primary/60">Set attempt limits and anti-cheating measures</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="maxAttempts" className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
              Max Attempts
              <Tooltip>
                <TooltipTrigger type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Maximum number of times a student can attempt this exam</p>
                </TooltipContent>
              </Tooltip>
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
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.maxAttempts.message as string}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="maxTabSwitches" className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
              Max Tab Switches
              <Tooltip>
                <TooltipTrigger type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How many times students can switch tabs before auto-submit</p>
                </TooltipContent>
              </Tooltip>
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
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.maxTabSwitches.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Proctoring Section */}
        <div className="border-t border-primary/10 pt-6">
          <div className="flex items-center gap-4 p-4 bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <label htmlFor="enableProctoring" className="flex items-center gap-2 text-sm font-semibold text-primary mb-1">
                Enable Eye & Head Tracking Proctoring
                <Tooltip>
                  <TooltipTrigger type="button">
                    <HelpCircle className="w-3.5 h-3.5 text-primary/50" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable automated eye and head tracking using student's camera</p>
                    <p className="text-xs mt-2">Monitors if student looks away or head turns away from screen</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <p className="text-xs text-primary/60">Track student attention using camera during the exam</p>
            </div>
            <input
              id="enableProctoring"
              type="checkbox"
              {...register('enableProctoring')}
              className="w-6 h-6 rounded border-2 border-primary/20 accent-blue-600 cursor-pointer"
            />
          </div>

          {enableProctoring && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Proctoring Features Enabled:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Eye tracking detection - warns if student looks away</li>
                    <li>Head position monitoring - detects if head turns away</li>
                    <li>Real-time violation logging</li>
                    <li>Violation summary shown after exam submission</li>
                    <li>Students will be asked for camera permission</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
