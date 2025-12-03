'use client';

import { useEffect, useState } from 'react';
import { 
  Settings, 
  Shield, 
  Bell, 
  Palette, 
  Save,
  Moon,
  Sun,
  Monitor,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const { setTheme: setAppTheme } = useTheme();
  const { showToast } = useToast();

  const [settings, setSettings] = useState({
    theme: 'system',
    compactMode: false,
    emailNotifications: true,
    pushNotifications: true,
    examDefaults: {
      duration: 60,
      passingScore: 40
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data && Object.keys(data).length > 0) {
          setSettings(prev => ({ ...prev, ...data }));
          // Sync theme context with fetched settings
          if (data.theme) {
            setAppTheme(data.theme);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, [setAppTheme]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.put('/settings', settings);
      // Update theme immediately if changed
      setAppTheme(settings.theme as any);
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="text-primary max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold font-alan-sans mb-2">Settings</h1>
          <p className="text-primary/70">Manage your preferences and application configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-secondary rounded-xl font-semibold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-secondary rounded-2xl shadow-lg border border-primary/10 overflow-hidden">
            <nav className="flex flex-col p-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${
                    activeTab === tab.id 
                      ? 'bg-primary text-secondary shadow-md' 
                      : 'text-primary/70 hover:bg-primary/5 hover:text-primary'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-secondary rounded-2xl shadow-lg border border-primary/10 p-8 min-h-[500px]">
            
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Palette className="w-6 h-6 text-blue-500" />
                    Appearance
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <label className="block text-sm font-semibold mb-4">Theme Preference</label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { value: 'light', icon: Sun, label: 'Light' },
                          { value: 'dark', icon: Moon, label: 'Dark' },
                          { value: 'system', icon: Monitor, label: 'System' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSettings({...settings, theme: option.value})}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              settings.theme === option.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-transparent bg-secondary hover:bg-primary/5 text-primary/60'
                            }`}
                          >
                            <option.icon className="w-6 h-6" />
                            <span className="text-sm font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <div>
                        <h3 className="font-semibold">Compact Mode</h3>
                        <p className="text-sm text-primary/60">Reduce spacing for higher information density</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.compactMode}
                          onChange={(e) => setSettings({...settings, compactMode: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-primary/10">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-purple-500" />
                    Exam Defaults
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Default Duration (minutes)</label>
                      <input 
                        type="number" 
                        value={settings.examDefaults.duration}
                        onChange={(e) => setSettings({
                          ...settings, 
                          examDefaults: {...settings.examDefaults, duration: parseInt(e.target.value)}
                        })}
                        className="w-full px-4 py-2 bg-secondary border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Default Passing Score (%)</label>
                      <input 
                        type="number" 
                        value={settings.examDefaults.passingScore}
                        onChange={(e) => setSettings({
                          ...settings, 
                          examDefaults: {...settings.examDefaults, passingScore: parseInt(e.target.value)}
                        })}
                        className="w-full px-4 py-2 bg-secondary border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-green-500" />
                  Security
                </h2>
                
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/10">
                  <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium mb-1">Current Password</label>
                      <input type="password" className="w-full px-4 py-2 bg-secondary border border-primary/20 rounded-lg" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input type="password" className="w-full px-4 py-2 bg-secondary border border-primary/20 rounded-lg" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                      <input type="password" className="w-full px-4 py-2 bg-secondary border border-primary/20 rounded-lg" placeholder="••••••••" />
                    </div>
                    <button className="px-4 py-2 bg-primary text-secondary rounded-lg font-medium text-sm hover:bg-primary/90">
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-primary/5 border border-primary/10 opacity-75">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Two-Factor Authentication</h3>
                      <p className="text-sm text-primary/60">Add an extra layer of security to your account</p>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded uppercase">Coming Soon</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-orange-500" />
                  Notifications
                </h2>

                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Email Notifications', desc: 'Receive emails about new submissions and reports', key: 'emailNotifications' },
                    { id: 'push', label: 'Push Notifications', desc: 'Receive real-time alerts in the browser', key: 'pushNotifications' }
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <div>
                        <h3 className="font-semibold">{item.label}</h3>
                        <p className="text-sm text-primary/60">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings[item.key as keyof typeof settings] as boolean}
                          onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
