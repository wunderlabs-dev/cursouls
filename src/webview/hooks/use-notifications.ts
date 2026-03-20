import { useCallback, useState } from "react";
import { uniqueId } from "lodash";

const NOTIFICATIONS_DISMISS_THRESHOLD = 3;
const NOTIFICATIONS_DISMISS_DELAY = 2500;

export interface Notification {
  readonly id: string;
  readonly text: string;
}

interface NotificationQueue {
  readonly notifications: readonly Notification[];
  readonly dispatch: (text: string) => void;
}

export const useNotifications = (): NotificationQueue => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dispatch = useCallback((text: string) => {
    const id = uniqueId();

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
