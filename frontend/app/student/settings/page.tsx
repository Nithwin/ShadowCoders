'use client';

import { useEffect, useState } from 'react';
import { 
  Settings, 
  Bell, 
  Save,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function StudentSettingsPage() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data && Object.keys(data).length > 0) {
          // Filter out admin-only settings if any
          const { emailNotifications, pushNotifications } = data;
          setSettings(prev => ({ 
            ...prev, 
            ...(emailNotifications !== undefined && { emailNotifications }),
            ...(pushNotifications !== undefined && { pushNotifications })
          }));
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.put('/settings', settings);
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-alan-sans mb-2">Settings</h1>
          <p className="text-primary/60">Manage your preferences and application settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-secondary rounded-xl font-semibold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                activeTab === tab.id
                  ? 'bg-primary text-secondary shadow-md'
                  : 'hover:bg-primary/5 text-primary/70'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* General Settings */}


          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-primary/10 shadow-sm space-y-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                Notification Preferences
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <div>
                    <h3 className="font-semibold">Email Notifications</h3>
                    <p className="text-sm text-primary/60">Receive updates about your exams and results via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <div>
                    <h3 className="font-semibold">Push Notifications</h3>
                    <p className="text-sm text-primary/60">Receive push notifications for important announcements</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.pushNotifications}
                      onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
