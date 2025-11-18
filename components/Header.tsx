
import React from 'react';
import { View } from '../types';
import { CameraIcon, ClapperboardIcon, GalleryIcon } from './icons';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
  isRecording: boolean;
}

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, icon, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-brand-blue text-white'
        : 'bg-dark-surface hover:bg-dark-border'
    } disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export const Header: React.FC<HeaderProps> = ({ currentView, setView, isRecording }) => {
  return (
    <header className="bg-dark-surface border-b border-dark-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ClapperboardIcon className="w-8 h-8 text-brand-blue" />
          <h1 className="text-xl font-bold text-dark-text-primary tracking-tight">
            Pro Screen Recorder
          </h1>
        </div>
        <nav className="flex items-center space-x-2">
          <NavButton
            label="Capture"
            icon={<CameraIcon className="w-5 h-5" />}
            isActive={currentView === 'capture'}
            onClick={() => setView('capture')}
            disabled={isRecording}
          />
          <NavButton
            label="Gallery"
            icon={<GalleryIcon className="w-5 h-5" />}
            isActive={currentView === 'gallery' || currentView === 'editor'}
            onClick={() => setView('gallery')}
            disabled={isRecording}
          />
        </nav>
      </div>
    </header>
  );
};
