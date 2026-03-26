import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/BigShoulders";

const { fontFamily: bodyFont } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const { fontFamily: displayFont } = loadDisplay("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});

// ── Chat conversation script ──
const conversation = [
  {
    role: "user" as const,
    text: "Hey Biddie, what's your morning outlook?",
    typingStart: 30,
    typingSpeed: 2, // frames per character
  },
  {
    role: "assistant" as const,
    text: "Morning! Markets are looking interesting today. ES futures are up 0.3% pre-market with some heavy call flow coming in on SPY 540s expiring Friday. I'm seeing bullish momentum building — gamma levels suggest we could push higher if we hold above 538.",
    appearDelay: 45, // frames after user msg done
  },
  {
    role: "user" as const,
    text: "Any unusual options flow worth watching?",
    typingStart: 30,
    typingSpeed: 2,
  },
  {
    role: "assistant" as const,
    text: "Big one just hit — $2.4M in NVDA 950 calls swept, June expiry. Conviction score: 87/100. That's aggressive positioning. Also seeing unusual put selling on AAPL 195s which signals institutional confidence. These are the setups I'm tracking closely.",
    appearDelay: 40,
  },
  {
    role: "user" as const,
    text: "What's your confidence level on NVDA right now?",
    typingStart: 25,
    typingSpeed: 2,
  },
  {
    role: "assistant" as const,
    text: "High conviction — 8.7/10. Multiple whale entries stacking at the same strike, new positioning (not rolling), and strong alignment with key gamma levels. The flow is aggressive and urgent. This is exactly the type of setup our model flags as high-probability.",
    appearDelay: 40,
  },
];

// ── Typing cursor ──
const Cursor: React.FC<{ visible: boolean }> = ({ visible }) => {
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 8) % 2 === 0;
  if (!visible) return null;
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: 16,
        backgroundColor: "#fff",
        marginLeft: 1,
        opacity: blink ? 1 : 0,
      }}
    />
  );
};

// ── Single chat bubble ──
const ChatBubble: React.FC<{
  role: "user" | "assistant";
  text: string;
  revealChars?: number; // for typing effect
  showCursor?: boolean;
  entryProgress: number; // 0-1
}> = ({ role, text, revealChars, showCursor, entryProgress }) => {
  const isUser = role === "user";
  const displayText =
    revealChars !== undefined ? text.slice(0, revealChars) : text;

  const y = interpolate(entryProgress, [0, 1], [20, 0]);
  const opacity = interpolate(entryProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-start",
        gap: 10,
        opacity,
        transform: `translateY(${y}px)`,
        marginBottom: 12,
      }}
    >
      {!isUser && (
        <Img
          src={staticFile("images/biddie-robot.png")}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid #3C82FF",
            flexShrink: 0,
          }}
        />
      )}
      <div
        style={{
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          backgroundColor: isUser
            ? "rgba(60, 130, 255, 0.25)"
            : "rgba(20, 24, 40, 0.85)",
          border: isUser
            ? "1px solid rgba(60, 130, 255, 0.4)"
            : "1px solid rgba(60, 130, 255, 0.15)",
          fontFamily: bodyFont,
          fontSize: 15,
          lineHeight: 1.5,
          color: isUser ? "#E0E8FF" : "#C8CDD7",
          fontWeight: isUser ? 500 : 400,
        }}
      >
        {!isUser && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#3C82FF",
              marginBottom: 4,
              letterSpacing: "0.05em",
            }}
          >
            BIDDIE AI
          </div>
        )}
        {displayText}
        {showCursor && <Cursor visible />}
      </div>
      {isUser && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3C82FF, #A050FF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: bodyFont,
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          J
        </div>
      )}
    </div>
  );
};

