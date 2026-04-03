import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface ChatImageUploadProps {
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
}

const ChatImageUpload = ({ onImageUploaded, disabled }: ChatImageUploadProps) => {
  const { session } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }

    const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
    onImageUploaded(data.publicUrl);

    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        title="Share a screenshot"
      >
        <ImagePlus className="h-4 w-4" />
      </button>
    </>
  );
};

export default ChatImageUpload;
