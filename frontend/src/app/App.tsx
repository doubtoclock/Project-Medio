import React, { useState } from 'react';
import { BottomNav } from './components/medio/BottomNav';
import { MeetView } from './components/medio/MeetView';
import { TravelView } from './components/medio/TravelView';
import { UserGuideView } from './components/medio/UserGuideView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'meet' | 'travel' | 'guide'>('meet');

  return (
    <div className="bg-black min-h-screen text-zinc-100 font-sans selection:bg-emerald-500/30 flex justify-center">
      <main className="min-h-screen w-full mx-auto relative bg-zinc-950 shadow-2xl border-x border-zinc-900 overflow-hidden">
        {activeTab === 'meet' && <MeetView />}
        {activeTab === 'travel' && <TravelView />}
        {activeTab === 'guide' && <UserGuideView />}
        
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </main>
    </div>
  );
}
