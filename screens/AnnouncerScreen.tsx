import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Player, MatchState, SavedTeamInfo } from '../types';
import StatModal from '../components/StatModal';
import { CrownIcon, QuestionMarkCircleIcon, VolleyballIcon } from '../components/icons';
import CommentaryGuideModal from '../components/CommentaryGuideModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TeamEmblem from '../components/TeamEmblem';

interface AnnouncerScreenProps {
    onNavigateToHistory: () => void;
}

const SoundPanel: React.FC<{ matchState: MatchState | null }> = ({ matchState }) => {
    const audioRefs = {
        bgm1: useRef<HTMLAudioElement>(null),
        bgm2: useRef<HTMLAudioElement>(null),
        timeout: useRef<HTMLAudioElement>(null),
        cheer: useRef<HTMLAudioElement>(null),
        end: useRef<HTMLAudioElement>(null),
        teamACheer: useRef<HTMLAudioElement>(null),
        teamBCheer: useRef<HTMLAudioElement>(null),
        teamACheer2: useRef<HTMLAudioElement>(null),
        teamBCheer2: useRef<HTMLAudioElement>(null),
    };
    const [playingSound, setPlayingSound] = useState<keyof typeof audioRefs | null>(null);

    const handleSoundToggle = useCallback((soundKey: keyof typeof audioRefs) => {
        Object.entries(audioRefs).forEach(([key, ref]) => {
            if (key !== soundKey && ref.current && !ref.current.paused) {
                ref.current.pause();
                ref.current.currentTime = 0;
            }
        });

        const audioToToggle = audioRefs[soundKey].current;
        if (!audioToToggle) return;
        
        if (playingSound === soundKey) {
            audioToToggle.pause();
            audioToToggle.currentTime = 0;
            setPlayingSound(null);
        } else {
            const isLooping = ['bgm1', 'bgm2', 'teamACheer', 'teamBCheer', 'teamACheer2', 'teamBCheer2'].includes(soundKey);
            audioToToggle.loop = isLooping;
            audioToToggle.play().catch(e => console.error(`Audio play failed for ${soundKey}:`, e));
            setPlayingSound(soundKey);
        }
    }, [playingSound, audioRefs]);

    const { teamA, teamB } = matchState || {};

    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            <audio ref={audioRefs.bgm1} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/start.wav" preload="auto"></audio>
            <audio ref={audioRefs.bgm2} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/start2.mp3" preload="auto"></audio>
            <audio ref={audioRefs.timeout} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/Timsong.mp3" preload="auto"></audio>
            <audio ref={audioRefs.cheer} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/crowd-cheering-379666.mp3" preload="auto"></audio>
            <audio ref={audioRefs.end} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/end.wav" preload="auto"></audio>
            {teamA?.cheerUrl && <audio ref={audioRefs.teamACheer} src={teamA.cheerUrl} preload="auto"></audio>}
            {teamB?.cheerUrl && <audio ref={audioRefs.teamBCheer} src={teamB.cheerUrl} preload="auto"></audio>}
            {teamA?.cheerUrl2 && <audio ref={audioRefs.teamACheer2} src={teamA.cheerUrl2} preload="auto"></audio>}
            {teamB?.cheerUrl2 && <audio ref={audioRefs.teamBCheer2} src={teamB.cheerUrl2} preload="auto"></audio>}
            
            <button onClick={() => handleSoundToggle('bgm1')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'bgm1' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
                {playingSound === 'bgm1' ? '음악 중지' : '경기 시작1'}
            </button>
             <button onClick={() => handleSoundToggle('bgm2')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'bgm2' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
                {playingSound === 'bgm2' ? '음악 중지' : '경기 시작2'}
            </button>
            <button onClick={() => handleSoundToggle('timeout')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'timeout' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-500'}`}>
                {playingSound === 'timeout' ? '음악 중지' : '작전 타임 노래'}
            </button>
            <button onClick={() => handleSoundToggle('cheer')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'cheer' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
                {playingSound === 'cheer' ? '음악 중지' : '환호'}
            </button>
            <button onClick={() => handleSoundToggle('end')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'end' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-500'}`}>
                {playingSound === 'end' ? '음악 중지' : '경기 종료'}
            </button>
            {teamA?.cheerUrl && teamA.name && (
                <button onClick={() => handleSoundToggle('teamACheer')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'teamACheer' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-sky-500 hover:bg-sky-400'}`}>
                    {playingSound === 'teamACheer' ? '응원가 중지' : `${teamA.name} 응원가 1`}
                </button>
            )}
            {teamB?.cheerUrl && teamB.name && (
                 <button onClick={() => handleSoundToggle('teamBCheer')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'teamBCheer' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-400'}`}>
                    {playingSound === 'teamBCheer' ? '응원가 중지' : `${teamB.name} 응원가 1`}
                </button>
            )}
            {teamA?.cheerUrl2 && teamA.name && (
                <button onClick={() => handleSoundToggle('teamACheer2')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'teamACheer2' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-sky-500 hover:bg-sky-400'}`}>
                    {playingSound === 'teamACheer2' ? '응원가 중지' : `${teamA.name} ${teamA.cheerName2 || '응원가 2'}`}
                </button>
            )}
            {teamB?.cheerUrl2 && teamB.name && (
                 <button onClick={() => handleSoundToggle('teamBCheer2')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'teamBCheer2' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-400'}`}>
                    {playingSound === 'teamBCheer2' ? '응원가 중지' : `${teamB.name} ${teamB.cheerName2 || '응원가 2'}`}
                </button>
            )}
        </div>
    );
};

const ScoreTrendChart: React.FC<{ match: MatchState }> = ({ match }) => {
    const chartData = useMemo(() => {
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
                    <XAxis dataKey="point" label={{ value: '진행', position: 'insideBottom', offset: -10 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                    <Legend verticalAlign="top" />
                    <Line type="monotone" dataKey={match.teamA.name} stroke={match.teamA.color || "#38bdf8"} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={match.teamB.name} stroke={match.teamB.color || "#f87171"} strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

interface TeamData {
    info: SavedTeamInfo;
    players: Record<string, Player>;
}

interface AllTeamInfo {
    teams: Record<string, TeamData>;
}

const LiveGameDisplay: React.FC<{ match: MatchState, allTeamInfo: AllTeamInfo }> = ({ match, allTeamInfo }) => {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [showGuideModal, setShowGuideModal] = useState(false);

    if (!match || typeof match !== 'object' || !match.teamA || typeof match.teamA !== 'object' || !match.teamB || typeof match.teamB !== 'object') {
        return (
            <div className="flex-grow flex items-center justify-center">
                <p className="text-red-500 text-lg">오류: 표시할 경기 데이터가 올바르지 않습니다.</p>
            </div>
        );
    }

    const teamAInfo = match.teamA.key ? allTeamInfo.teams[match.teamA.key]?.info : null;
    const teamBInfo = match.teamB.key ? allTeamInfo.teams[match.teamB.key]?.info : null;

    const TeamRoster: React.FC<{ team: typeof match.teamA, teamInfo: SavedTeamInfo | null }> = ({ team, teamInfo }) => {
        const teamColor = team.color || '#cbd5e1';
        
        if (!team.players || Object.values(team.players).length === 0) {
            return (
                <div className="bg-slate-900/50 p-4 rounded-lg border-2 h-full flex items-center justify-center text-center" style={{ borderColor: teamColor }}>
                    <p className="text-slate-400">선수 명단 정보 없음<br/>(수동 생성 팀)</p>
                </div>
            );
        }

        const sortedPlayers = Object.values(team.players).sort((a, b) => {
            const aIsCaptain = teamInfo ? a.id === teamInfo.captainId : false;
            const bIsCaptain = teamInfo ? b.id === teamInfo.captainId : false;
            if (aIsCaptain !== bIsCaptain) {
                return bIsCaptain ? 1 : -1;
            }
            return a.originalName.localeCompare(b.originalName);
        });

        return (
            <div className="bg-slate-900/50 p-4 rounded-lg border-2 h-full" style={{ borderColor: teamColor }}>
                <div className="flex flex-col items-center text-center gap-2 mb-4">
                    <TeamEmblem emblem={team.emblem} color={teamColor} className="w-10 h-10" />
                    <div>
                        <h3 className="text-2xl font-bold text-white">{team.name}</h3>
                        {team.slogan && <p className="text-sm italic" style={{ color: teamColor }}>"{team.slogan}"</p>}
                    </div>
                </div>
                <ul className="space-y-2">
                    {sortedPlayers.map(player => {
                        const isCaptain = teamInfo ? player.id === teamInfo.captainId : false;
                        return (
                            <li key={player.id} onClick={() => setSelectedPlayer(player)} className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                                {isCaptain && <CrownIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
                                <span className="font-semibold text-slate-200 truncate">{player.originalName}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        )
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in flex-grow">
            {showGuideModal && <CommentaryGuideModal onClose={() => setShowGuideModal(false)} />}
            {selectedPlayer && <StatModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} showRealNames={true} />}
            
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-6">
                <TeamRoster team={match.teamA} teamInfo={teamAInfo} />
                <div className="bg-slate-900/50 p-4 rounded-lg flex flex-col items-center justify-center gap-4 text-center">
                    <h2 className="text-4xl font-bold text-white">{match.teamA.name} vs {match.teamB.name}</h2>
                    <div className="flex items-center justify-center gap-6 my-4">
                        <span className="text-8xl font-extrabold" style={{ color: match.teamA.color || '#38bdf8' }}>{match.teamA.score}</span>
                        <span className="text-6xl font-bold text-slate-400">-</span>
                        <span className="text-8xl font-extrabold" style={{ color: match.teamB.color || '#f87171' }}>{match.teamB.score}</span>
                    </div>
                    {match.servingTeam && !match.gameOver && (
                        (() => {
                            const servingTeam = match.servingTeam === 'A' ? match.teamA : match.teamB;
                            return (
// FIX: Moved color styling to parent div to fix type error. VolleyballIcon inherits color via 'currentColor'.
                                <div className="flex items-center justify-center gap-2 mb-2 text-lg" style={{ color: servingTeam.color }}>
                                    <VolleyballIcon className="w-6 h-6 animate-pulse" />
                                    <span className="font-bold">
                                        {servingTeam.name} 서브
                                    </span>
                                </div>
                            );
                        })()
                    )}
                    {match.isDeuce && !match.gameOver && <p className="text-yellow-400 font-bold text-xl animate-pulse">듀스!</p>}
                    {match.gameOver && <p className="text-green-400 font-bold text-2xl">경기 종료!</p>}
                    <button onClick={() => setShowGuideModal(true)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 font-semibold py-2 px-4 rounded-lg">
                        <QuestionMarkCircleIcon className="w-5 h-5" />
                        해설 가이드 보기
                    </button>
                </div>
                <TeamRoster team={match.teamB} teamInfo={teamBInfo} />
            </div>
            {match.scoreHistory && match.scoreHistory.length > 1 && <ScoreTrendChart match={match} />}
        </div>
    );
};

const AnnouncerScreen: React.FC<AnnouncerScreenProps> = ({ onNavigateToHistory }) => {
    // FIX: Removed p2p from useData as it's not defined in the context.
    const { matchState, teamSets } = useData();

    const allTeamInfo = useMemo((): AllTeamInfo => {
        const teams: Record<string, TeamData> = {};
        teamSets.forEach(set => {
            set.teams.forEach(team => {
                const key = `${set.id}___${team.teamName}`;
                teams[key] = {
                    info: team,
                    players: set.players,
                };
            });
        });
        return { teams };
    }, [teamSets]);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 flex-grow">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-4 rounded-lg shadow-2xl">
                <SoundPanel matchState={matchState} />
            </div>

            {matchState ? (
                <LiveGameDisplay match={matchState} allTeamInfo={allTeamInfo} />
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-400">
                    <p className="text-2xl font-bold">진행 중인 경기가 없습니다.</p>
                    <p className="mt-2">호스트가 경기를 시작하면 데이터가 여기에 표시됩니다.</p>
                    {/* FIX: Removed line displaying session ID as p2p feature is not available. */}
                    <button onClick={onNavigateToHistory} className="mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">
                        지난 경기 기록 보기
                    </button>
                </div>
            )}
        </div>
    );
};

export default AnnouncerScreen;
