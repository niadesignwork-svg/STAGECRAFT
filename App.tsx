
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
  const [autoSave, setAutoSave] = useState(true); 
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showMobileControls, setShowMobileControls] = useState(true);

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

    if (window.innerWidth < 1024) {
      setShowMobileControls(false);
    }

    setIsGenerating(true);
    setError(null);

    try {
      const images = await generateStageImage(config);
      const textDetails = await generateStageDescription(config);
      const batchTimestamp = Date.now();

      const newDesigns: GeneratedDesign[] = images.map((img, index) => ({
        id: crypto.randomUUID(),
        imageUrl: img,
        variants: [], 
        imageHistory: [img],
        historyIndex: 0,
        ...textDetails,
        timestamp: batchTimestamp + index, 
      }));

      if (autoSave) {
        await Promise.all(newDesigns.map(d => saveDesignToLibrary(d)));
        const updatedLibrary = await getSavedDesigns();
        setSavedDesigns(updatedLibrary);
      }

      if (newDesigns.length > 1) {
        setCurrentDesign({ ...newDesigns[0], variants: images });
      } else {
        setCurrentDesign(newDesigns[0]);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "";
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
         setError("API 配額已滿 (429 Quota Exceeded)。請稍後再試或減少張數。");
      } else if (msg.toLowerCase().includes('safety')) {
         setError("設計內容被安全過濾器攔截。請嘗試修改元素或氛圍。");
      } else {
         setError(`生成失敗: ${msg || "請檢查網路與 API Key。"}`);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [config, autoSave]);

  const handleUpscale = useCallback(async (variantUrl: string) => {
    setIsEditingImage(true);
    let targetDesign = savedDesigns.find(d => d.imageUrl === variantUrl);
    if (!targetDesign) {
        if (currentDesign && (currentDesign.imageUrl === variantUrl || (currentDesign.variants && currentDesign.variants.includes(variantUrl)))) {
             targetDesign = {
                ...currentDesign,
                id: crypto.randomUUID(),
                imageUrl: variantUrl,
                variants: [],
                imageHistory: [variantUrl],
                historyIndex: 0
             };
        } else {
             setError("無法找到設計檔案");
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
        setError(`放大失敗: ${err.message || "請重試"}`);
    } finally {
        setIsEditingImage(false);
    }
  }, [savedDesigns, currentDesign, autoSave]);

  const handleEditImage = useCallback(async (instruction: string, maskBase64?: string) => {
    if (!currentDesign?.imageUrl) return;
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
      setError(`調整失敗: ${err.message}`);
    } finally {
      setIsEditingImage(false);
    }
  }, [currentDesign, autoSave]);

  const handleViewpointChange = useCallback(async (newViewpoint: StageViewpoint) => {
    if (!currentDesign?.imageUrl) return;
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
      setError(`視角轉換失敗: ${err.message}`);
    } finally {
      setIsEditingImage(false);
    }
  }, [currentDesign, autoSave]);

  const handleGenerateSimilar = useCallback(async () => {
    if (!currentDesign?.imageUrl) return;
    setIsGenerating(true);
    setError(null);
    try {
      const images = await generateSimilarVariant(currentDesign.imageUrl, config.imageCount);
      const batchTimestamp = Date.now();
      const newDesigns: GeneratedDesign[] = images.map((img, index) => ({
        ...currentDesign,
        id: crypto.randomUUID(),
        conceptTitle: `${currentDesign.conceptTitle} (變體 ${index + 1})`,
        imageUrl: img,
        variants: [],
        imageHistory: [img],
        historyIndex: 0,
        timestamp: batchTimestamp + index,
      }));
      if (autoSave) {
        await Promise.all(newDesigns.map(d => saveDesignToLibrary(d)));
        const updatedLibrary = await getSavedDesigns();
        setSavedDesigns(updatedLibrary);
      }
      if (newDesigns.length > 1) {
        setCurrentDesign({ ...newDesigns[0], variants: images });
      } else {
        setCurrentDesign(newDesigns[0]);
      }
    } catch (err: any) {
      setError(`生成變體失敗: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [currentDesign, autoSave, config.imageCount]);

  const handleGenerateVideo = useCallback(async () => {
    if (!currentDesign?.imageUrl) return;
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
      const updatedDesign: GeneratedDesign = { ...currentDesign, videoUrl: videoDataUrl };
      await updateDesignState(updatedDesign);
    } catch (err: any) {
      setError(`影片生成失敗: ${err.message}`);
    } finally {
      setIsVideoGenerating(false);
    }
  }, [currentDesign, autoSave]);

  const handleUndo = async () => {
    if (!currentDesign || currentDesign.historyIndex <= 0) return;
    const newIndex = currentDesign.historyIndex - 1;
    await updateDesignState({ ...currentDesign, imageUrl: currentDesign.imageHistory[newIndex], historyIndex: newIndex });
  };

  const handleRedo = async () => {
    if (!currentDesign || currentDesign.historyIndex >= currentDesign.imageHistory.length - 1) return;
    const newIndex = currentDesign.historyIndex + 1;
    await updateDesignState({ ...currentDesign, imageUrl: currentDesign.imageHistory[newIndex], historyIndex: newIndex });
  };

  const handleDeleteDesign = async (id: string) => {
    const newList = await deleteDesignFromLibrary(id);
    setSavedDesigns(newList);
    if (currentDesign?.id === id) setCurrentDesign(null);
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
    if (window.innerWidth < 1024) setShowMobileControls(false);
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
            <button 
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-slate-700 hover:border-neon-blue/50"
            >
              <FolderOpen size={18} />
              <span className="hidden sm:inline">收藏庫 (Library)</span>
              {savedDesigns.length > 0 && <span className="bg-neon-blue text-black text-[10px] px-1.5 rounded-full font-bold">{savedDesigns.length}</span>}
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
              <span className="flex items-center gap-2 text-neon-blue"><SlidersHorizontal size={20} /> {showMobileControls ? '收起設計參數' : '展開設計參數'}</span>
              {showMobileControls ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <div className={`${showMobileControls ? 'block' : 'hidden'} lg:block h-full transition-all duration-300`}>
              <Controls config={config} onChange={setConfig} isGenerating={isGenerating} onGenerate={handleGenerate} />
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

      <LibraryDrawer isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} designs={savedDesigns} onSelect={handleSelectDesign} onDelete={handleDeleteDesign} onUpdateDesign={handleUpdateDesignFolder} onDeleteFolder={handleDeleteFolderWithSync} currentId={currentDesign?.id} />
    </div>
  );
};

export default App;
