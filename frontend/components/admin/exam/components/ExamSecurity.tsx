import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { ExamFormInput } from '../ExamForm';
import { Shield, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExamSecurityProps {
  register: UseFormRegister<ExamFormInput>;
  errors: FieldErrors<ExamFormInput>;
}

export function ExamSecurity({ register, errors }: ExamSecurityProps) {
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
            <label htmlFor="maxAttempts" className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
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
            <label htmlFor="maxTabSwitches" className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
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
      </div>
    </TooltipProvider>
  );
}
