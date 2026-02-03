'use client'; // This must be a Client Component

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck, 
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Settings,
  Gift,
  Video
} from 'lucide-react';
import { useState } from 'react';

// 1. Define the navigation links for students
const navLinks = [
  { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { name: 'My Exams', href: '/student/exams', icon: FileText },
  { name: 'Results', href: '/student/results', icon: ClipboardCheck },
  { name: 'Redeem', href: '/student/redeem', icon: Gift },
  { name: 'Meetings', href: '/student/meetings', icon: Video },
  { name: 'Settings', href: '/student/settings', icon: Settings },
];

export default function StudentSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
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
              src="/images/logo-v2.png" 
              alt="ShadowCoders Logo" 
              width={40} 
              height={40}
              priority
              style={{ width: 'auto', height: 'auto' }}
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
          <h3 className="text-xs uppercase text-secondary/50 mb-2">Navigate</h3>
          <ul className="space-y-2">
            {navLinks.map((link) => {
              // Check if this link is the active page
              const isActive = pathname.startsWith(link.href);
              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
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
          <div className="flex items-center p-2 rounded-lg">
            <UserIcon className="w-8 h-8 p-1.5 rounded-full bg-secondary/20 mr-3" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'Student'}
              </p>
              <p className="text-xs text-secondary/60 truncate">
                {user?.email}
              </p>
            </div>
          </div>
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