// ── Typing indicator dots ──
const TypingIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <Img
        src={staticFile("images/biddie-robot.png")}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "2px solid #3C82FF",
        }}
      />
      <div
        style={{
          padding: "14px 20px",
          borderRadius: "16px 16px 16px 4px",
          backgroundColor: "rgba(20, 24, 40, 0.85)",
          border: "1px solid rgba(60, 130, 255, 0.15)",
          display: "flex",
          gap: 6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#3C82FF",
              opacity: interpolate(
                ((frame + i * 6) % 24) / 24,
                [0, 0.5, 1],
                [0.3, 1, 0.3]
              ),
              transform: `translateY(${interpolate(
                ((frame + i * 6) % 24) / 24,
                [0, 0.25, 0.5, 0.75, 1],
                [0, -4, 0, 2, 0]
              )}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ── Chat window chrome ──
const ChatWindow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({
    frame,
    fps,
    config: { damping: 28, stiffness: 40, mass: 2 },
  });

  return (
    <div
      style={{
        width: 520,
        height: 680,
        borderRadius: 20,
        overflow: "hidden",
        transform: `scale(${windowScale})`,
        background: "rgba(8, 14, 28, 0.95)",
        border: "1px solid rgba(60, 130, 255, 0.2)",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(60,130,255,0.1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(60, 130, 255, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#3C82FF",
              boxShadow: "0 0 8px rgba(60,130,255,0.5)",
            }}
          />
          <span
            style={{
              fontFamily: bodyFont,
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            Biddie AI
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: bodyFont,
            color: "#3C82FF",
            backgroundColor: "rgba(60,130,255,0.15)",
            padding: "3px 10px",
            borderRadius: 20,
            fontWeight: 500,
          }}
        >
          ● Online
        </span>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(60,130,255,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            backgroundColor: "rgba(20, 24, 40, 0.6)",
            border: "1px solid rgba(60,130,255,0.15)",
            fontFamily: bodyFont,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Ask Biddie anything...
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(60,130,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          ➤
        </div>
      </div>
    </div>
  );
};

// ── Main chat demo composition ──
// Timeline planning per exchange:
// User typing -> send -> Biddie typing indicator -> Biddie response appears
// Exchange 1: frames 20-280
// Exchange 2: frames 300-560
// Exchange 3: frames 580-840

interface ExchangeTimeline {
  userTypingStart: number;
  userTypingEnd: number;
  biddieThinkStart: number;
  biddieThinkEnd: number;
  biddieRevealStart: number;
  biddieRevealEnd: number;
}

export const ChatDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate timelines for each exchange
  const exchanges: ExchangeTimeline[] = [];
  const exchangeData: { user: (typeof conversation)[0]; assistant: (typeof conversation)[0] }[] = [];

  for (let i = 0; i < conversation.length; i += 2) {
    exchangeData.push({
      user: conversation[i],
      assistant: conversation[i + 1],
    });
  }

  let cursor = 25; // start after window appears
  for (const ex of exchangeData) {
    const userChars = ex.user.text.length;
    const typingDuration = userChars * ex.user.typingSpeed!;
    const userTypingStart = cursor;
    const userTypingEnd = cursor + typingDuration;
    const biddieThinkStart = userTypingEnd + 10;
    const biddieThinkEnd = biddieThinkStart + (ex.assistant.appearDelay || 40);
    const assistantChars = ex.assistant.text.length;
    const biddieRevealStart = biddieThinkEnd;
    const biddieRevealEnd = biddieRevealStart + Math.ceil(assistantChars * 0.6); // fast text reveal

    exchanges.push({
      userTypingStart,
      userTypingEnd,
      biddieThinkStart,
      biddieThinkEnd,
      biddieRevealStart,
      biddieRevealEnd,
    });

    cursor = biddieRevealEnd + 50; // pause between exchanges
  }

  // Build visible messages
  const visibleElements: React.ReactNode[] = [];

  for (let i = 0; i < exchanges.length; i++) {
    const ex = exchanges[i];
    const userMsg = exchangeData[i].user;
    const assistantMsg = exchangeData[i].assistant;

    // User message
    if (frame >= ex.userTypingStart) {
      const typingFrame = frame - ex.userTypingStart;
      const totalChars = userMsg.text.length;
      const typingDuration = totalChars * userMsg.typingSpeed!;
      const isTyping = frame < ex.userTypingEnd;
      const charsRevealed = isTyping
        ? Math.min(Math.floor(typingFrame / userMsg.typingSpeed!), totalChars)
        : totalChars;

      const entrySpring = spring({
        frame: frame - ex.userTypingStart,
        fps,
        config: { damping: 30, stiffness: 120 },
      });

      visibleElements.push(
        <ChatBubble
          key={`user-${i}`}
          role="user"
          text={userMsg.text}
          revealChars={charsRevealed}
          showCursor={isTyping}
          entryProgress={entrySpring}
        />
      );
    }

    // Biddie typing indicator
    if (frame >= ex.biddieThinkStart && frame < ex.biddieRevealStart) {
      visibleElements.push(
        <Sequence key={`typing-${i}`} from={0}>
          <TypingIndicator />
        </Sequence>
      );
    }

    // Biddie response
    if (frame >= ex.biddieRevealStart) {
      const revealFrame = frame - ex.biddieRevealStart;
      const totalChars = assistantMsg.text.length;
      const charsRevealed = Math.min(
        Math.floor(revealFrame * 1.8),
        totalChars
      );

      const entrySpring = spring({
        frame: frame - ex.biddieRevealStart,
        fps,
        config: { damping: 30, stiffness: 120 },
      });

      visibleElements.push(
        <ChatBubble
          key={`assistant-${i}`}
          role="assistant"
          text={assistantMsg.text}
          revealChars={charsRevealed}
          showCursor={charsRevealed < totalChars}
          entryProgress={entrySpring}
        />
      );
    }
  }

  // Background
  const bgGradientAngle = interpolate(frame, [0, 900], [135, 155]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${bgGradientAngle}deg, #050A18 0%, #0A1230 40%, #0D0A25 100%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Subtle hex grid bg */}
      <Img
        src={staticFile("images/bg_hex.png")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.12,
        }}
      />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(60,130,255,0.12) 0%, transparent 60%)",
          top: "10%",
          left: "20%",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(160,80,255,0.08) 0%, transparent 60%)",
          bottom: "15%",
          right: "20%",
        }}
      />

      {/* JORTRADE branding top */}
      <div
        style={{
          position: "absolute",
          top: 50,
          fontFamily: displayFont,
          fontSize: 28,
          fontWeight: 800,
          color: "rgba(255,255,255,0.15)",
          letterSpacing: "0.2em",
        }}
      >
        JORTRADE
      </div>

      {/* Chat window */}
      <ChatWindow>{visibleElements}</ChatWindow>

      {/* Bottom tag */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          fontFamily: bodyFont,
          fontSize: 14,
          color: "rgba(200,205,215,0.4)",
          letterSpacing: "0.15em",
        }}
      >
        AI-POWERED TRADING INTELLIGENCE
      </div>
    </AbsoluteFill>
  );
};
