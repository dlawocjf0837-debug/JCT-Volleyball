import React, { useState, useMemo, useCallback } from 'react';
import { MatchState, SavedTeamInfo } from '../types';
import { useData } from '../contexts/DataContext';
import { CrownIcon } from '../components/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RecordScreenProps {
    onContinueGame: (state: MatchState) => void;
}

type EnrichedMatch = MatchState & {
    id: string;
    date: string;
    time?: number;
};

interface FlattenedTeam extends SavedTeamInfo {
    className: string;
    captain: string;
    players: string[];
}

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


const RecordScreen: React.FC<RecordScreenProps> = ({ onContinueGame }) => {
    const { teamSets, matchHistory, matchState, matchTime, saveMatchHistory, clearInProgressMatch, showToast, p2p } = useData();
    const [selectedMatch, setSelectedMatch] = useState<EnrichedMatch | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [pointsData, setPointsData] = useState<Record<string, { teamA: number; teamB: number }>>({});
    const [rankings, setRankings] = useState<{ rank: number | string; teamName: string; totalPoints: number }[]>([]);
    const [showRankingsModal, setShowRankingsModal] = useState(false);
    
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

    const availableClasses = useMemo(() => {
        const classSet = new Set<string>();
        Object.values(allTeamData).forEach(team => {
            if (team.className) classSet.add(team.className);
        });
        return Array.from(classSet).sort((a,b) => a.localeCompare(b));
    }, [allTeamData]);
    
    const filteredMatches = useMemo(() => {
        if (!selectedClass) return allMatches;
        return allMatches.filter(match => {
            const teamAClass = match.teamA.key ? allTeamData[match.teamA.key]?.className : null;
            const teamBClass = match.teamB.key ? allTeamData[match.teamB.key]?.className : null;
            // If class is selected, show matches relevant to that class.
            // A non-host client might not have class data, so we show all matches for them if they can't filter.
            if (p2p.isHost || (teamAClass && teamBClass)) {
                return teamAClass === selectedClass || teamBClass === selectedClass;
            }
            return true;
        });
    }, [allMatches, selectedClass, allTeamData, p2p.isHost]);

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
        setRankings([]); // Clear rankings as they are now outdated
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

    const handleDelete = (matchId: string) => {
        if (!confirm('정말로 이 경기 기록을 삭제하시겠습니까?')) return;

        if (matchId === 'in-progress') {
            clearInProgressMatch();
        } else {
            const updatedHistory = matchHistory.filter((m, i) => `history-${i}` !== matchId);
            saveMatchHistory(updatedHistory);
        }
        
        if(selectedMatch?.id === matchId) setSelectedMatch(null);
        setPointsData({});
        setRankings([]);
        showToast('기록이 삭제되었습니다.', 'success');
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

    const teamARoster = selectedMatch?.teamA.key ? allTeamData[selectedMatch.teamA.key] : null;
    const teamBRoster = selectedMatch?.teamB.key ? allTeamData[selectedMatch.teamB.key] : null;
    
    const chartData = useMemo(() => {
        if (!selectedMatch) return [];
        const { teamA, teamB } = selectedMatch;
        return [
            { name: '서브 득점', [teamA.name]: teamA.serviceAces, [teamB.name]: teamB.serviceAces },
            { name: '서브 범실', [teamA.name]: teamA.serviceFaults, [teamB.name]: teamB.serviceFaults },
            { name: '블로킹', [teamA.name]: teamA.blockingPoints, [teamB.name]: teamB.blockingPoints },
            { name: '스파이크', [teamA.name]: teamA.spikeSuccesses, [teamB.name]: teamB.spikeSuccesses },
        ];
    }, [selectedMatch]);
    
    return (
        <>
            <RankingsModal isOpen={showRankingsModal} onClose={() => setShowRankingsModal(false)} rankings={rankings} />
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
                                return (
                                <div
                                    key={match.id}
                                    className={`flex items-center justify-between p-3 rounded-md transition-all duration-200 ${selectedMatch?.id === match.id ? 'bg-[#00A3FF]/20 ring-2 ring-[#00A3FF]' : 'bg-slate-800 hover:bg-slate-700'}`}
                                >
                                    <div className="flex-grow cursor-pointer" onClick={() => setSelectedMatch(match)}>
                                        <div className="flex justify-between items-center text-lg">
                                            <span className={`font-semibold ${match.winner === 'A' ? 'text-sky-400' : ''}`}>
                                                {match.teamA.name} {pointInfo && <span className="text-yellow-400 text-sm">(승점: {pointInfo.teamA}점)</span>}
                                            </span>
                                            <span className="font-mono font-bold text-xl">{match.teamA.score} : {match.teamB.score}</span>
                                            <span className={`font-semibold text-right ${match.winner === 'B' ? 'text-red-400' : ''}`}>
                                                {match.teamB.name} {pointInfo && <span className="text-yellow-400 text-sm">(승점: {pointInfo.teamB}점)</span>}
                                            </span>
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
                    
                    {selectedMatch && (
                        <div className="space-y-6 pt-6 border-t border-slate-700 animate-fade-in">
                            <h2 className="text-3xl font-bold text-[#00A3FF]">상세 기록 및 분석</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h3 className="font-bold text-xl mb-3 text-center">주요 스탯 비교</h3>
                                    <table className="w-full text-center">
                                        <thead><tr className="border-b-2 border-slate-600 text-slate-300"><th className="p-2 text-left">항목</th><th className="p-2 text-sky-400">{selectedMatch.teamA.name}</th><th className="p-2 text-red-400">{selectedMatch.teamB.name}</th></tr></thead>
                                        <tbody className="font-mono text-slate-200">
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">최종 점수</td><td className="p-2 text-2xl font-bold">{selectedMatch.teamA.score}</td><td className="p-2 text-2xl font-bold">{selectedMatch.teamB.score}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">서브 득점</td><td>{selectedMatch.teamA.serviceAces}</td><td>{selectedMatch.teamB.serviceAces}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">서브 범실</td><td>{selectedMatch.teamA.serviceFaults}</td><td>{selectedMatch.teamB.serviceFaults}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">블로킹 득점</td><td>{selectedMatch.teamA.blockingPoints}</td><td>{selectedMatch.teamB.blockingPoints}</td></tr>
                                            <tr className="border-b border-slate-700"><td className="p-2 text-left font-sans text-slate-400">스파이크 성공</td><td>{selectedMatch.teamA.spikeSuccesses}</td><td>{selectedMatch.teamB.spikeSuccesses}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg min-h-[300px]">
                                    <h3 className="font-bold text-xl mb-3 text-center">팀별 스탯 그래프</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="name" tick={{ fill: '#94a3b8' }} /><YAxis tick={{ fill: '#94a3b8' }} /><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} /><Legend /><Bar dataKey={selectedMatch.teamA.name} fill="#38bdf8" /><Bar dataKey={selectedMatch.teamB.name} fill="#f87171" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h3 className="font-bold text-xl mb-3 text-sky-400">{selectedMatch.teamA.name} 선수 명단</h3>
                                    {teamARoster ? (<ul className="space-y-2"><li className="flex items-center gap-2 font-bold text-yellow-400"><CrownIcon className="w-5 h-5"/>{teamARoster.captain}</li>{teamARoster.players.filter(p => p !== teamARoster.captain).map(p => <li key={p} className="ml-2">{p}</li>)}</ul>) : <p className="text-slate-500">선수 명단 정보가 없습니다.</p>}
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <h3 className="font-bold text-xl mb-3 text-red-400">{selectedMatch.teamB.name} 선수 명단</h3>
                                    {teamBRoster ? (<ul className="space-y-2"><li className="flex items-center gap-2 font-bold text-yellow-400"><CrownIcon className="w-5 h-5"/>{teamBRoster.captain}</li>{teamBRoster.players.filter(p => p !== teamBRoster.captain).map(p => <li key={p} className="ml-2">{p}</li>)}</ul>) : <p className="text-slate-500">선수 명단 정보가 없습니다.</p>}
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
