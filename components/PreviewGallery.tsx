
import React from 'react';
import { CapturedFile } from '../types';
import { CameraIcon, ClapperboardIcon, PlayIcon, TrashIcon } from './icons';
import { formatTime } from '../utils/helpers';

interface PreviewGalleryProps {
  files: CapturedFile[];
  onSelectFile: (file: CapturedFile) => void;
  onDeleteFile: (id: string) => void;
}

const FileCard: React.FC<{ file: CapturedFile; onSelect: () => void; onDelete: () => void; }> = ({ file, onSelect, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      onDelete();
    }
  };
  
  return (
    <div className="group relative bg-dark-surface rounded-lg overflow-hidden border border-dark-border transition-all duration-300 hover:shadow-2xl hover:border-brand-blue">
      <div onClick={onSelect} className="cursor-pointer">
        <div className="aspect-video bg-black flex items-center justify-center">
          {file.type === 'video' || file.type === 'audio' ? (
            <ClapperboardIcon className="w-16 h-16 text-dark-text-secondary" />
          ) : (
            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-4">
          <p className="font-semibold truncate">{file.name}</p>
          <p className="text-sm text-dark-text-secondary">{file.createdAt.toLocaleString()}</p>
        </div>
      </div>
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {file.type !== 'image' && (
          <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {formatTime(file.duration ?? 0)}
          </div>
        )}
        <button onClick={onSelect} className="p-4 bg-brand-blue/80 text-white rounded-full transform hover:scale-110 transition-transform">
          <PlayIcon className="w-8 h-8"/>
        </button>
      </div>
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 p-2 bg-dark-surface/50 rounded-full text-dark-text-secondary hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        title="Delete file"
      >
        <TrashIcon className="w-5 h-5"/>
      </button>
    </div>
  );
}

const PreviewGallery: React.FC<PreviewGalleryProps> = ({ files, onSelectFile, onDeleteFile }) => {
  if (files.length === 0) {
    return (
      <div className="text-center py-20 text-dark-text-secondary">
        <h2 className="text-2xl font-bold mb-2">No Captures Yet</h2>
        <p>Your recorded videos and screenshots will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">My Captures</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {files.map(file => (
          <FileCard 
            key={file.id} 
            file={file} 
            onSelect={() => onSelectFile(file)}
            onDelete={() => onDeleteFile(file.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default PreviewGallery;
