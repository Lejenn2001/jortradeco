import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Is there a setup to watch?",
    timestamp: "10:32 AM",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Monitoring a possible bullish structure forming near a key liquidity zone on NQ Futures. Confidence is at 9.1.\n\nWould you like entry timing context?",
    timestamp: "10:32 AM",
  },
  {
    id: "3",
    role: "user",
    content: "Yes, and what about PLTR puts?",
    timestamp: "10:34 AM",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "PLTR showing unusual put activity near the $23 strike. Confidence is moderate at 6.4. I'd suggest waiting for a confirmed breakdown below $22.80 before entering.\n\nMeanwhile, the NQ setup has a better risk/reward profile right now.",
    timestamp: "10:34 AM",
  },
];

const quickPrompts = [
  "Should I consider calls or puts?",
  "What's the confidence level?",
  "Show me similar setups",
];

const AIChatPanel = () => {
  const [messages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  return (
    <div className="glass-panel rounded-xl border-glow-purple flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Biddie AI</span>
        </div>
        <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Online
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg p-3 ${
              msg.role === "assistant"
                ? "bg-primary/5 border border-primary/10"
                : "bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {msg.role === "assistant" ? (
                <Bot className="h-3 w-3 text-primary" />
              ) : (
                <User className="h-3 w-3 text-accent" />
              )}
              <span className={`text-xs font-bold ${msg.role === "assistant" ? "text-primary" : "text-accent"}`}>
                {msg.role === "assistant" ? "Biddie" : "You"}
              </span>
              <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-line">{msg.content}</p>
          </div>
        ))}

        <div className="flex items-center gap-1 text-xs text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Analyzing market conditions...
        </div>
      </div>

      {/* Quick prompts */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              className="text-[10px] bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-full border border-border hover:border-primary/40 transition-colors"
              onClick={() => setInput(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Biddie anything..."
            className="bg-muted/30 border-border/50 rounded-lg text-sm flex-1"
          />
          <button className="bg-primary/20 text-primary rounded-lg p-2.5 hover:bg-primary/30 transition-colors shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
