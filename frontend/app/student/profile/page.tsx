'use client';

import { useAuth } from '@/context/AuthContext';

export default function StudentProfilePage() {
  const { user } = useAuth();

  return (
    <div className="text-primary">
      <h1 className="text-4xl font-bold font-alan-sans mb-6">My Profile</h1>
      
      <div className="max-w-lg">
        <div className="bg-secondary rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">User Information</h2>
          {user ? (
            <div className="space-y-4">
              <div>
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
              {user.department && (
                <div>
                  <label className="block text-sm font-medium text-primary/70">Department</label>
                  <p className="mt-1 text-lg text-primary">{user.department}</p>
                </div>
              )}
              {user.year && (
                <div>
                  <label className="block text-sm font-medium text-primary/70">Year</label>
                  <p className="mt-1 text-lg text-primary">{user.year}</p>
                </div>
              )}
              {user.section && (
                <div>
                  <label className="block text-sm font-medium text-primary/70">Section</label>
                  <p className="mt-1 text-lg text-primary">{user.section}</p>
                </div>
              )}
            </div>
          ) : (
            <p>Loading user data...</p>
          )}
        </div>
      </div>
    </div>
  );
}

