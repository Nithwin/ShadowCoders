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
  UserCircle,
  Loader2,
  CheckCircle2,
  Lock,
  Upload,
  Trophy,
  Target,
  Flame,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { api } from '@/lib/api';
import { getAbsoluteImageUrl } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import ActivityHeatmap from '@/components/profile/ActivityHeatmap';

export default function AdminProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<Array<{ date: string; count: number }>>([]);
  const [stats, setStats] = useState<{
    totalExams: number;
    averageScore: number;
    currentStreak: number;
    longestStreak: number;
    totalScore: number;
    totalMaxScore: number;
  } | null>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    reg_no: user?.reg_no || '',
    pictureUrl: user?.pictureUrl || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        reg_no: user.reg_no || '',
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, pictureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);

      // 2. Upload to server
      const formData = new FormData();
      formData.append('picture', file);

      try {
        setIsLoading(true);
        const { data } = await api.post('/me/picture', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        // Update local state with returned URL
        setFormData(prev => ({ ...prev, pictureUrl: data.pictureUrl }));
        // Also update global auth user
        await updateUser({ pictureUrl: data.pictureUrl });
        showToast('Profile picture updated!', 'success');
      } catch (err: any) {
        console.error('Upload failed:', err);
        showToast('Failed to upload picture', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Update basic profile info
      await updateUser({
        name: formData.name || null,
        reg_no: formData.reg_no || null,
        pictureUrl: formData.pictureUrl || null,
      });

      // 2. Update password if provided
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error("New passwords don't match");
        }
        if (!passwordData.currentPassword) {
          throw new Error("Current password is required to set a new one");
        }
        
        await api.post('/auth/change-password', {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });
      }

      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
      // Clear password fields
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update profile';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      reg_no: user?.reg_no || '',
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium text-primary/70">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              My Profile
            </h1>
            <p className="text-lg text-primary/70 font-medium">Manage your account settings and information</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-secondary border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl font-semibold"
            >
              <Edit2 className="w-5 h-5" />
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 shadow-lg">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5" />
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards - LeetCode Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-xl border-2 border-primary/10 p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{stats?.totalExams || 0}</p>
            <p className="text-sm text-primary/70 mt-1">Exams Completed</p>
          </div>
          
          <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-xl border-2 border-primary/10 p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{stats?.averageScore || 0}%</p>
            <p className="text-sm text-primary/70 mt-1">Average Score</p>
          </div>
          
          <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-xl border-2 border-primary/10 p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{stats?.currentStreak || 0}</p>
            <p className="text-sm text-primary/70 mt-1">Current Streak</p>
          </div>
          
          <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-xl border-2 border-primary/10 p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{stats?.longestStreak || 0}</p>
            <p className="text-sm text-primary/70 mt-1">Longest Streak</p>
          </div>
        </div>

        {/* Activity Heatmap */}
        {!isLoadingActivity && (
          <div className="mb-6">
            <ActivityHeatmap data={activityData} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture & Basic Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl shadow-xl p-8 border-2 border-primary/10">
              <div className="flex flex-col items-center">
                {/* Profile Picture */}
                <div className="relative mb-6">
                  {isEditing ? (
                    <div className="relative">
                      {formData.pictureUrl ? (
                        <img
                          src={getAbsoluteImageUrl(formData.pictureUrl)}
                          alt="Profile"
                          className="w-[140px] h-[140px] rounded-full object-cover border-4 border-primary/30 shadow-lg"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const placeholder = target.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-[140px] h-[140px] rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-primary/30 shadow-lg ${formData.pictureUrl ? 'hidden' : ''}`}
                      >
                        <UserCircle className="w-20 h-20 text-primary/50" />
                      </div>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 bg-gradient-to-r from-primary to-primary/90 text-white p-3 rounded-full cursor-pointer hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-secondary"
                        title="Edit profile picture URL"
                      >
                        <Camera className="w-5 h-5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          title="Upload new picture"
                        />
                      </button>
                    </div>
                  ) : (
                    user.pictureUrl ? (
                      <>
                        <img
                          src={getAbsoluteImageUrl(user.pictureUrl)}
                          alt="Profile"
                          className="w-[140px] h-[140px] rounded-full object-cover border-4 border-primary/30 shadow-lg"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const placeholder = target.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-primary/20 to-primary/10 hidden items-center justify-center border-4 border-primary/30 shadow-lg">
                          <UserCircle className="w-20 h-20 text-primary/50" />
                        </div>
                      </>
                    ) : (
                      <div className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-primary/30 shadow-lg">
                        <UserCircle className="w-20 h-20 text-primary/50" />
                      </div>
                    )
                  )}
                </div>

                <h2 className="text-2xl font-bold text-primary mb-2 text-center">
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="text-center bg-transparent border-b-2 border-primary/30 focus:border-primary focus:outline-none px-2 py-1 w-full max-w-[200px]"
                      placeholder="Your Name"
                    />
                  ) : (
                    user.name || 'No Name'
                  )}
                </h2>
                <p className="text-primary/60 text-sm mb-4 text-center">{user.email}</p>
                
                {/* Role Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/20 shadow-sm">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold capitalize text-primary">{user.role.toLowerCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Information Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl shadow-xl p-8 border-2 border-primary/10">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-primary/10">
                <div className="p-2.5 bg-blue-500/20 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-primary">Personal Information</h2>
              </div>

              <div className="space-y-6">
                {/* Registration Number */}
                <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/20 transition-colors">
                  <div className="p-2.5 bg-blue-500/20 rounded-lg">
                    <Hash className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-primary/70 mb-2">
                      Registration Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="reg_no"
                        value={formData.reg_no}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-secondary border-2 border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all shadow-sm hover:shadow-md font-medium"
                        placeholder="Enter registration number"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-primary">{user.reg_no || 'Not set'}</p>
                    )}
                  </div>
                </div>

                {/* Email - Read Only */}
                <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="p-2.5 bg-yellow-500/20 rounded-lg">
                    <Mail className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-primary/70 mb-2">
                      Email Address
                    </label>
                    <p className="text-lg font-semibold text-primary">{user.email}</p>
                    <p className="text-xs text-primary/50 mt-1">Email cannot be changed</p>
                  </div>
                </div>

                {/* Profile Picture URL - Editable */}
                {isEditing && (
                  <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/20 transition-colors">
                    <div className="p-2.5 bg-pink-500/20 rounded-lg">
                      <Camera className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-primary/70 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 bg-secondary border border-primary/20 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm font-medium">Upload New</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-primary/50">Max 5MB. JPG, PNG, GIF.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl shadow-xl p-8 border-2 border-primary/10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/10">
                <div className="p-2.5 bg-indigo-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-primary">Account Information</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 px-4 bg-primary/5 rounded-xl border border-primary/10">
                  <span className="text-sm font-semibold text-primary/70 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Member Since
                  </span>
                  <span className="text-primary font-semibold">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-primary/5 rounded-xl border border-primary/10">
                  <span className="text-sm font-semibold text-primary/70 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Last Updated
                  </span>
                  <span className="text-primary font-semibold">{formatDate(user.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Password Change Card */}
            {isEditing && (
              <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl shadow-xl p-8 border-2 border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/10">
                  <div className="p-2.5 bg-red-500/20 rounded-lg">
                    <Lock className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">Security</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary/70 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="w-full px-4 py-2.5 bg-secondary border-2 border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all shadow-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary/70 mb-2">New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full px-4 py-2.5 bg-secondary border-2 border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all shadow-sm font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary/70 mb-2">Confirm Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="w-full px-4 py-2.5 bg-secondary border-2 border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all shadow-sm font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-8 py-3 bg-secondary border-2 border-primary/20 text-primary rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}