import { Shield, Star, Crown } from "lucide-react";

interface ChatUserBadgeProps {
  userId: string;
  isAdmin?: boolean;
}

const BIDDIE_USER_ID = "00000000-0000-0000-0000-000000000000";

const ChatUserBadge = ({ userId, isAdmin }: ChatUserBadgeProps) => {
  if (userId === BIDDIE_USER_ID) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
        <Star className="h-2.5 w-2.5" />
        AI
      </span>
    );
  }

  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
        <Crown className="h-2.5 w-2.5" />
        ADMIN
      </span>
    );
  }

  return null;
};

export default ChatUserBadge;
