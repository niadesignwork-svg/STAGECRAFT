import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, X, RotateCcw } from 'lucide-react';

interface ImageMaskEditorProps {
  imageUrl: string;
  onConfirm: (maskBase64: string) => void;
  onCancel: () => void;
}

export const ImageMaskEditor: React.FC<ImageMaskEditorProps> = ({ imageUrl, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Initialize canvas size to match image
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      if (canvasRef.current && containerRef.current) {
        // Set internal resolution to match actual image
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        setImageLoaded(true);
      }
    };
  }, [imageUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath(); // Reset path
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; // Visible mask color
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;

    // Create a temporary canvas to generate the binary mask (Black background, White shape)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      // Fill black
      tempCtx.fillStyle = '#000000';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw the user's strokes as solid white
      tempCtx.drawImage(canvasRef.current, 0, 0);
      
      // To ensure the strokes are solid white (since we drew with opacity for UI)
      // We use globalCompositeOperation or just redraw logic, but simpler:
      // Iterate pixels or just rely on the fact we want to capture the shape.
      // Let's redraw the visible canvas onto black using a source-in or just composite.
      // Actually, since we drew with white (0.7 alpha), drawing it onto black results in grey. 
      // Let's force threshold it or better yet: keep a separate hidden canvas for the mask logic?
      // No, let's just fix the pixels.
      
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // If the pixel is not black (meaning the user drew there), make it full white
        if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0) {
            data[i] = 255;     // R
            data[i+1] = 255;   // G
            data[i+2] = 255;   // B
            data[i+3] = 255;   // Alpha
        }
      }
      tempCtx.putImageData(imageData, 0, 0);
      
      onConfirm(tempCanvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="relative w-full h-full group">
      <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-xl">
        {/* Background Image */}
        <img 
          src={imageUrl} 
          alt="Editing Target" 
          className="w-full h-full object-cover pointer-events-none" 
        />
        
        {/* Canvas Overlay */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onMouseMove={draw}
          className="absolute inset-0 cursor-crosshair touch-none z-10"
        />
        
        {/* Instructions Overlay (fades out on hover/interaction) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50 group-hover:opacity-0 transition-opacity duration-500">
            <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
               塗抹想要修改的區域 (Paint over area to edit)
            </div>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl z-20">
         <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
             <span className="text-xs text-slate-400 font-bold uppercase">Brush Size</span>
             <input 
               type="range" 
               min="5" 
               max="100" 
               value={brushSize} 
               onChange={(e) => setBrushSize(Number(e.target.value))}
               className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
             />
         </div>
         
         <button 
           onClick={handleClear}
           className="text-slate-400 hover:text-white transition-colors p-1"
           title="Clear All"
         >
            <RotateCcw size={20} />
         </button>

         <div className="w-px h-6 bg-slate-700"></div>

         <button 
           onClick={onCancel}
           className="text-red-400 hover:text-red-300 transition-colors p-1"
           title="Cancel"
         >
            <X size={24} />
         </button>
         
         <button 
           onClick={handleConfirm}
           className="bg-neon-blue hover:bg-neon-blue/80 text-black rounded-full p-1.5 transition-colors"
           title="Confirm Mask"
         >
            <Check size={20} />
         </button>
      </div>
    </div>
  );
};