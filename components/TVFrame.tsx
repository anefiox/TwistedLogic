import React from 'react';

interface TVFrameProps {
  children: React.ReactNode;
}

const TVFrame: React.FC<TVFrameProps> = ({ children }) => {
  return (
    <div className="relative w-full max-w-4xl aspect-[4/3] bg-[#1a1a1a] rounded-[2rem] p-4 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-4 border-[#333] ring-1 ring-[#000]">
      {/* Outer Shell Details */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-[#222] rounded-b-xl opacity-50"></div>
      
      {/* Screen Container */}
      <div className="relative w-full h-full bg-black rounded-[2rem] overflow-hidden shadow-inner ring-4 ring-black/50 border border-gray-800">
        
        {/* CRT Overlay Effects */}
        <div className="scanline pointer-events-none absolute inset-0 z-20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_50%,_rgba(0,0,0,0.4)_100%)] pointer-events-none z-10"></div>
        <div className="absolute inset-0 pointer-events-none z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>
        
        {/* Screen Glow */}
        <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(255,255,255,0.05)] pointer-events-none z-20 rounded-[2rem]"></div>

        {/* Content */}
        <div className="relative z-0 w-full h-full flex flex-col text-white font-mono flicker overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Hardware Knobs */}
      <div className="absolute -right-12 top-20 flex flex-col gap-6 hidden lg:flex">
        <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-[#111] shadow-lg transform rotate-45 cursor-pointer hover:rotate-90 transition-transform"></div>
        <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-[#111] shadow-lg transform -rotate-12 cursor-pointer hover:-rotate-45 transition-transform"></div>
      </div>
    </div>
  );
};

export default TVFrame;