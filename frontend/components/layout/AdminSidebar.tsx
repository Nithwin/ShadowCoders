'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck, 
  Code2, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useState } from 'react';

// 1. Define the navigation links
const navLinks = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Exams', href: '/admin/exams', icon: FileText },
  { name: 'Templates', href: '/admin/templates', icon: ClipboardCheck },
  // Let's create a placeholder for submissions
  { name: 'Submissions', href: '/admin/submissions', icon: ClipboardCheck }, 
  { name: 'Reattempts', href: '/admin/reattempts', icon: RefreshCw }, 
  { name: 'LeetCode Stats', href: '/admin/leetcode', icon: Code2 },
  { name: 'Users', href: '/admin/users', icon: UserIcon },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth(); // 2. Get user and logout from auth
  const pathname = usePathname(); // 3. Get current URL path
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile-only menu button */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 fixed top-4 left-4 z-40 bg-primary/50 backdrop-blur-sm rounded-md"
        aria-label="Open sidebar"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`
          flex flex-col w-64 h-screen p-4 bg-primary text-secondary
          fixed lg:static lg:translate-x-0
          transition-transform duration-300 ease-in-out
          z-50
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Image 
              src="/images/codepath.png" 
              alt="ShadowCoders Logo" 
              width={40} 
              height={40}
              priority
            />
            <span className="ml-2 text-xl font-bold font-alan-sans">ShadowCoders</span>
          </div>
          {/* Mobile-only close button */}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6 text-secondary/70" />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col justify-between">
        
        {/* Main Navigation Links */}
        <div>
          <h3 className="text-xs uppercase text-secondary/50 mb-2">Manage</h3>
          <ul className="space-y-2">
            {navLinks.map((link) => {
              // 4. Check if this link is the active page
              const isActive = pathname.startsWith(link.href);
              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`
                      flex items-center p-2 rounded-lg
                      transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-secondary/20 text-white' // Active link style
                          : 'text-secondary/70 hover:bg-secondary/10 hover:text-white' // Inactive
                      }
                    `}
                  >
                    <link.icon className="w-5 h-5 mr-3" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* User Profile & Logout Section */}
        <div className="border-t border-secondary/20 pt-4">

          <button
            onClick={logout}
            className="flex items-center w-full p-2 mt-2 rounded-lg transition-colors duration-200
                       bg-red-500 text-white hover:bg-red-600"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
    </>
  );
}