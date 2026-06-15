import { useEffect, useId, useRef, useState } from 'react';
import {
  loomEmbedUrl,
  parseLoomVideoId,
  parseYoutubeVideoId,
  youtubeEmbedUrl,
  type VisitorIntroVideo,
} from '@mams/types';
import { resolveIntroVideoUrl } from '../../lib/visitorIntroUrls';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          events?: { onStateChange?: (e: { data: number }) => void };
        }
      ) => void;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    });
  }
  return ytApiPromise;
}

function resolveVideoUrl(video: VisitorIntroVideo): string | null {
  if (video.source === 'upload' && video.url) return video.url;
  if (video.source === 'youtube' && video.url) {
    const id = parseYoutubeVideoId(video.url);
    return id ? youtubeEmbedUrl(id) : null;
  }
  if (video.source === 'loom' && video.url) {
    const id = parseLoomVideoId(video.url);
    return id ? loomEmbedUrl(id) : null;
  }
  return null;
}

export function VisitorVideoPlayer({
  video,
  slug,
  onCompleted,
  showManualFallback = true,
}: {
  video: VisitorIntroVideo;
  slug?: string;
  onCompleted?: () => void;
  showManualFallback?: boolean;
}) {
  const reactId = useId();
  const playerId = `yt-player-${reactId.replace(/:/g, '')}`;
  const completedRef = useRef(false);
  const [loomFallback, setLoomFallback] = useState(false);

  const markCompleted = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleted?.();
  };

  useEffect(() => {
    completedRef.current = false;
    setLoomFallback(false);
  }, [video.source, video.url, video.storageKey]);

  useEffect(() => {
    if (video.source !== 'youtube' || !video.url) return;
    const videoId = parseYoutubeVideoId(video.url);
    if (!videoId) return;

    let player: InstanceType<NonNullable<typeof window.YT>['Player']> | null = null;
    let cancelled = false;

    loadYoutubeApi().then(() => {
      if (cancelled || !window.YT) return;
      player = new window.YT.Player(playerId, {
        videoId,
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT!.PlayerState.ENDED) markCompleted();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      player = null;
    };
  }, [video.source, video.url, playerId]);

  useEffect(() => {
    if (video.source !== 'loom') return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.loom.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const type = data?.type ?? data?.event;
        if (
          type === 'video-ended' ||
          type === 'playback-complete' ||
          type === 'ended' ||
          data?.payload?.event === 'ended'
        ) {
          markCompleted();
        }
      } catch {
        /* ignore non-JSON messages */
      }
    };

    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => setLoomFallback(true), 8000);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, [video.source, video.url]);

  const uploadUrl = video.source === 'upload' ? resolveIntroVideoUrl(video, slug) : null;

  if (video.source === 'upload' && uploadUrl) {
    return (
      <video
        className="w-full rounded-md bg-black aspect-video"
        src={uploadUrl}
        controls
        playsInline
        onEnded={markCompleted}
      />
    );
  }

  if (video.source === 'youtube' && video.url && parseYoutubeVideoId(video.url)) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        <div id={playerId} className="h-full w-full" />
      </div>
    );
  }

  const embedUrl = resolveVideoUrl(video);
  if (video.source === 'loom' && embedUrl) {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={`${embedUrl}?hide_owner=true`}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
            title="Intro video"
          />
        </div>
        {showManualFallback && loomFallback && (
          <button type="button" className="btn-outline text-sm w-full" onClick={markCompleted}>
            I have watched the full video
          </button>
        )}
      </div>
    );
  }

  return null;
}
