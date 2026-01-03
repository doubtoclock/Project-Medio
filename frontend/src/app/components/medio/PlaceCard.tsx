import React from 'react';
import { Star } from 'lucide-react';

interface PlaceCardProps {
    place: {
        id: string;
        name: string;
        type: string;
        address: string;
        rating: number;
        image: string;
        timeFromA: string;
        timeFromB: string;
    }
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex gap-4 hover:bg-zinc-800/80 transition-all cursor-pointer group shadow-sm hover:shadow-md hover:border-zinc-700">
            <div className="w-24 h-24 rounded-xl bg-zinc-800 overflow-hidden shrink-0 relative">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                <img src={place.image} alt={place.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1.5 py-0.5">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-zinc-100 text-base leading-tight group-hover:text-emerald-400 transition-colors">{place.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-yellow-500 font-medium bg-yellow-500/10 px-1.5 py-0.5 rounded-md">
                        <Star size={10} fill="currentColor" />
                        <span>{place.rating}</span>
                    </div>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-1">{place.type} • {place.address}</p>
                <div className="mt-1 flex gap-2">
                     <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md border border-emerald-500/20 font-medium">A: {place.timeFromA}</span>
                     <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md border border-indigo-500/20 font-medium">B: {place.timeFromB}</span>
                </div>
            </div>
        </div>
    );
};
