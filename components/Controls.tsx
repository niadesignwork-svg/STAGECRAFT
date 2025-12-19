
import React, { useRef, useState, useEffect } from 'react';
import { StageConfig, MusicGenre, VenueSize, StageVibe, StageMechanics, StageViewpoint, AspectRatio, CreativeConcept, SavedConcept, StageForm } from '../types';
import { Music, MapPin, Zap, Palette, PenTool, Move3d, Eye, ImagePlus, Trash2, Layers, Monitor, Smartphone, Square, LayoutTemplate, Lightbulb, Sparkles, X, CloudFog, StickyNote, Bookmark, BookmarkCheck, Settings2, Grid } from 'lucide-react';
import { generateCreativeConcepts } from '../services/geminiService';
import { saveConcept, getSavedConcepts, deleteConcept } from '../services/storageService';

interface ControlsProps {
  config: StageConfig;
  onChange: (newConfig: StageConfig) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ config, onChange, isGenerating, onGenerate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [ideas, setIdeas] = useState<CreativeConcept[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<SavedConcept[]>([]);
  const [showIdeaMenu, setShowIdeaMenu] = useState(false);
  const [ideaTab, setIdeaTab] = useState<'generate' | 'saved'>('generate');

  useEffect(() => {
    if (showIdeaMenu && ideaTab === 'saved') {
      setSavedIdeas(getSavedConcepts());
    }
  }, [showIdeaMenu, ideaTab]);

  const handleChange = (field: keyof StageConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('referenceImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleChange('referenceImage', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGetInspired = async () => {
    setIdeaTab('generate');
    setIsBrainstorming(true);
    setShowIdeaMenu(true);
    setIdeas([]); // Clear previous
    
    try {
      const concepts = await generateCreativeConcepts();
      setIdeas(concepts);
    } catch (e) {
      console.error("Failed to get ideas", e);
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleSaveConcept = (e: React.MouseEvent, concept: CreativeConcept) => {
    e.stopPropagation();
    saveConcept(concept);
    // Visual feedback could be added here
    setSavedIdeas(getSavedConcepts()); // Refresh list just in case
    alert("已儲存至靈感筆記 (Saved to Notebook)");
  };

  const handleDeleteConcept = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteConcept(id);
    setSavedIdeas(updated);
  };

  const applyConcept = (concept: CreativeConcept) => {
    onChange({
      ...config,
      elements: concept.elements,
      colors: concept.colors,
      vibe: concept.vibe,
      mechanics: concept.mechanics
    });
    setShowIdeaMenu(false);
  };

  // Helper for Aspect Ratio Icon
  const getRatioIcon = (ratio: AspectRatio) => {
    switch (ratio) {
      case AspectRatio.RATIO_16_9: return <Monitor size={16} />;
      case AspectRatio.RATIO_9_16: return <Smartphone size={16} />;
      case AspectRatio.RATIO_1_1: return <Square size={16} />;
      case AspectRatio.RATIO_CUSTOM: return <Settings2 size={16} />;
      default: return <LayoutTemplate size={16} />;
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-2xl h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-neon-blue rounded-full"></span>
          設計參數 (Params)
        </h2>
        
        <button 
          onClick={handleGetInspired}
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/50 text-yellow-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.3)]"
        >
           <Lightbulb size={12} /> 靈感啟發 (Inspire Me)
        </button>
      </div>

      {/* Ideas Overlay */}
      {showIdeaMenu && (
        <div className="absolute inset-x-4 top-16 z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[400px]">
          <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
             <div className="flex gap-4">
               <button 
                  onClick={() => setIdeaTab('generate')}
                  className={`text-sm font-bold flex items-center gap-2 pb-1 transition-colors ${ideaTab === 'generate' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
               >
                  <Sparkles size={14} /> AI 提案
               </button>
               <button 
                  onClick={() => setIdeaTab('saved')}
                  className={`text-sm font-bold flex items-center gap-2 pb-1 transition-colors ${ideaTab === 'saved' ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-slate-500 hover:text-slate-300'}`}
               >
                  <StickyNote size={14} /> 靈感筆記
               </button>
             </div>
             <button onClick={() => setShowIdeaMenu(false)} className="text-slate-500 hover:text-white">
               <X size={16} />
             </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {ideaTab === 'generate' && (
              <>
                {isBrainstorming ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">正在激盪獨特創意 (Brainstorming)...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-500">AI 已隨機混搭不同風格生成以下提案：</span>
                        <button onClick={handleGetInspired} className="text-[10px] text-yellow-500 hover:underline flex items-center gap-1"><Sparkles size={10}/> 再換一批</button>
                    </div>
                    {ideas.map((idea, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-yellow-500/50 rounded-lg p-3 cursor-pointer transition-all group relative"
                        onClick={() => applyConcept(idea)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-white text-sm group-hover:text-yellow-400">{idea.title}</h4>
                          <div className="flex gap-2">
                            <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">{idea.vibe.split('(')[0]}</span>
                            <button 
                                onClick={(e) => handleSaveConcept(e, idea)}
                                className="text-slate-500 hover:text-neon-blue transition-colors"
                                title="Save to Notebook"
                            >
                                <Bookmark size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-1">{idea.elements}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-current to-transparent text-slate-500"></div>
                          <span className="text-[10px] text-slate-500 truncate">{idea.colors}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {ideaTab === 'saved' && (
              <div className="space-y-2">
                 {savedIdeas.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-xs">
                       尚未收藏任何靈感 (No saved notes)
                    </div>
                 ) : (
                   savedIdeas.map((idea) => (
                      <div 
                        key={idea.id}
                        className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-neon-blue rounded-lg p-3 cursor-pointer transition-all group"
                        onClick={() => applyConcept(idea)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-200 text-sm group-hover:text-neon-blue">{idea.title}</h4>
                          <div className="flex gap-2 items-center">
                             <span className="text-[10px] text-slate-500">{new Date(idea.timestamp).toLocaleDateString()}</span>
                             <button 
                                onClick={(e) => handleDeleteConcept(e, idea.id)}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                             >
                                <Trash2 size={12} />
                             </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-1">{idea.elements}</p>
                        <div className="flex gap-1 flex-wrap">
                            <span className="text-[9px] bg-black/30 px-1 rounded text-slate-500">{idea.vibe.split('(')[0]}</span>
                            <span className="text-[9px] bg-black/30 px-1 rounded text-slate-500">{idea.mechanics.split('(')[0]}</span>
                        </div>
                      </div>
                   ))
                 )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-5 flex-grow overflow-y-auto pr-2 custom-scrollbar">
        {/* Reference Image Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 text-neon-blue">
            <ImagePlus size={14} /> 參考風格/物件 (Reference Style)
          </label>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative group w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
              config.referenceImage 
                ? 'border-neon-blue bg-slate-900' 
                : 'border-slate-700 hover:border-neon-blue/50 hover:bg-slate-800'
            }`}
          >
            {config.referenceImage ? (
              <>
                <img 
                  src={config.referenceImage} 
                  alt="Reference" 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                      已載入參考圖 (Loaded)
                    </span>
                </div>
                <button 
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors z-10"
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <div className="text-center p-4">
                <ImagePlus size={24} className="mx-auto text-slate-500 mb-2 group-hover:text-neon-blue transition-colors" />
                <p className="text-xs text-slate-400 group-hover:text-slate-300">
                  點擊上傳參考圖片<br/>(Click to upload reference)
                </p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            *AI 將參考此圖片的造型或風格進行設計 (AI will use this shape/style as inspiration)
          </p>
        </div>

        {/* Image Count, Aspect Ratio, Atmospherics */}
        <div className="grid grid-cols-1 gap-4">
           {/* Image Count */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layers size={14} /> 生成張數 (Batch Size)
            </label>
            <div className="bg-slate-800 p-1 rounded-lg flex gap-1">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => handleChange('imageCount', num)}
                  className={`flex-1 py-2 text-sm font-bold rounded transition-all ${
                    config.imageCount === num
                    ? 'bg-neon-blue text-black shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            {/* Atmospherics Toggle */}
            <div className="mt-3 flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <CloudFog size={14} className={config.cinematicLighting ? 'text-neon-blue' : 'text-slate-500'} />
                <span className="text-xs text-slate-300">大氣特效 (Atmospherics)</span>
              </div>
              <button 
                onClick={() => handleChange('cinematicLighting', !config.cinematicLighting)}
                className={`w-10 h-5 rounded-full relative transition-colors ${config.cinematicLighting ? 'bg-neon-blue' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${config.cinematicLighting ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
             <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <LayoutTemplate size={14} /> 畫布比例 (Aspect Ratio)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {Object.values(AspectRatio).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => handleChange('aspectRatio', ratio)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    config.aspectRatio === ratio
                      ? 'bg-neon-blue/20 border-neon-blue text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  {getRatioIcon(ratio)}
                  <span className="truncate">{ratio.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            
            {/* Custom Ratio Inputs */}
            {config.aspectRatio === AspectRatio.RATIO_CUSTOM && (
              <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-1">
                 <div className="flex-1">
                   <span className="text-[10px] text-slate-500 uppercase block mb-1">Width</span>
                   <input 
                     type="number" 
                     placeholder="1920"
                     value={config.customWidth || ''}
                     onChange={(e) => handleChange('customWidth', parseInt(e.target.value))}
                     className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-neon-blue outline-none"
                   />
                 </div>
                 <div className="text-slate-500 pt-3">x</div>
                 <div className="flex-1">
                   <span className="text-[10px] text-slate-500 uppercase block mb-1">Height</span>
                   <input 
                     type="number" 
                     placeholder="1080"
                     value={config.customHeight || ''}
                     onChange={(e) => handleChange('customHeight', parseInt(e.target.value))}
                     className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-neon-blue outline-none"
                   />
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Genre */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Music size={14} /> 音樂風格 (Genre)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(MusicGenre).map((genre) => (
              <button
                key={genre}
                onClick={() => handleChange('genre', genre)}
                className={`text-sm px-3 py-2 rounded-lg border transition-all duration-200 text-left truncate ${
                  config.genre === genre
                    ? 'bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_10px_rgba(188,19,254,0.3)]'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Venue */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <MapPin size={14} /> 場地規模 (Venue)
          </label>
          <select
            value={config.venue}
            onChange={(e) => handleChange('venue', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent appearance-none cursor-pointer hover:bg-slate-750 transition-colors"
          >
            {Object.values(VenueSize).map((venue) => (
              <option key={venue} value={venue}>{venue}</option>
            ))}
          </select>
        </div>

        {/* Stage Form / Layout */}
        <div>
           <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
             <Grid size={14} /> 舞台形式 (Layout)
           </label>
           <select
             value={config.stageForm}
             onChange={(e) => handleChange('stageForm', e.target.value)}
             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent appearance-none cursor-pointer hover:bg-slate-750 transition-colors"
           >
             {Object.values(StageForm).map((form) => (
               <option key={form} value={form}>{form}</option>
             ))}
           </select>
        </div>

        {/* Mechanics / Transformation */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 text-neon-blue">
            <Move3d size={14} /> 動態變形 (Transformation)
          </label>
          <select
            value={config.mechanics}
            onChange={(e) => handleChange('mechanics', e.target.value)}
            className="w-full bg-slate-900 border border-neon-blue/30 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent appearance-none cursor-pointer hover:bg-slate-800 transition-colors shadow-[0_0_15px_rgba(0,243,255,0.1)]"
          >
            {Object.values(StageMechanics).map((mech) => (
              <option key={mech} value={mech}>{mech}</option>
            ))}
          </select>
        </div>
        
        {/* Viewpoint */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 text-neon-pink">
            <Eye size={14} /> 初始視角 (Viewpoint)
          </label>
          <select
            value={config.viewpoint}
            onChange={(e) => handleChange('viewpoint', e.target.value)}
            className="w-full bg-slate-900 border border-neon-pink/30 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
          >
            {Object.values(StageViewpoint).map((vp) => (
              <option key={vp} value={vp}>{vp}</option>
            ))}
          </select>
        </div>

        {/* Vibe */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Zap size={14} /> 氛圍 (Atmosphere)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(StageVibe).map((vibe) => (
              <button
                key={vibe}
                onClick={() => handleChange('vibe', vibe)}
                className={`text-xs px-3 py-2 rounded-lg border transition-all duration-200 text-left truncate ${
                  config.vibe === vibe
                    ? 'bg-neon-blue/20 border-neon-blue text-white shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
                }`}
              >
                {vibe}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Palette size={14} /> 主色調 (Colors)
          </label>
          <input
            type="text"
            value={config.colors}
            onChange={(e) => handleChange('colors', e.target.value)}
            placeholder="例如：青色與洋紅 (Cyan and Magenta)"
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-blue placeholder-slate-500"
          />
        </div>

        {/* Elements */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <PenTool size={14} /> 特殊元素 (Elements)
          </label>
          <textarea
            value={config.elements}
            onChange={(e) => handleChange('elements', e.target.value)}
            placeholder="例如：巨大 LED 立方體、雷射塔、懸浮走道..."
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-blue placeholder-slate-500 resize-none"
          />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex justify-center items-center gap-2 ${
            isGenerating
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white hover:shadow-neon-pink/50'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              設計中 (Designing)...
            </>
          ) : (
            <>
              <Zap size={20} fill="currentColor" /> 生成設計 (GENERATE)
            </>
          )}
        </button>
      </div>
    </div>
  );
};
