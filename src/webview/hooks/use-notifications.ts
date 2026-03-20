import { useCallback, useRef, useState } from "react";

const NOTIFICATIONS_DISMISS_THRESHOLD = 3;
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

    setNotifications((previous) => [...previous, { id, text }]);

    setTimeout(() => {
      setNotifications((previous) => {
        if (previous.length <= NOTIFICATIONS_DISMISS_THRESHOLD) {
          return previous;
        }
        return previous.slice(-NOTIFICATIONS_DISMISS_THRESHOLD);
      });
    }, NOTIFICATIONS_DISMISS_DELAY);
  }, []);

  return {
    notifications,
    dispatch,
  };
};
