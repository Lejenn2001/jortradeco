import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { ChatDemo } from "./ChatDemo";
import { PromoVideo } from "./PromoVideo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1080}
    />
    <Composition
      id="reel"
      component={MainVideo}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="chat-demo"
      component={ChatDemo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="promo"
      component={PromoVideo}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
