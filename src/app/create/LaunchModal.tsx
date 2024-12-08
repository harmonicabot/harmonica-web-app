import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

interface LaunchModalProps {
  showLaunchModal: boolean;
  setShowLaunchModal: (show: boolean) => void;
  handleShareComplete: (e: React.FormEvent, mode: 'launch' | 'draft') => void;
}

export function LaunchModal({ 
  showLaunchModal, 
  setShowLaunchModal, 
  handleShareComplete 
}: LaunchModalProps) {
  return (
    <Dialog open={showLaunchModal} onOpenChange={setShowLaunchModal}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Ready to launch?</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Deploy your new session in one-click.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={(e) => {
              setShowLaunchModal(false);
              handleShareComplete(e as any, 'draft');
            }}
          >
            Save to drafts
          </Button>
          <Button
            onClick={(e) => {
              setShowLaunchModal(false);
              handleShareComplete(e as any, 'launch');
            }}
          >
            Launch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 