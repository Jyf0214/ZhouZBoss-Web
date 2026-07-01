'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, ListMusic, X } from 'lucide-react';
import { useConfig } from '@/hooks/use-config';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 播放列表面板 */
function PlaylistPanel({
  songs,
  currentIndex,
  playing,
  onSelect,
  onClose,
}: {
  songs: { name: string; artist: string }[];
  currentIndex: number;
  playing: boolean;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="w-72 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-700 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">播放列表</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {songs.map((song, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              i === currentIndex
                ? 'bg-zinc-100 dark:bg-zinc-700'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
            }`}
          >
            <span className={`text-xs w-5 text-center ${i === currentIndex ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-400'}`}>
              {i === currentIndex && playing ? '♪' : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm truncate ${i === currentIndex ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {song.name || '未知曲目'}
              </div>
              {song.artist && (
                <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{song.artist}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/** 展开的进度条 + 歌曲信息 */
function ProgressPanel({
  name,
  progress,
  duration,
  expanded,
  onSeek,
}: {
  name: string;
  progress: number;
  duration: number;
  expanded: boolean;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    onSeek(e);
  }, [onSeek]);

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-1.5 overflow-hidden"
        >
          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap max-w-[140px] truncate">
            {name || '未播放'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 tabular-nums w-8 text-right">{formatTime(progress)}</span>
            <div
              onClick={handleClick}
              className="relative w-24 h-1 bg-zinc-200 dark:bg-zinc-600 rounded-full cursor-pointer group"
            >
              <div
                className="absolute left-0 top-0 h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-[width] duration-100"
                style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-zinc-900 dark:bg-zinc-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: duration ? `calc(${(progress / duration) * 100}% - 5px)` : '0' }}
              />
            </div>
            <span className="text-[10px] text-zinc-400 tabular-nums w-8">{formatTime(duration)}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 播放控制按钮组 */
function PlayerControls({
  playing,
  expanded,
  muted,
  volume,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleExpand,
  onTogglePlaylist,
  onToggleMute,
  onVolumeChange,
}: {
  playing: boolean;
  expanded: boolean;
  muted: boolean;
  volume: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleExpand: () => void;
  onTogglePlaylist: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
}) {
  return (
    <>
      <button
        onClick={onTogglePlay}
        className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
      >
        {playing ? (
          <Pause size={16} className="text-white dark:text-zinc-900" />
        ) : (
          <Play size={16} className="text-white dark:text-zinc-900 ml-0.5" />
        )}
      </button>
      <div className="flex items-center gap-0.5">
        <button onClick={onToggleExpand} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="展开/收起">
          {expanded ? <X size={14} /> : <ListMusic size={14} />}
        </button>
        <button onClick={onPrev} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="上一首">
          <SkipBack size={14} />
        </button>
        <button onClick={onNext} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="下一首">
          <SkipForward size={14} />
        </button>
        <button onClick={onTogglePlaylist} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="播放列表">
          <ListMusic size={14} />
        </button>
        <div className="flex items-center gap-1 ml-1">
          <button onClick={onToggleMute} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-14 h-1 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
          />
        </div>
      </div>
    </>
  );
}

/** 主播放器 */
export function MusicPlayer() {
  const { config } = useConfig();
  const musicConfig = config?.music;

  const [expanded, setExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);

  const songs = musicConfig?.songs ?? [];
  const current = songs[currentIndex];
  const enabled = musicConfig?.enable ?? false;

  useEffect(() => {
    if (!enabled) return;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setCurrentIndex((prev) => (prev + 1) % songs.length);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, songs.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.url) return;
    audio.src = current.url;
    audio.load();
    if (playing) {
      audio.play().catch(() => { /* ignore autoplay block */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, current?.url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio?.paused) {
      audio.play().catch(() => { /* ignore */ });
    } else {
      audio?.pause();
    }
  }, []);

  const playPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + songs.length) % songs.length);
  }, [songs.length]);

  const playNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % songs.length);
  }, [songs.length]);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (audio && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
    }
  }, [duration]);

  if (!enabled || songs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {showPlaylist && (
          <PlaylistPanel
            songs={songs}
            currentIndex={currentIndex}
            playing={playing}
            onSelect={(i) => { setCurrentIndex(i); setShowPlaylist(false); }}
            onClose={() => setShowPlaylist(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-full shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 border border-zinc-100 dark:border-zinc-700 pl-4 pr-2 py-2"
      >
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
        >
          {playing ? (
            <Pause size={16} className="text-white dark:text-zinc-900" />
          ) : (
            <Play size={16} className="text-white dark:text-zinc-900 ml-0.5" />
          )}
        </button>

        <ProgressPanel
          name={current?.name ?? ''}
          progress={progress}
          duration={duration}
          expanded={expanded}
          onSeek={seekTo}
        />

        <PlayerControls
          playing={playing}
          expanded={expanded}
          muted={muted}
          volume={volume}
          onTogglePlay={togglePlay}
          onPrev={playPrev}
          onNext={playNext}
          onToggleExpand={() => setExpanded(!expanded)}
          onTogglePlaylist={() => setShowPlaylist(!showPlaylist)}
          onToggleMute={() => setMuted(!muted)}
          onVolumeChange={(v) => { setVolume(v); setMuted(false); }}
        />
      </motion.div>
    </div>
  );
}
