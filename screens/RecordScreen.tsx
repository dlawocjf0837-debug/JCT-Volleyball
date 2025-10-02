import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MatchState, SavedTeamInfo, TeamMatchState, PlayerStats, Player, TeamSet } from '../types';
import { useData } from '../contexts/DataContext';
import { CrownIcon, TrophyIcon, FireIcon, SparklesIcon, MedalIcon } from '../components/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import PlayerHistoryModal from '../components/PlayerHistoryModal';
import TeamEmblem from '../components/TeamEmblem';

interface RecordScreenProps {
    onContinueGame: (state: MatchState) => void;
}

type EnrichedMatch = MatchState & {
    id: string;
    date: string;
    time?: number;
};

// --- New Types for In-depth Analysis ---
type MvpResult = {
    player: Player;
    team: TeamMatchState;
    stats: PlayerStats;
    mvpScore: number;
    scoreBreakdown: Record<string, number>;
} | null;

type TimelineEvent = {
    type: 'STREAK' | 'LEAD_CHANGE' | 'DEUCE' | 'MATCH_POINT';
    team: 'A' | 'B' | null;
    description: string;
    score: string;
};

type MatchLeaders = {
    points: { player: Player; value: number }[];
    serviceAces: { player: Player; value: number }[];
    blockingPoints: { player: Player; value: number }[];
};


interface FlattenedTeam extends SavedTeamInfo {
    className: string;
    captain: string;
    players: string[];
}

