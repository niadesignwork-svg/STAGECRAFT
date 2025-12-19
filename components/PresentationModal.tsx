
import React, { useState, useEffect } from 'react';
import { GeneratedDesign } from '../types';
import { ChevronLeft, ChevronRight, X, Printer, Music, Zap, Move3d, Monitor, Lightbulb, Sparkles, Layout } from 'lucide-react';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  design: GeneratedDesign;
}

// Moved SlideContainer outside and renamed to SlideLayout to avoid recreating it on every render.
// Also fixes the TypeScript error regarding children prop.
interface SlideLayoutProps {
  children: React.ReactNode;
  className?: string;
  timestamp: number;
  currentSlide: number;
  totalSlides: number;
}

const SlideLayout: React.FC<SlideLayoutProps> = ({ 
  children, 
  className = "", 
  timestamp, 
  currentSlide, 
  totalSlides 
}) => (
  <div className={`w-full h-full flex flex-col p-12 relative overflow-hidden ${className} print:p-0 print:h-screen`}>
    {/* Header / Watermark */}
    <div className="absolute top-6 left-8 flex items-center gap-2 opacity-50 print:opacity-100">
      <div className="w-3 h-3 bg-neon-blue rounded-full"></div>
      <span className="text-xs font-bold tracking-[0.2em] text-white uppercase">StageCraft AI Design Proposal</span>
    </div>
    <div className="absolute top-6 right-8 text-xs text-slate-500 font-mono print:text-black">
      {new Date(timestamp).toLocaleDateString()}
    </div>
    
    {children}

    {/* Footer Pagination */}
    <div className="absolute bottom-6 right-8 text-slate-600 text-sm font-mono print:bottom-4">
      {currentSlide + 1} / {totalSlides}
    </div>
  </div>
);

