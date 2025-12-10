'use client';

import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, ChevronDown, Bell, AlertCircle } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import Link from 'next/link';
import { getAbsoluteImageUrl } from '@/lib/utils';
import { useViolationNotifications } from '@/context/ViolationNotificationContext';
import { useRouter, usePathname } from 'next/navigation';
import NotificationDropdown from '@/components/ui/NotificationDropdown';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { violations, violationCount } = useViolationNotifications();
  const router = useRouter();
  const pathname = usePathname();

  // Get exam ID from pathname if on monitor page
  const examIdMatch = pathname?.match(/\/admin\/exams\/([^\/]+)\/monitor/);
  const examId = examIdMatch?.[1];

  const handleViolationClick = (violation: any) => {
    if (examId) {
      router.push(`/admin/exams/${examId}/monitor`);
    } else {
      // If not on monitor page, try to navigate to the exam's monitor page
      router.push(`/admin/exams/${violation.examId}/monitor`);
    }
    setNotificationOpen(false);
  };

  return (
  <header className="flex items-center justify-end gap-4 p-4 bg-secondary border-b border-gray-200 h-16 sticky top-0 z-30">
      {/* General Notifications */}
      <NotificationDropdown />

      {/* Violation Notification Bell */}
      <DropdownMenu.Root open={notificationOpen} onOpenChange={setNotificationOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            {violationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {violationCount > 9 ? '9+' : violationCount}
              </span>
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="w-80 bg-secondary rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto"
            sideOffset={5}
            align="end"
          >
            <DropdownMenu.Label className="px-4 py-3 text-sm font-semibold text-gray-700 border-b border-gray-200">
              Keyboard Violations {violationCount > 0 && `(${violationCount})`}
            </DropdownMenu.Label>
            {violationCount === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No violations detected
              </div>
            ) : (
              <div className="py-2">
                {Array.from(violations.values()).map((violation) => (
                  <DropdownMenu.Item
                    key={violation.attemptId}
                    asChild
                    className="focus:outline-none"
                  >
                    <button
                      onClick={() => handleViolationClick(violation)}
                      className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-red-100 rounded-full mt-0.5">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {violation.studentName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {violation.studentEmail}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(violation.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </DropdownMenu.Item>
                ))}
              </div>
            )}
            {violationCount > 0 && (
              <>
                <DropdownMenu.Separator className="h-px bg-gray-200" />
                <DropdownMenu.Item asChild>
                  <Link
                    href={examId ? `/admin/exams/${examId}/monitor` : '/admin/exams'}
                    className="block px-4 py-2 text-sm text-primary hover:bg-gray-100 text-center font-medium"
                    onClick={() => setNotificationOpen(false)}
                  >
                    View All in Monitor
                  </Link>
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
            {user?.pictureUrl ? (
                <img 
                  src={getAbsoluteImageUrl(user.pictureUrl)} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
            ) : null}
            <UserIcon className={`w-8 h-8 p-1.5 rounded-full bg-primary/20 text-primary ${user?.pictureUrl ? 'hidden' : 'block'}`} />
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-primary truncate">
                {user?.name || 'Staff Member'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-500" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="w-56 bg-secondary rounded-md shadow-lg border border-gray-200"
            sideOffset={5}
          >
            <DropdownMenu.Label className="px-3 py-2 text-xs text-gray-500">My Account</DropdownMenu.Label>
            <DropdownMenu.Item asChild>
              <Link href="/admin/profile" className="block px-3 py-2 text-sm text-primary hover:bg-gray-100">
                Profile
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="h-px bg-gray-200" />
            <DropdownMenu.Item 
              onSelect={logout}
              className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Logout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
