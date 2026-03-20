import { useCallback, useRef, useState } from "react";

const NOTIFICATIONS_MAX_VISIBLE = 5;
const NOTIFICATIONS_DISMISS_DELAY = 2500;

export interface Notification {
  readonly id: number;
  readonly text: string;
}

interface NotificationQueue {
  readonly notifications: readonly Notification[];
  readonly dispatch: (text: string) => void;
}

export const useNotifications = (): NotificationQueue => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const counter = useRef(0);

  const dispatch = useCallback((text: string) => {
    const id = counter.current++;

    setNotifications((previous) => [...previous, { id, text }].slice(-NOTIFICATIONS_MAX_VISIBLE));

    setTimeout(() => {
      setNotifications((previous) => previous.filter((notification) => notification.id !== id));
    }, NOTIFICATIONS_DISMISS_DELAY);
  }, []);

  return {
    notifications,
    dispatch,
  };
};
