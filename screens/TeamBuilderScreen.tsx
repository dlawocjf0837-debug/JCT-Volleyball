import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Player, Team, TeamId, STAT_KEYS, STAT_NAMES, Stats } from '../types';
import PlayerCard from '../components/PlayerCard';
import TeamPanel from '../components/TeamPanel';
import StatModal from '../components/StatModal';
import ComparisonModal from '../components/ComparisonModal';
import FinalTeamsScreen from '../components/FinalTeamsScreen';
import { UsersIcon, EyeIcon, EyeSlashIcon, ScaleIcon, UndoIcon } from '../components/icons';

interface TeamBuilderScreenProps {
    initialPlayers: Player[];
    onReset: () => void;
    selectedClass: string;
}

type DraftMove = {
    playerId: string;
    teamId: TeamId;
    previousState: {
        unassignedPlayerIds: string[];
        teams: Team[];
        draftOrder: TeamId[];
        currentPickIndex: number;
        draftRound: number;
    };
};

const TEAM_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const TeamBuilderScreen: React.FC<TeamBuilderScreenProps> = ({ initialPlayers, onReset, selectedClass }) => {
    const [phase, setPhase] = useState<'captain-selection' | 'drafting' | 'final'>('captain-selection');
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [teams, setTeams] = useState<Team[]>([]);
    const [unassignedPlayerIds, setUnassignedPlayerIds] = useState<string[]>([]);
    const [selectedCaptainIds, setSelectedCaptainIds] = useState<Set<string>>(new Set());
    
    // Draft state
    const [draftOrder, setDraftOrder] = useState<TeamId[]>([]);
    const [currentPickIndex, setCurrentPickIndex] = useState(0);
    const [draftRound, setDraftRound] = useState(1);
    const [draftHistory, setDraftHistory] = useState<DraftMove[]>([]);


    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [balanceGender, setBalanceGender] = useState(false);

    const [showRealNames, setShowRealNames] = useState(false);
    const [comparisonPlayerIds, setComparisonPlayerIds] = useState<Set<string>>(new Set());
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
    const [sortKey, setSortKey] = useState<keyof Stats | 'totalScore'>('totalScore');

    useEffect(() => {
        const playerMap = initialPlayers.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        setPlayers(playerMap);
        setUnassignedPlayerIds(initialPlayers.map(p => p.id));
    }, [initialPlayers]);
    
    const handleViewStats = useCallback((player: Player) => {
        setSelectedPlayer(player);
    }, []);

    const handleToggleCaptainSelection = useCallback((player: Player) => {
        const newSelection = new Set(selectedCaptainIds);
        if (newSelection.has(player.id)) {
            newSelection.delete(player.id);
        } else if (newSelection.size < 4) {
            newSelection.add(player.id);
        } else {
            alert('최대 4명의 주장만 선택할 수 있습니다.');
        }
        setSelectedCaptainIds(newSelection);
    }, [selectedCaptainIds]);
    
    const handleToggleComparison = useCallback((playerId: string) => {
        setComparisonPlayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) {
                newSet.delete(playerId);
            } else if (newSet.size < 2) {
                newSet.add(playerId);
            } else {
                alert('최대 2명의 선수만 비교할 수 있습니다.');
            }
            return newSet;
        });
    }, []);

    const handleStartDraft = useCallback(() => {
        if (selectedCaptainIds.size !== 4) return;
        
        const updatedPlayers = { ...players };
        // FIX: Add explicit type `string` to `id` to prevent it from being inferred as `unknown`.
        selectedCaptainIds.forEach((id: string) => {
            if(updatedPlayers[id]) updatedPlayers[id].isCaptain = true;
        });
        
        const captainPlayers = Array.from(selectedCaptainIds).map(id => updatedPlayers[id]);
        
        const newTeams = captainPlayers.map((captain, index) => ({
            id: `team-${captain.id}`,
            name: `${captain.originalName} 팀`,
            captainId: captain.id,
            playerIds: [captain.id],
            color: TEAM_COLORS[index % TEAM_COLORS.length],
        }));
        
        // Setup Snake Draft
        const initialDraftOrder = captainPlayers
            .sort((a, b) => b.totalScore - a.totalScore)
            .map(c => newTeams.find(t => t.captainId === c.id)!.id);

        setDraftOrder(initialDraftOrder);
        setCurrentPickIndex(0);
        setDraftRound(1);
        
        setPlayers(updatedPlayers);
        setTeams(newTeams);
        setUnassignedPlayerIds(Object.keys(players).filter(id => !selectedCaptainIds.has(id)));
        setPhase('drafting');
        setComparisonPlayerIds(new Set());
        setDraftHistory([]);
    }, [selectedCaptainIds, players]);

    const performDraftPick = useCallback((playerId: string, targetTeamId: TeamId) => {
        const move: DraftMove = {
            playerId,
            teamId: targetTeamId,
            previousState: {
                unassignedPlayerIds,
                teams,
                draftOrder,
                currentPickIndex,
                draftRound,
            },
        };
        setDraftHistory(prev => [...prev, move]);

        const newUnassignedPlayerIds = unassignedPlayerIds.filter(id => id !== playerId);
        setUnassignedPlayerIds(newUnassignedPlayerIds);

        setTeams(currentTeams => currentTeams.map(t =>
            t.id === targetTeamId
            ? { ...t, playerIds: [...t.playerIds, playerId] }
            : t
        ));

        const nextPickIndex = currentPickIndex + 1;
        if (nextPickIndex >= draftOrder.length) {
            setDraftRound(prev => prev + 1);
            setDraftOrder(prev => [...prev].reverse());
            setCurrentPickIndex(0);
        } else {
            setCurrentPickIndex(nextPickIndex);
        }

        if (newUnassignedPlayerIds.length === 0) {
            setPhase('final');
        }
    }, [unassignedPlayerIds, teams, draftOrder, currentPickIndex, draftRound]);

    const handleDrop = useCallback((playerId: string, targetTeamId: TeamId) => {
        const currentPickingTeamId = draftOrder[currentPickIndex];
        if (targetTeamId !== currentPickingTeamId) {
            const currentTeamName = teams.find(t => t.id === currentPickingTeamId)?.name || '알 수 없는 팀';
            alert(`지금은 '${currentTeamName}'의 선택 차례입니다.`);
            return;
        }

        if (unassignedPlayerIds.includes(playerId)) {
            performDraftPick(playerId, targetTeamId);
        }
    }, [draftOrder, currentPickIndex, teams, unassignedPlayerIds, performDraftPick]);
    
    const handleDoubleClickDraft = useCallback((player: Player) => {
        if (phase !== 'drafting') return;
        const currentPickingTeamId = draftOrder[currentPickIndex];
        if (!currentPickingTeamId || !unassignedPlayerIds.includes(player.id)) {
            return;
        }
        performDraftPick(player.id, currentPickingTeamId);
    }, [phase, draftOrder, currentPickIndex, unassignedPlayerIds, performDraftPick]);

    const handleUndo = useCallback(() => {
        if (draftHistory.length === 0) return;

        const lastMove = draftHistory[draftHistory.length - 1];
        
        setUnassignedPlayerIds(lastMove.previousState.unassignedPlayerIds);
        setTeams(lastMove.previousState.teams);
        setDraftOrder(lastMove.previousState.draftOrder);
        setCurrentPickIndex(lastMove.previousState.currentPickIndex);
        setDraftRound(lastMove.previousState.draftRound);
        
        setDraftHistory(prev => prev.slice(0, -1));

    }, [draftHistory]);

    const handleTeamNameChange = useCallback((teamId: TeamId, newName: string) => {
        setTeams(currentTeams => currentTeams.map(t => t.id === teamId ? { ...t, name: newName } : t));
    }, []);
    
    const sortedUnassignedPlayerIds = useMemo(() => {
        const sortablePlayers = unassignedPlayerIds.map(id => players[id]).filter(Boolean);

        sortablePlayers.sort((a, b) => {
            const valA = sortKey === 'totalScore' ? a.totalScore : a.stats[sortKey as keyof Stats];
            const valB = sortKey === 'totalScore' ? b.totalScore : b.stats[sortKey as keyof Stats];
            return valB - valA; // Always sort descending (higher score is better)
        });

        return sortablePlayers.map(p => p.id);
    }, [unassignedPlayerIds, players, sortKey]);

    const teamAverages = useMemo(() => {
        type GenderCount = { male: number; female: number; other: number };
        const averages: Record<TeamId, { stats: Record<keyof Stats, number>, total: number, count: number, gender: GenderCount }> = {};

        teams.forEach(team => {
            const numPlayers = team.playerIds.length;
            const genderCount: GenderCount = { male: 0, female: 0, other: 0 };
            const emptyStats = STAT_KEYS.reduce((acc, key) => ({...acc, [key]: 0}), {} as Stats);

            if (numPlayers === 0) { averages[team.id] = { stats: emptyStats, total: 0, count: 0, gender: genderCount }; return; }
            
            const teamTotals = team.playerIds.reduce((totals, id) => {
                const player = players[id];
                if (!player) return totals;
                STAT_KEYS.forEach(key => { totals.stats[key] += player.stats[key]; });
                totals.totalScore += player.totalScore;
                if (player.gender.includes('남')) genderCount.male++; else if (player.gender.includes('여')) genderCount.female++; else genderCount.other++;
                return totals;
            }, { stats: emptyStats, totalScore: 0 });

            averages[team.id] = {
                stats: STAT_KEYS.reduce((acc, key) => ({ ...acc, [key]: teamTotals.stats[key] / numPlayers }), {} as Stats),
                total: teamTotals.totalScore / numPlayers,
                count: numPlayers,
                gender: genderCount
            };
        });
        return averages;
    }, [teams, players]);

    const getStatLeaders = (statKey: keyof Stats | 'total') => {
        let max = -1, leaders: TeamId[] = [];
        Object.entries(teamAverages).forEach(([teamId, data]) => {
            // FIX: Cast `data` to its expected type to resolve properties not existing on `unknown`.
            const typedData = data as { stats: Record<keyof Stats, number>, total: number };
            const value = statKey === 'total' ? typedData.total : typedData.stats[statKey as keyof Stats];
            if (value > max) { max = value; leaders = [teamId]; } 
            else if (value.toFixed(1) === max.toFixed(1)) { leaders.push(teamId); }
        });
        return leaders;
    }
    
    const currentPickingTeam = useMemo(() => {
        if (phase !== 'drafting' || draftOrder.length === 0 || unassignedPlayerIds.length === 0) return null;
        const currentTeamId = draftOrder[currentPickIndex];
        return teams.find(t => t.id === currentTeamId);
    }, [phase, draftOrder, currentPickIndex, teams, unassignedPlayerIds]);

    const sortingControls = (
        <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sort-select" className="text-slate-400 font-semibold">정렬 기준:</label>
            <select 
                id="sort-select" 
                value={sortKey} 
                onChange={(e) => setSortKey(e.target.value as keyof Stats | 'totalScore')} 
                className="bg-slate-700 border border-slate-600 rounded-md py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#00A3FF] text-white"
            >
                <option value="totalScore">종합 점수</option>
                {STAT_KEYS.map(key => (
                    <option key={key} value={key}>{STAT_NAMES[key]}</option>
                ))}
            </select>
        </div>
    );

    const controlPanel = (
         <div className="flex items-center gap-2 flex-wrap">
            {phase === 'drafting' && (
                <>
                    <button onClick={() => setShowRealNames(!showRealNames)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
                        {showRealNames ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        {showRealNames ? '이름 숨기기' : '이름 보기'}
                    </button>
                    <button onClick={handleUndo} disabled={draftHistory.length === 0} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed">
                        <UndoIcon className="w-5 h-5" />
                        되돌리기
                    </button>
                </>
            )}
             <button onClick={() => setIsComparisonModalOpen(true)} disabled={comparisonPlayerIds.size !== 2} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed">
                <ScaleIcon className="w-5 h-5" />
                2명 비교하기 ({comparisonPlayerIds.size}/2)
            </button>
             {phase === 'drafting' && (
                <>
                    <label htmlFor="gender-balance-toggle" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-slate-700">
                        <UsersIcon className="w-5 h-5 mr-2 text-pink-400"/>
                        <span className="font-semibold text-slate-300">성별 균형</span>
                        <div className="relative inline-block w-10 ml-2 align-middle select-none">
                            <input type="checkbox" id="gender-balance-toggle" checked={balanceGender} onChange={() => setBalanceGender(!balanceGender)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"/>
                            <label htmlFor="gender-balance-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-slate-600 cursor-pointer"></label>
                        </div>
                    </label>
                </>
            )}
        </div>
    );

    if (phase === 'final') {
        return <FinalTeamsScreen teams={teams} players={players} onReset={onReset} selectedClass={selectedClass} />;
    }

    if (phase === 'captain-selection') {
        return (
             <div className="space-y-6">
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-4 rounded-lg shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                         <div className="text-center md:text-left">
                            <h2 className="text-2xl font-bold text-[#00A3FF]">주장 4명 선택하기</h2>
                            <p className="text-slate-400">팀을 이끌 주장을 선택하세요. (카드를 클릭하여 선택) ({selectedCaptainIds.size} / 4)</p>
                         </div>
                         <button onClick={handleStartDraft} disabled={selectedCaptainIds.size !== 4} className="bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-2 px-6 rounded-lg transition duration-200 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed">
                            팀 생성 및 드래프트 시작
                        </button>
                    </div>
                    <div className="border-t border-slate-700 pt-4">
                        {controlPanel}
                    </div>
                </div>
                 <div className="bg-slate-900/50 p-4 rounded-xl shadow-lg border-2 border-dashed border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {unassignedPlayerIds.map(id => players[id]).filter(Boolean).map(p => (
                            <PlayerCard 
                                key={p.id} 
                                player={p} 
                                onClick={handleToggleCaptainSelection}
                                onViewStats={handleViewStats}
                                isDraggable={false} 
                                showRealNames={showRealNames} 
                                onToggleComparison={handleToggleComparison} 
                                isComparisonSelected={comparisonPlayerIds.has(p.id)} 
                                isCaptainSelectable={true} 
                                isCaptainSelected={selectedCaptainIds.has(p.id)} 
                            />
                        ))}
                    </div>
                </div>
                 {selectedPlayer && <StatModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} showRealNames={showRealNames} />}
                 {isComparisonModalOpen && comparisonPlayerIds.size === 2 && (
                    <ComparisonModal
                        player1={players[Array.from(comparisonPlayerIds)[0]]}
                        player2={players[Array.from(comparisonPlayerIds)[1]]}
                        onClose={() => { setIsComparisonModalOpen(false); }}
                        showRealNames={showRealNames}
                    />
                )}
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-4 rounded-lg shadow-lg flex flex-col gap-4">
                 <div className="flex flex-wrap gap-4 justify-between items-center">
                    {controlPanel}
                    <div className="flex items-center gap-2">
                         <button onClick={onReset} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition duration-200">초기화</button>
                    </div>
                </div>
                {unassignedPlayerIds.length > 0 && currentPickingTeam && (
                    <div className="text-center bg-slate-900 p-3 rounded-lg">
                        <h3 className="text-xl font-bold text-[#00A3FF] animate-pulse">
                            Round {draftRound} - 현재 <span style={{color: currentPickingTeam.color}}>{currentPickingTeam.name}</span> 선택 중...
                        </h3>
                    </div>
                )}
                <div className="w-full bg-slate-900 p-3 rounded-lg overflow-x-auto">
                    <h3 className="text-center font-bold text-lg mb-2 text-[#00A3FF]">팀 능력치 비교</h3>
                    <table className="min-w-full text-sm text-center">
                        <thead>
                            <tr className="text-slate-400">
                                <th className="p-2">능력치</th>
                                {teams.map(t => <th key={t.id} className="p-2" style={{color: t.color}}>{t.name} ({teamAverages[t.id]?.count || 0}명)</th>)}
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {['total', ...STAT_KEYS].map(key => {
                                const leaders = getStatLeaders(key as keyof Stats | 'total');
                                return (
                                    <tr key={key} className="border-t border-slate-700">
                                        <td className="p-2 font-semibold text-slate-400">{key === 'total' ? '종합 점수' : STAT_NAMES[key as keyof Stats]}</td>
                                        {teams.map(t => (
                                            <td key={t.id} className={`p-2 font-bold ${leaders.includes(t.id) ? 'text-[#00A3FF]' : ''}`}>
                                                {(key === 'total' ? teamAverages[t.id]?.total : teamAverages[t.id]?.stats[key as keyof Stats])?.toFixed(1) || '0.0'}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })}
                            <tr className="border-t border-slate-700">
                                <td className="p-2 font-semibold text-slate-400">성비(남/여)</td>
                                {teams.map(t => (<td key={t.id} className="p-2 font-semibold">{teamAverages[t.id]?.gender.male || 0} / {teamAverages[t.id]?.gender.female || 0}</td>))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 <TeamPanel 
                    teamId="unassigned" 
                    name="미배정 선수" 
                    playerCount={unassignedPlayerIds.length} 
                    color="#64748b" 
                    onDrop={handleDrop} 
                    isCurrentPick={false}
                    headerControls={sortingControls}
                >
                    {sortedUnassignedPlayerIds.map(id => players[id]).filter(Boolean).map(p => (
                        <PlayerCard 
                            key={p.id} 
                            player={p} 
                            onClick={() => {}} 
                            onDoubleClick={handleDoubleClickDraft}
                            onViewStats={handleViewStats}
                            isDraggable={!p.isCaptain} 
                            showRealNames={showRealNames} 
                            onToggleComparison={handleToggleComparison} 
                            isComparisonSelected={comparisonPlayerIds.has(p.id)} 
                        />
                    ))}
                </TeamPanel>
                {teams.map(team => (
                     <TeamPanel key={team.id} teamId={team.id} name={team.name} playerCount={team.playerIds.length} color={team.color} onDrop={handleDrop} onNameChange={handleTeamNameChange} isCurrentPick={team.id === currentPickingTeam?.id}>
                        {team.playerIds.map(id => players[id]).filter(Boolean).sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain)).map(p => (
                             <PlayerCard 
                                key={p.id} 
                                player={p} 
                                onClick={handleViewStats} 
                                onViewStats={handleViewStats}
                                isDraggable={!p.isCaptain} 
                                showRealNames={showRealNames} 
                                onToggleComparison={handleToggleComparison} 
                                isComparisonSelected={comparisonPlayerIds.has(p.id)}
                            />
                        ))}
                    </TeamPanel>
                ))}
            </div>
            {selectedPlayer && <StatModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} showRealNames={showRealNames} />}
            {isComparisonModalOpen && comparisonPlayerIds.size === 2 && (
                <ComparisonModal
                    player1={players[Array.from(comparisonPlayerIds)[0]]}
                    player2={players[Array.from(comparisonPlayerIds)[1]]}
                    onClose={() => { setIsComparisonModalOpen(false); }}
                    showRealNames={showRealNames}
                />
            )}
        </div>
    );
};

export default TeamBuilderScreen;