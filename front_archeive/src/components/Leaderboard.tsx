import { useEffect, useState } from 'react';
import { Trophy, Flame, Star, Crown, Medal } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { LeaderboardEntry } from '../lib/types';
import { Skeleton } from './ui';

export function Leaderboard() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/gamification/leaderboard');
        // The backend returns rank natively or just an array ordered by xp.
        // Let's add rank based on index.
        const mapped = data.map((d: any, i: number) => ({
          ...d,
          rank: i + 1,
        }));
        setEntries(mapped);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Trophy className="w-7 h-7 text-gold-400" />
          Leaderboard
        </h1>
        <p className="text-sm text-neutral-400 mt-1">Top learners ranked by total XP earned.</p>
      </div>

      {/* Podium */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : podium.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-neutral-400">
          No entries yet. Be the first!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* Reorder: 2nd, 1st, 3rd */}
          {[1, 0, 2].map((idx) => {
            const entry = podium[idx];
            if (!entry) return <div key={idx} />;
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            return (
              <div
                key={entry.id}
                className={`glass rounded-2xl p-4 text-center flex flex-col items-center justify-end ${
                  isFirst ? 'sm:pt-8 pb-6' : 'pt-4 pb-4'
                } ${isFirst ? 'border-gold-500/30 order-2' : isSecond ? 'order-1' : 'order-3'}`}
              >
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-2 ${
                    isFirst
                      ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-base-950 shadow-glow-gold'
                      : isSecond
                        ? 'bg-gradient-to-br from-neutral-300 to-neutral-500 text-base-950'
                        : 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                  }`}
                >
                  {isFirst ? <Crown className="w-5 h-5 sm:w-7 sm:h-7" /> : <Medal className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <p className="font-semibold text-white text-xs sm:text-sm truncate max-w-full">
                  {entry.full_name}
                </p>
                <p className="text-gold-300 font-bold text-lg sm:text-xl">{entry.xp.toLocaleString()} XP</p>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Rank #{entry.rank}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Remaining list */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="divide-y divide-white/[0.04]">
          {rest.map((entry) => {
            const isMe = entry.id === profile?.id;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 ${isMe ? 'bg-accent-500/5' : ''}`}
              >
                <div className="w-8 text-center font-display font-bold text-neutral-500">
                  {entry.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-base-950 font-bold">
                  {entry.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {entry.full_name} {isMe && <span className="text-accent-300 text-xs">(You)</span>}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      {entry.streak_days}d streak
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <p className="font-bold text-gold-300 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {entry.xp.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">XP</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
