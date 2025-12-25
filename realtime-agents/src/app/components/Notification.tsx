'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/app/lib/utils';

export type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

let notificationId = 0;
const listeners: Array<(notifications: Notification[]) => void> = [];
let notifications: Notification[] = [];

function notify(message: string, type: NotificationType = 'info', duration: number = 4000) {
  const id = `notification-${notificationId++}`;
  const notification: Notification = { id, message, type };
  
  notifications = [...notifications, notification];
  listeners.forEach(listener => listener([...notifications]));
  
  if (duration > 0) {
    setTimeout(() => {
      notifications = notifications.filter(n => n.id !== id);
      listeners.forEach(listener => listener([...notifications]));
    }, duration);
  }
  
  return id;
}

export function showNotification(message: string, type: NotificationType = 'info', duration?: number) {
  return notify(message, type, duration);
}

export function showSuccess(message: string, duration?: number) {
  return notify(message, 'success', duration);
}

export function showError(message: string, duration?: number) {
  return notify(message, 'error', duration);
}

export function NotificationContainer() {
  const [currentNotifications, setCurrentNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const listener = (notifs: Notification[]) => {
      setCurrentNotifications(notifs);
    };
    listeners.push(listener);
    listener(notifications);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  if (currentNotifications.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {currentNotifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            "pointer-events-auto rounded-2xl shadow-2xl border-2 p-5 transform transition-all duration-300 ease-out backdrop-blur-sm",
            notification.type === 'success' && "bg-gradient-to-br from-amber-100/95 to-orange-100/95 border-amber-300/80 text-amber-900",
            notification.type === 'error' && "bg-gradient-to-br from-red-100/95 to-orange-100/95 border-red-300/80 text-red-900",
            notification.type === 'info' && "bg-gradient-to-br from-amber-100/95 to-yellow-100/95 border-amber-300/80 text-amber-900"
          )}
          style={{
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div className="flex items-start gap-4">
            <span className={cn(
              "material-symbols-outlined text-2xl flex-shrink-0",
              notification.type === 'success' && "text-amber-600",
              notification.type === 'error' && "text-red-600",
              notification.type === 'info' && "text-amber-600"
            )}>
              {notification.type === 'success' && 'check_circle'}
              {notification.type === 'error' && 'error'}
              {notification.type === 'info' && 'info'}
            </span>
            <p className="text-base font-semibold flex-1 leading-relaxed">
              {notification.message}
            </p>
            <button
              onClick={() => {
                notifications = notifications.filter(n => n.id !== notification.id);
                listeners.forEach(listener => listener([...notifications]));
              }}
              className={cn(
                "flex-shrink-0 p-1.5 rounded-lg transition-colors",
                notification.type === 'success' && "text-amber-700 hover:bg-amber-200/50",
                notification.type === 'error' && "text-red-700 hover:bg-red-200/50",
                notification.type === 'info' && "text-amber-700 hover:bg-amber-200/50"
              )}
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

