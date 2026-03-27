'use client';

interface ExamTabsProps {
  activeTab: 'settings' | 'sections' | 'questions' | 'assignments';
  onTabChange: (tab: 'settings' | 'sections' | 'questions' | 'assignments') => void;
}

export default function ExamTabs({ activeTab, onTabChange }: ExamTabsProps) {
  const tabs: Array<{ id: 'settings' | 'sections' | 'questions' | 'assignments'; label: string }> = [
    { id: 'settings', label: 'Settings' },
    { id: 'sections', label: 'Sections' },
    { id: 'questions', label: 'Questions' },
    { id: 'assignments', label: 'Assignments' },
  ];

  return (
    <div className="flex gap-1 border-b border-primary/20 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`py-3 px-6 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? 'border-b-2 border-primary text-primary'
              : 'text-primary/60 hover:text-primary/80'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

