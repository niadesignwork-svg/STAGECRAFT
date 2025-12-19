
import React, { useState, useCallback, useEffect } from 'react';
import { Controls } from './components/Controls';
import { ResultDisplay } from './components/ResultDisplay';
import { LibraryDrawer } from './components/LibraryDrawer';
import { StageConfig, GeneratedDesign, MusicGenre, VenueSize, StageVibe, StageMechanics, StageViewpoint, AspectRatio, StageForm } from './types';
import { generateStageImage, generateStageDescription, editStageImage, generateViewpointVariant, upscaleStageImage, generateSimilarVariant, generateStageVideo } from './services/geminiService';
import { getSavedDesigns, saveDesignToLibrary, deleteDesignFromLibrary, moveDesignToFolder, deleteFolder } from './services/storageService';
import { Mic2, AlertTriangle, FolderOpen, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

const App: React.FC = () => {
  const [config, setConfig] = useState<StageConfig>({
    genre: MusicGenre.POP,
    venue: VenueSize.ARENA,
    stageForm: StageForm.SYMMETRICAL,
    vibe: StageVibe.FUTURISTIC,
    mechanics: StageMechanics.HYDRAULIC_LIFT,
    viewpoint: StageViewpoint.FRONT_CENTER,
    aspectRatio: AspectRatio.RATIO_16_9,
    colors: '青色與紫色 (Cyan & Purple)',
    elements: '巨大 LED 矩陣, 雷射光束 (Giant LED, Lasers)',
    imageCount: 1,
  });

  const [currentDesign, setCurrentDesign] = useState<GeneratedDesign | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<GeneratedDesign[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [autoSave, setAutoSave] = useState(true); // Auto-save enabled by default
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile UX state
  const [showMobileControls, setShowMobileControls] = useState(true);

  // Load library on mount (Async)
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const loaded = await getSavedDesigns();
        setSavedDesigns(loaded);
      } catch (e) {
        console.error("Failed to load library", e);
      }
    };
    loadLibrary();
  }, []);

  // Helper to update current design AND save to library (conditionally)
  const updateDesignState = async (design: GeneratedDesign, forceSave = false) => {
    setCurrentDesign(design);
    
    if (autoSave || forceSave) {
      try {
        const updatedList = await saveDesignToLibrary(design);
        setSavedDesigns(updatedList);
      } catch (e) {
        console.error("Save failed", e);
        setError("儲存失敗 (Save failed) - Storage might be full.");
      }
    }
  };

  const handleManualSave = async (asCopy = false) => {
    if (!currentDesign) return;
    
    let designToSave = currentDesign;
    
    if (asCopy) {
      // Clone as new ID
      designToSave = {
        ...currentDesign,
        id: crypto.randomUUID(),
        conceptTitle: `${currentDesign.conceptTitle} (Copy)`,
        timestamp: Date.now()
      };
    }

    await updateDesignState(designToSave, true);
  };

  const handleGenerate = useCallback(async () => {
    if (!process.env.API_KEY) {
        setError("API Key is missing. Please set process.env.API_KEY.");
        return;
    }

    // Auto-collapse controls on mobile when generating to show results
    if (window.innerWidth < 1024) {
      setShowMobileControls(false);
    }

    setIsGenerating(true);
    setError(null);

    try {
      // SEQUENTIAL EXECUTION to reduce Rate Limits (Quota Exceeded)
      // First generate images (Higher priority/cost)
      const images = await generateStageImage(config);
      
      // Then generate text details
      const textDetails = await generateStageDescription(config);

      const batchTimestamp = Date.now();

      // Create separate design objects for each generated image
      const newDesigns: GeneratedDesign[] = images.map((img, index) => ({
        id: crypto.randomUUID(),
        imageUrl: img,
        variants: [], 
        imageHistory: [img],
        historyIndex: 0,
        ...textDetails,
        timestamp: batchTimestamp + index, 
      }));

      // Save all to library ONLY if autoSave is ON
      if (autoSave) {
        await Promise.all(newDesigns.map(d => saveDesignToLibrary(d)));
        const updatedLibrary = await getSavedDesigns();
        setSavedDesigns(updatedLibrary);
      }

      // Determine display state
      if (newDesigns.length > 1) {
        const compositeDesign: GeneratedDesign = {
          ...newDesigns[0], 
          variants: images, 
        };
        setCurrentDesign(compositeDesign);
      } else {
        setCurrentDesign(newDesigns[0]);
      }

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
         setError("API 配額已滿，系統將自動重試但最終失敗。請稍後再試或減少生成張數。(API Quota Exceeded)");
      } else {
         setError("生成設計失敗。請確保您的 API Key 正確。(Failed to generate)");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [config, autoSave]);

  const handleUpscale = useCallback(async (variantUrl: string) => {
    setIsEditingImage(true);
    
    // Find the actual saved design that matches this variant (if it exists in library)
    let targetDesign = savedDesigns.find(d => d.imageUrl === variantUrl);

    // Fallback: If not in library (because auto-save was off), construct from current temp state
    if (!targetDesign) {
        if (currentDesign && (currentDesign.imageUrl === variantUrl || (currentDesign.variants && currentDesign.variants.includes(variantUrl)))) {
             targetDesign = {
                ...currentDesign,
                id: crypto.randomUUID(), // New ID since it's effectively a new realization
                imageUrl: variantUrl,
                variants: [],
                imageHistory: [variantUrl],
                historyIndex: 0
             };
        } else {
             setError("無法找到原始設計檔案 (Original design not found)");
             setIsEditingImage(false);
             return;
        }
    }

    try {
        const upscaledUrl = await upscaleStageImage(variantUrl);

        const updatedDesign: GeneratedDesign = {
            ...targetDesign,
            imageUrl: upscaledUrl,
            variants: [], 
            imageHistory: [...targetDesign.imageHistory, upscaledUrl],
            historyIndex: targetDesign.imageHistory.length 
        };
        
        await updateDesignState(updatedDesign);

    } catch (err: any) {
        console.error(err);
        if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
            setError("API 配額已滿，無法放大圖片。(API Quota Exceeded for Upscaling)");
        } else {
            setError("放大圖片失敗，請使用原圖。(Failed to upscale, falling back to original)");
        }
        
        // Ensure UI stays consistent even if upscale fails
        const updatedDesign: GeneratedDesign = {
            ...targetDesign,
            imageUrl: variantUrl,
            variants: [],
            imageHistory: [...targetDesign.imageHistory],
            historyIndex: targetDesign.historyIndex
        };
        await updateDesignState(updatedDesign);
    } finally {
        setIsEditingImage(false);
    }
  }, [savedDesigns, currentDesign, autoSave]);

  const handleEditImage = useCallback(async (instruction: string, maskBase64?: string) => {
    if (!currentDesign?.imageUrl) return;
    if (!process.env.API_KEY) return;

    setIsEditingImage(true);
    setError(null);

    try {
      const newImageUrl = await editStageImage(currentDesign.imageUrl, instruction, maskBase64);
      
      const prev = currentDesign;
      const newHistory = [...prev.imageHistory.slice(0, prev.historyIndex + 1), newImageUrl];
      
      const updatedDesign = {
        ...prev,
        imageUrl: newImageUrl,
        imageHistory: newHistory,
        historyIndex: newHistory.length - 1
      };

      await updateDesignState(updatedDesign);
      
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
          setError("API 配額已滿，無法調整圖片。(API Quota Exceeded for Editing)");
      } else {
          setError("圖片調整失敗，請稍後重試。(Failed to edit image)");
      }
    } finally {
      setIsEditingImage(false);
    }
  }, [currentDesign, autoSave]);

  const handleViewpointChange = useCallback(async (newViewpoint: StageViewpoint) => {
    if (!currentDesign?.imageUrl) return;
    if (!process.env.API_KEY) return;

    setIsEditingImage(true);
    setError(null);

    try {
      const newImageUrl = await generateViewpointVariant(currentDesign.imageUrl, newViewpoint);
      
      const prev = currentDesign;
      const newHistory = [...prev.imageHistory.slice(0, prev.historyIndex + 1), newImageUrl];
      
      const updatedDesign = {
        ...prev,
        imageUrl: newImageUrl,
        imageHistory: newHistory,
        historyIndex: newHistory.length - 1
      };

      await updateDesignState(updatedDesign);
      
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
          setError("API 配額已滿，無法轉換視角。(API Quota Exceeded for Viewpoint)");
      } else {
          setError("轉換視角失敗，請稍後重試。(Failed to change perspective)");
      }
    } finally {
      setIsEditingImage(false);
    }
  }, [currentDesign, autoSave]);

  const handleGenerateSimilar = useCallback(async () => {
    if (!currentDesign?.imageUrl) return;
    if (!process.env.API_KEY) return;

    setIsGenerating(true); // Switch to full generation loader for batch processing
    setError(null);

    try {
      // Use config.imageCount to determine how many variations to generate (1-4)
      const images = await generateSimilarVariant(currentDesign.imageUrl, config.imageCount);
      
      const batchTimestamp = Date.now();
      
      // Create independent design entries for each result so they are saved to library
      const newDesigns: GeneratedDesign[] = images.map((img, index) => ({
        ...currentDesign,
        id: crypto.randomUUID(),
        conceptTitle: `${currentDesign.conceptTitle} (Variant ${index + 1})`,
        imageUrl: img,
        variants: [], // Initially empty, we group them for display below
        imageHistory: [img],
        historyIndex: 0,
        timestamp: batchTimestamp + index,
        folder: undefined
      }));

      // Save all to library if autoSave is ON
      if (autoSave) {
        await Promise.all(newDesigns.map(d => saveDesignToLibrary(d)));
        const updatedLibrary = await getSavedDesigns();
        setSavedDesigns(updatedLibrary);
      }

      // If multiple, show grid. If single, show directly.
      if (newDesigns.length > 1) {
        const compositeDesign: GeneratedDesign = {
          ...newDesigns[0], 
          variants: images, // Trigger Grid View
        };
        setCurrentDesign(compositeDesign);
      } else {
        setCurrentDesign(newDesigns[0]);
      }
      
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
          setError("API 配額已滿，生成相似圖片失敗。(API Quota Exceeded for Variants)");
      } else {
          setError("生成相似圖片失敗 (Failed to generate similar variant)");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [currentDesign, autoSave, config.imageCount]);

  const handleGenerateVideo = useCallback(async () => {
    if (!currentDesign?.imageUrl) return;
    
    // Mandatory API Key selection check for Veo
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
    }

    setIsVideoGenerating(true);
    setError(null);

    try {
      const videoDataUrl = await generateStageVideo(currentDesign.imageUrl);
      
      const updatedDesign: GeneratedDesign = {
        ...currentDesign,
        videoUrl: videoDataUrl,
      };

      await updateDesignState(updatedDesign);
      
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
          setError("API 配額已滿，無法生成影片。(API Quota Exceeded for Video)");
      } else {
          setError("生成動態影片失敗，請確認 API 額度或稍後重試。 (Failed to generate video)");
      }
    } finally {
      setIsVideoGenerating(false);
    }
  }, [currentDesign, autoSave]);

  const handleUndo = async () => {
    if (!currentDesign || currentDesign.historyIndex <= 0) return;
    
    const newIndex = currentDesign.historyIndex - 1;
    const updatedDesign = {
      ...currentDesign,
      imageUrl: currentDesign.imageHistory[newIndex],
      historyIndex: newIndex
    };
    await updateDesignState(updatedDesign);
  };

  const handleRedo = async () => {
    if (!currentDesign || currentDesign.historyIndex >= currentDesign.imageHistory.length - 1) return;
    
    const newIndex = currentDesign.historyIndex + 1;
    const updatedDesign = {
      ...currentDesign,
      imageUrl: currentDesign.imageHistory[newIndex],
      historyIndex: newIndex
    };
    await updateDesignState(updatedDesign);
  };

  const handleDeleteDesign = async (id: string) => {
    const newList = await deleteDesignFromLibrary(id);
    setSavedDesigns(newList);
    if (currentDesign?.id === id) {
      setCurrentDesign(null);
    }
  };

  const handleUpdateDesignFolder = async (id: string, folder?: string) => {
    const newList = await moveDesignToFolder(id, folder);
    setSavedDesigns(newList);
    if (currentDesign?.id === id) {
      const updated = newList.find(d => d.id === id);
      if (updated) setCurrentDesign(updated);
    }
  };
  
  const handleDeleteFolderWithSync = async (folder: string) => {
     await deleteFolder(folder);
     const newList = await getSavedDesigns();
     setSavedDesigns(newList);
  };

  const handleSelectDesign = (design: GeneratedDesign) => {
    setCurrentDesign(design);
    if (window.innerWidth < 1024) {
      setShowMobileControls(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-neon-purple selection:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/5 rounded-full blur-[120px]" />
      </div>

      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-neon-blue to-neon-purple p-2 rounded-lg">
              <Mic2 size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tighter">
              STAGE<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">CRAFT</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-xs font-medium text-slate-500 border border-slate-800 rounded-full px-3 py-1">
              Powered by Gemini 2.5 & Imagen 4
            </div>
            
            <button 
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-slate-700 hover:border-neon-blue/50"
            >
              <FolderOpen size={18} />
              <span className="hidden sm:inline">收藏庫 (Library)</span>
              {savedDesigns.length > 0 && (
                <span className="bg-neon-blue text-black text-[10px] px-1.5 rounded-full font-bold">
                  {savedDesigns.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3 lg:h-[calc(100vh-8rem)] lg:sticky lg:top-24 z-20 flex flex-col gap-4">
            
            <button 
              onClick={() => setShowMobileControls(!showMobileControls)}
              className="lg:hidden w-full bg-slate-800/90 backdrop-blur border border-slate-700 p-4 rounded-xl flex items-center justify-between text-white font-bold shadow-lg active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2 text-neon-blue">
                <SlidersHorizontal size={20} /> 
                {showMobileControls ? '收起設計參數 (Collapse)' : '展開設計參數 (Design Settings)'}
              </span>
              {showMobileControls ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <div className={`${showMobileControls ? 'block' : 'hidden'} lg:block h-full transition-all duration-300`}>
              <Controls 
                config={config} 
                onChange={setConfig} 
                isGenerating={isGenerating} 
                onGenerate={handleGenerate} 
              />
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 min-h-[600px]">
            <ResultDisplay 
              design={currentDesign} 
              isGenerating={isGenerating} 
              isEditingImage={isEditingImage}
              onEditImage={handleEditImage}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onChangeViewpoint={handleViewpointChange}
              onUpscale={handleUpscale}
              autoSave={autoSave}
              onToggleAutoSave={setAutoSave}
              onManualSave={handleManualSave}
              isSavedInLibrary={!!savedDesigns.find(d => d.id === currentDesign?.id)}
              onGenerateSimilar={handleGenerateSimilar}
              onGenerateVideo={handleGenerateVideo}
              isVideoGenerating={isVideoGenerating}
            />
          </div>
        </div>
      </main>

      <LibraryDrawer 
        isOpen={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)}
        designs={savedDesigns}
        onSelect={handleSelectDesign}
        onDelete={handleDeleteDesign}
        onUpdateDesign={handleUpdateDesignFolder}
        onDeleteFolder={handleDeleteFolderWithSync}
        currentId={currentDesign?.id}
      />
    </div>
  );
};

export default App;
