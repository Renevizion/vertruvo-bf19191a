import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function WaveformPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const waveSurfer = WaveSurfer.create({
      container: containerRef.current,
      url: src,
      height: 64,
      waveColor: "hsl(var(--muted-foreground) / 0.25)",
      progressColor: "hsl(var(--primary))",
      cursorColor: "hsl(var(--primary))",
      barWidth: 3,
      barGap: 2,
      barRadius: 999,
      normalize: true,
    });

    waveSurferRef.current = waveSurfer;

    waveSurfer.on("ready", () => setDuration(waveSurfer.getDuration()));
    waveSurfer.on("audioprocess", () => setCurrentTime(waveSurfer.getCurrentTime()));
    waveSurfer.on("timeupdate", (time) => setCurrentTime(time));
    waveSurfer.on("play", () => setIsPlaying(true));
    waveSurfer.on("pause", () => setIsPlaying(false));
    waveSurfer.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      waveSurfer.destroy();
      waveSurferRef.current = null;
    };
  }, [src]);

  const togglePlayback = async () => {
    if (!waveSurferRef.current) return;
    await waveSurferRef.current.playPause();
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        <Button type="button" size="icon" variant="outline" onClick={togglePlayback}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="min-w-0 flex-1">
          <div ref={containerRef} className="w-full" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
