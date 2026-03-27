'use client';

import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, ChevronDown, Moon, Sun } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import Link from 'next/link';
import { getAbsoluteImageUrl } from '@/lib/utils';
import NotificationDropdown from '@/components/ui/NotificationDropdown';
import { useTheme } from '@/context/ThemeContext';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  return (
  <header className="flex items-center justify-end gap-3 p-4 bg-secondary/95 dark:bg-slate-950/90 border-b border-gray-200 dark:border-slate-800 h-16 sticky top-0 z-30 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* General Notifications */}
      <NotificationDropdown />

      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            {user?.pictureUrl ? (
                <img 
                  src={getAbsoluteImageUrl(user.pictureUrl)} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 object-cover"
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
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="w-56 bg-secondary dark:bg-slate-900 rounded-md shadow-lg border border-gray-200 dark:border-slate-700"
            sideOffset={5}
          >
            <DropdownMenu.Label className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">My Account</DropdownMenu.Label>
            <DropdownMenu.Item asChild>
              <Link href="/admin/profile" className="block px-3 py-2 text-sm text-primary dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800">
                Profile
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-slate-700" />
            <DropdownMenu.Item 
              onSelect={logout}
              className="block w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Logout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
