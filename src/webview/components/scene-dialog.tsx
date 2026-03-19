import type { Notification } from "@web/hooks/use-notifications";

import { Typewriter } from "./scene-typewriter";

interface SceneDialogProps {
  notifications: readonly Notification[];
}

const SceneDialog = ({ notifications }: SceneDialogProps) => {
  return (
    <div className="px-8 pb-8">
      <div className="w-full p-px rounded border-x border-t border-b-2 border-surface bg-cream">
        <div className="px-4 pt-2 pb-3 rounded-sm border-x border-b border-t-2 border-surface text-md antialiased">
          {notifications.length === 0 ? (
            <Typewriter text={"WELCOME TO CURSOULS!\nCreate an agent to get started"} />
          ) : (
            <ul className="space-y-0.5">
              {notifications.map((n) => (
                <li key={n.id} className="uppercase text-sm">
                  <Typewriter text={n.text} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export { SceneDialog };
