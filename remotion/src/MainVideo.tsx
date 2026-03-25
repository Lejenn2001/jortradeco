import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Outfit";
import { loadFont as loadDisplay } from "@remotion/google-fonts/BigShoulders";

const { fontFamily: bodyFont } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });
const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700", "800"], subsets: ["latin"] });

// Scene 1: Logo reveal with glow
const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({ frame, fps, config: { damping: 15, stiffness: 80, mass: 1.5 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const glowSize = interpolate(frame, [0, 60, 90], [0, 600, 400], { extrapolateRight: "clamp" });
  const glowOpacity = interpolate(frame, [0, 30, 90], [0, 0.6, 0.2], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [50, 70], [30, 0], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [40, 80], [0, 300], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#080E1C", justifyContent: "center", alignItems: "center" }}>
      {/* Background image */}
      <Img src={staticFile("images/bg_hex.png")} style={{
        position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.3,
      }} />
      
      {/* Glow */}
      <div style={{
        position: "absolute", width: glowSize, height: glowSize,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(60,130,255,${glowOpacity}) 0%, rgba(160,80,255,${glowOpacity * 0.5}) 40%, transparent 70%)`,
      }} />

      {/* Logo */}
      <Img src={staticFile("images/logo_jt.png")} style={{
        opacity, transform: `scale(${scale})`,
        width: 320, height: "auto",
        filter: "drop-shadow(0 0 30px rgba(60,130,255,0.4))",
      }} />

      {/* Accent line */}
      <div style={{
        width: lineWidth, height: 3, marginTop: 20,
        background: "linear-gradient(90deg, transparent, #3C82FF, #A050FF, transparent)",
      }} />

      {/* Tagline */}
      <div style={{
        opacity: taglineOpacity, transform: `translateY(${taglineY}px)`,
        fontFamily: bodyFont, fontSize: 28, color: "#C8CDD7",
        marginTop: 25, letterSpacing: "0.3em", fontWeight: 400,
      }}>
        TRADE WITH INTELLIGENCE
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: The 4 Pillars stagger in
const FourPillars: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 15], [40, 0], { extrapolateRight: "clamp" });

  const pillars = [
    { icon: "🤖", name: "AI SIGNALS", desc: "Biddie scans 1,000+ setups", color: "#3C82FF" },
    { icon: "👥", name: "COMMUNITY", desc: "Real-time trader network", color: "#A050FF" },
    { icon: "🎓", name: "EDUCATION", desc: "Structured trading courses", color: "#00DCFF" },
    { icon: "🧑‍🏫", name: "MENTORSHIP", desc: "Live coaching & strategy", color: "#00FFA0" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#080E1C", justifyContent: "center", alignItems: "center", padding: 60 }}>
      <Img src={staticFile("images/bg_pillars.png")} style={{
        position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.2,
      }} />

      <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center", marginBottom: 50 }}>
        <div style={{ fontFamily: displayFont, fontSize: 72, fontWeight: 800, color: "#fff" }}>THE ECOSYSTEM</div>
        <div style={{ fontFamily: bodyFont, fontSize: 24, color: "#8C91A0", marginTop: 10, letterSpacing: "0.2em" }}>FOUR PILLARS OF EDGE</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
        {pillars.map((p, i) => {
          const delay = 20 + i * 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 150 } });
          const x = interpolate(s, [0, 1], [-400, 0]);
          const o = interpolate(s, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              opacity: o, transform: `translateX(${x}px)`,
              display: "flex", alignItems: "center", gap: 20,
              background: "rgba(10,14,28,0.85)", borderRadius: 16, padding: "22px 30px",
              borderLeft: `4px solid ${p.color}`,
            }}>
              <div style={{ fontSize: 36 }}>{p.icon}</div>
              <div>
                <div style={{ fontFamily: displayFont, fontSize: 38, fontWeight: 700, color: p.color, letterSpacing: "0.1em" }}>{p.name}</div>
                <div style={{ fontFamily: bodyFont, fontSize: 26, color: "#C8CDD7", marginTop: 4 }}>{p.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Biddie reveal
const BiddieReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const biddieScale = spring({ frame: frame - 10, fps, config: { damping: 10, stiffness: 100 } });
  const biddieRotate = interpolate(frame, [10, 40], [-15, 0], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [25, 40], [30, 0], { extrapolateRight: "clamp" });
  const glowPulse = interpolate(frame, [0, 120], [0, Math.PI * 4]);
  const glowRadius = 350 + Math.sin(glowPulse) * 30;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0818", justifyContent: "center", alignItems: "center" }}>
      <Img src={staticFile("images/bg_hex.png")} style={{
        position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.25,
      }} />

      {/* Pulsing glow behind Biddie */}
      <div style={{
        position: "absolute", width: glowRadius, height: glowRadius, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(160,80,255,0.3) 0%, rgba(60,130,255,0.1) 50%, transparent 70%)",
        top: "15%",
      }} />

      {/* Biddie */}
      <Img src={staticFile("images/biddie.png")} style={{
        width: 350, height: 350,
        transform: `scale(${biddieScale}) rotate(${biddieRotate}deg)`,
        marginTop: -80,
        filter: "drop-shadow(0 0 40px rgba(160,80,255,0.5))",
      }} />

      {/* Text below */}
      <div style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, textAlign: "center", marginTop: 30 }}>
        <div style={{ fontFamily: displayFont, fontSize: 64, fontWeight: 800, color: "#fff" }}>MEET BIDDIE</div>
        <div style={{ fontFamily: bodyFont, fontSize: 26, color: "#A050FF", marginTop: 8 }}>Your AI Trading Assistant</div>
        <div style={{ fontFamily: bodyFont, fontSize: 20, color: "#8C91A0", marginTop: 12 }}>Scans 1,000+ setups daily</div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Stats counter
const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: "1,000+", label: "Setups Scanned Daily", color: "#3C82FF" },
    { value: "8.5+", label: "Confidence Threshold", color: "#00FFA0" },
    { value: "24/7", label: "Market Monitoring", color: "#A050FF" },
    { value: "REAL-TIME", label: "Flow Detection", color: "#00DCFF" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#080E1C", justifyContent: "center", alignItems: "center", padding: 60 }}>
      <Img src={staticFile("images/bg_hex.png")} style={{
        position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.2,
      }} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
        {stats.map((s, i) => {
          const delay = i * 10;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
          const scale = interpolate(sp, [0, 1], [0.6, 1]);
          const o = interpolate(sp, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              opacity: o, transform: `scale(${scale})`,
              width: 440, background: "rgba(15,20,35,0.9)", borderRadius: 20,
              padding: "35px 30px", textAlign: "center",
              border: `1px solid ${s.color}33`,
            }}>
              <div style={{ fontFamily: displayFont, fontSize: 56, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: bodyFont, fontSize: 20, color: "#C8CDD7", marginTop: 10 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: CTA closing
const ClosingCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80, mass: 1.5 } });
  const tagOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [30, 50], [20, 0], { extrapolateRight: "clamp" });
  const urlOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [20, 60], [0, 400], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.05) * 0.15 + 0.35;

  return (
    <AbsoluteFill style={{ backgroundColor: "#080E1C", justifyContent: "center", alignItems: "center" }}>
      <Img src={staticFile("images/bg_pillars.png")} style={{
        position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.2,
      }} />

      {/* Glow */}
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(60,130,255,${glowPulse}) 0%, rgba(160,80,255,${glowPulse * 0.5}) 40%, transparent 65%)`,
      }} />

      <div style={{ textAlign: "center", transform: `scale(${logoScale})` }}>
        <div style={{ fontFamily: displayFont, fontSize: 100, fontWeight: 800, color: "#fff", letterSpacing: "0.12em" }}>
          JORTRADE
        </div>
      </div>

      <div style={{ width: lineWidth, height: 3, marginTop: 15, background: "linear-gradient(90deg, transparent, #3C82FF, #A050FF, transparent)" }} />

      <div style={{ opacity: tagOpacity, transform: `translateY(${tagY}px)`, textAlign: "center", marginTop: 25 }}>
        <div style={{ fontFamily: bodyFont, fontSize: 28, color: "#C8CDD7", letterSpacing: "0.15em" }}>
          YOUR EDGE STARTS HERE
        </div>
      </div>

      <div style={{
        opacity: urlOpacity, marginTop: 40,
        background: "linear-gradient(135deg, #3C82FF, #A050FF)", borderRadius: 30,
        padding: "14px 40px",
      }}>
        <div style={{ fontFamily: displayFont, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "0.1em" }}>
          WWW.JORTRADE.COM
        </div>
      </div>

      <div style={{ opacity: urlOpacity, marginTop: 20 }}>
        <div style={{ fontFamily: bodyFont, fontSize: 22, color: "#8C91A0" }}>@jortrade</div>
      </div>
    </AbsoluteFill>
  );
};

// Main composition
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={100}><LogoReveal /></Sequence>
      <Sequence from={100} durationInFrames={110}><FourPillars /></Sequence>
      <Sequence from={210} durationInFrames={90}><BiddieReveal /></Sequence>
      <Sequence from={300} durationInFrames={60}><StatsScene /></Sequence>
      <Sequence from={360} durationInFrames={90}><ClosingCTA /></Sequence>
    </AbsoluteFill>
  );
};
