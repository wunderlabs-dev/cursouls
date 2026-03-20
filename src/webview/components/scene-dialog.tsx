import type { Notification } from "@web/hooks/use-notifications";

import { NOTIFICATION } from "@web/utils/constants";

import { Typewriter } from "./scene-typewriter";

interface SceneDialogProps {
  notifications: readonly Notification[];
}

const SceneDialog = ({ notifications }: SceneDialogProps) => {
  return (
    <div className="px-8 pb-8">
      <div className="w-full p-px bg-cream rounded border-x border-t border-b-2 border-surface">
        <div className="px-4 pt-2 pb-3 text-md antialiased whitespace-break-spaces rounded-sm border-x border-b border-t-2 border-surface">
          {notifications.length ? (
            <ul className="space-y-0.5">
              {notifications.map((notification) => (
                <li key={notification.id} className="text-sm uppercase">
                  <Typewriter text={notification.text} />
                </li>
              ))}
            </ul>
          ) : (
            <Typewriter text={NOTIFICATION.idle} />
          )}
        </div>
      </div>
    </div>
  );
};

export { SceneDialog };
