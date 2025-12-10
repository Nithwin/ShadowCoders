'use client';

import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, ChevronDown, Coins, Bell, AlertCircle } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAbsoluteImageUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import { useViolationNotifications } from '@/context/ViolationNotificationContext';
import NotificationDropdown from '@/components/ui/NotificationDropdown';

export default function StudentHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [points, setPoints] = useState<number>(0);
  const { hasPendingViolation } = useViolationNotifications();

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await api.get<{ points: number }>('/student/points');
        setPoints(res.data.points);
      } catch (error) {
        // Silently fail - points will show 0
        console.error('Failed to fetch points:', error);
      }
    };
    if (user) {
      fetchPoints();
    }
  }, [user]);

  return (
    <header className="flex items-center justify-between p-4 bg-secondary border-b border-primary/10 h-16 sticky top-0 z-30">
      {/* Points Display */}
      <Link 
        href="/student/redeem"
        className="group flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-yellow-500/15 via-yellow-500/10 to-yellow-500/15 hover:from-yellow-500/25 hover:via-yellow-500/20 hover:to-yellow-500/25 border border-yellow-500/30 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20 hover:scale-105"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-sm group-hover:blur-md transition-all"></div>
          <div className="relative p-1.5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-md">
            <Coins className="w-5 h-5 text-white drop-shadow-sm" fill="currentColor" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-primary/60 leading-none">Points</span>
          <span className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text text-transparent leading-tight">{points.toLocaleString()}</span>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {/* Notification Bell for Pending Violations */}
        {hasPendingViolation && (
          <DropdownMenu.Root open={notificationOpen} onOpenChange={setNotificationOpen}>
            <DropdownMenu.Trigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-primary/5 transition-colors">
                <Bell className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  !
                </span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="w-80 bg-secondary rounded-md shadow-lg border border-primary/10"
                sideOffset={5}
                align="end"
              >
                <DropdownMenu.Label className="px-4 py-3 text-sm font-semibold text-primary border-b border-primary/10">
                  Violation Notice
                </DropdownMenu.Label>
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-primary mb-2">
                        Keyboard Violation Detected
                      </p>
                      <p className="text-xs text-primary/70">
                        A keyboard event was detected during your exam. Your exam has been paused and is waiting for admin review. Please wait for their decision.
                      </p>
                    </div>
                  </div>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        <NotificationDropdown />

        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-primary/5">
            {user?.pictureUrl ? (
                <img 
                  src={getAbsoluteImageUrl(user.pictureUrl)} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-primary/20 object-cover"
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
                {user?.name || 'Student'}
              </p>
              <p className="text-xs text-primary/60 truncate">
                {user?.email}
              </p>
            </div>
            <ChevronDown className="w-5 h-5 text-primary/60" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="w-56 bg-secondary rounded-md shadow-lg border border-primary/10"
            sideOffset={5}
          >
            <DropdownMenu.Label className="px-3 py-2 text-xs text-primary/60">My Account</DropdownMenu.Label>
            <DropdownMenu.Item asChild>
              <Link href="/student/profile" className="block px-3 py-2 text-sm text-primary hover:bg-primary/5">
                Profile
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="h-px bg-primary/10" />
            <DropdownMenu.Item 
              onSelect={logout}
              className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
            >
              Logout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      </div>
    </header>
  );
}

