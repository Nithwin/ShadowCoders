'use client';

import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import Link from 'next/link';
import { getAbsoluteImageUrl } from '@/lib/utils';

export default function StudentHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-end p-4 bg-secondary border-b border-primary/10 h-16 sticky top-0 z-30">
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
    </header>
  );
}

