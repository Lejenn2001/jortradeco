import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const quickPrompts = [
  "What's the market sentiment right now?",
  "Any unusual options flow today?",
  "Show me high-confidence setups",
];

const AIChatPanel = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: text.trim(), history },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data?.reply || "I couldn't generate a response. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error('AI chat error:', e);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-8 w-8 text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Ask Biddie anything about the markets.</p>
            <p className="text-xs text-muted-foreground mt-1">Powered by real-time Unusual Whales data + Claude AI</p>
          </div>
        )}

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

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            Biddie is analyzing...
          </div>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((q) => (
              <button
                key={q}
                className="text-[10px] bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-full border border-border hover:border-primary/40 transition-colors"
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Biddie anything..."
            className="bg-muted/30 border-border/50 rounded-lg text-sm flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary/20 text-primary rounded-lg p-2.5 hover:bg-primary/30 transition-colors shrink-0 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChatPanel;
