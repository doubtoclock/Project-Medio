import React, { useState } from 'react';
import { Search, Navigation, Clock, CreditCard, Star, MapPin } from 'lucide-react';
import { motion } from "framer-motion";
import { RealMap } from './Map';
import { Header } from './Header';

export const TravelView = () => {
    const [destination, setDestination] = useState('');

    return (
        <div className="h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
            <Header />
             {/* Map Background */}
            <div className="absolute inset-0 -z-0">
            <RealMap /></div>

             <div className="absolute inset-0 pt-24 px-4 pb-24 overflow-y-auto no-scrollbar pointer-events-auto">
                <header className="mb-4 relative z-10">
                    <h1 className="text-4xl font-bold mb-2 text-white tracking-tight drop-shadow-md"></h1>
                    <p className="text-zinc-600 text-sm font-medium">Find the best way to your destination.</p>
                </header>

                <div className="relative mb-6 group z-10">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                         <Search size={20} />
                    </div>
                    <input 
                        type="text" 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Where to?" 
                        className="w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all placeholder:text-zinc-500 shadow-xl"
                    />
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        <button className="min-w-[110px] h-32 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-lg">
                            <div className="bg-zinc-950 w-10 h-10 rounded-full flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 text-lg">🏠</div>
                            <div className="text-left">
                                <span className="font-bold text-sm block text-zinc-200">Home</span>
                                <span className="text-[10px] text-zinc-500">24 mins</span>
                            </div>
                        </button>
                        <button className="min-w-[110px] h-32 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-lg">
                            <div className="bg-zinc-950 w-10 h-10 rounded-full flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 text-lg">💼</div>
                            <div className="text-left">
                                <span className="font-bold text-sm block text-zinc-200">Work</span>
                                <span className="text-[10px] text-zinc-500">45 mins</span>
                            </div>
                        </button>
                        <button className="min-w-[110px] h-32 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-lg">
                            <div className="bg-zinc-950 w-10 h-10 rounded-full flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 text-lg">💪</div>
                            <div className="text-left">
                                <span className="font-bold text-sm block text-zinc-200">Gym</span>
                                <span className="text-[10px] text-zinc-500">12 mins</span>
                            </div>
                        </button>
                        <button className="min-w-[110px] h-32 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-lg">
                            <div className="bg-zinc-950 w-10 h-10 rounded-full flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 text-lg text-zinc-600">+</div>
                            <div className="text-left">
                                <span className="font-bold text-sm block text-zinc-200">Add</span>
                            </div>
                        </button>
                    </div>
                </div>

                {destination && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 space-y-4 relative z-10"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase text-zinc-400 tracking-wider bg-black/40 backdrop-blur-md inline-block px-2 py-1 rounded-md">Best Options</h2>
                            <button className="text-xs text-emerald-500 font-medium hover:underline bg-black/40 backdrop-blur-md px-2 py-1 rounded-md">Filter</button>
                        </div>
                        
                        {/* Mock Result 1 */}
                        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:bg-zinc-900 transition-all cursor-pointer hover:border-zinc-700 group shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                        <Navigation size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">Bus 55A</h3>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1">Fastest • Low Traffic <Star size={10} className="fill-yellow-500 text-yellow-500"/></p>
                                    </div>
                                </div>
                                <span className="bg-emerald-500/10 px-3 py-1 rounded-lg text-sm font-bold text-emerald-400">22 min</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-zinc-400 border-t border-zinc-800 pt-4 mt-2">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-zinc-600"/>
                                    <span>Leaves in <span className="text-white font-medium">4m</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard size={16} className="text-zinc-600"/>
                                    <span>$1.50</span>
                                </div>
                            </div>
                        </div>

                        {/* Mock Result 2 */}
                        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:bg-zinc-900 transition-all cursor-pointer hover:border-zinc-700 group shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-orange-500/10 p-3 rounded-xl text-orange-400 group-hover:scale-110 transition-transform">
                                        <Navigation size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">Metro Line 2</h3>
                                        <p className="text-xs text-zinc-500">Direct • Crowded</p>
                                    </div>
                                </div>
                                <span className="bg-zinc-800 px-3 py-1 rounded-lg text-sm font-bold text-zinc-400">28 min</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-zinc-400 border-t border-zinc-800 pt-4 mt-2">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-zinc-600"/>
                                    <span>Leaves in <span className="text-white font-medium">1m</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard size={16} className="text-zinc-600"/>
                                    <span>$2.00</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
             </div>
        </div>
    );
}
