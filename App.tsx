import React, { useState, useEffect } from 'react';
import { Layout, Clapperboard, Sparkles, User, Settings2, Video as VideoIcon, Plus, Trash2, Download, Loader2, Folder, ArrowLeft, Calendar, MoreVertical } from 'lucide-react';
import ApiKeySelector from './components/ApiKeySelector';
import Timeline from './components/Timeline';
import { Project, Scene } from './types';
import { generateScriptScenes, generateCharacterImage, generateVideoClip } from './services/gemini';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project Management State
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('veo_studio_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Persist projects
  useEffect(() => {
    localStorage.setItem('veo_studio_projects', JSON.stringify(projects));
  }, [projects]);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const updateCurrentProject = (updates: Partial<Project>) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => 
      p.id === currentProjectId 
        ? { ...p, ...updates, lastModified: Date.now() } 
        : p
    ));
  };

  const createProject = () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: newProjectName,
      createdAt: Date.now(),
      lastModified: Date.now(),
      step: 'script',
      scriptPrompt: '',
      scenes: [],
      characterPrompt: '',
      characterImageBase64: null,
      aspectRatio: '16:9'
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setNewProjectName('');
    setShowNewProjectModal(false);
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) setCurrentProjectId(null);
    }
  };

  const handleGenerateScript = async () => {
    if (!currentProject || !currentProject.scriptPrompt) return;
    setLoading(true);
    setError(null);
    try {
      const scenes = await generateScriptScenes(currentProject.scriptPrompt);
      updateCurrentProject({ scenes, step: 'character' });
    } catch (e: any) {
      setError(e.message || "Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCharacter = async () => {
    if (!currentProject || !currentProject.characterPrompt) return;
    setLoading(true);
    setError(null);
    try {
      const b64 = await generateCharacterImage(currentProject.characterPrompt);
      updateCurrentProject({ characterImageBase64: b64 });
    } catch (e: any) {
      setError(e.message || "Failed to generate character");
    } finally {
      setLoading(false);
    }
  };

  const confirmCharacter = () => {
    updateCurrentProject({ step: 'production' });
  };

  const generateSceneVideo = async (sceneId: string) => {
    if (!currentProject) return;
    const scene = currentProject.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Update status to generating
    updateCurrentProject({
      scenes: currentProject.scenes.map(s => s.id === sceneId ? { ...s, status: 'generating', error: undefined } : s)
    });

    try {
      // Use character image as start frame if available
      const videoUrl = await generateVideoClip(
        scene.description, 
        currentProject.characterImageBase64, 
        currentProject.aspectRatio
      );

      updateCurrentProject({
        scenes: currentProject.scenes.map(s => s.id === sceneId ? { ...s, status: 'completed', videoUrl } : s)
      });
    } catch (e: any) {
      updateCurrentProject({
        scenes: currentProject.scenes.map(s => s.id === sceneId ? { ...s, status: 'error', error: e.message } : s)
      });
    }
  };

  const addScene = () => {
    if (!currentProject) return;
    const newScene: Scene = {
      id: crypto.randomUUID(),
      order: currentProject.scenes.length + 1,
      description: "A new scene description...",
      status: 'pending'
    };
    updateCurrentProject({ scenes: [...currentProject.scenes, newScene] });
  };

  const deleteScene = (id: string) => {
    if (!currentProject) return;
    updateCurrentProject({ scenes: currentProject.scenes.filter(s => s.id !== id) });
  };

  const handleDescriptionChange = (id: string, text: string) => {
    if (!currentProject) return;
    updateCurrentProject({
      scenes: currentProject.scenes.map(s => s.id === id ? { ...s, description: text } : s)
    });
  };

  if (!hasApiKey) {
    return <ApiKeySelector onKeySelected={() => setHasApiKey(true)} />;
  }

  // --- DASHBOARD VIEW ---
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Clapperboard className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Veo Studio</h1>
                <p className="text-zinc-500 text-sm">Video Production Platform</p>
              </div>
            </div>
            <button 
              onClick={() => setShowNewProjectModal(true)}
              className="bg-zinc-900 text-white hover:bg-zinc-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" /> New Project
            </button>
          </header>

          {showNewProjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm p-4">
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-4 text-zinc-900">Create New Project</h2>
                <input
                  autoFocus
                  type="text"
                  placeholder="Project Name (e.g. My Sci-Fi Short)"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-3 mb-6 focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 text-zinc-900 placeholder-zinc-400 outline-none"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowNewProjectModal(false)}
                    className="px-4 py-2 text-zinc-500 hover:text-zinc-900"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createProject}
                    disabled={!newProjectName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full text-center py-20 border border-dashed border-zinc-200 rounded-2xl bg-white">
                <Folder className="w-16 h-16 mx-auto text-zinc-300 mb-4" />
                <h3 className="text-xl font-medium text-zinc-400 mb-2">No projects yet</h3>
                <p className="text-zinc-500 mb-6">Create your first video project to get started.</p>
                <button 
                  onClick={() => setShowNewProjectModal(true)}
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Create a Project
                </button>
              </div>
            ) : (
              projects.map(project => (
                <div 
                  key={project.id}
                  onClick={() => setCurrentProjectId(project.id)}
                  className="group relative bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-video bg-zinc-100 relative">
                    {project.characterImageBase64 ? (
                      <img 
                        src={`data:image/png;base64,${project.characterImageBase64}`}
                        alt="Project Thumbnail"
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                        <Clapperboard className="w-12 h-12 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => deleteProject(e, project.id)}
                        className="p-2 bg-white/90 hover:bg-red-50 text-zinc-600 hover:text-red-600 rounded-full shadow-sm backdrop-blur-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-zinc-900 mb-1 truncate">{project.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.lastModified).toLocaleDateString()}
                      </span>
                      <span>{project.scenes.length} Scenes</span>
                      <span className="uppercase">{project.aspectRatio}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                         project.step === 'production' ? 'bg-emerald-50 text-emerald-600' :
                         project.step === 'character' ? 'bg-indigo-50 text-indigo-600' :
                         'bg-zinc-100 text-zinc-500'
                       }`}>
                         {project.step}
                       </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- EDITOR VIEW (Existing Logic) ---
  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-20 border-r border-zinc-200 flex flex-col items-center py-6 bg-white z-20">
        <button 
          onClick={() => setCurrentProjectId(null)}
          className="w-10 h-10 mb-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
          title="Back to Projects"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-8">
          <Clapperboard className="w-5 h-5 text-indigo-600" />
        </div>
        
        <nav className="flex flex-col gap-6 w-full">
          <NavItem 
            active={currentProject.step === 'script'} 
            icon={<Layout size={20} />} 
            label="Script" 
            onClick={() => updateCurrentProject({ step: 'script' })} 
          />
          <NavItem 
            active={currentProject.step === 'character'} 
            icon={<User size={20} />} 
            label="Cast" 
            onClick={() => updateCurrentProject({ step: 'character' })} 
          />
          <NavItem 
            active={currentProject.step === 'production'} 
            icon={<VideoIcon size={20} />} 
            label="Studio" 
            onClick={() => updateCurrentProject({ step: 'production' })} 
          />
        </nav>

        <div className="mt-auto mb-4">
           <button 
             onClick={() => {
                updateCurrentProject({ aspectRatio: currentProject.aspectRatio === '16:9' ? '9:16' : '16:9' });
             }}
             className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
             title="Toggle Aspect Ratio"
           >
             <Settings2 size={20} />
             <span className="text-[9px] font-mono mt-0.5">{currentProject.aspectRatio}</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-zinc-50">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
             <span className="text-zinc-400 font-mono text-xs uppercase tracking-wider">Project</span>
             <h1 className="text-lg font-bold text-zinc-900">{currentProject.name}</h1>
          </div>
          {loading && (
             <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
               <Loader2 className="w-4 h-4 animate-spin" />
               Processing with Gemini...
             </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* STEP 1: SCRIPT */}
          {currentProject.step === 'script' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Main Project Script</h2>
                <p className="text-zinc-500">Describe the full script or concept for your video project. Gemini will break this down into individual scenes for production.</p>
              </div>
              
              <div className="bg-white border border-zinc-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <textarea
                  className="w-full bg-transparent border-none text-lg p-4 focus:ring-0 min-h-[200px] resize-none placeholder-zinc-400 text-zinc-900 outline-none"
                  placeholder="e.g. A cyber-noir short film about a detective... Scene 1: Rainy street... Scene 2: Enter bar..."
                  value={currentProject.scriptPrompt}
                  onChange={(e) => updateCurrentProject({ scriptPrompt: e.target.value })}
                />
                <div className="flex justify-between items-center px-4 pb-2 pt-2 border-t border-zinc-100">
                   <div className="flex gap-2">
                     <span className={`text-xs px-2 py-1 rounded ${currentProject.aspectRatio === '16:9' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-400'}`}>16:9</span>
                     <span className={`text-xs px-2 py-1 rounded ${currentProject.aspectRatio === '9:16' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-400'}`}>9:16</span>
                   </div>
                   <button
                    disabled={loading || !currentProject.scriptPrompt}
                    onClick={handleGenerateScript}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Scenes
                  </button>
                </div>
              </div>

              {currentProject.scenes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Generated Scenes</h3>
                  <div className="space-y-3">
                    {currentProject.scenes.map((scene, idx) => (
                      <div key={scene.id} className="group flex gap-4 p-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl transition-all shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-500 font-mono">
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          value={scene.description}
                          onChange={(e) => handleDescriptionChange(scene.id, e.target.value)}
                          className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm text-zinc-700 placeholder-zinc-400"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => updateCurrentProject({ step: 'character' })}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                      Next: Cast Character
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHARACTER */}
          {currentProject.step === 'character' && (
            <div className="max-w-4xl mx-auto h-full flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex-1 space-y-6">
                <div>
                   <h2 className="text-2xl font-bold mb-2 text-zinc-900">Design your Star</h2>
                   <p className="text-zinc-500 text-sm">Create a consistent character to feature in your videos. This image will be used as the starting reference for Veo.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-700">Character Description</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 bg-white border border-zinc-200 rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 outline-none text-zinc-900"
                      placeholder="e.g. A robotic cat with glowing blue eyes"
                      value={currentProject.characterPrompt}
                      onChange={(e) => updateCurrentProject({ characterPrompt: e.target.value })}
                    />
                    <button 
                      onClick={handleGenerateCharacter}
                      disabled={loading || !currentProject.characterPrompt}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" /> Generate
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-4">Script Preview</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {currentProject.scenes.map((s, i) => (
                      <div key={s.id} className="text-sm text-zinc-500 flex gap-3">
                         <span className="text-zinc-400 font-mono">{i+1}.</span>
                         <span>{s.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 flex flex-col gap-4">
                 <div className="aspect-square w-full bg-white border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center overflow-hidden relative">
                    {currentProject.characterImageBase64 ? (
                      <>
                        <img 
                          src={`data:image/png;base64,${currentProject.characterImageBase64}`} 
                          alt="Character" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                           <span className="text-white text-sm font-medium">Generated Character</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 text-zinc-400">
                        <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <span className="text-sm">No character generated yet</span>
                      </div>
                    )}
                 </div>
                 
                 <button 
                   onClick={confirmCharacter}
                   disabled={!currentProject.characterImageBase64}
                   className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                 >
                   Confirm & Go to Studio
                 </button>
              </div>
            </div>
          )}

          {/* STEP 3: PRODUCTION */}
          {currentProject.step === 'production' && (
            <div className="flex flex-col h-full gap-8 animate-in fade-in duration-500">
              
              {/* Scene Timeline */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold text-zinc-900">Video Timeline</h2>
                   <div className="flex gap-2">
                      <button onClick={addScene} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600 transition-colors">
                        <Plus className="w-3 h-3" /> Add Scene
                      </button>
                   </div>
                </div>
                
                <div className="flex-1 overflow-hidden bg-zinc-100/50 rounded-2xl border border-zinc-200/80 p-6 flex flex-col justify-center">
                   {currentProject.scenes.length === 0 ? (
                     <div className="text-center text-zinc-400">
                       <p>No scenes in timeline.</p>
                       <button onClick={addScene} className="mt-2 text-indigo-600 hover:underline">Add one</button>
                     </div>
                   ) : (
                     <Timeline 
                       scenes={currentProject.scenes} 
                       onGenerate={generateSceneVideo}
                       onDelete={deleteScene}
                       aspectRatio={currentProject.aspectRatio}
                     />
                   )}
                </div>
              </div>

              {/* Character Ref */}
              <div className="h-32 bg-white border-t border-zinc-200 p-4 flex gap-4 items-center">
                 <div className="w-24 h-24 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0 relative border border-zinc-200">
                    {currentProject.characterImageBase64 && (
                      <img 
                        src={`data:image/png;base64,${currentProject.characterImageBase64}`} 
                        className="w-full h-full object-cover" 
                        alt="Ref"
                      />
                    )}
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-lg"></div>
                 </div>
                 <div>
                   <h3 className="text-sm font-medium text-zinc-900">Active Character Reference</h3>
                   <p className="text-xs text-zinc-500 mt-1 max-w-md">
                     This character image is being used as the start frame for all Veo generations to maintain consistency.
                   </p>
                 </div>
                 <div className="ml-auto text-right">
                    <div className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Total Scenes</div>
                    <div className="text-2xl font-mono text-zinc-900">{currentProject.scenes.length}</div>
                 </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex flex-col items-center gap-1 py-2 px-1 border-l-2 transition-all duration-200 ${
      active 
      ? 'border-indigo-600 text-indigo-600' 
      : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
    }`}
  >
    <div className={`p-2 rounded-lg ${active ? 'bg-indigo-50' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;