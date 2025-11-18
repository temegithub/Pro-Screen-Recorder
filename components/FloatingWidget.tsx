
import React, { useState, useEffect, useRef } from 'react';
import { RecorderStatus, CaptureSettings } from '../types';
import { CameraIcon, PauseIcon, PlayIcon, StopIcon } from './icons';
import { formatTime } from '../utils/helpers';

interface FloatingWidgetProps {
  status: RecorderStatus;
  timer: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onScreenshot: (settings: Partial<CaptureSettings>) => void;
}

const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  status,
  timer,
  onPause,
  onResume,
  onStop,
  onScreenshot,
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: 50 });
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (ref.current) {
      isDragging.current = true;
      offset.current = {
        x: e.clientX - ref.current.getBoundingClientRect().left,
        y: e.clientY - ref.current.getBoundingClientRect().top,
      };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      setPosition({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };
  
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleQuickScreenshot = () => {
    onScreenshot({ imageFormat: 'png' });
  };
  
  return (
    <div
      ref={ref}
      className="fixed z-50 bg-dark-surface/80 backdrop-blur-sm border border-dark-border rounded-full shadow-2xl flex items-center space-x-2 p-2 text-dark-text-primary"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center pl-2 pr-1 cursor-move">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
        <span className="font-mono text-lg ml-3">{formatTime(timer)}</span>
      </div>

      <div className="h-8 border-l border-dark-border"></div>

      <button onClick={handleQuickScreenshot} title="Quick Screenshot" className="p-3 hover:bg-dark-border rounded-full transition-colors">
        <CameraIcon className="w-5 h-5" />
      </button>

      {status === 'recording' && (
        <button onClick={onPause} title="Pause" className="p-3 hover:bg-dark-border rounded-full transition-colors">
          <PauseIcon className="w-5 h-5" />
        </button>
      )}

      {status === 'paused' && (
        <button onClick={onResume} title="Resume" className="p-3 hover:bg-dark-border rounded-full transition-colors text-green-400">
          <PlayIcon className="w-5 h-5" />
        </button>
      )}
      
      <button onClick={onStop} title="Stop" className="p-3 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors">
        <StopIcon className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};

export default FloatingWidget;
