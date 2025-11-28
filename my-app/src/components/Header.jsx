import React from 'react';
import { DollarSign, Star, Trophy, User } from 'lucide-react';
import { moodProfiles } from '../data/financialData';

const Header = ({ level, xp, maxXp, points, mood, onProfileClick }) => {
  const xpPercentage = (xp / maxXp) * 100;
  const moodData = moodProfiles[mood] || moodProfiles.motivational;
  
  return (
    <header className={`bg-gradient-to-r ${moodData.color} text-white p-6 md:p-10 pb-16 md:pb-20 md:rounded-b-3xl lg:rounded-b-4xl shadow-lg relative z-10 transition-colors duration-500`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          
          {/* Logo & Mood Section */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="relative">
                <DollarSign className="w-8 h-8 md:w-10 md:h-10" />
                <div className="absolute -top-1 -right-1 text-xl animate-bounce">{moodData.emoji}</div>
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">Artha Saarthi AI</h1>
                <p className="text-xs opacity-90 font-medium tracking-wide uppercase">{moodData.tone} mode</p>
              </div>
            </div>

            {/* Mobile Profile Button (Visible only on small screens) */}
            <button 
              onClick={onProfileClick}
              className="md:hidden bg-white/20 p-2 rounded-full backdrop-blur-md hover:bg-white/30 transition"
            >
              <User className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Stats & Desktop Profile Section */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center justify-between gap-3 w-full md:w-auto bg-black/20 md:bg-transparent p-1 md:p-0 rounded-xl">
              <div className="flex items-center gap-1 bg-black/40 px-4 py-2 rounded-lg md:rounded-full backdrop-blur-sm flex-1 justify-center">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="font-bold text-sm">{points} pts</span>
              </div>
              <div className="flex items-center gap-1 bg-black/40 px-4 py-2 rounded-lg md:rounded-full backdrop-blur-sm flex-1 justify-center">
                <Trophy className="w-4 h-4 text-orange-300" />
                <span className="font-bold text-sm">Lvl {level}</span>
              </div>
            </div>

            {/* Desktop Profile Button */}
            <button 
              onClick={onProfileClick}
              className="hidden md:flex bg-white/20 p-2.5 rounded-full backdrop-blur-md hover:bg-white/30 transition shadow-lg border border-white/10"
              title="My Profile"
            >
              <User className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* XP Bar */}
        <div className="relative w-full bg-black/20 rounded-full h-3 overflow-hidden backdrop-blur-sm mt-2 border border-white/10">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500 transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${xpPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-wider mt-2 text-white/80 font-bold text-right">
          {Math.floor(xp)} / {maxXp} XP to next level
        </p>
      </div>
    </header>
  );
};

export default Header;