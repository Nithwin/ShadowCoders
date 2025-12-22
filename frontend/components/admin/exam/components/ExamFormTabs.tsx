'use client';

import { useState } from 'react';
import { FileText, Clock, Settings, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export type TabId = 'basic' | 'timing' | 'settings' | 'security';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'basic',
    label: 'Basic Info',
    icon: FileText,
    description: 'Exam title and description',
  },
  {
    id: 'timing',
    label: 'Schedule & Timing',
    icon: Clock,
    description: 'Dates, duration, and timing modes',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Languages, randomization, and marking',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Attempts and tab switch limits',
  },
];

interface ExamFormTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  errors?: Partial<Record<TabId, boolean>>;
  completed?: Partial<Record<TabId, boolean>>;
}

export function ExamFormTabs({ activeTab, onTabChange, errors = {}, completed = {} }: ExamFormTabsProps) {
  return (
    <div className="mb-8">
      {/* Tab Navigation */}
      <div className="border-b border-primary/10">
        <nav className="flex space-x-1 overflow-x-auto" aria-label="Exam form sections">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasError = errors[tab.id];
            const isCompleted = completed[tab.id];
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all
                  border-b-2 whitespace-nowrap
                  ${isActive 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-primary/60 hover:text-primary hover:bg-primary/5'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-primary/60 group-hover:text-primary'}`} />
                <span>{tab.label}</span>
                
                {/* Status Indicators */}
                {hasError && !isActive && (
                  <AlertCircle className="w-4 h-4 text-red-500" aria-label="Has errors" />
                )}
                {isCompleted && !isActive && !hasError && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" aria-label="Completed" />
                )}
                
                {/* Step Number */}
                <span className={`
                  ml-1 text-xs px-1.5 py-0.5 rounded-full
                  ${isActive ? 'bg-primary text-secondary' : 'bg-primary/10 text-primary/60'}
                `}>
                  {index + 1}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Tab Description */}
      <div className="mt-4 px-1">
        <p className="text-sm text-primary/70">
          {tabs.find(t => t.id === activeTab)?.description}
        </p>
      </div>
    </div>
  );
}
