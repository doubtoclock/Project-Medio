import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, TrainFront, Navigation, Star } from 'lucide-react';
import { FakeMap } from './FakeMap';
import { Header } from './Header';

// Mock Data
const MOCK_PLACES = [
  { id: '1', name: 'Nocturne Café', type: 'Food', address: '123 Midnight Ave', rating: 4.8, image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000&auto=format&fit=crop', timeFromA: '15m', timeFromB: '20m', top: '40%', left: '30%' },
  { id: '2', name: 'Nebula Mall', type: 'Mall', address: '45 Starlight Blvd', rating: 4.5, image: 'https://images.unsplash.com/photo-1519567241046-7f570eee3d9f?q=80&w=1000&auto=format&fit=crop', timeFromA: '30m', timeFromB: '25m', top: '60%', left: '70%' },
  { id: '3', name: 'Lunar Cinema', type: 'Movies', address: '88 Crescent Way', rating: 4.7, image: 'https://images.unsplash.com/photo-1517604931442-71053e3e2rc?q=80&w=1000&auto=format&fit=crop', timeFromA: '40m', timeFromB: '35m', top: '25%', left: '60%' },
  { id: '4', name: 'The Void Bistro', type: 'Food', address: '99 Deep Space Ln', rating: 4.6, image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1000&auto=format&fit=crop', timeFromA: '22m', timeFromB: '18m', top: '55%', left: '20%' },
  { id: '5', name: 'Zenith Park', type: 'Park', address: '12 Sky High Dr', rating: 4.9, image: 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?q=80&w=1000&auto=format&fit=crop', timeFromA: '10m', timeFromB: '12m', top: '45%', left: '50%' },
];

export const MeetView = () => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [locA, setLocA] = useState('');
  const [locB, setLocB] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const filteredPlaces = activeFilter === 'All' 
    ? MOCK_PLACES 
    : MOCK_PLACES.filter(p => p.type === activeFilter);

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
        <Header />
        
        {/* Map Background */}
        <FakeMap />

        {/* Pins Layer */}
        <div className="absolute inset-0 pointer-events-none mt-20"> {/* Added margin-top to offset fixed header */}
            {filteredPlaces.map((place) => (
                <motion.button
                    key={place.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.2 }}
                    onClick={() => setSelectedPlace(place)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group pointer-events-auto"
                    style={{ top: place.top, left: place.left }}
                >
                    <div className="relative">
                        <div className={`
                            flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 
                            ${selectedPlace?.id === place.id ? 'bg-white border-white text-black scale-125 z-20' : 'bg-zinc-800 border-zinc-600 text-white'}
                            transition-all duration-300
                        `}>
                            {place.type === 'Food' && <span className="text-xs">🍔</span>}
                            {place.type === 'Mall' && <span className="text-xs">🛍️</span>}
                            {place.type === 'Movies' && <span className="text-xs">🎬</span>}
                            {place.type === 'Park' && <span className="text-xs">🌳</span>}
                        </div>
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-sm">
                            {place.name}
                        </div>
                    </div>
                </motion.button>
            ))}
        </div>

      {/* Search Area */}
      <div className="absolute top-[80px] left-0 right-0 z-40 px-4 transition-all duration-300 pointer-events-none pt-4">
        <motion.div 
          layout
          className={`bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-xl overflow-hidden relative z-50 pointer-events-auto ${isSearchExpanded ? 'ring-2 ring-zinc-700' : ''}`}
          onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
        >
          {!isSearchExpanded ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex items-center gap-3 text-zinc-400 cursor-pointer py-1"
            >
              <Search size={20} />
              <span className="text-sm font-medium">Enter locations...</span>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col gap-4"
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Find Halfway Point</h3>
                    <button onClick={(e) => { e.stopPropagation(); setIsSearchExpanded(false); }} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute left-3 top-3 w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 group-focus-within:ring-emerald-500/40 transition-all"></div>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Starting Point A" 
                    value={locA}
                    onChange={(e) => setLocA(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
                    autoFocus
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-3 w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20 group-focus-within:ring-indigo-500/40 transition-all"></div>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Starting Point B" 
                    value={locB}
                    onChange={(e) => setLocB(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSearchExpanded(false); }}
                className="w-full bg-white text-black font-bold text-sm py-3 rounded-xl hover:bg-zinc-200 transition-colors mt-2"
              >
                Find Places
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade pl-1 pointer-events-auto">
          {['All', 'Food', 'Mall', 'Movies', 'Park'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border backdrop-blur-md transition-all duration-300 shadow-lg ${
                activeFilter === filter 
                  ? 'bg-white text-black border-white' 
                  : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Detail Sheet */}
      <AnimatePresence>
        {selectedPlace && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }} 
             className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none"
           >
             <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-auto" onClick={() => setSelectedPlace(null)} />
             
             <motion.div 
               initial={{ y: "100%" }} 
               animate={{ y: 0 }} 
               exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
               className="bg-zinc-900 border-t md:border border-zinc-800 w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col pointer-events-auto relative z-10"
             >
                <div className="h-48 md:h-56 bg-zinc-800 relative shrink-0">
                    <img src={selectedPlace.image} alt={selectedPlace.name} className="w-full h-full object-cover opacity-80" />
                    <button 
                        onClick={() => setSelectedPlace(null)}
                        className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex justify-between items-end">
                             <div>
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md mb-2 inline-block backdrop-blur-md border border-emerald-500/20">{selectedPlace.type}</span>
                                <h2 className="text-3xl font-bold text-white leading-none mb-1">{selectedPlace.name}</h2>
                                <p className="text-zinc-300 text-sm flex items-center gap-1 opacity-90"><MapPin size={12}/> {selectedPlace.address}</p>
                             </div>
                             <div className="text-2xl font-bold text-yellow-500">{selectedPlace.rating}</div>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto no-scrollbar pb-24">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                            <div className="text-xs text-zinc-500 mb-1">From Point A</div>
                            <div className="text-xl font-bold text-emerald-400">{selectedPlace.timeFromA}</div>
                        </div>
                        <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                            <div className="text-xs text-zinc-500 mb-1">From Point B</div>
                            <div className="text-xl font-bold text-indigo-400">{selectedPlace.timeFromB}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                             Transport Options
                             <div className="h-[1px] bg-zinc-800 flex-1"></div>
                        </h3>
                        
                        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors cursor-pointer group">
                            <div className="p-3 bg-zinc-900 rounded-xl text-orange-400 group-hover:scale-110 transition-transform">
                                <TrainFront size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">Metro Line 4</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Every 5 mins • Moderate Crowd</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white">$2.50</div>
                                <div className="text-xs text-zinc-500">12 mins</div>
                            </div>
                        </div>

                         <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors cursor-pointer group">
                            <div className="p-3 bg-zinc-900 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                <Navigation size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">Bus 402</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Arrives in 2 mins</div>
                            </div>
                             <div className="text-right">
                                <div className="text-sm font-bold text-white">$1.20</div>
                                <div className="text-xs text-zinc-500">20 mins</div>
                            </div>
                        </div>
                    </div>

                    <button className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all transform active:scale-95 shadow-lg shadow-white/10">
                        Start Navigation
                    </button>
                </div>
             </motion.div>
           </motion.div> 
        )}
      </AnimatePresence>
    </div>
  );
};
