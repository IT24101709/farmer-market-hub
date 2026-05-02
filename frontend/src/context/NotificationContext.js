import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AuthContext } from './AuthContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/notificationService';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {}
});

export const NotificationProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshNotifications = useCallback(async () => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetchNotifications(token);
      const list = res.data || [];
      setNotifications(list);
      setUnreadCount(
        typeof res.unread === 'number' ? res.unread : list.filter((n) => !n.read).length
      );
    } catch {
      /* offline / 401 — ignore */
    }
  }, [token, user]);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 12000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshNotifications();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refreshNotifications]);

  const markAsRead = useCallback(
    async (id) => {
      if (!token) return;
      try {
        await markNotificationRead(id, token);
        await refreshNotifications();
      } catch {
        /* ignore */
      }
    },
    [token, refreshNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      await refreshNotifications();
    } catch {
      /* ignore */
    }
  }, [token, refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
