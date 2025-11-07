'use client';

import { useAuth } from '@/context/AuthContext';

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Welcome, {user?.name || 'Student'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {user?.email}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {user?.role} • {user?.department || 'N/A'}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
          
          <div className="border-t dark:border-zinc-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Your Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Exams</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-semibold text-green-900 dark:text-green-100">Completed</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">0</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Pending</h3>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
