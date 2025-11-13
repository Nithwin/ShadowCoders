'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  Mail, 
  Shield, 
  Hash, 
  Building2, 
  Calendar, 
  Users, 
  Edit2, 
  Save, 
  X, 
  Camera,
  Clock,
  UserCircle
} from 'lucide-react';

export default function StudentProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    reg_no: user?.reg_no || '',
    year: user?.year?.toString() || '',
    department: user?.department || '',
    section: user?.section || '',
    pictureUrl: user?.pictureUrl || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        reg_no: user.reg_no || '',
        year: user.year?.toString() || '',
        department: user.department || '',
        section: user.section || '',
        pictureUrl: user.pictureUrl || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await updateUser({
        name: formData.name || null,
        reg_no: formData.reg_no || null,
        year: formData.year ? parseInt(formData.year) : null,
        department: formData.department || null,
        section: formData.section || null,
        pictureUrl: formData.pictureUrl || null,
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      reg_no: user?.reg_no || '',
      year: user?.year?.toString() || '',
      department: user?.department || '',
      section: user?.section || '',
      pictureUrl: user?.pictureUrl || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-primary">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="text-primary max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold font-alan-sans">My Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture & Basic Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-secondary rounded-xl shadow-lg p-6 border border-primary/10">
            <div className="flex flex-col items-center">
              {/* Profile Picture */}
              <div className="relative mb-4">
                {isEditing ? (
                  <div className="relative">
                    {formData.pictureUrl ? (
                      <img
                        src={formData.pictureUrl}
                        alt="Profile"
                        className="w-[120px] h-[120px] rounded-full object-cover border-4 border-primary/20"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-[120px] h-[120px] rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 ${formData.pictureUrl ? 'hidden' : ''}`}
                    >
                      <UserCircle className="w-16 h-16 text-primary/40" />
                    </div>
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                      title="Edit profile picture URL"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  user.pictureUrl ? (
                    <>
                      <img
                        src={user.pictureUrl}
                        alt="Profile"
                        className="w-[120px] h-[120px] rounded-full object-cover border-4 border-primary/20"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                      <div className="w-[120px] h-[120px] rounded-full bg-primary/10 hidden items-center justify-center border-4 border-primary/20">
                        <UserCircle className="w-16 h-16 text-primary/40" />
                      </div>
                    </>
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                      <UserCircle className="w-16 h-16 text-primary/40" />
                    </div>
                  )
                )}
              </div>

              <h2 className="text-2xl font-bold text-primary mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="text-center bg-transparent border-b-2 border-primary/30 focus:border-primary focus:outline-none"
                    placeholder="Your Name"
                  />
                ) : (
                  user.name || 'No Name'
                )}
              </h2>
              <p className="text-primary/60 text-sm mb-4">{user.email}</p>
              
              {/* Role Badge */}
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium capitalize">{user.role.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Information Card */}
        <div className="lg:col-span-2">
          <div className="bg-secondary rounded-xl shadow-lg p-6 border border-primary/10">
            <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
              <User className="w-6 h-6" />
              Personal Information
            </h2>

            <div className="space-y-5">
              {/* Registration Number */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Hash className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-primary/70 mb-1">
                    Registration Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="reg_no"
                      value={formData.reg_no}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-background border border-primary/20 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter registration number"
                    />
                  ) : (
                    <p className="text-lg text-primary">{user.reg_no || 'Not set'}</p>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-primary/70 mb-1">
                    Department
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-background border border-primary/20 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter department"
                    />
                  ) : (
                    <p className="text-lg text-primary">{user.department || 'Not set'}</p>
                  )}
                </div>
              </div>

              {/* Year */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-primary/70 mb-1">
                    Year
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 bg-background border border-primary/20 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter year"
                    />
                  ) : (
                    <p className="text-lg text-primary">{user.year || 'Not set'}</p>
                  )}
                </div>
              </div>

              {/* Section */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-primary/70 mb-1">
                    Section
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-background border border-primary/20 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter section"
                    />
                  ) : (
                    <p className="text-lg text-primary">{user.section || 'Not set'}</p>
                  )}
                </div>
              </div>

              {/* Email - Read Only */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-primary/70 mb-1">
                    Email Address
                  </label>
                  <p className="text-lg text-primary">{user.email}</p>
                </div>
              </div>

              {/* Profile Picture URL - Editable */}
              {isEditing && (
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-primary/70 mb-1">
                      Profile Picture URL
                    </label>
                    <input
                      type="url"
                      name="pictureUrl"
                      value={formData.pictureUrl}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-background border border-primary/20 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-primary/50 mt-1">Enter a URL to your profile picture</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Information Card */}
          <div className="bg-secondary rounded-xl shadow-lg p-6 border border-primary/10 mt-6">
            <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Account Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-primary/10">
                <span className="text-sm font-medium text-primary/70">Member Since</span>
                <span className="text-primary">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-primary/70">Last Updated</span>
                <span className="text-primary">{formatDate(user.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-secondary border-2 border-primary/20 text-primary rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

