import { Reply, X } from "lucide-react";

interface ChatReplyPreviewProps {
  replyTo: { id: string; user_name: string; content: string } | null;
  onCancel: () => void;
}

const ChatReplyPreview = ({ replyTo, onCancel }: ChatReplyPreviewProps) => {
  if (!replyTo) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border-l-2 border-primary/40 rounded-r-lg mx-2 mb-1">
      <Reply className="h-3 w-3 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold text-primary">{replyTo.user_name}</span>
        <p className="text-[11px] text-muted-foreground truncate">{replyTo.content}</p>
      </div>
      <button onClick={onCancel} className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export default ChatReplyPreview;
