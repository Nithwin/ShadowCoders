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
  Settings,
  AlertTriangle,
  ShoppingCart,
  Activity
} from 'lucide-react';
import { useState } from 'react';

// 1. Define the navigation links
const navLinks = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Exams', href: '/admin/exams', icon: FileText },
  { name: 'Templates', href: '/admin/templates', icon: ClipboardCheck },
  { name: 'Issue Reports', href: '/admin/reports', icon: AlertTriangle },
  // Let's create a placeholder for submissions
  { name: 'Submissions', href: '/admin/submissions', icon: ClipboardCheck }, 
  { name: 'Reattempts', href: '/admin/reattempts', icon: RefreshCw }, 
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'LeetCode Stats', href: '/admin/leetcode', icon: Code2 },
  { name: 'Users', href: '/admin/users', icon: UserIcon },
  { name: 'Resource Monitoring', href: '/admin/resources', icon: Activity },
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
        className="lg:hidden p-2 fixed top-4 left-4 z-40 bg-[#0B1F3A]/95 border border-slate-700 backdrop-blur-sm rounded-md shadow-sm"
        aria-label="Open sidebar"
      >
        <Menu className="w-6 h-6 text-slate-200" />
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`
          flex flex-col w-64 h-screen p-4 text-slate-200
          bg-[#0B1F3A] border-r border-slate-700
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
            <span className="ml-2 text-xl font-bold font-alan-sans text-slate-100">ShadowCoders</span>
          </div>
          {/* Mobile-only close button */}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6 text-slate-300" />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col min-h-0">
        
        {/* Main Navigation Links - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="text-xs uppercase text-slate-400/90 mb-2 mt-1 px-1">Manage</h3>
          <ul className="space-y-2 pb-4">
            {navLinks.map((link) => {
              // 4. Check if this link is the active page
              const isActive = pathname.startsWith(link.href);
              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`
                      flex items-center p-2.5 rounded-xl border
                      transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-slate-800 text-blue-300 border-slate-700 shadow-sm'
                          : 'text-slate-300 border-transparent hover:bg-slate-800/90 hover:text-white'
                      }
                    `}
                  >
                    <link.icon className="w-5 h-5 mr-3 shrink-0" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* User Profile & Logout Section - Fixed at bottom */}
        <div className="border-t border-slate-700 pt-4 mt-auto shrink-0">
          <div className="mb-3 px-2 py-2 rounded-lg bg-slate-900/70 border border-slate-700">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Staff Member'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>

          <button
            onClick={logout}
            className="flex items-center w-full p-2 mt-2 rounded-lg transition-colors duration-200
                       bg-red-600 text-white hover:bg-red-700"
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