export const PresentationModal: React.FC<PresentationModalProps> = ({ isOpen, onClose, design }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 4;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide]);

  if (!isOpen) return null;

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center print:bg-white print:block print:static">
      
      {/* Controls (Hidden in Print) */}
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white z-50 print:hidden">
        <X size={24} />
      </button>
      
      <button onClick={handlePrint} className="absolute top-4 right-20 p-2 bg-neon-blue hover:bg-white text-black rounded-full font-bold flex items-center gap-2 px-4 z-50 print:hidden shadow-lg shadow-neon-blue/20">
        <Printer size={18} /> <span className="text-sm">Print / PDF</span>
      </button>

      <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all print:hidden">
        <ChevronLeft size={48} />
      </button>
      <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all print:hidden">
        <ChevronRight size={48} />
      </button>

      {/* Slide Deck Container */}
      <div className="w-[1280px] aspect-video bg-slate-950 shadow-2xl rounded-xl overflow-hidden border border-slate-800 print:w-full print:h-screen print:border-0 print:rounded-none print:shadow-none print:bg-white print:text-black">
        
        {/* SLIDE 1: COVER */}
        {currentSlide === 0 && (
          <div className="w-full h-full relative">
            {/* Background Image */}
            <div className="absolute inset-0">
               <img src={design.imageUrl} className="w-full h-full object-cover opacity-40 blur-sm scale-105 print:opacity-100 print:blur-0" />
               <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent print:hidden" />
            </div>

            <SlideLayout 
              timestamp={design.timestamp} 
              currentSlide={currentSlide} 
              totalSlides={totalSlides}
              className="justify-center relative z-10"
            >
              <div className="border-l-8 border-neon-blue pl-8 mb-8">
                <h1 className="text-7xl font-bold text-white mb-4 tracking-tight print:text-black leading-tight">
                  {design.conceptTitle}
                </h1>
                <div className="text-2xl text-neon-blue font-light tracking-widest uppercase print:text-slate-700">
                  Concert Stage Design Concept
                </div>
              </div>
              
              <div className="flex gap-8 mt-12">
                <div className="bg-white/5 backdrop-blur p-6 rounded-lg border border-white/10 print:border-slate-300 print:bg-transparent">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Date</div>
                  <div className="text-xl font-mono text-white print:text-black">{new Date(design.timestamp).toLocaleDateString()}</div>
                </div>
                <div className="bg-white/5 backdrop-blur p-6 rounded-lg border border-white/10 print:border-slate-300 print:bg-transparent">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">ID</div>
                  <div className="text-xl font-mono text-white print:text-black">#{design.id.slice(0, 8)}</div>
                </div>
              </div>
            </SlideLayout>
          </div>
        )}

        {/* SLIDE 2: VISUAL CONCEPT */}
        {currentSlide === 1 && (
           <SlideLayout
             timestamp={design.timestamp} 
             currentSlide={currentSlide} 
             totalSlides={totalSlides}
           >
             <div className="grid grid-cols-12 gap-8 h-full">
               <div className="col-span-7 flex flex-col justify-center">
                 <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative group">
                    <img src={design.imageUrl} className="w-full h-full object-cover" />
                 </div>
               </div>
               <div className="col-span-5 flex flex-col justify-center space-y-8">
                 <div>
                    <h2 className="text-4xl font-bold text-white mb-6 flex items-center gap-3 print:text-black">
                      <Layout className="text-neon-purple" /> 
                      Design Concept
                    </h2>
                    <p className="text-lg text-slate-300 leading-relaxed print:text-slate-700">
                      {design.description}
                    </p>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg border border-slate-800 print:bg-slate-100 print:border-slate-200">
                      <div className="p-3 bg-neon-blue/20 rounded-full text-neon-blue print:text-blue-600">
                        <Music size={24} />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 uppercase">Atmosphere</div>
                        <div className="font-bold text-white text-lg print:text-black">Immersive & Kinetic</div>
                      </div>
                   </div>
                 </div>
               </div>
             </div>
           </SlideLayout>
        )}

        {/* SLIDE 3: MECHANICS */}
        {currentSlide === 2 && (
           <SlideLayout
             timestamp={design.timestamp} 
             currentSlide={currentSlide} 
             totalSlides={totalSlides}
           >
             <div className="h-full flex flex-col">
                <h2 className="text-4xl font-bold text-white mb-12 flex items-center gap-3 print:text-black">
                  <Move3d className="text-neon-blue" size={40} /> 
                  Transformation Logic
                </h2>

                <div className="grid grid-cols-2 gap-12 flex-1">
                   <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 relative overflow-hidden print:bg-slate-50 print:border-slate-200">
                      <div className="absolute top-0 right-0 p-12 opacity-5">
                        <Move3d size={200} />
                      </div>
                      <h3 className="text-xl font-bold text-neon-blue mb-6 uppercase tracking-wider print:text-blue-600">
                        Mechanical Sequence
                      </h3>
                      <p className="text-xl text-white leading-loose font-light print:text-black">
                        {design.transformationSequence}
                      </p>
                   </div>

                   <div className="flex flex-col gap-6">
                      <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-2xl border border-slate-800 flex items-center justify-center print:bg-white print:border-slate-200">
                        {/* Abstract Visualization of Movement */}
                        <div className="relative w-full h-full flex items-center justify-center">
                           <div className="absolute w-32 h-32 border-2 border-neon-blue rounded-full animate-pulse print:border-blue-600"></div>
                           <div className="absolute w-48 h-48 border border-dashed border-slate-600 rounded-full animate-[spin_10s_linear_infinite]"></div>
                           <div className="text-center z-10">
                              <div className="text-5xl font-bold text-white mb-2 print:text-black">Active</div>
                              <div className="text-sm text-slate-400 uppercase tracking-widest">State Transition</div>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
             </div>
           </SlideLayout>
        )}

        {/* SLIDE 4: TECH SPECS */}
        {currentSlide === 3 && (
          <SlideLayout
            timestamp={design.timestamp} 
            currentSlide={currentSlide} 
            totalSlides={totalSlides}
          >
            <h2 className="text-4xl font-bold text-white mb-10 flex items-center gap-3 print:text-black">
               <Zap className="text-neon-pink" size={40} />
               Technical Specifications
            </h2>

            <div className="grid grid-cols-3 gap-8 h-full pb-12">
               {/* Lighting */}
               <div className="bg-slate-900 border-t-4 border-neon-blue p-8 rounded-lg shadow-lg print:bg-slate-50 print:text-black">
                  <div className="mb-6 flex items-center gap-3">
                     <div className="p-3 bg-neon-blue/10 rounded-lg text-neon-blue">
                       <Lightbulb size={32} />
                     </div>
                     <h3 className="text-2xl font-bold text-white print:text-black">Lighting</h3>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-lg print:text-slate-700">
                    {design.technicalSpecs.lighting}
                  </p>
               </div>

               {/* Video */}
               <div className="bg-slate-900 border-t-4 border-neon-purple p-8 rounded-lg shadow-lg print:bg-slate-50 print:text-black">
                  <div className="mb-6 flex items-center gap-3">
                     <div className="p-3 bg-neon-purple/10 rounded-lg text-neon-purple">
                       <Monitor size={32} />
                     </div>
                     <h3 className="text-2xl font-bold text-white print:text-black">Video Surfaces</h3>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-lg print:text-slate-700">
                    {design.technicalSpecs.video}
                  </p>
               </div>

               {/* SFX */}
               <div className="bg-slate-900 border-t-4 border-neon-pink p-8 rounded-lg shadow-lg print:bg-slate-50 print:text-black">
                  <div className="mb-6 flex items-center gap-3">
                     <div className="p-3 bg-neon-pink/10 rounded-lg text-neon-pink">
                       <Sparkles size={32} />
                     </div>
                     <h3 className="text-2xl font-bold text-white print:text-black">Special FX</h3>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-lg print:text-slate-700">
                    {design.technicalSpecs.specialEffects}
                  </p>
               </div>
            </div>
          </SlideLayout>
        )}

      </div>
    </div>
  );
};
