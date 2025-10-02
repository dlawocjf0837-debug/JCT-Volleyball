import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Player, SavedTeamInfo } from '../types';
import TeamEmblem from '../components/TeamEmblem';

interface AttendanceScreenProps {
    teamSelection: {
        teamA: string;
        teamB: string;
        teamAKey?: string;
        teamBKey?: string;
    };
    onStartMatch: (attendingPlayers: { teamA: Record<string, Player>, teamB: Record<string, Player> }) => void;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ teamSelection, onStartMatch }) => {
    const { teamSets } = useData();

    const { teamAInfo, teamAPlayers, teamBInfo, teamBPlayers } = useMemo(() => {
        let teamAInfo: SavedTeamInfo | null = null;
        let teamAPlayers: Player[] = [];
        let teamBInfo: SavedTeamInfo | null = null;
        let teamBPlayers: Player[] = [];

        if (teamSelection.teamAKey) {
            const [setId, teamName] = teamSelection.teamAKey.split('___');
            const set = teamSets.find(s => s.id === setId);
            if (set) {
                teamAInfo = set.teams.find(t => t.teamName === teamName) || null;
                if (teamAInfo) {
                    teamAPlayers = teamAInfo.playerIds.map(id => set.players[id]).filter(Boolean);
                }
            }
        }
        
        if (teamSelection.teamBKey) {
            const [setId, teamName] = teamSelection.teamBKey.split('___');
            const set = teamSets.find(s => s.id === setId);
            if (set) {
                teamBInfo = set.teams.find(t => t.teamName === teamName) || null;
                if (teamBInfo) {
                    teamBPlayers = teamBInfo.playerIds.map(id => set.players[id]).filter(Boolean);
                }
            }
        }

        return { teamAInfo, teamAPlayers, teamBInfo, teamBPlayers };
    }, [teamSelection, teamSets]);

    const [attendingA, setAttendingA] = useState<Set<string>>(new Set());
    const [attendingB, setAttendingB] = useState<Set<string>>(new Set());

    useEffect(() => {
        setAttendingA(new Set(teamAPlayers.map(p => p.id)));
        setAttendingB(new Set(teamBPlayers.map(p => p.id)));
    }, [teamAPlayers, teamBPlayers]);
    
    const handleTogglePlayer = (team: 'A' | 'B', playerId: string) => {
        const setter = team === 'A' ? setAttendingA : setAttendingB;
        setter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) {
                newSet.delete(playerId);
            } else {
                newSet.add(playerId);
            }
            return newSet;
        });
    };

    const handleToggleAll = (team: 'A' | 'B') => {
        const players = team === 'A' ? teamAPlayers : teamBPlayers;
        const attending = team === 'A' ? attendingA : attendingB;
        const setter = team === 'A' ? setAttendingA : setAttendingB;

        if (attending.size === players.length) {
            setter(new Set()); // Deselect all
        } else {
            setter(new Set(players.map(p => p.id))); // Select all
        }
    };
    
    const handleStart = () => {
        const finalTeamA: Record<string, Player> = {};
        teamAPlayers.forEach(p => {
            if (attendingA.has(p.id)) {
                finalTeamA[p.id] = p;
            }
        });

        const finalTeamB: Record<string, Player> = {};
        teamBPlayers.forEach(p => {
            if (attendingB.has(p.id)) {
                finalTeamB[p.id] = p;
            }
        });
        
        onStartMatch({ teamA: finalTeamA, teamB: finalTeamB });
    };

    const PlayerList: React.FC<{
        teamInfo: SavedTeamInfo | null,
        players: Player[],
        attending: Set<string>,
        onToggle: (playerId: string) => void,
        onToggleAll: () => void,
    }> = ({ teamInfo, players, attending, onToggle, onToggleAll }) => {
        if (!teamInfo) {
            return <div className="text-slate-400 text-center p-8">팀 정보를 불러올 수 없습니다.</div>;
        }

        const teamColor = teamInfo.color || '#cbd5e1';

        return (
            <div className="bg-slate-900/50 p-6 rounded-lg border-2 border-solid flex flex-col" style={{ borderColor: teamColor }}>
                <div className="flex flex-col items-center text-center gap-2 mb-4">
                    <TeamEmblem emblem={teamInfo.emblem} color={teamColor} className="w-12 h-12" />
                    <div>
                        <h3 className="text-2xl font-bold text-white">{teamInfo.teamName}</h3>
                        {teamInfo.slogan && <p className="text-sm italic" style={{ color: teamColor }}>"{teamInfo.slogan}"</p>}
                    </div>
                </div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold text-slate-300">출전 선수 ({attending.size}/{players.length})</h4>
                    <button onClick={onToggleAll} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md">
                        {attending.size === players.length ? '전체 해제' : '전체 선택'}
                    </button>
                </div>
                <div className="space-y-2 flex-grow overflow-y-auto max-h-96 pr-2">
                    {players.map(player => (
                        <label key={player.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                            <input
                                type="checkbox"
                                checked={attending.has(player.id)}
                                onChange={() => onToggle(player.id)}
                                className="h-5 w-5 bg-slate-700 border-slate-500 rounded text-sky-500 focus:ring-sky-500"
                            />
                            <span className="font-semibold text-slate-200">{player.originalName}</span>
                            <span className="text-xs text-slate-400 ml-auto">{player.class}반 {player.studentNumber}번</span>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-2xl space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-[#00A3FF]">출전 선수 선택</h2>
                <p className="text-slate-400 mt-1">경기에 참여할 선수를 선택해주세요.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PlayerList
                    teamInfo={teamAInfo}
                    players={teamAPlayers}
                    attending={attendingA}
                    onToggle={(playerId) => handleTogglePlayer('A', playerId)}
                    onToggleAll={() => handleToggleAll('A')}
                />
                <PlayerList
                    teamInfo={teamBInfo}
                    players={teamBPlayers}
                    attending={attendingB}
                    onToggle={(playerId) => handleTogglePlayer('B', playerId)}
                    onToggleAll={() => handleToggleAll('B')}
                />
            </div>
            <div className="flex justify-center pt-6">
                <button
                    onClick={handleStart}
                    className="bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-3 px-12 rounded-lg transition duration-200 text-xl"
                >
                    경기 시작
                </button>
            </div>
        </div>
    );
};

export default AttendanceScreen;