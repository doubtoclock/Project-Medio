import React from 'react';

export const Header = () => {
    return (
        <div className="relative bg-zinc-950 pt-10 pb-4 px-6 fixed top-0 left-0 right-0 z-50 flex items-center justify-center mx-auto shadow-md overflow-visible">
            <h1 className="text-2xl font-black tracking-tighter text-white italic">MEDIO</h1>

            {/* subtle bottom fade for aesthetic */}
            <div className="pointer-events-none absolute -bottom-2 left-0 right-0 h-6 bg-gradient-to-b from-zinc-950 to-transparent" />
        </div>
    );
};
