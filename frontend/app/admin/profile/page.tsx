'use client';

import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="text-primary">
      <h1 className="text-4xl font-bold font-alan-sans mb-6">My Profile</h1>
      
      <div className="max-w-lg">
        {/* Use bg-secondary for the card, matching your dashboard table */}
        <div className="bg-secondary rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">User Information</h2>
          {user ? (
            <div className="space-y-4">
              <div>
                {/* Use text-primary/70 for labels */}
                <label className="block text-sm font-medium text-primary/70">Name</label>
                <p className="mt-1 text-lg font-semibold text-primary">{user.name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary/70">Email</label>
                <p className="mt-1 text-lg text-primary">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary/70">Role</label>
                <p className="mt-1 text-lg capitalize text-primary">{user.role.toLowerCase()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary/70">Registration No.</label>
                <p className="mt-1 text-lg text-primary">{user.reg_no || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <p>Loading user data...</p>
          )}
        </div>
      </div>
    </div>
  );
}