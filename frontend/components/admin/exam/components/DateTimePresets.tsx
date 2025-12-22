import { Play, Clock, Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DateTimePresetsProps {
  onPresetSelect: (startDate: Date, endDate: Date) => void;
}

interface DatePreset {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getStartDate: () => Date;
  getEndDate: () => Date;
  description: string;
}

const presets: DatePreset[] = [
  {
    label: 'Start Now',
    icon: Play,
    getStartDate: () => new Date(),
    getEndDate: () => {
      const date = new Date();
      date.setHours(date.getHours() + 24);
      return date;
    },
    description: 'Starts immediately, ends in 24 hours',
  },
  {
    label: '1 Hour',
    icon: Clock,
    getStartDate: () => new Date(),
    getEndDate: () => {
      const date = new Date();
      date.setHours(date.getHours() + 1);
      return date;
    },
    description: 'Starts now, ends in 1 hour',
  },
  {
    label: '1 Day',
    icon: Calendar,
    getStartDate: () => new Date(),
    getEndDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    },
    description: 'Starts now, ends tomorrow',
  },
  {
    label: '1 Week',
    icon: CalendarDays,
    getStartDate: () => new Date(),
    getEndDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    },
    description: 'Starts now, ends in 7 days',
  },
];

export function DateTimePresets({ onPresetSelect }: DateTimePresetsProps) {
  const handlePresetClick = (preset: DatePreset) => {
    const startDate = preset.getStartDate();
    const endDate = preset.getEndDate();
    onPresetSelect(startDate, endDate);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-primary">
        Quick Presets
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              onClick={() => handlePresetClick(preset)}
              className="flex flex-col items-center gap-2 h-auto py-3 hover:bg-primary/10 hover:border-primary/30"
              title={preset.description}
            >
              <Icon className="w-4 h-4 text-primary/70" />
              <span className="text-xs font-medium">{preset.label}</span>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-primary/60">
        Click a preset to quickly set start and end times
      </p>
    </div>
  );
}
