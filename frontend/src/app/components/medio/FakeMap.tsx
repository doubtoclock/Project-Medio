import React from 'react';

export const FakeMap = () => {
    return (
        <div className="absolute inset-0 overflow-hidden bg-[#242f3e]">
            {/* City Blocks Pattern */}
            <div 
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
                        linear-gradient(#000 2px, transparent 2px), 
                        linear-gradient(90deg, #000 2px, transparent 2px)
                    `,
                    backgroundSize: '100px 100px',
                    backgroundColor: '#242f3e'
                }}
            />
            
            {/* Secondary Roads */}
            <div 
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
                        linear-gradient(#000 1px, transparent 1px), 
                        linear-gradient(90deg, #000 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                }}
            />

            {/* River */}
            <div className="absolute top-0 right-0 w-64 h-[120%] bg-[#17263c] -rotate-12 translate-x-1/2 blur-[1px] border-l border-[#2f3d52]" />
            
            {/* Parks */}
            <div className="absolute top-[20%] left-[10%] w-48 h-32 bg-[#1d3d2e] rounded-3xl opacity-60 mix-blend-screen" />
            <div className="absolute bottom-[10%] right-[30%] w-64 h-48 bg-[#1d3d2e] rounded-[3rem] opacity-60 mix-blend-screen" />
            <div className="absolute top-[60%] left-[5%] w-32 h-32 bg-[#1d3d2e] rounded-full opacity-60 mix-blend-screen" />

            {/* Major Highways */}
            <div className="absolute top-1/2 left-0 w-full h-3 bg-[#333] shadow-lg" />
            <div className="absolute top-0 left-1/3 w-4 h-full bg-[#333] shadow-lg" />
            
            {/* Random Buildings/Areas */}
            <div className="absolute top-[15%] left-[55%] w-24 h-24 bg-[#303642] rounded-lg" />
            <div className="absolute bottom-[35%] left-[15%] w-32 h-16 bg-[#303642] rounded-lg" />
            <div className="absolute top-[60%] right-[10%] w-20 h-40 bg-[#303642] rounded-lg" />

            {/* Street Labels */}
            <div className="absolute top-[51%] left-[10%] text-[10px] text-zinc-500 font-medium tracking-widest uppercase opacity-50 rotate-0 pointer-events-none">Central Ave</div>
            <div className="absolute top-[10%] left-[34.5%] text-[10px] text-zinc-500 font-medium tracking-widest uppercase opacity-50 rotate-90 pointer-events-none">Broadway</div>
            <div className="absolute bottom-[20%] right-[40%] text-[10px] text-emerald-800 font-bold tracking-widest uppercase opacity-60 pointer-events-none">Highland Park</div>
        </div>
    );
};
