// 🪄 THE UPGRADED "REALISTIC" FOLDING ANIMATION
function FoldingAnimation({ type, orientation }: { type: string, orientation: string }) {
  const isTriFold = type === 'Tri-Fold';
  const isHalfFold = type === 'Half-Fold';
  const isZFold = type === 'Z-Fold';
  const isVertical = orientation === 'Vertical';

  if (!isTriFold && !isHalfFold && !isZFold) {
    return (
      <div className="w-32 h-48 bg-white border border-gray-200 shadow-sm relative flex flex-col p-2">
        <MockPaperContent />
      </div>
    );
  }

  // Adjust dimensions based on orientation
  const widthClass = isVertical ? 'w-48 h-48' : 'w-48 h-48'; 
  const containerClass = isVertical ? 'w-32 h-40 flex-row' : 'w-40 h-32 flex-col';

  return (
    <div className={`perspective-800 ${widthClass} flex items-center justify-center`}>
      <div className={`relative ${containerClass} flex preserve-3d animate-fold-hover`}>
        
        {/* Panel 1 */}
        <div className={`
          absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1
          ${isVertical ? 'left-0 top-0 bottom-0 w-1/3 origin-right' : 'top-0 left-0 right-0 h-1/3 origin-bottom'}
          ${isTriFold ? (isVertical ? 'animate-v-tri-1' : 'animate-h-tri-1') : ''}
          ${isZFold ? (isVertical ? 'animate-v-z-1' : 'animate-h-z-1') : ''}
          ${isHalfFold ? (isVertical ? 'w-1/2 animate-v-half-1' : 'h-1/2 animate-h-half-1') : ''}
        `}>
           <MockPaperContent part={1} vertical={isVertical} />
           {/* Add a "Back" face so it's not transparent when folded */}
           <div className="absolute inset-0 bg-gray-100 opacity-0 backface-hidden"></div>
        </div>

        {/* Panel 2 (Center) - Only for Tri/Z */}
        {(isTriFold || isZFold) && (
          <div className={`
            absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1
            ${isVertical ? 'left-1/3 top-0 bottom-0 w-1/3' : 'top-1/3 left-0 right-0 h-1/3'}
          `}>
             <MockPaperContent part={2} vertical={isVertical} />
          </div>
        )}

        {/* Panel 3 */}
        <div className={`
          absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1
          ${isVertical ? 'right-0 top-0 bottom-0 origin-left' : 'bottom-0 left-0 right-0 origin-top'}
          ${isTriFold ? (isVertical ? 'w-1/3 animate-v-tri-3' : 'h-1/3 animate-h-tri-3') : ''}
          ${isZFold ? (isVertical ? 'w-1/3 animate-v-z-3' : 'h-1/3 animate-h-z-3') : ''}
          ${isHalfFold ? (isVertical ? 'w-1/2 hidden' : 'h-1/2 hidden') : ''}
        `}>
          <MockPaperContent part={3} vertical={isVertical} />
        </div>

      </div>
      
      {/* CSS MAGIC */}
      <style jsx>{`
        .perspective-800 { perspective: 800px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        
        /* VERTICAL (Rotate Y) */
        @keyframes vTri1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vTri3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-170deg); } }
        @keyframes vZ1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vZ3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vHalf1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-175deg); } }

        /* HORIZONTAL (Rotate X) */
        @keyframes hTri1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hTri3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(170deg); } }
        @keyframes hZ1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hZ3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hHalf1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(175deg); } }

        .animate-v-tri-1 { animation: vTri1 5s infinite ease-in-out; }
        .animate-v-tri-3 { animation: vTri3 5s infinite ease-in-out; }
        .animate-v-z-1 { animation: vZ1 5s infinite ease-in-out; }
        .animate-v-z-3 { animation: vZ3 5s infinite ease-in-out; }
        .animate-v-half-1 { animation: vHalf1 5s infinite ease-in-out; }

        .animate-h-tri-1 { animation: hTri1 5s infinite ease-in-out; }
        .animate-h-tri-3 { animation: hTri3 5s infinite ease-in-out; }
        .animate-h-z-1 { animation: hZ1 5s infinite ease-in-out; }
        .animate-h-z-3 { animation: hZ3 5s infinite ease-in-out; }
        .animate-h-half-1 { animation: hHalf1 5s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
// 🪄 THE UPGRADED "REALISTIC" FOLDING ANIMATION
function FoldingAnimation({ type, orientation }: { type: string, orientation: string }) {
  const isTriFold = type === 'Tri-Fold';
  const isHalfFold = type === 'Half-Fold';
  const isZFold = type === 'Z-Fold';
  const isVertical = orientation === 'Vertical';

  if (!isTriFold && !isHalfFold && !isZFold) {
    return (
      <div className="w-32 h-48 bg-white border border-gray-200 shadow-sm relative flex flex-col p-2">
        <MockPaperContent />
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 font-medium bg-white/50">
          FLAT
        </div>
      </div>
    );
  }

  // Adjust dimensions based on orientation
  const widthClass = isVertical ? 'w-48 h-48' : 'w-48 h-48'; 
  const containerClass = isVertical ? 'w-32 h-40 flex-row' : 'w-40 h-32 flex-col';

  return (
    <div className={`perspective-800 ${widthClass} flex items-center justify-center`}>
      <div className={`relative ${containerClass} flex preserve-3d animate-fold-hover`}>
        
        {/* Panel 1 */}
        <div className={`
          absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1
          ${isVertical ? 'left-0 top-0 bottom-0 w-1/3 origin-right' : 'top-0 left-0 right-0 h-1/3 origin-bottom'}
          ${isTriFold ? (isVertical ? 'animate-v-tri-1' : 'animate-h-tri-1') : ''}
          ${isZFold ? (isVertical ? 'animate-v-z-1' : 'animate-h-z-1') : ''}
          ${isHalfFold ? (isVertical ? 'w-1/2 animate-v-half-1' : 'h-1/2 animate-h-half-1') : ''}
        `}>
           <MockPaperContent part={1} vertical={isVertical} />
           {/* Back face to prevent transparency issues */}
           <div className="absolute inset-0 bg-gray-50 opacity-0 backface-hidden"></div>
        </div>

        {/* Panel 2 (Center) - Only for Tri/Z */}
        {(isTriFold || isZFold) && (
          <div className={`
            absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1
            ${isVertical ? 'left-1/3 top-0 bottom-0 w-1/3' : 'top-1/3 left-0 right-0 h-1/3'}
          `}>
             <MockPaperContent part={2} vertical={isVertical} />
          </div>
        )}

        {/* Panel 3 */}
        <div className={`
          absolute border border-gray-300 bg-white overflow-hidden flex flex-col p-1
          ${isVertical ? 'right-0 top-0 bottom-0 origin-left' : 'bottom-0 left-0 right-0 origin-top'}
          ${isTriFold ? (isVertical ? 'w-1/3 animate-v-tri-3' : 'h-1/3 animate-h-tri-3') : ''}
          ${isZFold ? (isVertical ? 'w-1/3 animate-v-z-3' : 'h-1/3 animate-h-z-3') : ''}
          ${isHalfFold ? (isVertical ? 'w-1/2 hidden' : 'h-1/2 hidden') : ''}
        `}>
          <MockPaperContent part={3} vertical={isVertical} />
        </div>

      </div>
      
      {/* STANDARD CSS (Safe for Vercel Builds) */}
      <style>{`
        .perspective-800 { perspective: 800px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        
        /* VERTICAL (Rotate Y) */
        @keyframes vTri1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vTri3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-170deg); } }
        @keyframes vZ1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vZ3 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(170deg); } }
        @keyframes vHalf1 { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-175deg); } }

        /* HORIZONTAL (Rotate X) */
        @keyframes hTri1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hTri3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(170deg); } }
        @keyframes hZ1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hZ3 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(-170deg); } }
        @keyframes hHalf1 { 0%,100% { transform: rotateX(0deg); } 50% { transform: rotateX(175deg); } }

        .animate-v-tri-1 { animation: vTri1 5s infinite ease-in-out; }
        .animate-v-tri-3 { animation: vTri3 5s infinite ease-in-out; }
        .animate-v-z-1 { animation: vZ1 5s infinite ease-in-out; }
        .animate-v-z-3 { animation: vZ3 5s infinite ease-in-out; }
        .animate-v-half-1 { animation: vHalf1 5s infinite ease-in-out; }

        .animate-h-tri-1 { animation: hTri1 5s infinite ease-in-out; }
        .animate-h-tri-3 { animation: hTri3 5s infinite ease-in-out; }
        .animate-h-z-1 { animation: hZ1 5s infinite ease-in-out; }
        .animate-h-z-3 { animation: hZ3 5s infinite ease-in-out; }
        .animate-h-half-1 { animation: hHalf1 5s infinite ease-in-out; }
      `}</style>
    </div>
  );
}

// 📄 HELPER: Makes the div look like a real document with text lines
function MockPaperContent({ part = 1, vertical = true }: { part?: number, vertical?: boolean }) {
  // Styles to simulate a document layout (Header image, text lines, footer)
  return (
    <div className={`w-full h-full flex ${vertical ? 'flex-col space-y-1' : 'flex-row space-x-1'} opacity-60`}>
      {/* Simulate a Header Image on Part 1 */}
      {part === 1 && <div className={`${vertical ? 'h-8 w-full' : 'w-8 h-full'} bg-gray-200 rounded-sm`}></div>}
      
      {/* Simulate Text Lines */}
      <div className="flex-1 space-y-1">
        <div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-full' : 'w-1 h-full'}`}></div>
        <div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-5/6' : 'w-1 h-5/6'}`}></div>
        <div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-full' : 'w-1 h-full'}`}></div>
        <div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-4/5' : 'w-1 h-4/5'}`}></div>
        
        {part === 2 && (
          <>
             <div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-full' : 'w-1 h-full'}`}></div>
             <div className={`bg-gray-100 rounded-sm ${vertical ? 'h-1 w-4/6' : 'w-1 h-4/6'}`}></div>
          </>
        )}
      </div>

      {/* Simulate a Footer/CTA on Part 3 */}
      {part === 3 && <div className={`${vertical ? 'h-6 w-full mt-auto' : 'w-6 h-full ml-auto'} bg-gray-200 rounded-sm`}></div>}
    </div>
  );
}
