'use client';

import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import Link from 'next/link';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
  <header className="flex items-center justify-end p-4 bg-secondary border-b border-gray-200 h-16 sticky top-0 z-30">
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
            {user?.pictureUrl ? (
                <img 
                  src={user.pictureUrl} 
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
