
import React, { useState } from 'react';
import { GeneratedDesign, StageViewpoint } from '../types';
import { Download, Sparkles, Move3d, Wand2, Undo2, Redo2, Paintbrush, Eye, Maximize, Presentation, Lightbulb, Monitor, Save, Heart, CopyPlus, Shuffle, Clapperboard, PlayCircle } from 'lucide-react';
import { ImageMaskEditor } from './ImageMaskEditor';
import { PresentationModal } from './PresentationModal';
import { PanoramaViewer } from './PanoramaViewer';

interface ResultDisplayProps {
  design: GeneratedDesign | null;
  isGenerating: boolean;
  isEditingImage?: boolean;
  onEditImage?: (prompt: string, maskBase64?: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onChangeViewpoint?: (viewpoint: StageViewpoint) => void;
  onUpscale?: (imageUrl: string) => void;
  autoSave?: boolean;
  onToggleAutoSave?: (enabled: boolean) => void;
  onManualSave?: (asCopy?: boolean) => void;
  isSavedInLibrary?: boolean;
  onGenerateSimilar?: () => void;
  onGenerateVideo?: () => void;
  isVideoGenerating?: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  design, 
  isGenerating, 
  isEditingImage = false, 
  onEditImage,
  onUndo,
  onRedo,
  onChangeViewpoint,
  onUpscale,
  autoSave = true,
  onToggleAutoSave,
  onManualSave,
  isSavedInLibrary = true,
  onGenerateSimilar,
  onGenerateVideo,
  isVideoGenerating = false
}) => {
  const [editPrompt, setEditPrompt] = useState('');
  const [showEditInput, setShowEditInput] = useState(false);
  const [showViewpointMenu, setShowViewpointMenu] = useState(false);
  const [isMaskMode, setIsMaskMode] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [is360Mode, setIs360Mode] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  const handleDownload = (url?: string) => {
    const targetUrl = url || (isPlayingVideo && design?.videoUrl ? design.videoUrl : design?.imageUrl);
    if (targetUrl) {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = isPlayingVideo ? `stage-video-${Date.now()}.mp4` : `stage-design-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSubmitEdit = (maskBase64?: string) => {
    if (editPrompt.trim() && onEditImage) {
      onEditImage(editPrompt, maskBase64);
      setEditPrompt('');
      setIsMaskMode(false);
    }
  };

  // Check if we are in "Selection Mode" (Multiple variants exist, but none 'selected' as main yet)
  const showCandidates = design?.variants && design.variants.length > 0;

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 p-12">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 border-t-4 border-neon-blue rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-r-4 border-neon-purple rounded-full animate-spin reverse"></div>
          <div className="absolute inset-4 border-b-4 border-neon-pink rounded-full animate-spin"></div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">舞台建構中 (Constructing)...</h3>
        <p className="text-slate-400 text-center max-w-md">
          正在模擬機械結構、計算液壓負載並渲染動態建築 (Simulating mechanics and rendering kinetic architecture)...
        </p>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 border-dashed p-12 text-center">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-600">
          <Sparkles size={48} />
        </div>
        <h3 className="text-xl font-bold text-slate-300 mb-2">準備開始 (Ready to Create)</h3>
        <p className="text-slate-500 max-w-sm">
          請在左側配置您的動態參數，然後點擊生成以查看您的變形舞台。
          (Configure kinetic parameters on the left and hit Generate.)
        </p>
      </div>
    );
  }

  // --- Grid View for Multiple Candidates ---
  if (showCandidates) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple mb-4">
             選擇您的設計草案 (Select Design Draft)
          </h2>
          <p className="text-slate-400 mb-6">
             AI 已生成 {design.variants?.length} 個方案。請選擇一張進行高畫質放大與細節優化。
             (Please select one to upscale and refine.)
          </p>

          <div className={`grid gap-4 ${design.variants!.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
             {design.variants!.map((url, index) => (
               <div key={index} className="group relative rounded-xl overflow-hidden border border-slate-700 hover:border-neon-blue transition-all bg-black">
                  <img src={url} alt={`Draft ${index + 1}`} className="w-full aspect-video object-cover" />
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                     <button 
                       onClick={() => onUpscale && onUpscale(url)}
                       className="bg-neon-blue hover:bg-white text-black font-bold px-6 py-3 rounded-full shadow-lg shadow-neon-blue/30 flex items-center gap-2 transform transition-transform hover:scale-105"
                     >
                       <Maximize size={20} /> 放大並選定 (Upscale & Select)
                     </button>
                     <button 
                        onClick={() => handleDownload(url)} 
                        className="bg-slate-800/80 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-slate-700"
                     >
                        <Download size={14} /> 下載草圖
                     </button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded border border-white/10">
                     Option {index + 1}
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Single Image / Detail View ---
  const hasHistory = design.imageHistory.length > 1;
  const canUndo = design.historyIndex > 0;
  const canRedo = design.historyIndex < design.imageHistory.length - 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <PresentationModal 
        isOpen={isPresentationOpen} 
        onClose={() => setIsPresentationOpen(false)} 
        design={design} 
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800">
         <div className="flex items-center gap-2">
           <button 
             onClick={onUndo}
             disabled={!canUndo || isEditingImage || isMaskMode || isPlayingVideo}
             className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
             title="Undo (Ctrl+Z)"
           >
             <Undo2 size={18} />
           </button>
           <button 
             onClick={onRedo}
             disabled={!canRedo || isEditingImage || isMaskMode || isPlayingVideo}
             className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
             title="Redo (Ctrl+Y)"
           >
             <Redo2 size={18} />
           </button>
           {hasHistory && (
             <span className="text-xs text-slate-600 font-mono ml-2 hidden sm:inline-block">
                v{design.historyIndex + 1}/{design.imageHistory.length}
             </span>
           )}
         </div>

         <div className="flex items-center gap-2 flex-wrap">
           
           {/* Save Controls */}
           <div className="flex items-center bg-slate-950/50 rounded-lg border border-slate-800 p-1 mr-2">
              {onToggleAutoSave && (
                <button 
                  onClick={() => onToggleAutoSave(!autoSave)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${autoSave ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}
                  title="自動儲存到收藏庫 (Auto-save to Library)"
                >
                  <div className={`w-2 h-2 rounded-full ${autoSave ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                  {autoSave ? 'Auto-Save ON' : 'Auto-Save OFF'}
                </button>
              )}

              <div className="w-px h-4 bg-slate-700 mx-2"></div>
              
              {onManualSave && (
                <>
                  <button 
                    onClick={() => onManualSave(false)}
                    disabled={isSavedInLibrary && autoSave} 
                    className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${isSavedInLibrary ? 'text-neon-pink' : 'text-slate-400 hover:text-white'}`}
                    title={isSavedInLibrary ? "已儲存 (Saved)" : "加入收藏庫 (Save to Library)"}
                  >
                    {isSavedInLibrary ? <Heart size={18} fill="currentColor" /> : <Heart size={18} />}
                  </button>
                  <button 
                    onClick={() => onManualSave(true)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="另存為新設計 (Save as Copy)"
                  >
                    <CopyPlus size={18} />
                  </button>
                </>
              )}
           </div>
           
           <button 
             onClick={onGenerateSimilar}
             className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
             title="生成相似的變體 (Generate Similar Variant)"
           >
              <Shuffle size={14} />
              生成相似 (Generate Similar)
           </button>

           <div className="relative">
             <button 
                onClick={() => {
                   setShowViewpointMenu(!showViewpointMenu);
                   setShowEditInput(false);
                   setIsMaskMode(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showViewpointMenu ? 'bg-neon-blue text-black shadow-lg shadow-neon-blue/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
             >
               <Eye size={14} />
               切換視角 (Perspective)
             </button>
             
             {/* Viewpoint Dropdown */}
             {showViewpointMenu && (
               <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                 <div className="p-2 space-y-1">
                   <div className="text-xs font-bold text-slate-500 px-2 py-1">GENERATED VARIANT</div>
                   {Object.values(StageViewpoint).map((vp) => (
                     <button
                       key={vp}
                       onClick={() => {
                         if(onChangeViewpoint) onChangeViewpoint(vp);
                         setShowViewpointMenu(false);
                       }}
                       className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-neon-blue rounded-lg transition-colors truncate"
                     >
                       {vp.split('(')[0]}
                     </button>
                   ))}
                 </div>
               </div>
             )}
           </div>

           <button 
              onClick={() => {
                setShowEditInput(true);
                setIsMaskMode(!isMaskMode);
                setShowViewpointMenu(false);
              }} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isMaskMode ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Paintbrush size={14} />
              區域調整 (Zone Edit)
           </button>
           <button 
              onClick={() => {
                setShowEditInput(!showEditInput);
                setIsMaskMode(false);
                setShowViewpointMenu(false);
              }} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showEditInput && !isMaskMode ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Wand2 size={14} />
              全圖微調 (Edit All)
           </button>
           
           {/* Generate Video Button */}
           <button 
              onClick={() => {
                if (onGenerateVideo) onGenerateVideo();
              }}
              disabled={isVideoGenerating}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isVideoGenerating ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
            >
              {isVideoGenerating ? <div className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> : <Clapperboard size={14} />}
              生成動態 (Animate)
           </button>

         </div>
      </div>

      {/* Image/Video Section */}
      <div className="group relative rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-700 ring-1 ring-white/10 aspect-video">
        
        {is360Mode ? (
          <div className="w-full h-full">
             <PanoramaViewer imageUrl={design.imageUrl} />
             <button 
               onClick={() => setIs360Mode(false)}
               className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md transition-all"
             >
               Exit VR Mode
             </button>
          </div>
        ) : isMaskMode ? (
          <ImageMaskEditor 
            imageUrl={design.imageUrl} 
            onConfirm={(maskBase64) => {
                if(!editPrompt.trim()) {
                    alert("請輸入調整指令 (Please enter prompt)");
                    return;
                }
                handleSubmitEdit(maskBase64);
            }}
            onCancel={() => setIsMaskMode(false)}
          />
        ) : isPlayingVideo && design.videoUrl ? (
          <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
             <video 
               src={design.videoUrl} 
               controls 
               autoPlay 
               loop 
               className="w-full h-full object-contain"
             />
             <button 
                onClick={() => setIsPlayingVideo(false)}
                className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all z-20"
             >
               <Undo2 size={20} /> 返回圖片 (Back to Image)
             </button>
          </div>
        ) : (
          <>
            <img 
              src={design.imageUrl} 
              alt={design.conceptTitle} 
              className={`w-full h-full object-cover transition-all duration-700 ${isEditingImage || isVideoGenerating ? 'opacity-50 scale-100 blur-sm' : ''}`}
            />
            
            {/* 360 Toggle Overlay */}
            <div className="absolute top-4 left-4 z-10">
               <button 
                 onClick={() => setIs360Mode(true)}
                 className="bg-black/40 hover:bg-black/70 text-white px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-bold border border-white/20 flex items-center gap-2"
               >
                 <Eye size={14} /> Enter 360° VR
               </button>
            </div>

            {/* Video Play Overlay */}
            {design.videoUrl && !isVideoGenerating && (
              <div className="absolute top-4 left-36 z-10">
                 <button 
                   onClick={() => setIsPlayingVideo(true)}
                   className="bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-bold border border-white/20 flex items-center gap-2 animate-pulse"
                 >
                   <PlayCircle size={14} /> Play Motion Video
                 </button>
              </div>
            )}
            
            {/* Loading Overlay */}
            {(isEditingImage || isVideoGenerating) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <div className={`w-12 h-12 border-4 ${isVideoGenerating ? 'border-indigo-500' : 'border-neon-blue'} border-t-transparent rounded-full animate-spin mb-2`}></div>
                <span className={`${isVideoGenerating ? 'text-indigo-400' : 'text-neon-blue'} font-bold text-shadow-lg`}>
                  {isVideoGenerating ? '正在生成動態影片 (Generating Video)...' : '正在渲染 (Rendering)...'}
                </span>
                {isVideoGenerating && <span className="text-xs text-slate-300 mt-1">這可能需要幾分鐘 (This may take a moment)</span>}
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-between items-end z-10 pointer-events-none">
              <div className="flex gap-2 pointer-events-auto">
                <button onClick={() => setIsPresentationOpen(true)} className="bg-gradient-to-r from-neon-purple to-neon-blue hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all font-bold shadow-lg flex items-center gap-2">
                  <Presentation size={18} /> 生成設計簡報 (Presentation)
                </button>
                <button onClick={() => handleDownload()} className="bg-white/20 backdrop-blur hover:bg-white/30 text-white p-2 rounded-lg transition-colors" title="Download">
                  <Download size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Input Panel */}
      {(showEditInput || isMaskMode) && (
        <div className={`bg-slate-800/60 border rounded-xl p-4 animate-in slide-in-from-top-2 ${isMaskMode ? 'border-neon-pink/50 shadow-[0_0_20px_rgba(255,0,170,0.1)]' : 'border-neon-purple/50'}`}>
           <div className="flex items-center gap-2 mb-2">
               {isMaskMode ? <Paintbrush size={16} className="text-neon-pink" /> : <Wand2 size={16} className="text-neon-purple" />}
               <span className="text-sm font-bold text-white">
                  {isMaskMode ? '區域調整模式 (Zone Edit Mode)' : '全圖微調 (Refine Image)'}
               </span>
           </div>
           <div className="flex gap-2 flex-col sm:flex-row">
               <input 
                 type="text" 
                 value={editPrompt}
                 onChange={(e) => setEditPrompt(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && !isMaskMode && handleSubmitEdit()}
                 placeholder={isMaskMode ? "輸入針對塗抹區域的指令... (e.g. Change to blue lights)" : "輸入調整指令... (e.g. Add fog, make it darker)"}
                 className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
               />
               {isMaskMode ? (
                 <div className="text-xs text-slate-400 flex items-center bg-slate-900/50 px-3 rounded border border-slate-700">
                    請在上方圖片塗抹區域後按 ✔ 確認
                 </div>
               ) : (
                 <button 
                   onClick={() => handleSubmitEdit()}
                   disabled={isEditingImage || !editPrompt.trim()}
                   className="bg-neon-purple hover:bg-neon-purple/80 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   更新 (Update)
                 </button>
               )}
           </div>
        </div>
      )}

      {/* Title and Description */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-start mb-4">
           <div>
             <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
               {design.conceptTitle}
             </h2>
             <p className="text-slate-400 text-sm mt-1">Generated {new Date(design.timestamp).toLocaleTimeString()}</p>
           </div>
        </div>
        <p className="text-slate-300 leading-relaxed text-lg border-l-4 border-neon-pink pl-4 mb-6">
          {design.description}
        </p>

        {/* Transformation Block */}
        <div className="mb-6 bg-neon-blue/5 border border-neon-blue/20 rounded-lg p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Move3d size={100} className="text-neon-blue" />
            </div>
            <h4 className="text-neon-blue font-bold text-lg mb-2 flex items-center gap-2">
                <Move3d size={20} /> 變形序列 (Transformation)
            </h4>
            <p className="text-slate-300 relative z-10">
                {design.transformationSequence}
            </p>
        </div>

        {/* Tech Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <h4 className="text-neon-blue font-semibold mb-2 flex items-center gap-2">
              <Lightbulb size={16} /> 燈光 (Lighting)
            </h4>
            <p className="text-sm text-slate-400">{design.technicalSpecs.lighting}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <h4 className="text-neon-purple font-semibold mb-2 flex items-center gap-2">
              <Monitor size={16} /> 影像 (Video)
            </h4>
            <p className="text-sm text-slate-400">{design.technicalSpecs.video}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <h4 className="text-neon-pink font-semibold mb-2 flex items-center gap-2">
              <Sparkles size={16} /> 特效 (Effects)
            </h4>
            <p className="text-sm text-slate-400">{design.technicalSpecs.specialEffects}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
