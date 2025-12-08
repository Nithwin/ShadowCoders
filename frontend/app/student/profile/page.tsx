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
  Lock,
  Upload,
  Code,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  MapPin
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function StudentProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
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
    leetcodeId: user?.leetcodeId || '',
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
        year: user.year?.toString() || '',
        department: user.department || '',
        section: user.section || '',
        pictureUrl: user.pictureUrl || '',
        leetcodeId: user.leetcodeId || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name in passwordData) {
      setPasswordData(prev => ({ ...prev, [name]: value }));
    } else {
      let newValue = value;
      if (name === 'leetcodeId' && value.includes('leetcode.com')) {
        try {
          const cleanUrl = value.replace(/\/$/, '');
          const parts = cleanUrl.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart !== 'u' && lastPart !== 'leetcode.com') {
            newValue = lastPart;
          }
        } catch (e) {}
      }
      setFormData(prev => ({ ...prev, [name]: newValue }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, pictureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('picture', file);

      try {
        setIsLoading(true);
        const { data } = await api.post('/me/picture', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const timestamp = new Date().getTime();
        const newPictureUrl = `${data.pictureUrl}?t=${timestamp}`;
        setFormData(prev => ({ ...prev, pictureUrl: newPictureUrl }));
        await updateUser({ pictureUrl: newPictureUrl });
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
      await updateUser({
        name: formData.name || null,
        reg_no: formData.reg_no || null,
        year: formData.year ? parseInt(formData.year) : null,
        department: formData.department || null,
        section: formData.section || null,
        pictureUrl: formData.pictureUrl || null,
        leetcodeId: formData.leetcodeId || null,
      });

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
      year: user?.year?.toString() || '',
      department: user?.department || '',
      section: user?.section || '',
      pictureUrl: user?.pictureUrl || '',
      leetcodeId: user?.leetcodeId || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
        {/* Bold Header Background */}
        <div className="h-56 relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900">
             <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-20"></div>
             {/* Abstract Accents */}
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400 opacity-[0.1] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
                <div className="relative group">
                    <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-[6px] border-white shadow-xl bg-gray-100 overflow-hidden relative">
                        {formData.pictureUrl ? (
                            <img
                            src={formData.pictureUrl}
                            alt={user.name || 'Profile'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                            }}
                            />
                        ) : null}
                         <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${formData.pictureUrl ? 'hidden' : 'flex'}`}>
                            <UserCircle className="w-24 h-24 text-gray-300" />
                        </div>
                        
                         {isEditing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                <Camera className="w-8 h-8 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left pb-4 space-y-3">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center justify-center md:justify-start gap-3">
                            {user.name}
                            {user.role === 'STUDENT' && <CheckCircle2 className="w-6 h-6 text-blue-600 fill-blue-50" />}
                        </h1>
                        <p className="text-lg text-gray-500 font-medium">{user.reg_no || 'Student'}</p>
                    </div>
                    
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 font-medium text-gray-700">
                            <Shield className="w-3.5 h-3.5 text-gray-500" />
                            {user.role}
                        </span>
                        <div className="h-4 w-px bg-gray-300 hidden md:block"></div>
                        <span className="flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{user.department || 'Department N/A'}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{user.section ? `Section ${user.section}` : 'Section N/A'}</span>
                        </span>
                     </div>
                </div>

                <div className="pb-4">
                     {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-lg shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-3">
                             <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm font-semibold rounded-lg shadow-sm transition-all"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
                <X className="w-4 h-4" />
                {error}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Sidebar */}
            <div className="space-y-6">
                
                {/* Academic Status Widget */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                         <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                             <GraduationCap className="w-4 h-4 text-gray-500" />
                             Academic Info
                         </h3>
                    </div>
                    
                    <div className="p-5 space-y-4">
                        <div className="group">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Registration Number</label>
                            {isEditing ? (
                                <div className="relative">
                                    <input 
                                        name="reg_no" 
                                        value={formData.reg_no} 
                                        disabled
                                        className="w-full bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-500 cursor-not-allowed" 
                                    />
                                    <Lock className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                </div>
                            ) : (
                                <p className="text-gray-900 font-mono font-medium">{user.reg_no || 'Not set'}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Year</label>
                                {isEditing ? (
                                    <input type="number" name="year" value={formData.year} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-gray-900">{user.year || '-'}</span>
                                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">YEAR</span>
                                    </div>
                                )}
                            </div>
                            <div className="group">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Section</label>
                                {isEditing ? (
                                    <input name="section" value={formData.section} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-gray-900">{user.section || '-'}</span>
                                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">SEC</span>
                                    </div>
                                )}
                            </div>
                        </div>

                         <div className="group">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Department</label>
                            {isEditing ? (
                                <input name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            ) : (
                                <p className="text-gray-900 font-medium">{user.department || 'Not set'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Activity Widget */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                     <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                         <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                             <Clock className="w-4 h-4 text-gray-500" />
                             Timeline
                         </h3>
                    </div>
                     <div className="p-5">
                         <div className="relative border-l-2 border-gray-100 ml-2 space-y-6">
                             <div className="relative pl-6">
                                 <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"></div>
                                 <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Last Active</p>
                                 <p className="text-sm font-medium text-gray-900">{formatDate(user.updatedAt)}</p>
                             </div>
                             <div className="relative pl-6">
                                 <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 ring-4 ring-white"></div>
                                 <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Joined</p>
                                 <p className="text-sm font-medium text-gray-900">{formatDate(user.createdAt)}</p>
                             </div>
                         </div>
                     </div>
                 </div>

            </div>

             {/* Right Main Content */}
             <div className="lg:col-span-2 space-y-6">
                 
                 {/* Main Details Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 sm:p-8">
                     <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                             <User className="w-5 h-5" />
                         </div>
                         <div>
                            <h2 className="text-lg font-bold text-gray-900">Personal Data</h2>
                            <p className="text-sm text-gray-500">Manage your personal information</p>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-1.5">
                             <label className="text-sm font-medium text-gray-700">Full Legal Name</label>
                             {isEditing ? (
                                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400" />
                             ) : (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <p className="text-gray-900">{user.name}</p>
                                </div>
                             )}
                         </div>

                         <div className="space-y-1.5">
                             <label className="text-sm font-medium text-gray-700">Email Address</label>
                             <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                                <p className="text-gray-900">{user.email}</p>
                                <Lock className="w-4 h-4 text-gray-400" />
                             </div>
                         </div>

                         <div className="md:col-span-2 pt-2">
                             <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Code className="w-4 h-4 text-gray-500" />
                                    LeetCode Integration
                                </label>
                                <span className="text-xs text-gray-400 font-normal">Sync your coding stats</span>
                             </div>

                             {isEditing ? (
                                <input 
                                    name="leetcodeId" 
                                    value={formData.leetcodeId} 
                                    onChange={handleInputChange} 
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400" 
                                    placeholder="e.g. https://leetcode.com/u/username"
                                />
                             ) : (
                                <div className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors bg-white group hover:shadow-sm">
                                    {user.leetcodeId ? (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                                                    <Code className="w-5 h-5 text-yellow-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{user.leetcodeId}</p>
                                                    <a href={`https://leetcode.com/${user.leetcodeId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                        View Profile <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Connected
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between text-gray-500">
                                            <span className="text-sm">No LeetCode account linked</span>
                                            <button onClick={() => setIsEditing(true)} className="text-xs font-medium text-blue-600 hover:underline">Connect Now</button>
                                        </div>
                                    )}
                                </div>
                             )}
                         </div>
                     </div>
                </div>

                {/* Security Form */}
                {isEditing && (
                    <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden p-6 sm:p-8">
                         <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                 <Shield className="w-5 h-5" />
                             </div>
                             <div>
                                <h2 className="text-lg font-bold text-gray-900">Security</h2>
                                <p className="text-sm text-gray-500">Update your password</p>
                             </div>
                         </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Current Password</label>
                                <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-gray-400" placeholder="Required to authorize changes" />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">New Password</label>
                                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-gray-400" placeholder="Min. 8 characters" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-gray-400" placeholder="Re-enter to confirm" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

             </div>
        </div>

      </div>
    </div>
  );
}
