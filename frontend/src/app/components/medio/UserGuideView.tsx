import React from 'react';
import { Info, Shield, HelpCircle, ChevronRight } from 'lucide-react';

export const UserGuideView = () => {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 pb-24">
             <header className="mb-10 mt-4">
                <h1 className="text-4xl font-bold mb-2 text-white tracking-tight">Guide</h1>
                <p className="text-zinc-500 text-sm">Everything you need to know about Medio.</p>
             </header>

             <div className="space-y-8">
                 <section>
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                            <Info size={18} />
                        </div>
                        <h2 className="font-bold text-lg text-white">How it Works</h2>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-sm text-zinc-400 leading-relaxed space-y-3 shadow-sm">
                        <p>
                            <strong className="text-zinc-200">1. Enter Locations:</strong> Tap the search bar on the Meet tab and enter two starting locations.
                        </p>
                        <p>
                            <strong className="text-zinc-200">2. Choose a Category:</strong> Filter by Food, Mall, or Movies to find the perfect spot.
                        </p>
                        <p>
                            <strong className="text-zinc-200">3. Get Directions:</strong> Select a place to see travel times and public transport options for both parties.
                        </p>
                    </div>
                 </section>

                 <section>
                    <div className="flex items-center gap-2 mb-4 text-indigo-400">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                            <Shield size={18} />
                        </div>
                        <h2 className="font-bold text-lg text-white">Privacy & Terms</h2>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-sm text-zinc-400 leading-relaxed space-y-2 shadow-sm">
                        <p>
                            We do not store your location data permanently. All calculations are performed in real-time to ensure your privacy.
                        </p>
                        <div className="h-px bg-zinc-800 my-2"></div>
                        <p className="text-xs">
                            By using this app, you agree to our Terms of Service. Please respect public transport regulations in your area.
                        </p>
                    </div>
                 </section>

                 <section>
                    <div className="flex items-center gap-2 mb-4 text-amber-400">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg">
                            <HelpCircle size={18} />
                        </div>
                        <h2 className="font-bold text-lg text-white">FAQ</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center group cursor-pointer hover:border-zinc-700 transition-colors">
                            <div>
                                <h3 className="font-medium text-white mb-1">Is it free?</h3>
                                <p className="text-xs text-zinc-500">Yes, Medio is completely free to use.</p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center group cursor-pointer hover:border-zinc-700 transition-colors">
                            <div>
                                <h3 className="font-medium text-white mb-1">Does it work offline?</h3>
                                <p className="text-xs text-zinc-500">No, you need an active internet connection.</p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                    </div>
                 </section>
             </div>
             
             <div className="mt-16 text-center">
                <p className="text-xs font-bold text-zinc-700 mb-1">Medio App v1.0.0</p>
                <p className="text-[10px] text-zinc-800">&copy; 2026 Medio Inc. All rights reserved.</p>
             </div>
        </div>
    );
};
