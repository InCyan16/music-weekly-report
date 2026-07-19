import { NextRequest, NextResponse } from "next/server";
import { getSpotifyClientCredentialsToken } from "@/lib/spotify/client-credentials";
import {
  getSpotifyMarket,
  searchSpotifyTracks,
} from "@/lib/spotify/search-tracks";
import {
  corsPreflightResponse,
  withDemoCors,
} from "@/lib/spotify/cors";

/**
 * Demo / 开发用：Client Credentials 搜索（无需用户登录）
 * 生产环境默认关闭，设置 ALLOW_PUBLIC_SPOTIFY_SEARCH=true 开启
 */
export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  const allowed =
    process.env.ALLOW_PUBLIC_SPOTIFY_SEARCH === "true" ||
    process.env.NODE_ENV !== "production";

  if (!allowed) {
    return withDemoCors(
      request,
      NextResponse.json({ error: "未开放公开搜索" }, { status: 403 }),
    );
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return withDemoCors(request, NextResponse.json({ tracks: [] }));
  }

  try {
    const token = await getSpotifyClientCredentialsToken();
    const tracks = await searchSpotifyTracks(token, q, getSpotifyMarket());
    return withDemoCors(request, NextResponse.json({ tracks }));
  } catch (err) {
    return withDemoCors(
      request,
      NextResponse.json(
        { error: err instanceof Error ? err.message : "搜索失败" },
        { status: 500 },
      ),
    );
  }
}
