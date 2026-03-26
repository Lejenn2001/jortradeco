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

// ── Scene 1: Logo Reveal + Tagline ──
const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 30, stiffness: 30, mass: 2.5 },
  });
  const logoOpacity = interpolate(frame, [10, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(frame, [70, 100], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [70, 100], [40, 0], {
    extrapolateRight: "clamp",
  });

  // Subtle glow pulse
  const glowPulse = Math.sin(frame * 0.03) * 0.08 + 0.2;

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(160deg, #050A18 0%, #0A1230 35%, #0D0A25 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Ambient glows */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "20%",
          width: "45vw",
          height: "45vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(60,130,255,${glowPulse}) 0%, transparent 60%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          right: "20%",
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(160,80,255,${glowPulse * 0.7}) 0%, transparent 60%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 60,
        }}
      >
        <Img
          src={staticFile("images/jortrade-logo.png")}
          style={{
            height: 350,
            objectFit: "contain",
            filter: "drop-shadow(0 0 40px rgba(88,101,242,0.5))",
          }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          textAlign: "center",
          maxWidth: "85%",
        }}
      >
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: 64,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          Trade With{" "}
          <span style={{ color: "#3C82FF" }}>Confidence</span>
          <br />
          Using Your AI Assistant
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: Chat Demo ──
const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chat window entrance
  const windowScale = spring({
    frame,
    fps,
    config: { damping: 28, stiffness: 40, mass: 2 },
  });

  // User message typing
  const userText = "What's the flow on NVDA today?";
  const userTypingStart = 30;
  const userCharsRevealed =
    frame >= userTypingStart
      ? Math.min(
          Math.floor((frame - userTypingStart) / 2),
          userText.length
        )
      : 0;
  const userDone = userCharsRevealed >= userText.length;
  const userMsgVisible = frame >= userTypingStart;

  // Biddie typing indicator
  const biddieThinkStart = userTypingStart + userText.length * 2 + 15;
  const biddieThinkEnd = biddieThinkStart + 45;

  // Biddie response
  const biddieText =
    "NVDA flow is heavily bullish. Spotted aggressive call sweeps at the $950 strike — $2.4M in premium. Conviction score: 87/100. Gamma levels support a push higher if it holds above $920. This is a high-confidence setup.";
  const biddieRevealStart = biddieThinkEnd;
  const biddieCharsRevealed =
    frame >= biddieRevealStart
      ? Math.min(Math.floor((frame - biddieRevealStart) * 1.8), biddieText.length)
      : 0;
  const biddieVisible = frame >= biddieRevealStart;

  // Glow
  const glowPulse = Math.sin(frame * 0.03) * 0.06 + 0.15;

  const userEntrySpring = spring({
    frame: frame - userTypingStart,
    fps,
    config: { damping: 30, stiffness: 120 },
  });
  const biddieEntrySpring = spring({
    frame: frame - biddieRevealStart,
    fps,
    config: { damping: 30, stiffness: 120 },
  });

  // Cursor blink
  const cursorBlink = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(160deg, #050A18 0%, #0A1230 35%, #0D0A25 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Ambient glows */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "15%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(60,130,255,${glowPulse}) 0%, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "15%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(160,80,255,${glowPulse * 0.7}) 0%, transparent 60%)`,
        }}
      />

      {/* Chat Window */}
      <div
        style={{
          width: 560,
          borderRadius: 24,
          overflow: "hidden",
          transform: `scale(${windowScale})`,
          background: "rgba(10, 14, 30, 0.9)",
          border: "1px solid rgba(60, 130, 255, 0.2)",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(60,130,255,0.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(60, 130, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Img
              src={staticFile("images/biddie-robot.png")}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "2px solid #3C82FF",
              }}
            />
            <span
              style={{
                fontFamily: bodyFont,
                fontSize: 15,
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
              padding: "3px 12px",
              borderRadius: 20,
              fontWeight: 500,
            }}
          >
            ● Online
          </span>
        </div>

        {/* Messages */}
        <div
          style={{
            padding: 20,
            minHeight: 200,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 14,
          }}
        >
          {/* User message */}
          {userMsgVisible && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "flex-start",
                gap: 10,
                opacity: interpolate(userEntrySpring, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(userEntrySpring, [0, 1], [15, 0])}px)`,
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  borderRadius: "16px 16px 4px 16px",
                  backgroundColor: "rgba(60, 130, 255, 0.2)",
                  border: "1px solid rgba(60, 130, 255, 0.35)",
                  fontFamily: bodyFont,
                  fontSize: 15,
                  color: "#E0E8FF",
                  fontWeight: 500,
                }}
              >
                {userText.slice(0, userCharsRevealed)}
                {!userDone && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 16,
                      backgroundColor: "#fff",
                      marginLeft: 1,
                      opacity: cursorBlink ? 1 : 0,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
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
                U
              </div>
            </div>
          )}

          {/* Biddie typing indicator */}
          {frame >= biddieThinkStart && frame < biddieRevealStart && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Img
                src={staticFile("images/biddie-robot.png")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "2px solid #3C82FF",
                }}
              />
              <div
                style={{
                  padding: "14px 20px",
                  borderRadius: "16px 16px 16px 4px",
                  backgroundColor: "rgba(20, 24, 40, 0.85)",
                  border: "1px solid rgba(60, 130, 255, 0.12)",
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
          )}

          {/* Biddie response */}
          {biddieVisible && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                opacity: interpolate(biddieEntrySpring, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(biddieEntrySpring, [0, 1], [15, 0])}px)`,
              }}
            >
              <Img
                src={staticFile("images/biddie-robot.png")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "2px solid #3C82FF",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  maxWidth: "80%",
                  padding: "12px 16px",
                  borderRadius: "16px 16px 16px 4px",
                  backgroundColor: "rgba(20, 24, 40, 0.85)",
                  border: "1px solid rgba(60, 130, 255, 0.12)",
                  fontFamily: bodyFont,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "#C8CDD7",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#3C82FF",
                    marginBottom: 6,
                    letterSpacing: "0.05em",
                  }}
                >
                  BIDDIE AI
                </div>
                {biddieText.slice(0, biddieCharsRevealed)}
                {biddieCharsRevealed < biddieText.length && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 14,
                      backgroundColor: "#3C82FF",
                      marginLeft: 1,
                      opacity: cursorBlink ? 1 : 0,
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid rgba(60,130,255,0.1)",
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
              backgroundColor: "rgba(20, 24, 40, 0.5)",
              border: "1px solid rgba(60,130,255,0.1)",
              fontFamily: bodyFont,
              fontSize: 13,
              color: "#4B5563",
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
              color: "#3C82FF",
              fontSize: 16,
            }}
          >
            ➤
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: Closing Logo ──
const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 30, stiffness: 28, mass: 2.8 },
  });
  const logoOpacity = interpolate(frame, [5, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const urlOpacity = interpolate(frame, [50, 80], [0, 1], {
    extrapolateRight: "clamp",
  });
  const glowPulse = Math.sin(frame * 0.04) * 0.1 + 0.25;

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(160deg, #050A18 0%, #0A1230 35%, #0D0A25 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Big central glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(60,130,255,${glowPulse}) 0%, rgba(160,80,255,${glowPulse * 0.5}) 40%, transparent 65%)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <Img
          src={staticFile("images/jortrade-logo.png")}
          style={{
            height: 300,
            objectFit: "contain",
            filter: "drop-shadow(0 0 40px rgba(88,101,242,0.5))",
          }}
        />
      </div>

      {/* URL pill */}
      <div
        style={{
          opacity: urlOpacity,
          marginTop: 50,
          background: "linear-gradient(135deg, #3C82FF, #A050FF)",
          borderRadius: 30,
          padding: "14px 40px",
        }}
      >
        <div
          style={{
            fontFamily: displayFont,
            fontSize: 30,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.1em",
          }}
        >
          WWW.JORTRADE.COM
        </div>
      </div>

      <div style={{ opacity: urlOpacity, marginTop: 18 }}>
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: 22,
            color: "#8C91A0",
          }}
        >
          @jortrade
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ──
export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={160}>
        <LogoScene />
      </Sequence>
      <Sequence from={160} durationInFrames={300}>
        <ChatScene />
      </Sequence>
      <Sequence from={460} durationInFrames={140}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
