import Typewriter from "./scene-typewriter";

interface SceneDialogProps {
  text: string;
}

const SceneDialog = ({ text }: SceneDialogProps) => {

  return (
    <div className="px-8 pb-8">
      <div
        className="w-full p-px rounded border-x border-t border-b-2 border-surface bg-cream"
      >
        <div className="px-4 pt-2 pb-3 rounded-sm border-x border-b border-t-2 border-surface text-md antialiased whitespace-pre-line">
          <Typewriter text={text} />
        </div>
      </div>
    </div>
  );
};

export default SceneDialog;
