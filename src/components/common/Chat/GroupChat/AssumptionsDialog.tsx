import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircularLoader } from "@/components/ui/loader";

type AssumptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current assumptions (the backend has no getter, so we pass local state). */
  initial: string[];
  onSave: (assumptions: string[]) => void;
  isSaving: boolean;
};

/**
 * Editor for the shared assumptions applied to every persona reply
 * (POST /v1/persona/group-chat/context). Saving REPLACES the full list.
 */
function AssumptionsDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  isSaving,
}: AssumptionsDialogProps) {
  const [items, setItems] = useState<string[]>([]);

  // Re-seed the editor each time it opens.
  useEffect(() => {
    if (open) setItems(initial.length > 0 ? initial : [""]);
  }, [open, initial]);

  const update = (index: number, value: string) =>
    setItems((prev) => prev.map((it, i) => (i === index ? value : it)));

  const remove = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const add = () => setItems((prev) => [...prev, ""]);

  const handleSave = () => {
    onSave(items.map((s) => s.trim()).filter(Boolean));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Shared assumptions</DialogTitle>
          <DialogDescription>
            Statements every persona considers when replying. Saving replaces the
            full list.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                placeholder="e.g. Product contains natural electrolytes"
                onChange={(e) => update(index, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                aria-label="Remove assumption"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={add}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add assumption
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <CircularLoader size="sm" className="mr-2 border-white" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssumptionsDialog;
