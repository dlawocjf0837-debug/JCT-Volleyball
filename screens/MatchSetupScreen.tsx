import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { SavedTeamInfo } from '../types';

interface MatchSetupScreenProps {
    onStartMatch: (teams: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }) => void;
}

interface FlattenedTeam extends SavedTeamInfo {
    key: string; // Unique key: "setId___teamName"
    displayName: string; // "1반 - Team Awesome"
    className: string; // "1반"
}

export default function MatchSetupScreen({ onStartMatch }: MatchSetupScreenProps) {
    const { teamSets, showToast } = useData();
    const [teamA, setTeamA] = useState('A팀');
    const [teamB, setTeamB] = useState('B팀');
    const [selectedTeamAKey, setSelectedTeamAKey] = useState('');
    const [selectedTeamBKey, setSelectedTeamBKey] = useState('');
    const [filterClass, setFilterClass] = useState<string>('');

    const { flattenedTeams } = useMemo(() => {
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
        };
    }, [teamSets]);

    const availableClasses = useMemo(() => {
        const classNames = new Set(flattenedTeams.map(t => t.className).filter(Boolean));
        // FIX: Add explicit types to sort callback parameters to prevent them from being inferred as `unknown`.
        return Array.from(classNames).sort((a: string, b: string) => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamA.trim() || !teamB.trim()) {
            showToast('팀 이름을 모두 입력해주세요.', 'error');
            return;
        }
        if (selectedTeamAKey && selectedTeamAKey === selectedTeamBKey) {
            showToast("서로 다른 팀을 선택해주세요.", 'error');
            return;
        }
        if (!selectedTeamAKey || !selectedTeamBKey) {
            showToast("저장된 팀을 양쪽 모두 선택해야 경기를 시작할 수 있습니다.", 'error');
            return;
        }
        onStartMatch({ 
            teamA: teamA.trim(), 
            teamB: teamB.trim(), 
            teamAKey: selectedTeamAKey || undefined, 
            teamBKey: selectedTeamBKey || undefined 
        });
    };

    return (
        <>
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
                                <h3 className="font-semibold text-slate-300 mb-2">2. 팀 데이터 불러오기</h3>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="teamA-select" className="block text-sm font-medium text-slate-300 mb-1">A팀 선택</label>
                                        <select id="teamA-select" value={selectedTeamAKey} onChange={e => handleSelectTeam(e.target.value, 'A')} className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">-- 팀 선택 --</option>
                                            {filteredTeams.map(t => <option key={t.key} value={t.key} disabled={t.key === selectedTeamBKey}>{t.teamName}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label htmlFor="teamB-select" className="block text-sm font-medium text-slate-300 mb-1">B팀 선택</label>
                                        <select id="teamB-select" value={selectedTeamBKey} onChange={e => handleSelectTeam(e.target.value, 'B')} className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-red-500">
                                            <option value="">-- 팀 선택 --</option>
                                            {filteredTeams.map(t => <option key={t.key} value={t.key} disabled={t.key === selectedTeamAKey}>{t.teamName}</option>)}
                                        </select>
                                     </div>
                                 </div>
                                 <p className="text-xs text-slate-500 mt-2">* '팀 구성하기'에서 저장된 팀만 선택할 수 있습니다.</p>
                            </div>
                        ) : (
                             <p className="text-center text-slate-400 p-2 bg-slate-800/50 rounded-lg">선택한 반에 저장된 팀 데이터가 없습니다.</p>
                        )}
                        
                        <div className="flex justify-end items-center pt-4">
                            <button type="submit" className="bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-3 px-8 rounded-lg transition duration-200 text-lg" disabled={!selectedTeamAKey || !selectedTeamBKey}>
                                출전 선수 선택하기
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