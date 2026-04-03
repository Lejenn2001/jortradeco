import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface PinnedMessage {
  id: string;
  user_name: string;
  content: string;
}

interface ChatPinnedBarProps {
  messages: PinnedMessage[];
  onJumpTo: (id: string) => void;
}

const ChatPinnedBar = ({ messages, onJumpTo }: ChatPinnedBarProps) => {
  const [expanded, setExpanded] = useState(false);

  if (messages.length === 0) return null;

  const shown = expanded ? messages : messages.slice(0, 1);

  return (
    <div className="glass-panel rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 mb-1.5 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Pin className="h-3 w-3 text-amber-400" />
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Pinned ({messages.length})
          </span>
        </div>
        {messages.length > 1 && (
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>
      {shown.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onJumpTo(msg.id)}
          className="block w-full text-left hover:bg-amber-500/10 rounded px-1.5 py-0.5 transition-colors"
        >
          <span className="text-[10px] font-semibold text-amber-300">{msg.user_name}: </span>
          <span className="text-[11px] text-muted-foreground truncate">{msg.content.slice(0, 100)}</span>
        </button>
      ))}
    </div>
  );
};

export default ChatPinnedBar;
