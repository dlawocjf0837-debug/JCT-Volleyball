import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { TeamSet, SavedTeamInfo } from '../types.ts';

interface MatchSetupScreenProps {
    onStartMatch: (teams: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }) => void;
}

interface FlattenedTeam extends SavedTeamInfo {
    key: string; // Unique key: "setId___teamName"
    displayName: string; // "1반 - Team Awesome"
    className: string; // "1반"
}

// Moved outside the main component to prevent re-creation on every render and fix React Hook errors.
const TeamManagementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    teams: FlattenedTeam[];
    players: Record<string, any>;
    onDelete: (key: string) => void;
    onDeleteAll: () => void;
}> = ({ isOpen, onClose, teams, players, onDelete, onDeleteAll }) => {
    if (!isOpen) return null;
    const [viewingTeam, setViewingTeam] = useState<FlattenedTeam | null>(null);

    const handleConfirmDeleteAll = () => {
        if(confirm('정말로 저장된 모든 팀 구성을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            onDeleteAll();
        }
    }
    
    const getPlayerName = (id: string) => players[id]?.originalName || '정보 없음';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-lg text-white border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[#00A3FF]">저장된 팀 관리</h2>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>
                {viewingTeam ? (
                     <div>
                        <button onClick={() => setViewingTeam(null)} className="mb-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">&larr; 뒤로가기</button>
                        <h3 className="text-xl font-bold mb-2">{viewingTeam.displayName} 선수 목록</h3>
                        <ul className="space-y-2 bg-slate-800 p-3 rounded-md max-h-60 overflow-y-auto">
                            <li className="text-yellow-400 font-bold">주장: {getPlayerName(viewingTeam.captainId)}</li>
                            {viewingTeam.playerIds.filter(id => id !== viewingTeam.captainId).map((playerId, i) => <li key={i} className="text-slate-300">{getPlayerName(playerId)}</li>)}
                        </ul>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-3 max-h-80 overflow-y-auto">
                            {teams.length > 0 ? teams.map(team => (
                                <li key={team.key} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                                    <span className="font-semibold">{team.displayName}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setViewingTeam(team)} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-1 px-3 rounded text-sm">정보 확인</button>
                                        <button onClick={() => { if(confirm(`${team.displayName}을(를) 삭제하시겠습니까?`)) onDelete(team.key) }} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">삭제</button>
                                    </div>
                                </li>
                            )) : <p className="text-slate-400 text-center">저장된 팀이 없습니다.</p>}
                        </ul>
                        {teams.length > 0 && (
                             <div className="mt-4 pt-4 border-t border-slate-700">
                                <button onClick={handleConfirmDeleteAll} className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">모든 기록 삭제</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default function MatchSetupScreen({ onStartMatch }: MatchSetupScreenProps) {
    const { teamSets, saveTeamSets, showToast, clearInProgressMatch } = useData();
    const [teamA, setTeamA] = useState('A팀');
    const [teamB, setTeamB] = useState('B팀');
    const [selectedTeamAKey, setSelectedTeamAKey] = useState('');
    const [selectedTeamBKey, setSelectedTeamBKey] = useState('');
    const [filterClass, setFilterClass] = useState<string>('');
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);

    const { flattenedTeams, allPlayers } = useMemo(() => {
        const teams: FlattenedTeam[] = [];
        let players: Record<string, any> = {};
        teamSets.forEach(set => {
            players = { ...players, ...set.players };
            set.teams.forEach(team => {
                teams.push({
                    ...team,
                    key: `${set.id}___${team.teamName}`,
                    displayName: `${set.className} - ${team.teamName}`,
                    className: set.className,
                });
            });
        });
        return { 
            flattenedTeams: teams.sort((a, b) => a.displayName.localeCompare(b.displayName)),
            allPlayers: players 
        };
    }, [teamSets]);

    const availableClasses = useMemo(() => {
        const classNames = new Set(flattenedTeams.map(t => t.className).filter(Boolean));
        return Array.from(classNames).sort((a, b) => {
            if (a === '전체') return -1;
            if (b === '전체') return 1;
            return a.localeCompare(b);
        });
    }, [flattenedTeams]);

    const filteredTeams = useMemo(() => filterClass ? flattenedTeams.filter(t => t.className === filterClass) : [], [flattenedTeams, filterClass]);

    const handleSelectTeam = (teamKey: string, target: 'A' | 'B') => {
        const selectedTeam = flattenedTeams.find(t => t.key === teamKey);
        if (target === 'A') {
            setSelectedTeamAKey(teamKey);
            setTeamA(selectedTeam ? selectedTeam.teamName : 'A팀');
        } else {
            setSelectedTeamBKey(teamKey);
            setTeamB(selectedTeam ? selectedTeam.teamName : 'B팀');
        }
    };

    const handleDeleteTeam = async (key: string) => {
        try {
            const [setId] = key.split('___');
            
            const updatedTeamSets = teamSets.map(set => {
                if (set.id === setId) {
                    const updatedTeams = set.teams.filter(t => `${set.id}___${t.teamName}` !== key);
                    return { ...set, teams: updatedTeams };
                }
                return set;
            }).filter(set => set.teams.length > 0);

            await saveTeamSets(updatedTeamSets);
            
            if(key === selectedTeamAKey) { setTeamA('A팀'); setSelectedTeamAKey(''); }
            if(key === selectedTeamBKey) { setTeamB('B팀'); setSelectedTeamBKey(''); }

            showToast('팀이 삭제되었습니다.', 'success');
        } catch(e) {
            console.error("Failed to delete team:", e);
            showToast("팀 삭제 중 오류가 발생했습니다.", 'error');
        }
    };

    const handleDeleteAllTeams = async () => {
        await saveTeamSets([]);
        setTeamA('A팀');
        setTeamB('B팀');
        setSelectedTeamAKey('');
        setSelectedTeamBKey('');
        setIsMgmtModalOpen(false);
        showToast('모든 팀 기록이 삭제되었습니다.', 'success');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamA.trim() || !teamB.trim()) {
            showToast('팀 이름을 모두 입력해주세요.', 'error');
            return;
        }
        if (selectedTeamAKey && selectedTeamAKey === selectedTeamBKey) {
            showToast("서로 다른 팀을 선택해주세요.", 'error');
            return;
        }
        await clearInProgressMatch();
        onStartMatch({ 
            teamA: teamA.trim(), 
            teamB: teamB.trim(), 
            teamAKey: selectedTeamAKey || undefined, 
            teamBKey: selectedTeamBKey || undefined 
        });
    };

    return (
        <>
            <TeamManagementModal 
                isOpen={isMgmtModalOpen} 
                onClose={() => setIsMgmtModalOpen(false)} 
                teams={flattenedTeams} 
                players={allPlayers}
                onDelete={handleDeleteTeam} 
                onDeleteAll={handleDeleteAllTeams} 
            />
            <div className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-2xl space-y-6 animate-fade-in">
                <div className="space-y-2">
                    <label htmlFor="class-filter" className="block text-sm font-bold text-slate-300">1. 반 선택</label>
                    <select id="class-filter" value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                        <option value="">-- 반을 선택해주세요 --</option>
                        {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {filterClass ? (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                        {filteredTeams.length > 0 ? (
                            <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
                                <h3 className="font-semibold text-slate-300 mb-2">2. 팀 데이터 불러오기 (선택)</h3>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="teamA-select" className="block text-sm font-medium text-slate-300 mb-1">A팀 선택</label>
                                        <select id="teamA-select" value={selectedTeamAKey} onChange={e => handleSelectTeam(e.target.value, 'A')} className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">A팀 직접 입력</option>
                                            {filteredTeams.map(t => <option key={t.key} value={t.key} disabled={t.key === selectedTeamBKey}>{t.displayName}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label htmlFor="teamB-select" className="block text-sm font-medium text-slate-300 mb-1">B팀 선택</label>
                                        <select id="teamB-select" value={selectedTeamBKey} onChange={e => handleSelectTeam(e.target.value, 'B')} className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-red-500">
                                            <option value="">B팀 직접 입력</option>
                                            {filteredTeams.map(t => <option key={t.key} value={t.key} disabled={t.key === selectedTeamAKey}>{t.displayName}</option>)}
                                        </select>
                                     </div>
                                 </div>
                            </div>
                        ) : (
                             <p className="text-center text-slate-400 p-2 bg-slate-800/50 rounded-lg">선택한 반에 저장된 팀 데이터가 없습니다. 팀 이름을 직접 입력해주세요.</p>
                        )}

                        <div>
                            <label htmlFor="teamA" className="block text-sm font-medium text-slate-300 mb-2">A팀 이름</label>
                            <input type="text" id="teamA" value={teamA} onChange={e => setTeamA(e.target.value)} disabled={!!selectedTeamAKey} className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#00A3FF] disabled:bg-slate-700 disabled:text-slate-400" required />
                        </div>
                        <div>
                            <label htmlFor="teamB" className="block text-sm font-medium text-slate-300 mb-2">B팀 이름</label>
                            <input type="text" id="teamB" value={teamB} onChange={e => setTeamB(e.target.value)} disabled={!!selectedTeamBKey} className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#00A3FF] disabled:bg-slate-700 disabled:text-slate-400" required />
                        </div>
                        
                        <div className="space-y-3 pt-2">
                            <button type="button" onClick={() => setIsMgmtModalOpen(true)} className="w-full text-center py-3 px-4 border border-slate-500 rounded-md shadow-sm font-medium text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-900">
                                저장된 팀 관리
                            </button>
                        </div>

                        <div className="flex justify-end items-center pt-4">
                            <button type="submit" className="bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-3 px-8 rounded-lg transition duration-200 text-lg">
                                새 경기 시작
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center p-8 text-slate-400 bg-slate-800/30 rounded-lg">
                        <p>팀을 설정하려면 먼저 위에서 반을 선택해주세요.</p>
                    </div>
                )}
            </div>
        </>
    );
}