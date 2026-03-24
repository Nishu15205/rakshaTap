'use client';

import { Home, Users, Map, Settings, History, Shield, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRakshaStore } from '@/store/raksha-store';
import { motion } from 'framer-motion';

const navItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'contacts' as const, label: 'Contacts', icon: Users },
  { id: 'ai' as const, label: 'AI Help', icon: Brain },
  { id: 'map' as const, label: 'Map', icon: Map },
  { id: 'history' as const, label: 'History', icon: History },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const { activeTab, setActiveTab, isSOSActive } = useRakshaStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full relative',
                'transition-colors duration-200',
                isActive
                  ? isSOSActive ? 'text-red-400' : 'text-red-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn('w-5 h-5', isSOSActive && isActive && 'animate-pulse')} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function Header() {
  const { isSOSActive } = useRakshaStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-lg border-b border-zinc-800">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isSOSActive ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-br from-red-500 to-red-700'
          )}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">RakshaTap</span>
        </div>

        {isSOSActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="text-white text-xs font-medium">SOS ACTIVE</span>
          </motion.div>
        )}
      </div>
    </header>
  );
}
