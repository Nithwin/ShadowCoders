'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { socketService } from '@/lib/socket';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch initial notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Socket listener
  useEffect(() => {
    if (!user) return;

    const socket = socketService.connect(localStorage.getItem('token') || '');
    if (socket) {
      socket.on('notification', (newNotification: Notification) => {
        setNotifications(prev => [newNotification, ...prev]);
        // Also play a sound or show browser notification if needed
      });
    }

    return () => {
      socket?.off('notification');
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get<Notification[]>('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      
      await api.put(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark as read:', error);
      // Revert if failed (optional, but good practice)
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await api.put('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead,
      isOpen,
      setIsOpen
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
