import React from 'react';
import { Player, Team, TeamSet } from '../types';
import { useData } from '../contexts/DataContext';
import { CrownIcon } from './icons';
import TeamEmblem from './TeamEmblem';

interface FinalTeamsScreenProps {
    teams: Team[];
    players: Record<string, Player>;
    onReset: () => void;
    selectedClass: string;
}

const FinalTeamsScreen: React.FC<FinalTeamsScreenProps> = ({ teams, players, onReset, selectedClass }) => {
    const { teamSets, saveTeamSets } = useData();

    const handleSaveData = async () => {
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
                color: team.color,
                emblem: 'icon_volleyball',
                slogan: '', // Initialize with empty slogan
            })),
            players: playersInSet,
        };

        const updatedTeamSets = [...teamSets, newTeamSet];
        await saveTeamSets(updatedTeamSets, `${newTeamSet.className} 팀 데이터가 저장되었습니다.`);
    };

    return (
        <div className="max-w-7xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-2xl space-y-8 animate-fade-in">
            <div className="text-center">
                <h2 className="text-4xl font-bold text-[#00A3FF]">최종 팀 구성 결과</h2>
                <p className="text-slate-400 mt-2">드래프트가 완료되었습니다. 데이터를 저장하여 경기에 사용하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {teams.map(team => {
                    const teamPlayers = team.playerIds.map(id => players[id]).filter(Boolean);
                    const captain = teamPlayers.find(p => p.isCaptain);
                    // Shuffle non-captain players randomly
                    const otherPlayers = [...teamPlayers.filter(p => !p.isCaptain)].sort(() => Math.random() - 0.5);
                    const finalPlayerList = captain ? [captain, ...otherPlayers] : otherPlayers;

                    return (
                        <div key={team.id} className="bg-slate-900/70 rounded-xl p-5 border-2 border-solid flex flex-col" style={{ borderColor: team.color }}>
                            <div className="flex flex-col items-center mb-4">
                                <TeamEmblem emblem={team.emblem || 'icon_volleyball'} color={team.color} className="w-16 h-16 mb-2" />
                                <h3 className="text-2xl font-bold text-center truncate" style={{ color: team.color }}>{team.name}</h3>
                            </div>
                            <ul className="space-y-3 flex-grow">
                                {finalPlayerList.map(player => (
                                    <li key={player.id} className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
                                        {player.isCaptain && <CrownIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />}
                                        <div className="flex-grow min-w-0">
                                            <p className="font-semibold text-lg text-slate-200 truncate">{player.originalName}</p>
                                            <p className="text-sm text-slate-400">{player.class}반 {player.studentNumber}번</p>
                                        </div>
                                        <span className="text-xs font-mono bg-slate-700 text-[#99dfff] px-2 py-1 rounded-full flex-shrink-0">{player.totalScore.toFixed(1)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg text-center">
                <p className="text-slate-300">
                    팀의 앰블럼, 색상, 응원가를 변경하려면 '팀 관리' 메뉴를 이용해주세요.
                </p>
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
