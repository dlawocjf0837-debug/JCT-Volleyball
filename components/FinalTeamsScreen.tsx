import React, { useState, useEffect } from 'react';
import { Player, Team, TeamSet } from '../types.ts';
import { useData } from '../contexts/DataContext.tsx';
import { CrownIcon } from './icons.tsx';

interface FinalTeamsScreenProps {
    teams: Team[];
    players: Record<string, Player>;
    onReset: () => void;
    selectedClass: string;
}

const FinalTeamsScreen: React.FC<FinalTeamsScreenProps> = ({ teams, players, onReset, selectedClass }) => {
    const { teamSets, saveTeamSets, showToast } = useData();
    const [cheerUrls, setCheerUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        const sampleCheerUrls = [
            "https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/main/cheer1.mp3",
            "https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/main/cheer2.mp3",
            "https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/main/cheer3.mp3",
            "https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/main/cheer4.mp3",
        ];

        const initialUrls: Record<string, string> = {};
        teams.forEach((team, index) => {
            if (team && team.id) {
                initialUrls[team.id] = sampleCheerUrls[index % sampleCheerUrls.length];
            }
        });
        setCheerUrls(initialUrls);
    }, [teams]);

    const handleCheerUrlChange = (teamId: string, url: string) => {
        setCheerUrls(prev => ({ ...prev, [teamId]: url }));
    };

    const handleSaveData = () => {
        try {
            const allPlayerIdsInSet = new Set<string>();
            teams.forEach(team => {
                team.playerIds.forEach(id => allPlayerIdsInSet.add(id));
            });
            
            const playersInSet: Record<string, Player> = {};
            allPlayerIdsInSet.forEach(id => {
                if (players[id]) {
                    playersInSet[id] = players[id];
                }
            });

            const newTeamSet: TeamSet = {
                id: `set_${Date.now()}`,
                className: selectedClass === 'all' ? '전체' : `${selectedClass}반`,
                savedAt: new Date().toISOString(),
                teams: teams.map(team => ({
                    teamName: team.name,
                    captainId: team.captainId,
                    playerIds: team.playerIds,
                    cheerUrl: cheerUrls[team.id] || '',
                })),
                players: playersInSet,
            };

            const updatedTeamSets = [...teamSets, newTeamSet];
            saveTeamSets(updatedTeamSets);
            
            const classNameForMessage = selectedClass === 'all' ? '전체' : `${selectedClass}반`;
            showToast(`${classNameForMessage} 팀 데이터가 성공적으로 저장되었습니다!`, 'success');
        } catch (error) {
            console.error("Error saving team data:", error);
            showToast("데이터 저장 중 오류가 발생했습니다.", 'error');
        }
    };


    return (
        <div className="max-w-7xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-2xl space-y-8 animate-fade-in">
            <div className="text-center">
                <h2 className="text-4xl font-bold text-[#00A3FF]">최종 팀 구성 결과</h2>
                <p className="text-slate-400 mt-2">드래프트가 완료되었습니다. 최종 팀 구성을 확인하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {teams.map(team => {
                    return (
                        <div key={team.id} className="bg-slate-900/70 rounded-xl p-5 border-2 border-solid flex flex-col" style={{ borderColor: team.color }}>
                            <h3 className="text-2xl font-bold mb-4 text-center truncate" style={{ color: team.color }}>{team.name}</h3>
                            <ul className="space-y-3 flex-grow">
                                {team.playerIds
                                    .map(id => players[id])
                                    .filter(Boolean)
                                    .sort((a,b) => b.isCaptain ? 1 : -1) // Captain always on top
                                    .map(player => (
                                        <li key={player.id} className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
                                            {player.isCaptain && <CrownIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />}
                                            <div className="flex-grow min-w-0">
                                                <p className="font-semibold text-lg text-slate-200 truncate">{player.originalName}</p>
                                                <p className="text-sm text-slate-400">{player.class}반 {player.studentNumber}번</p>
                                            </div>
                                            <span className="text-xs font-mono bg-slate-700 text-[#99dfff] px-2 py-1 rounded-full flex-shrink-0">{player.totalScore.toFixed(1)}</span>
                                        </li>
                                    ))
                                }
                            </ul>
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <label htmlFor={`cheer-url-${team.id}`} className="block text-sm font-medium text-slate-400 mb-1">
                                    응원가 URL 입력
                                </label>
                                <input
                                    id={`cheer-url-${team.id}`}
                                    type="text"
                                    placeholder="GitHub Raw 링크 등"
                                    value={cheerUrls[team.id] || ''}
                                    onChange={(e) => handleCheerUrlChange(team.id, e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center items-center gap-4 pt-4">
                 <button
                    onClick={handleSaveData}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition duration-200 text-lg"
                >
                    데이터 저장
                </button>
                <button
                    onClick={onReset}
                    className="bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-3 px-8 rounded-lg transition duration-200 text-lg"
                >
                    새로 시작하기
                </button>
            </div>
        </div>
    );
};

export default FinalTeamsScreen;