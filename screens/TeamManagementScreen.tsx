import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { SavedTeamInfo, Player } from '../types';
import EmblemModal from '../components/EmblemModal';
import TeamEmblem from '../components/TeamEmblem';
// FIX: Changed to a named import to match the export from TeamProfileCardModal.
import { TeamProfileCardModal } from '../components/TeamProfileCardModal';
import { IdentificationIcon } from '../components/icons';

interface TeamWithSetId extends SavedTeamInfo {
    setId: string;
    key: string; // "setId___teamName"
}

type Config = SavedTeamInfo & { key: string };

const TEAM_COLORS_PALETTE = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#f472b6', '#06b6d4', '#f59e0b'];

const TeamManagementScreen: React.FC = () => {
    const { teamSets, saveTeamSets, showToast } = useData();
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [configs, setConfigs] = useState<Record<string, Config>>({});
    const [isEmblemModalOpen, setIsEmblemModalOpen] = useState(false);
    const [currentTargetTeamKey, setCurrentTargetTeamKey] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [viewingProfileTeam, setViewingProfileTeam] = useState<{ team: SavedTeamInfo, players: Player[] } | null>(null);


    useEffect(() => {
        const initialConfigs: Record<string, Config> = {};
        teamSets.forEach(set => {
            set.teams.forEach(team => {
                const key = `${set.id}___${team.teamName}`;
                initialConfigs[key] = { ...team, key };
            });
        });
        setConfigs(initialConfigs);
    }, [teamSets]);

    const availableClasses = useMemo(() => {
        const classSet = new Set<string>();
        teamSets.forEach(set => {
            if (set.className) classSet.add(set.className);
        });
        return Array.from(classSet).sort((a, b) => a.localeCompare(b));
    }, [teamSets]);

    const teamsInClass = useMemo((): TeamWithSetId[] => {
        if (!selectedClass) return [];
        const teams: TeamWithSetId[] = [];
        teamSets.forEach(set => {
            if (set.className === selectedClass) {
                set.teams.forEach(team => teams.push({ ...team, setId: set.id, key: `${set.id}___${team.teamName}` }));
            }
        });
        return teams.sort((a, b) => a.teamName.localeCompare(b.teamName));
    }, [teamSets, selectedClass]);

    const colorConflicts = useMemo(() => {
        const conflicts = new Map<string, string[]>();
        const colorMap = new Map<string, string[]>();
        teamsInClass.forEach(team => {
            const color = configs[team.key]?.color;
            if (color) {
                if (!colorMap.has(color)) colorMap.set(color, []);
                colorMap.get(color)?.push(team.teamName);
            }
        });
        colorMap.forEach((teams, color) => {
            if (teams.length > 1) {
                teams.forEach(teamName => conflicts.set(teamName, teams.filter(t => t !== teamName)));
            }
        });
        return conflicts;
    }, [configs, teamsInClass]);

    const handleConfigChange = (key: string, field: keyof SavedTeamInfo, value: any) => {
        setConfigs(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
    };

    const handleSave = async () => {
        try {
            const updatedTeamSets = teamSets.map(set => {
                const updatedTeams = set.teams.map(team => {
                    const key = `${set.id}___${team.teamName}`;
                    if (configs[key]) {
                        const { key: _key, ...configToSave } = configs[key];
                        return configToSave;
                    }
                    return team;
                });
                return { ...set, teams: updatedTeams };
            });
            await saveTeamSets(updatedTeamSets, "모든 변경사항이 저장되었습니다.");
        } catch (error) {
            // Error toast is shown in saveTeamSets
        }
    };

    const handleEmblemSelect = (emblem: string) => {
        if (currentTargetTeamKey) {
            handleConfigChange(currentTargetTeamKey, 'emblem', emblem);
        }
        setIsEmblemModalOpen(false);
        setCurrentTargetTeamKey(null);
    };

    const handleViewProfile = (teamKey: string) => {
        const config = configs[teamKey];
        const [setId] = teamKey.split('___');
        const set = teamSets.find(s => s.id === setId);
        if (config && set) {
            const players = config.playerIds.map(id => set.players[id]).filter(Boolean);
            setViewingProfileTeam({ team: config, players });
            setIsProfileModalOpen(true);
        }
    };

    return (
        <>
            <EmblemModal
                isOpen={isEmblemModalOpen}
                onClose={() => setIsEmblemModalOpen(false)}
                onSelect={handleEmblemSelect}
            />
            {viewingProfileTeam && (
                 <TeamProfileCardModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    team={viewingProfileTeam.team}
                    players={viewingProfileTeam.players}
                />
            )}
            <div className="max-w-4xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-2xl space-y-6 animate-fade-in">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex-grow">
                        <label htmlFor="class-select" className="block text-sm font-bold text-slate-300 mb-2">
                            1. 반 선택
                        </label>
                        <select
                            id="class-select"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="">-- 반을 선택해주세요 --</option>
                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="self-end">
                         <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-base">모두 저장하기</button>
                    </div>
                </div>

                {selectedClass && (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-300 border-b border-slate-700 pb-2">
                            {selectedClass} 팀 관리
                        </h3>
                        {teamsInClass.length > 0 ? (
                            <div className="space-y-4">
                                {teamsInClass.map((team) => {
                                    const config = configs[team.key];
                                    if (!config) return null;
                                    const conflict = colorConflicts.get(team.teamName);
                                    return (
                                    <div key={team.key} className="bg-slate-800 p-4 rounded-lg space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                                <button 
                                                    onClick={() => { setCurrentTargetTeamKey(team.key); setIsEmblemModalOpen(true); }}
                                                    className="w-20 h-20 bg-slate-900 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600 hover:border-sky-500 transition-colors"
                                                    aria-label={`${team.teamName} 앰블럼 변경`}
                                                >
                                                    <TeamEmblem emblem={config.emblem} color={config.color} className="w-16 h-16"/>
                                                </button>
                                                <button onClick={() => handleViewProfile(team.key)} className="w-full flex items-center justify-center gap-1 text-xs bg-sky-700 hover:bg-sky-600 text-white font-semibold py-1 px-2 rounded-md">
                                                     <IdentificationIcon className="w-4 h-4" />
                                                    프로필
                                                </button>
                                            </div>
                                            <div className="flex-grow space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-semibold text-xl" style={{ color: config.color || '#cbd5e1' }}>{team.teamName}</h4>
                                                    {conflict && <span className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-md">'{conflict.join(', ')}'팀과 색상 중복</span>}
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1">팀 색상</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {TEAM_COLORS_PALETTE.map(color => (
                                                            <button 
                                                                key={color}
                                                                onClick={() => handleConfigChange(team.key, 'color', color)}
                                                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${config.color === color ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
                                                                style={{ backgroundColor: color }}
                                                                aria-label={`주 색상 ${color} 선택`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pt-3 border-t border-slate-700">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">팀 슬로건</label>
                                                <input type="text" placeholder="팀의 슬로건을 입력하세요." value={config.slogan || ''} onChange={(e) => handleConfigChange(team.key, 'slogan', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm text-slate-400 w-20 flex-shrink-0">응원가 1</label>
                                                <input type="text" placeholder="응원가 1 URL" value={config.cheerUrl || ''} onChange={(e) => handleConfigChange(team.key, 'cheerUrl', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="text" placeholder="응원가 2 이름" value={config.cheerName2 || ''} onChange={(e) => handleConfigChange(team.key, 'cheerName2', e.target.value)} className="w-28 flex-shrink-0 bg-slate-900 border border-slate-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
                                                <input type="text" placeholder="응원가 2 URL" value={config.cheerUrl2 || ''} onChange={(e) => handleConfigChange(team.key, 'cheerUrl2', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
                                            </div>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 p-4 bg-slate-800/50 rounded-lg">
                                선택한 반에 저장된 팀이 없습니다. 먼저 '팀 구성하기'에서 팀을 생성하고 저장해주세요.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default TeamManagementScreen;