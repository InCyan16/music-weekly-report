import { type MoodLabel } from "@/lib/music/types";
import { getTwemojiUrl } from "@/lib/mood/twemoji";
import { cn } from "@/lib/utils";

type MoodEmojiProps = {
  label: MoodLabel;
  className?: string;
};

export function MoodEmoji({ label, className }: MoodEmojiProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getTwemojiUrl(label)}
      alt=""
      draggable={false}
      className={cn("h-full w-full select-none object-contain", className)}
    />
  );
}
