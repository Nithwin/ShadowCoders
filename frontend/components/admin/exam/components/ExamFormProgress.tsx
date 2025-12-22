import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { type TabId } from './ExamFormTabs';

interface ExamFormProgressProps {
  activeTab: TabId;
  onTabChange: (tab: TabId);
  completionPercentage: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const tabOrder: TabId[] = ['basic', 'timing', 'settings', 'security'];

export function ExamFormProgress({
  activeTab,
  onTabChange,
  completionPercentage,
  canGoNext,
  canGoPrevious,
}: ExamFormProgressProps) {
  const currentIndex = tabOrder.indexOf(activeTab);
  const currentStep = currentIndex + 1;
  const totalSteps = tabOrder.length;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onTabChange(tabOrder[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < tabOrder.length - 1) {
      onTabChange(tabOrder[currentIndex + 1]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-primary/70">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-primary/70 font-medium">
            {Math.round(completionPercentage)}% Complete
          </span>
        </div>
        <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleNext}
          disabled={!canGoNext}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