const PlayerStatsTable: React.FC<{ 
    teamMatchState: TeamMatchState; 
    onPlayerClick: (player: Player) => void;
    teamSet: TeamSet | undefined;
}> = ({ teamMatchState, onPlayerClick, teamSet }) => {
    const { players: participatingPlayers, playerStats } = teamMatchState;

    const fullRoster = useMemo(() => {
        const teamInfo = teamSet?.teams.find(t => t.teamName === teamMatchState.name);
        if (!teamSet || !teamInfo) {
            // Fallback for manually created teams or old data without a proper link
            return Object.values(participatingPlayers);
        }
        return teamInfo.playerIds.map(id => teamSet.players[id]).filter(Boolean);
    }, [teamSet, teamMatchState.name, participatingPlayers]);

    if (fullRoster.length === 0) {
        return (
            <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                    <TeamEmblem emblem={teamMatchState.emblem} color={teamMatchState.color} className="w-8 h-8" />
                    <h4 className="font-bold text-xl text-slate-300">{teamMatchState.name} 선수 기록</h4>
                </div>
                <p className="text-slate-500">이 경기에 대한 선수별 기록이 없습니다.</p>
            </div>
        );
    }

    const statOrder: (keyof PlayerStats)[] = ['points', 'serviceAces', 'spikeSuccesses', 'blockingPoints', 'serviceFaults'];
    const statHeaderNames: Record<keyof PlayerStats, string> = {
        points: '득점',
        serviceAces: '서브',
        spikeSuccesses: '스파이크',
        blockingPoints: '블로킹',
        serviceFaults: '범실',
    };
    
    return (
        <div className="bg-slate-800/50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
                <TeamEmblem emblem={teamMatchState.emblem} color={teamMatchState.color} className="w-8 h-8" />
                <div>
                    <h4 className="font-bold text-xl text-slate-300">{teamMatchState.name}</h4>
                    {teamMatchState.slogan && <p className="text-xs italic" style={{ color: teamMatchState.color }}>"{teamMatchState.slogan}"</p>}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-center text-sm">
                    <thead>
                        <tr className="border-b-2 border-slate-600 text-slate-300">
                            <th className="p-2 text-left">선수</th>
                            {statOrder.map(key => <th key={key} className="p-2">{statHeaderNames[key]}</th>)}
                        </tr>
                    </thead>
                    <tbody className="font-mono text-slate-200">
                        {fullRoster.map(player => {
                            const didParticipate = player.id in participatingPlayers;
                            const stats = didParticipate ? playerStats?.[player.id] : null;

                            return (
                             <tr key={player.id} className="border-b border-slate-700">
                                <td className="p-2 text-left font-sans text-slate-400 font-semibold">
                                     <button onClick={() => onPlayerClick(player)} className="text-left hover:text-sky-400 transition-colors" aria-label={`${player.originalName} 상세 기록 보기`}>
                                        {player.originalName || '알 수 없음'}
                                    </button>
                                </td>
                                {didParticipate && stats ? (
                                    statOrder.map(key => <td key={key} className="p-2">{stats[key] || 0}</td>)
                                ) : (
                                    <td colSpan={statOrder.length} className="p-2 text-center text-slate-500 font-sans italic">
                                        참여하지 않음
                                    </td>
                                )}
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
    )
};


const RankingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    rankings: { rank: number | string; teamName: string; totalPoints: number }[];
}> = ({ isOpen, onClose, rankings }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-md text-white border border-[#00A3FF]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[#00A3FF]">팀 순위</h2>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>
                {rankings.length > 0 ? (
                    <ul className="space-y-3">
                        {rankings.map((team, index) => (
                            <li key={index} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg text-lg transition-transform hover:scale-105">
                                <span className="font-bold w-16 text-yellow-300">{team.rank}위</span>
                                <span className="flex-grow font-semibold">{team.teamName}</span>
                                <span className="font-mono text-[#00A3FF]">{team.totalPoints}점</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-400 text-center py-4">계산된 순위가 없습니다. 먼저 '승점 확인'을 눌러주세요.</p>
                )}
            </div>
        </div>
    );
};

const ScoreTrendChart: React.FC<{ match: EnrichedMatch }> = ({ match }) => {
    const chartData = useMemo(() => {
        if (!match.scoreHistory) return [];
        return match.scoreHistory.map((score, index) => ({
            point: index,
            [match.teamA.name]: score.a,
            [match.teamB.name]: score.b,
        }));
    }, [match.scoreHistory, match.teamA.name, match.teamB.name]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg h-80">
             <h4 className="text-lg font-bold text-center text-slate-300 mb-2">득점 추이</h4>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="point" label={{ value: '진행', position: 'insideBottom', offset: -10 }} stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fill: '#94a3b8' }}/>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                    <Legend verticalAlign="top" />
                    <Line type="monotone" dataKey={match.teamA.name} stroke={match.teamA.color || "#38bdf8"} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={match.teamB.name} stroke={match.teamB.color || "#f87171"} strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};


// --- New Analysis Components ---
const MvpCard: React.FC<{ mvp: MvpResult }> = ({ mvp }) => {
    if (!mvp) {
        return (
            <div className="bg-slate-800/50 p-4 rounded-lg text-center text-slate-500 h-full flex items-center justify-center">
                선수별 데이터가 부족하여 MVP를 선정할 수 없습니다.
            </div>
        );
    }

    const { player, team, stats, mvpScore, scoreBreakdown } = mvp;

    return (
        <div className="bg-gradient-to-br from-yellow-800/30 via-slate-900/50 to-slate-900/50 p-6 rounded-lg border-2 border-yellow-400/80 shadow-2xl shadow-yellow-500/10 flex flex-col items-center justify-center text-center">
            
            <div className="flex items-center gap-3">
                 <CrownIcon className="w-8 h-8 text-yellow-300" />
                 <h3 className="text-2xl font-bold text-yellow-300 tracking-widest">경기 MVP</h3>
            </div>
            
            <p className="text-5xl font-black text-white my-4 drop-shadow-lg">{player.originalName}</p>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-300 bg-slate-700/50 px-4 py-1 rounded-full mb-6">
                <TeamEmblem emblem={team.emblem} color={team.color} className="w-5 h-5" />
                <span className="text-white">{team.name}</span>
            </div>

            <div className="w-full max-w-sm grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-xl text-slate-400">총 득점</p>
                    <p className="text-6xl font-bold text-sky-300">{stats.points}</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-xl text-slate-400">서브 득점</p>
                    <p className="text-6xl font-bold text-sky-300">{stats.serviceAces}</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-xl text-slate-400">스파이크</p>
                    <p className="text-6xl font-bold text-sky-300">{stats.spikeSuccesses}</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-xl text-slate-400">블로킹</p>
                    <p className="text-6xl font-bold text-sky-300">{stats.blockingPoints}</p>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-yellow-400/20 w-full max-w-sm">
                <p className="font-bold text-lg text-yellow-300">MVP 점수: {mvpScore.toFixed(1)}점</p>
                <p className="text-sm text-slate-400">
                    (스파이크: {scoreBreakdown.spikePoints.toFixed(1)},
                    서브: {scoreBreakdown.servePoints.toFixed(1)},
                    블로킹: {scoreBreakdown.blockPoints.toFixed(1)},
                    범실: {scoreBreakdown.faultPoints.toFixed(1)})
                </p>
            </div>
        </div>
    );
};

const MatchLeadersCard: React.FC<{ leaders: MatchLeaders | null }> = ({ leaders }) => {
    if (!leaders) return null;

    const LeaderItem: React.FC<{ icon: React.ReactNode; title: string; leaders: { player: Player; value: number }[] }> = ({ icon, title, leaders }) => {
        if (leaders.length === 0) return null;
        return (
            <div className="bg-slate-800 p-4 rounded-lg flex items-start gap-4">
                <div className="flex-shrink-0 text-yellow-400 mt-1">{icon}</div>
                <div className="flex-grow">
                    <p className="text-sm text-slate-400">{title}</p>
                    {leaders.map(({player, value}) => (
                         <p key={player.id} className="text-lg font-bold text-white">{player.originalName} ({value})</p>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg">
            <h3 className="text-xl font-bold text-slate-300 mb-4 text-center">최다 기록</h3>
            <div className="space-y-3">
                <LeaderItem icon={<MedalIcon className="w-8 h-8"/>} title="최다 득점" leaders={leaders.points} />
                <LeaderItem icon={<MedalIcon className="w-8 h-8"/>} title="최다 서브 에이스" leaders={leaders.serviceAces} />
                <LeaderItem icon={<MedalIcon className="w-8 h-8"/>} title="최다 블로킹" leaders={leaders.blockingPoints} />
            </div>
        </div>
    );
};


const Timeline: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
    if (events.length === 0) {
        return null;
    }

    const getIcon = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'STREAK': return <FireIcon className="w-5 h-5 text-orange-400" />;
            case 'LEAD_CHANGE': return <SparklesIcon className="w-5 h-5 text-yellow-400" />;
            case 'DEUCE': return <span className="font-bold text-purple-400">D</span>;
            case 'MATCH_POINT': return <TrophyIcon className="w-5 h-5 text-green-400" />;
            default: return null;
        }
    };

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg">
            <h3 className="text-xl font-bold text-slate-300 mb-4 text-center">주요 순간 타임라인</h3>
            <div className="relative pl-6 border-l-2 border-slate-700 space-y-4">
                {events.map((event, index) => (
                    <div key={index} className="relative">
                        <div className="absolute -left-[1.35rem] top-1 bg-slate-900 border-2 border-slate-700 rounded-full w-8 h-8 flex items-center justify-center">
                            {getIcon(event.type)}
                        </div>
                        <div className="pl-4">
                            <p className="font-semibold text-slate-200">{event.description}</p>
                            <p className="text-xs text-slate-400">스코어: {event.score}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const RecordScreen: React.FC<RecordScreenProps> = ({ onContinueGame }) => {
    const { teamSets, matchHistory, matchState, matchTime, saveMatchHistory, clearInProgressMatch, showToast, p2p } = useData();
    const [selectedMatch, setSelectedMatch] = useState<EnrichedMatch | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [pointsData, setPointsData] = useState<Record<string, { teamA: number; teamB: number }>>({});
    const [rankings, setRankings] = useState<{ rank: number | string; teamName: string; totalPoints: number }[]>([]);
    const [showRankingsModal, setShowRankingsModal] = useState(false);
    const [showScoreTrend, setShowScoreTrend] = useState(false);
    const [playerHistoryData, setPlayerHistoryData] = useState<{
        player: Player;
        cumulativeStats: any;
        performanceHistory: any[];
    } | null>(null);
    const [mvp, setMvp] = useState<MvpResult>(null);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [matchLeaders, setMatchLeaders] = useState<MatchLeaders | null>(null);


    useEffect(() => {
        if (selectedMatch) {
            setShowScoreTrend(false); // Reset when new match is selected
        }
    }, [selectedMatch]);
    
    const allMatches = useMemo((): EnrichedMatch[] => {
        const all = [
            ...matchHistory.map((m, i) => ({
                ...m,
                id: `history-${i}`,
                status: m.status || 'completed' as const,
            }))
        ];

        if (matchState && matchState.status === 'in_progress') {
            all.push({
                ...matchState,
                status: 'in_progress',
                id: 'in-progress',
                date: new Date().toISOString(),
                time: matchTime,
            });
        }
        
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [matchHistory, matchState, matchTime]);

    const allTeamData = useMemo((): Record<string, FlattenedTeam> => {
        const teamData: Record<string, FlattenedTeam> = {};
        teamSets.forEach(set => {
            set.teams.forEach(team => {
                const key = `${set.id}___${team.teamName}`;
                const captain = set.players[team.captainId];
                teamData[key] = {
                    ...team,
                    className: set.className,
                    captain: captain ? captain.originalName : '주장 정보 없음',
                    players: team.playerIds.map(id => set.players[id]?.originalName || '선수 정보 없음'),
                };
            });
        });
        return teamData;
    }, [teamSets]);

    const enrichedSelectedMatch = useMemo(() => {
        if (!selectedMatch) return null;
    
        const matchCopy = JSON.parse(JSON.stringify(selectedMatch)) as EnrichedMatch;
        
        const updateTeamBranding = (teamState: TeamMatchState) => {
            const teamInfo = teamState.key ? allTeamData[teamState.key] : null;
            if (teamInfo) {
                teamState.emblem = teamInfo.emblem || teamState.emblem;
                teamState.color = teamInfo.color || teamState.color;
                teamState.slogan = teamInfo.slogan || teamState.slogan;
            }
            if (!teamState.color) teamState.color = teamState === matchCopy.teamA ? '#38bdf8' : '#f87171';
            return teamState;
        };
    
        matchCopy.teamA = updateTeamBranding(matchCopy.teamA);
        matchCopy.teamB = updateTeamBranding(matchCopy.teamB);
        
        return matchCopy;
    }, [selectedMatch, allTeamData]);


    const availableClasses = useMemo(() => {
        const classSet = new Set<string>();
        Object.values(allTeamData).forEach(team => {
            if (team.className) classSet.add(team.className);
        });
        return Array.from(classSet).sort((a,b) => a.localeCompare(b));
    }, [allTeamData]);
    
    const filteredMatches = useMemo(() => {
        const validMatches = allMatches.filter(match => {
            if (!match || !match.teamA || !match.teamB) {
                console.warn("Filtered out a malformed match record:", match);
                return false;
            }
            return true;
        });

        if (!selectedClass) return validMatches;

        return validMatches.filter(match => {
            // FIX: Explicitly cast the result of the index access to resolve 'unknown' type error.
            const teamAClass = match.teamA.key ? (allTeamData[match.teamA.key] as FlattenedTeam)?.className : null;
            // FIX: Explicitly cast the result of the index access to resolve 'unknown' type error.
            const teamBClass = match.teamB.key ? (allTeamData[match.teamB.key] as FlattenedTeam)?.className : null;
            if (p2p.isHost || (teamAClass && teamBClass)) {
                return teamAClass === selectedClass || teamBClass === selectedClass;
            }
            return true;
        });
    }, [allMatches, selectedClass, allTeamData, p2p.isHost]);
    
    useEffect(() => {
        const calculateMvp = (match: EnrichedMatch): MvpResult => {
            let bestPlayer: { player: Player, team: TeamMatchState, stats: PlayerStats, mvpScore: number, scoreBreakdown: Record<string, number> } | null = null;
            const processTeam = (teamState: TeamMatchState) => {
                if (!teamState.players || !teamState.playerStats) return;
                for (const playerId of Object.keys(teamState.players)) {
                    const player = teamState.players[playerId];
                    const stats = teamState.playerStats[playerId];
                    if (player && stats) {
                        const scoreBreakdown = {
                            spikePoints: (stats.spikeSuccesses || 0) * 1.5,
                            servePoints: (stats.serviceAces || 0) * 2.0,
                            blockPoints: (stats.blockingPoints || 0) * 1.8,
                            faultPoints: -(stats.serviceFaults || 0) * 1.0,
                        };
                        const mvpScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

                        if (!bestPlayer || mvpScore > bestPlayer.mvpScore) {
                            bestPlayer = { player, team: teamState, stats, mvpScore, scoreBreakdown };
                        }
                    }
                }
            };
            processTeam(match.teamA);
            processTeam(match.teamB);
            return bestPlayer;
        };

        const generateTimeline = (match: EnrichedMatch): TimelineEvent[] => {
            const getTopScorerInStreak = (teamState: TeamMatchState): Player | null => {
                if (!teamState.players || !teamState.playerStats) return null;
                return Object.values(teamState.players).reduce((top, current) => {
                    const topPoints = top ? teamState.playerStats[top.id]?.points ?? -1 : -1;
                    const currentPoints = current ? teamState.playerStats[current.id]?.points ?? -1 : -1;
                    return currentPoints > topPoints ? current : top;
                }, null as Player | null);
            };

            const events: TimelineEvent[] = [];
            if (!match.scoreHistory || match.scoreHistory.length < 2) return [];

            let streak = { team: '', count: 0 };
            let lastLead: 'A' | 'B' | 'TIE' | null = null;
            
            for (let i = 1; i < match.scoreHistory.length; i++) {
                const prev = match.scoreHistory[i-1];
                const curr = match.scoreHistory[i];
                const scoreStr = `${curr.a}-${curr.b}`;
                let scoringTeam: 'A' | 'B' | null = null;

                if (curr.a > prev.a) scoringTeam = 'A';
                else if (curr.b > prev.b) scoringTeam = 'B';
                
                if (scoringTeam) {
                    if (streak.team === scoringTeam) {
                        streak.count++;
                    } else {
                        if (streak.count >= 3) {
                            const teamState = streak.team === 'A' ? match.teamA : match.teamB;
                            const topScorer = getTopScorerInStreak(teamState);
                            const topScorerInfo = topScorer ? ` (주요 선수: ${topScorer.originalName} ${teamState.playerStats[topScorer.id]?.points || 0}점)` : '';
                            events.push({ type: 'STREAK', team: streak.team as 'A' | 'B', description: `${teamState.name}, ${streak.count}점 연속 득점!${topScorerInfo}`, score: `${prev.a}-${prev.b}` });
                        }
                        streak = { team: scoringTeam, count: 1 };
                    }
                }
                
                const currentLead = curr.a > curr.b ? 'A' : (curr.b > curr.a ? 'B' : 'TIE');
                if (lastLead && currentLead !== 'TIE' && lastLead !== 'TIE' && currentLead !== lastLead) {
                    const leadTeamState = currentLead === 'A' ? match.teamA : match.teamB;
                    const topScorer = getTopScorerInStreak(leadTeamState);
                    const topScorerInfo = topScorer ? ` (주요 선수: ${topScorer.originalName} ${leadTeamState.playerStats[topScorer.id]?.points || 0}점)` : '';
                    events.push({ type: 'LEAD_CHANGE', team: currentLead, description: `${leadTeamState.name}, 역전에 성공!${topScorerInfo}`, score: scoreStr });
                }
                if (currentLead !== 'TIE') lastLead = currentLead;

                if (curr.a >= 10 && curr.a === curr.b) {
                    const isNewDeuce = !events.some(e => e.type === 'DEUCE' && e.score === scoreStr);
                    if (isNewDeuce) {
                        events.push({ type: 'DEUCE', team: null, description: `듀스 접전!`, score: scoreStr });
                    }
                }
            }

            if (streak.count >= 3) {
                const teamState = streak.team === 'A' ? match.teamA : match.teamB;
                const topScorer = getTopScorerInStreak(teamState);
                const topScorerInfo = topScorer ? ` (주요 선수: ${topScorer.originalName} ${teamState.playerStats[topScorer.id]?.points || 0}점)` : '';
                events.push({ type: 'STREAK', team: streak.team as 'A' | 'B', description: `${teamState.name}, ${streak.count}점 연속 득점!${topScorerInfo}`, score: `${match.scoreHistory[match.scoreHistory.length - 1].a}-${match.scoreHistory[match.scoreHistory.length - 1].b}` });
            }

            events.push({ type: 'MATCH_POINT', team: match.winner, description: `경기 종료!`, score: `${match.teamA.score}-${match.teamB.score}` });

            return events;
        };

        const calculateMatchLeaders = (match: EnrichedMatch): MatchLeaders => {
            const leaders: MatchLeaders = { points: [], serviceAces: [], blockingPoints: [] };
            let maxStats = { points: 0, serviceAces: 0, blockingPoints: 0 };
            const allPlayersInMatch: {player: Player, stats: PlayerStats}[] = [];
        
            const addPlayersFromTeam = (team: TeamMatchState) => {
                if (!team.players || !team.playerStats) return;
                Object.keys(team.players).forEach(pId => {
                    if (team.players[pId] && team.playerStats[pId]) {
                        allPlayersInMatch.push({player: team.players[pId], stats: team.playerStats[pId]});
                    }
                });
            };
        
            addPlayersFromTeam(match.teamA);
            addPlayersFromTeam(match.teamB);
        
            allPlayersInMatch.forEach(({ stats }) => {
                if (stats.points > maxStats.points) maxStats.points = stats.points;
                if (stats.serviceAces > maxStats.serviceAces) maxStats.serviceAces = stats.serviceAces;
                if (stats.blockingPoints > maxStats.blockingPoints) maxStats.blockingPoints = stats.blockingPoints;
            });
        
            allPlayersInMatch.forEach(({ player, stats }) => {
                if (stats.points > 0 && stats.points === maxStats.points) leaders.points.push({ player, value: stats.points });
                if (stats.serviceAces > 0 && stats.serviceAces === maxStats.serviceAces) leaders.serviceAces.push({ player, value: stats.serviceAces });
                if (stats.blockingPoints > 0 && stats.blockingPoints === maxStats.blockingPoints) leaders.blockingPoints.push({ player, value: stats.blockingPoints });
            });
        
            return leaders;
        };

        if (enrichedSelectedMatch && enrichedSelectedMatch.status === 'completed') {
            setMvp(calculateMvp(enrichedSelectedMatch));
            setTimelineEvents(generateTimeline(enrichedSelectedMatch));
            setMatchLeaders(calculateMatchLeaders(enrichedSelectedMatch));
        } else {
            setMvp(null);
            setTimelineEvents([]);
            setMatchLeaders(null);
        }
    }, [enrichedSelectedMatch]);


    const calculatePlayerHistory = useCallback((player: Player) => {
        if (!player) return;
    
        const cumulativeStats: any = {
            points: 0, serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0, matchesPlayed: 0
        };
        const performanceHistory: any[] = [];
    
        const completedMatches = matchHistory
            .filter(m => m.status === 'completed')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
        completedMatches.forEach(match => {
            let playerTeam: 'teamA' | 'teamB' | null = null;
            if (match.teamA.players && Object.keys(match.teamA.players).includes(player.id)) {
                playerTeam = 'teamA';
            } else if (match.teamB.players && Object.keys(match.teamB.players).includes(player.id)) {
                playerTeam = 'teamB';
            }
    
            if (playerTeam) {
                const teamState = match[playerTeam];
                const opponentName = (playerTeam === 'teamA' ? match.teamB : match.teamA).name;
                const playerStatsForMatch = teamState.playerStats?.[player.id];
    
                if (playerStatsForMatch) {
                    cumulativeStats.matchesPlayed += 1;
                    Object.keys(playerStatsForMatch).forEach(key => {
                        cumulativeStats[key as keyof PlayerStats] = (cumulativeStats[key as keyof PlayerStats] || 0) + playerStatsForMatch[key as keyof PlayerStats];
                    });
    
                    performanceHistory.push({
                        matchDate: match.date,
                        opponent: opponentName,
                        stats: playerStatsForMatch,
                    });
                }
            }
        });
    
        const totalServices = (cumulativeStats.serviceAces || 0) + (cumulativeStats.serviceFaults || 0);
        cumulativeStats.serviceSuccessRate = totalServices > 0 ? (cumulativeStats.serviceAces / totalServices) * 100 : 0;
        
        performanceHistory.reverse();
    
        setPlayerHistoryData({ player, cumulativeStats, performanceHistory });
    }, [matchHistory]);

    const handleCalculatePoints = useCallback(() => {
        const newPointsData: Record<string, { teamA: number; teamB: number }> = {};
        filteredMatches.forEach(match => {
            if (match.status === 'completed' && match.winner) {
                if (match.winner === 'A') {
                    newPointsData[match.id] = { teamA: 3, teamB: 0 };
                } else {
                    newPointsData[match.id] = { teamA: 0, teamB: 3 };
                }
            }
        });
        setPointsData(newPointsData);
        setRankings([]);
        showToast('경기별 승점을 계산했습니다.', 'success');
    }, [filteredMatches, showToast]);

    const handleCalculateRankings = useCallback(() => {
        const teamPoints: Record<string, number> = {};

        filteredMatches.forEach(match => {
            if (match.status === 'completed' && match.winner) {
                const winnerName = match.winner === 'A' ? match.teamA.name : match.teamB.name;
                const loserName = match.winner === 'A' ? match.teamB.name : match.teamA.name;
                
                teamPoints[winnerName] = (teamPoints[winnerName] || 0) + 3;
                teamPoints[loserName] = (teamPoints[loserName] || 0);
            }
        });

        if (Object.keys(teamPoints).length === 0) {
            showToast('순위를 계산할 완료된 경기가 없습니다.', 'error');
            return;
        }

        const sortedTeams = Object.entries(teamPoints)
            .map(([teamName, totalPoints]) => ({ teamName, totalPoints }))
            .sort((a, b) => b.totalPoints - a.totalPoints);
        
        const finalRankings: { rank: number | string; teamName: string; totalPoints: number }[] = [];
        let rank = 1;
        for (let i = 0; i < sortedTeams.length; i++) {
            let currentRank: number | string = rank;
            if (i > 0 && sortedTeams[i].totalPoints === sortedTeams[i-1].totalPoints) {
                currentRank = finalRankings[i-1].rank;
            }
            finalRankings.push({ ...sortedTeams[i], rank: currentRank });
            rank = i + 2;
        }

        setRankings(finalRankings);
        setShowRankingsModal(true);
    }, [filteredMatches, showToast]);

    const handleDelete = async (matchId: string) => {
        if (!confirm('정말로 이 경기 기록을 삭제하시겠습니까?')) return;

        try {
            if (matchId === 'in-progress') {
                clearInProgressMatch();
                showToast('진행 중인 경기가 삭제되었습니다.', 'success');
            } else {
                const updatedHistory = matchHistory.filter((_, i) => `history-${i}` !== matchId);
                await saveMatchHistory(updatedHistory, '기록이 삭제되었습니다.');
            }
            
            if(selectedMatch?.id === matchId) setSelectedMatch(null);
            setPointsData({});
            setRankings([]);
        } catch (error) {
            console.error("Failed to delete match record:", error);
        }
    };
    
    const handleExportCSV = () => {
        if (filteredMatches.length === 0) {
            showToast('내보낼 데이터가 없습니다.', 'error');
            return;
        }
        const headers = "경기날짜,A팀,A팀 점수,B팀,B팀 점수,승리팀,경기시간(초),A팀 서브득점,B팀 서브득점,A팀 서브범실,B팀 서브범실,A팀 블로킹,B팀 블로킹,A팀 스파이크,B팀 스파이크,A팀 페어플레이,B팀 페어플레이,A팀 3단플레이,B팀 3단플레이";
        const rows = filteredMatches.map(m => {
            const winnerName = m.winner ? (m.winner === 'A' ? m.teamA.name : m.teamB.name) : '무승부';
            return [
                new Date(m.date).toLocaleString('ko-KR'),
                m.teamA.name, m.teamA.score, m.teamB.name, m.teamB.score, winnerName, m.time || 0,
                m.teamA.serviceAces, m.teamB.serviceAces,
                m.teamA.serviceFaults, m.teamB.serviceFaults,
                m.teamA.blockingPoints, m.teamB.blockingPoints,
                m.teamA.spikeSuccesses, m.teamB.spikeSuccesses,
                m.teamA.fairPlay, m.teamB.fairPlay,
                m.teamA.threeHitPlays, m.teamB.threeHitPlays
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + [headers, ...rows].join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `jct_match_history_${selectedClass || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const chartData = useMemo(() => {
        if (!enrichedSelectedMatch) return [];
        const { teamA, teamB } = enrichedSelectedMatch;
        return [
            { name: '서브 득점', [teamA.name]: teamA.serviceAces, [teamB.name]: teamB.serviceAces },
            { name: '서브 범실', [teamA.name]: teamA.serviceFaults, [teamB.name]: teamB.serviceFaults },
            { name: '블로킹', [teamA.name]: teamA.blockingPoints, [teamB.name]: teamB.blockingPoints },
            { name: '스파이크', [teamA.name]: teamA.spikeSuccesses, [teamB.name]: teamB.spikeSuccesses },
            { name: '3단 플레이', [teamA.name]: teamA.threeHitPlays, [teamB.name]: teamB.threeHitPlays },
            { name: '페어플레이', [teamA.name]: teamA.fairPlay, [teamB.name]: teamB.fairPlay },
        ];
    }, [enrichedSelectedMatch]);

    const findTeamSetForMatchTeam = (teamKey: string | undefined): TeamSet | undefined => {
        if (!teamKey) return undefined;
        const [setId] = teamKey.split('___');
        return teamSets.find(s => s.id === setId);
    };
    
    return (
        <>
            <RankingsModal isOpen={showRankingsModal} onClose={() => setShowRankingsModal(false)} rankings={rankings} />
            {playerHistoryData && (
                <PlayerHistoryModal
                    player={playerHistoryData.player}
                    cumulativeStats={playerHistoryData.cumulativeStats}
                    performanceHistory={playerHistoryData.performanceHistory}
                    onClose={() => setPlayerHistoryData(null)}
                />
            )}
            <div className="max-w-7xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-2xl space-y-6 animate-fade-in w-full">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-bold text-[#00A3FF]">경기 기록 목록</h2>
                    <div className="flex gap-4 items-center">
                        <div>
                            <label htmlFor="class-select-history" className="sr-only">반 선택</label>
                            <select
                                id="class-select-history"
                                value={selectedClass}
                                onChange={(e) => {
                                    setSelectedClass(e.target.value);
                                    setSelectedMatch(null);
                                    setPointsData({});
                                    setRankings([]);
                                }}
                                className="bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00A3FF]"
                            >
                                <option value="">-- 모든 반 보기 --</option>
                                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <button onClick={handleExportCSV} disabled={filteredMatches.length === 0} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed">
                            CSV 다운로드
                        </button>
                    </div>
                </div>

                <div className="animate-fade-in">
                    <div className="max-h-60 overflow-y-auto bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                        {filteredMatches.length === 0 ? (
                            <p className="text-center text-slate-400 py-8">표시할 경기 기록이 없습니다.</p>
                        ) : (
                            filteredMatches.map((match) => {
                                const pointInfo = pointsData[match.id];
                                const teamAInfo = match.teamA.key ? allTeamData[match.teamA.key] : null;
                                const teamBInfo = match.teamB.key ? allTeamData[match.teamB.key] : null;

                                const teamAColor = teamAInfo?.color || match.teamA.color || '#38bdf8';
                                const teamBColor = teamBInfo?.color ||'#f87171';
                                const teamAEmblem = teamAInfo?.emblem || match.teamA.emblem;
                                const teamBEmblem = teamBInfo?.emblem || match.teamB.emblem;

                                return (
                                <div
                                    key={match.id}
                                    className={`flex items-center justify-between p-3 rounded-md transition-all duration-200 ${selectedMatch?.id === match.id ? 'bg-[#00A3FF]/20 ring-2 ring-[#00A3FF]' : 'bg-slate-800 hover:bg-slate-700'}`}
                                >
                                    <div className="flex-grow cursor-pointer" onClick={() => setSelectedMatch(match)}>
                                        <div className="flex justify-between items-center text-lg">
                                            <div className="flex items-center gap-2">
                                                <TeamEmblem emblem={teamAEmblem} color={teamAColor} className="w-6 h-6"/>
                                                <span className={`font-semibold ${match.winner === 'A' ? 'font-bold' : ''}`} style={{color: teamAColor}}>
                                                    {match.teamA.name} {pointInfo && <span className="text-yellow-400 text-sm">(승점: {pointInfo.teamA}점)</span>}
                                                </span>
                                            </div>
                                            <span className="font-mono font-bold text-xl">{match.teamA.score} : {match.teamB.score}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold text-right ${match.winner === 'B' ? 'font-bold' : ''}`} style={{color: teamBColor}}>
                                                    {match.teamB.name} {pointInfo && <span className="text-yellow-400 text-sm">(승점: {pointInfo.teamB}점)</span>}
                                                </span>
                                                <TeamEmblem emblem={teamBEmblem} color={teamBColor} className="w-6 h-6"/>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            <span className={`font-semibold ${match.status === 'in_progress' ? 'text-green-400 animate-pulse' : 'text-slate-500'}`}>
                                                {match.status === 'in_progress' ? '진행 중' : '경기 종료'}
                                            </span>
                                            - {new Date(match.date).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                        {match.status === 'in_progress' && p2p.isHost && (
                                            <button onClick={(e) => { e.stopPropagation(); onContinueGame(match); }} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-md text-sm transition" aria-label={`${match.teamA.name} vs ${match.teamB.name} 경기 이어하기`}>
                                                이어하기
                                            </button>
                                        )}
                                        {p2p.isHost && <button onClick={(e) => { e.stopPropagation(); handleDelete(match.id); }} className="text-slate-500 hover:text-red-500 font-bold text-xl flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-700" aria-label="기록 삭제">&times;</button>}
                                    </div>
                                </div>
                            )})
                        )}
                    </div>

                    <div className="flex justify-center items-center gap-4 py-4 mt-4 border-t border-slate-700">
                        <button onClick={handleCalculatePoints} className="bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-3 px-6 rounded-lg transition duration-200">
                            승점 확인
                        </button>
                        <button onClick={handleCalculateRankings} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
                            순위 확인
                        </button>
                    </div>
                    
                    {enrichedSelectedMatch && (
                        <div className="space-y-6 pt-6 border-t border-slate-700 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl font-bold text-[#00A3FF]">상세 기록 및 분석</h2>
                            </div>
                            
                             {enrichedSelectedMatch.status === 'completed' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <MvpCard mvp={mvp} />
                                    <div className="flex flex-col gap-6">
                                        <MatchLeadersCard leaders={matchLeaders} />
                                        <Timeline events={timelineEvents} />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h3 className="font-bold text-xl mb-3 text-center">주요 스탯 비교</h3>
                                    <table className="w-full text-center">
                                        <thead><tr className="border-b-2 border-slate-600 text-slate-300"><th className="p-2 text-left">항목</th><th className="p-2" style={{color: enrichedSelectedMatch.teamA.color}}>{enrichedSelectedMatch.teamA.name}</th><th className="p-2" style={{color: enrichedSelectedMatch.teamB.color}}>{enrichedSelectedMatch.teamB.name}</th></tr></thead>
                                        <tbody className="font-mono text-slate-200">
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">최종 점수</td><td className="p-2 text-2xl font-bold">{enrichedSelectedMatch.teamA.score}</td><td className="p-2 text-2xl font-bold">{enrichedSelectedMatch.teamB.score}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">서브 득점</td><td>{enrichedSelectedMatch.teamA.serviceAces}</td><td>{enrichedSelectedMatch.teamB.serviceAces}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">서브 범실</td><td>{enrichedSelectedMatch.teamA.serviceFaults}</td><td>{enrichedSelectedMatch.teamB.serviceFaults}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">블로킹 득점</td><td>{enrichedSelectedMatch.teamA.blockingPoints}</td><td>{enrichedSelectedMatch.teamB.blockingPoints}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">스파이크 성공</td><td>{enrichedSelectedMatch.teamA.spikeSuccesses}</td><td>{enrichedSelectedMatch.teamB.spikeSuccesses}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">3단 플레이</td><td>{enrichedSelectedMatch.teamA.threeHitPlays}</td><td>{enrichedSelectedMatch.teamB.threeHitPlays}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">페어플레이</td><td>{enrichedSelectedMatch.teamA.fairPlay}</td><td>{enrichedSelectedMatch.teamB.fairPlay}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg min-h-[300px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-xl text-center">팀별 스탯 그래프</h3>
                                        <button
                                            onClick={() => setShowScoreTrend(prev => !prev)}
                                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-1 px-3 rounded-lg text-sm transition duration-200"
                                        >
                                            {showScoreTrend ? '추이 닫기' : '득점 추이'}
                                        </button>
                                     </div>
                                    {showScoreTrend ? (
                                        <div className="animate-fade-in h-[250px]">
                                            <ScoreTrendChart match={enrichedSelectedMatch} />
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} interval={0} />
                                                <YAxis tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                                <Legend />
                                                <Bar dataKey={enrichedSelectedMatch.teamA.name} fill={enrichedSelectedMatch.teamA.color} />
                                                <Bar dataKey={enrichedSelectedMatch.teamB.name} fill={enrichedSelectedMatch.teamB.color} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-700">
                                <h3 className="text-2xl font-bold text-slate-300 mb-4">선수별 상세 기록</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <PlayerStatsTable 
                                        teamMatchState={enrichedSelectedMatch.teamA} 
                                        onPlayerClick={calculatePlayerHistory} 
                                        teamSet={findTeamSetForMatchTeam(enrichedSelectedMatch.teamA.key)}
                                    />
                                    <PlayerStatsTable 
                                        teamMatchState={enrichedSelectedMatch.teamB} 
                                        onPlayerClick={calculatePlayerHistory}
                                        teamSet={findTeamSetForMatchTeam(enrichedSelectedMatch.teamB.key)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default RecordScreen;