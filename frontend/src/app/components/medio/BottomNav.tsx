import React from 'react';
import { MapPin, Navigation, Book } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'meet' | 'travel' | 'guide';
  onTabChange: (tab: 'meet' | 'travel' | 'guide') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 pb-safe pt-2 px-6 h-20 flex justify-around items-start z-50">
      <NavButton 
        icon={<MapPin size={24} />} 
        label="Meet" 
        isActive={activeTab === 'meet'} 
        onClick={() => onTabChange('meet')} 
      />
      <NavButton 
        icon={<Navigation size={24} />} 
        label="Travel" 
        isActive={activeTab === 'travel'} 
        onClick={() => onTabChange('travel')} 
      />
      <NavButton 
        icon={<Book size={24} />} 
        label="Guide" 
        isActive={activeTab === 'guide'} 
        onClick={() => onTabChange('guide')} 
      />
    </div>
  );
};

const NavButton = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
  >
    <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-zinc-800 translate-y-[-2px]' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </button>
);
