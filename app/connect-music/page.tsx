import { Suspense } from "react";
import ConnectMusicContent from "./ConnectMusicContent";

export default function ConnectMusicPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-ink-muted">加载中...</div>}>
      <ConnectMusicContent />
    </Suspense>
  );
}
