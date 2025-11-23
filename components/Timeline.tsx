import React, { useState } from 'react';
import { Scene } from '../types';
import { Play, Check, AlertCircle, Loader2, Video as VideoIcon } from 'lucide-react';

interface TimelineProps {
  scenes: Scene[];
  onGenerate: (id: string) => void;
  onDelete: (id: string) => void;
  aspectRatio: '16:9' | '9:16';
}

const Timeline: React.FC<TimelineProps> = ({ scenes, onGenerate, onDelete, aspectRatio }) => {
  
  // Calculate width/height classes based on aspect ratio for preview
  const aspectClass = aspectRatio === '16:9' ? 'aspect-video w-64' : 'aspect-[9/16] w-32';

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max px-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="flex flex-col gap-2 group relative">
             {/* Card */}
             <div className={`relative ${aspectClass} bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm flex-shrink-0 transition-all hover:border-zinc-300 hover:shadow-md`}>
                
                {/* Status Indicator / Overlay */}
                <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-white/90 backdrop-blur-md rounded text-xs font-mono text-zinc-600 shadow-sm">
                  Scene {scene.order}
                </div>

                {/* Content */}
                {scene.status === 'completed' && scene.videoUrl ? (
                  <video 
                    src={scene.videoUrl} 
                    className="w-full h-full object-cover" 
                    controls 
                    loop
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    {scene.status === 'generating' ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-xs text-indigo-600 font-medium">Rendering...</span>
                      </div>
                    ) : scene.status === 'error' ? (
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                        <span className="text-xs text-red-500">Failed</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-zinc-500 transition-colors">
                        <VideoIcon className="w-8 h-8" />
                        <span className="text-xs">Ready</span>
                      </div>
                    )}
                  </div>
                )}
             </div>

             {/* Description & Controls */}
             <div className="w-full max-w-[16rem]">
               <p className="text-xs text-zinc-500 line-clamp-2 mb-2 min-h-[2.5em]">{scene.description}</p>
               
               <div className="flex gap-2">
                 {scene.status !== 'generating' && scene.status !== 'completed' && (
                   <button
                     onClick={() => onGenerate(scene.id)}
                     className="flex-1 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold rounded border border-indigo-200 transition-colors flex items-center justify-center gap-1"
                   >
                     <Play className="w-3 h-3" /> Generate
                   </button>
                 )}
                 {scene.status === 'completed' && (
                    <div className="flex-1 py-1.5 px-3 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded border border-emerald-200 flex items-center justify-center gap-1 cursor-default">
                      <Check className="w-3 h-3" /> Done
                    </div>
                 )}
                 <button 
                  onClick={() => onDelete(scene.id)}
                  className="px-2 py-1.5 hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded transition-colors text-xs"
                 >
                   Delete
                 </button>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;