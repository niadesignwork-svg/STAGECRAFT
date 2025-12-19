
import React, { useState, useEffect, useMemo } from 'react';
import { GeneratedDesign } from '../types';
import { X, Trash2, Calendar, Image as ImageIcon, Folder, FolderPlus, Clock, MoreVertical, CornerDownRight, ChevronLeft } from 'lucide-react';
import { getFolders, createFolder } from '../services/storageService';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  designs: GeneratedDesign[];
  onSelect: (design: GeneratedDesign) => void;
  onDelete: (id: string) => void;
  onUpdateDesign: (id: string, folder?: string) => void;
  onDeleteFolder?: (folder: string) => void; // New prop for async folder delete
  currentId?: string;
}

type ViewMode = 'timeline' | 'folders';

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  isOpen,
  onClose,
  designs,
  onSelect,
  onDelete,
  onUpdateDesign,
  onDeleteFolder,
  currentId
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveMenuOpenId, setMoveMenuOpenId] = useState<string | null>(null);

  // Load folders on open
  useEffect(() => {
    if (isOpen) {
      setFolders(getFolders());
    }
  }, [isOpen]);

  const timelineGroups = useMemo(() => {
    const groups: Record<string, GeneratedDesign[]> = {};
    const today = new Date().toLocaleDateString();
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString();

    designs.forEach(design => {
      const date = new Date(design.timestamp).toLocaleDateString();
      let label = date;
      if (date === today) label = '今天 (Today)';
      else if (date === yesterday) label = '昨天 (Yesterday)';
      
      if (!groups[label]) groups[label] = [];
      groups[label].push(design);
    });
    
    return groups;
  }, [designs]);

  const folderDesigns = useMemo(() => {
    if (!activeFolder) return [];
    return designs.filter(d => d.folder === activeFolder);
  }, [designs, activeFolder]);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const updatedFolders = createFolder(newFolderName.trim());
      setFolders(updatedFolders);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = (folder: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`確定要刪除資料夾 "${folder}" 嗎？裡面的設計將會被移出資料夾。(Delete folder "${folder}"?)`)) {
      if (onDeleteFolder) {
        onDeleteFolder(folder);
        // Manually update local list optimistically or reload from service
        setFolders(prev => prev.filter(f => f !== folder));
      }
    }
  };

  const handleMoveDesign = (designId: string, folderName?: string) => {
    onUpdateDesign(designId, folderName);
    setMoveMenuOpenId(null);
  };

  const renderDesignCard = (design: GeneratedDesign) => (
    <div 
      key={design.id}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 mb-3 ${
        currentId === design.id 
          ? 'border-neon-blue ring-1 ring-neon-blue bg-slate-800' 
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
      }`}
    >
      <div 
        className="aspect-video w-full cursor-pointer relative overflow-hidden"
        onClick={() => {
          onSelect(design);
          if (window.innerWidth < 640) onClose();
        }}
      >
        <img 
          src={design.imageUrl} 
          alt={design.conceptTitle}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        {currentId === design.id && (
          <div className="absolute top-2 left-2 bg-neon-blue text-black text-xs font-bold px-2 py-1 rounded">
            當前 (Current)
          </div>
        )}

        {design.folder && (
          <div className="absolute bottom-2 left-2 bg-slate-900/80 text-xs text-slate-300 px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1 border border-slate-700">
            <Folder size={10} /> {design.folder}
          </div>
        )}
      </div>

      <div className="p-3 relative">
        <h3 className="font-bold text-white text-sm truncate pr-6">
          {design.conceptTitle}
        </h3>
        <div className="flex justify-between items-end mt-1">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock size={10} />
            {new Date(design.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
          
          <div className="flex items-center gap-1">
             <div className="relative">
               <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoveMenuOpenId(moveMenuOpenId === design.id ? null : design.id);
                  }}
                  className="p-1.5 text-slate-500 hover:text-neon-purple hover:bg-neon-purple/10 rounded transition-colors"
                  title="Move to Folder"
               >
                  <CornerDownRight size={14} />
               </button>

               {moveMenuOpenId === design.id && (
                 <div className="absolute bottom-full right-0 mb-1 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="text-[10px] font-bold text-slate-500 px-2 py-1 bg-slate-950">移動至 (Move to)...</div>
                    <button 
                      onClick={() => handleMoveDesign(design.id, undefined)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      (移出資料夾 None)
                    </button>
                    {folders.map(f => (
                      <button 
                        key={f}
                        onClick={() => handleMoveDesign(design.id, f)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-neon-blue truncate"
                      >
                        {f}
                      </button>
                    ))}
                 </div>
               )}
             </div>

             {moveMenuOpenId === design.id && (
               <div className="fixed inset-0 z-10" onClick={() => setMoveMenuOpenId(null)} />
             )}

             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 if(confirm('確定要刪除此設計嗎？(Delete this design?)')) {
                   onDelete(design.id);
                 }
               }}
               className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
               title="Delete"
             >
               <Trash2 size={14} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon size={20} className="text-neon-blue" />
              收藏庫 (Library)
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex p-1 bg-slate-950 rounded-lg">
            <button 
              onClick={() => { setViewMode('timeline'); setActiveFolder(null); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
                viewMode === 'timeline' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Clock size={14} /> 時序 (Timeline)
            </button>
            <button 
              onClick={() => setViewMode('folders')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
                viewMode === 'folders' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Folder size={14} /> 資料夾 (Folders)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/50">
          
          {viewMode === 'timeline' && (
            <div className="space-y-6">
              {Object.entries(timelineGroups).map(([date, gd]) => {
                const groupDesigns = gd as GeneratedDesign[];
                return (
                  <div key={date}>
                    <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur py-2 mb-2 border-b border-slate-800/50 flex items-center gap-2 text-xs font-bold text-neon-blue uppercase tracking-wider">
                      <Calendar size={12} /> {date}
                      <span className="text-slate-600 ml-auto">{groupDesigns.length} items</span>
                    </div>
                    <div className="space-y-3">
                      {groupDesigns.map(renderDesignCard)}
                    </div>
                  </div>
                );
              })}
              {designs.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                   無保存的設計 (No saved designs)
                </div>
              )}
            </div>
          )}

          {viewMode === 'folders' && !activeFolder && (
            <div className="space-y-2">
              {isCreatingFolder ? (
                <div className="bg-slate-800 p-3 rounded-xl border border-neon-blue mb-4 animate-in slide-in-from-top-2">
                  <input 
                    autoFocus
                    type="text" 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder Name..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm mb-2 focus:border-neon-blue outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsCreatingFolder(false)} className="text-xs text-slate-400 hover:text-white px-2 py-1">取消</button>
                    <button onClick={handleCreateFolder} className="text-xs bg-neon-blue text-black font-bold px-3 py-1 rounded hover:bg-neon-blue/80">建立</button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:border-neon-blue hover:text-neon-blue hover:bg-slate-800/50 transition-all mb-4"
                >
                  <FolderPlus size={18} /> 建立資料夾 (New Folder)
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                {folders.map(folder => {
                   const count = designs.filter(d => d.folder === folder).length;
                   return (
                    <div 
                      key={folder}
                      onClick={() => setActiveFolder(folder)}
                      className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-500 rounded-xl p-4 cursor-pointer transition-all relative"
                    >
                      <Folder size={32} className="text-slate-500 group-hover:text-neon-purple mb-3 transition-colors" />
                      <h4 className="text-white font-bold text-sm truncate">{folder}</h4>
                      <p className="text-xs text-slate-500">{count} items</p>
                      
                      <button 
                        onClick={(e) => handleDeleteFolder(folder, e)}
                        className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                   );
                })}
                <div 
                   onClick={() => setActiveFolder('uncategorized_root_virtual')} 
                   className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all"
                >
                   <div className="relative">
                     <Folder size={32} className="text-slate-600 mb-3" />
                     <div className="absolute -bottom-1 -right-1 text-slate-400 text-[10px] bg-slate-900 px-1 rounded border border-slate-700">N/A</div>
                   </div>
                   <h4 className="text-slate-300 font-bold text-sm truncate">未分類 (Uncategorized)</h4>
                   <p className="text-xs text-slate-500">{designs.filter(d => !d.folder).length} items</p>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'folders' && activeFolder && (
            <div>
              <button 
                onClick={() => setActiveFolder(null)}
                className="flex items-center gap-1 text-slate-400 hover:text-white mb-4 text-sm transition-colors"
              >
                <ChevronLeft size={16} /> 返回資料夾列表 (Back)
              </button>
              
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Folder size={20} className="text-neon-purple" />
                {activeFolder === 'uncategorized_root_virtual' ? '未分類項目' : activeFolder}
              </h3>

              <div className="space-y-3">
                {activeFolder === 'uncategorized_root_virtual' 
                  ? designs.filter(d => !d.folder).map(renderDesignCard)
                  : folderDesigns.map(renderDesignCard)
                }
                {(activeFolder === 'uncategorized_root_virtual' ? designs.filter(d => !d.folder) : folderDesigns).length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    此資料夾為空 (Empty Folder)
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-600 bg-slate-950">
          {designs.length} designs stored locally
        </div>
      </div>
    </>
  );
};
