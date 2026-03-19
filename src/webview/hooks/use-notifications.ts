import { useCallback, useRef, useState } from "react";

const MAX_VISIBLE = 3;
const EXPIRE_MS = 5000;

export interface Notification {
  readonly id: number;
  readonly text: string;
}

interface NotificationQueue {
  readonly notifications: readonly Notification[];
  readonly push: (text: string) => void;
}

export const useNotifications = (): NotificationQueue => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextId = useRef(0);

  const push = useCallback((text: string) => {
    const id = nextId.current++;

    setNotifications((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, text }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, EXPIRE_MS);
  }, []);

  return { notifications, push };
};
