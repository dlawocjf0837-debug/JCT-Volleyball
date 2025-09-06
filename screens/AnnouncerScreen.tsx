import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { Player, MatchState, SavedTeamInfo } from '../types.ts';
import StatModal from '../components/StatModal.tsx';
import { CrownIcon, QuestionMarkCircleIcon } from '../components/icons.tsx';
import CommentaryGuideModal from '../components/CommentaryGuideModal.tsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnnouncerScreenProps {
    onNavigateToHistory: () => void;
}

// --- Sound Panel Component ---
// Moved outside the main component to prevent re-creation on every render.
const SoundPanel: React.FC<{ matchState: MatchState | null }> = ({ matchState }) => {
    const audioRefs = {
        bgm1: useRef<HTMLAudioElement>(null),
        bgm2: useRef<HTMLAudioElement>(null),
        timeout: useRef<HTMLAudioElement>(null),
        cheer: useRef<HTMLAudioElement>(null),
        end: useRef<HTMLAudioElement>(null),
        teamACheer: useRef<HTMLAudioElement>(null),
        teamBCheer: useRef<HTMLAudioElement>(null),
    };
    const [playingSound, setPlayingSound] = useState<keyof typeof audioRefs | null>(null);

    const handleSoundToggle = useCallback((soundKey: keyof typeof audioRefs) => {
        // Stop all other sounds first
        Object.entries(audioRefs).forEach(([key, ref]) => {
            if (key !== soundKey && ref.current && !ref.current.paused) {
                ref.current.pause();
                ref.current.currentTime = 0;
            }
        });

        const audioToToggle = audioRefs[soundKey].current;
        if (!audioToToggle) return;
        
        if (playingSound === soundKey) {
            // The clicked sound is already playing, so stop it.
            audioToToggle.pause();
            audioToToggle.currentTime = 0;
            setPlayingSound(null);
        } else {
            // A different sound or no sound was playing, so start this one.
            const isLooping = ['bgm1', 'bgm2', 'teamACheer', 'teamBCheer'].includes(soundKey);
            audioToToggle.loop = isLooping;
            audioToToggle.play().catch(e => console.error(`Audio play failed for ${soundKey}:`, e));
            setPlayingSound(soundKey);
        }
    }, [playingSound, audioRefs]);

    const teamACheerUrl = matchState?.teamA.cheerUrl;
    const teamBCheerUrl = matchState?.teamB.cheerUrl;

    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            {/* NOTE: 구글 드라이브 링크는 직접 재생이 안되므로, 작동하는 샘플 오디오 URL로 교체했습니다. 위 설명에 따라 GitHub 등에 업로드하여 얻은 직접 링크로 교체하여 사용하세요. */}
            <audio ref={audioRefs.bgm1} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/start.wav" preload="auto"></audio>
            <audio ref={audioRefs.bgm2} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/start2.mp3" preload="auto"></audio>
            <audio ref={audioRefs.timeout} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/Timsong.mp3" preload="auto"></audio>
            <audio ref={audioRefs.cheer} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/crowd-cheering-379666.mp3" preload="auto"></audio>
            <audio ref={audioRefs.end} src="https://github.com/dlawocjf0837-debug/Volleyball-sounds/raw/refs/heads/main/end.wav" preload="auto"></audio>
            {teamACheerUrl && <audio ref={audioRefs.teamACheer} src={teamACheerUrl} preload="auto"></audio>}
            {teamBCheerUrl && <audio ref={audioRefs.teamBCheer} src={teamBCheerUrl} preload="auto"></audio>}
            
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
            {teamACheerUrl && matchState?.teamA.name && (
                <button onClick={() => handleSoundToggle('teamACheer')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'teamACheer' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-sky-500 hover:bg-sky-400'}`}>
                    {playingSound === 'teamACheer' ? '응원가 중지' : `${matchState.teamA.name} 응원가`}
                </button>
            )}
            {teamBCheerUrl && matchState?.teamB.name && (
                 <button onClick={() => handleSoundToggle('teamBCheer')} className={`font-semibold py-2 px-3 rounded transition-colors text-sm text-white ${playingSound === 'teamBCheer' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-400'}`}>
                    {playingSound === 'teamBCheer' ? '응원가 중지' : `${matchState.teamB.name} 응원가`}
                </button>
            )}
        </div>
    );
};


// --- Score Trend Chart Component ---
// Moved outside the main component to prevent re-creation on every render.
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
                    <Line type="monotone" dataKey={match.teamA.name} stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={match.teamB.name} stroke="#f87171" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

// Moved outside for consistency and best practices.
const WaitingComponent: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg">
        <div className="text-center p-8 text-slate-400">
            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-sky-400 mx-auto mb-4"></div>
            <p className="text-lg">{message}</p>
            {message.includes('연결') 
                ? <p>호스트가 세션을 다시 시작하면 자동으로 연결됩니다.</p>
                : <p>잠시 후 자동으로 표시됩니다.</p>
            }
        </div>
    </div>
);


const AnnouncerScreen: React.FC<AnnouncerScreenProps> = ({ onNavigateToHistory }) => {
    const { teamSets, matchState, p2p } = useData();
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [showGuideModal, setShowGuideModal] = useState(false);

    const allPlayersAndTeams = useMemo(() => {
        const teams: Record<string, { info: SavedTeamInfo; players: Record<string, Player> }> = {};
        if (Array.isArray(teamSets)) {
            teamSets.forEach(set => {
                if (set && Array.isArray(set.teams)) {
                    set.teams.forEach(team => {
                        if (team && team.teamName && set.id && set.players) {
                            const key = `${set.id}___${team.teamName}`;
                            teams[key] = {
                                info: team,
                                players: set.players,
                            };
                        }
                    });
                }
            });
        }
        return { teams };
    }, [teamSets]);

    if (!p2p.isHost && !p2p.isConnected) {
        return <WaitingComponent message="호스트와의 연결이 끊어졌습니다." />;
    }

    if (!matchState) {
        return <WaitingComponent message="호스트로부터 경기 데이터를 기다리는 중..." />;
    }

    const teamAData = matchState.teamA.key ? allPlayersAndTeams.teams[matchState.teamA.key] : null;
    const teamBData = matchState.teamB.key ? allPlayersAndTeams.teams[matchState.teamB.key] : null;

    const allPlayers = useMemo(() => {
        let players: Record<string, Player> = {};
        if (teamAData) players = { ...players, ...teamAData.players };
        if (teamBData) players = { ...players, ...teamBData.players };
        return players;
    }, [teamAData, teamBData]);

    const handlePlayerClick = (player: Player) => setSelectedPlayer(player);
    
    const TeamRoster: React.FC<{ teamName: string; color: string; teamInfo: SavedTeamInfo | null }> = ({ teamName, color, teamInfo }) => {
        if (!teamInfo) {
            return (
                <div className="bg-slate-900/50 p-4 rounded-lg border-2 h-full flex items-center justify-center text-center" style={{ borderColor: color }}>
                    <p className="text-slate-400">선수 명단 정보 없음<br/>(수동 생성 팀)</p>
                </div>
            );
        }
        return (
            <div className="bg-slate-900/50 p-4 rounded-lg border-2 h-full" style={{ borderColor: color }}>
                <h3 className="text-2xl font-bold mb-4 text-center" style={{ color }}>{teamName}</h3>
                <ul className="space-y-2">
                    {teamInfo.playerIds.map(id => allPlayers[id]).filter(Boolean).sort((a,b) => (b.id === teamInfo.captainId ? 1 : -1) - (a.id === teamInfo.captainId ? 1 : -1)).map(player => (
                        <li key={player.id} onClick={() => handlePlayerClick(player)} className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                            {player.id === teamInfo.captainId && <CrownIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
                            <span className="font-semibold text-slate-200 truncate">{player.originalName}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 flex-grow animate-fade-in">
            {showGuideModal && <CommentaryGuideModal onClose={() => setShowGuideModal(false)} />}
            {selectedPlayer && <StatModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} showRealNames={true} />}
            
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-4 rounded-lg shadow-2xl">
                 <div className="flex justify-between items-center flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-slate-300">실시간 중계 화면</h2>
                    <div className="flex items-center gap-4">
                        <SoundPanel matchState={matchState} />
                        <button onClick={() => setShowGuideModal(true)} className="p-2 text-slate-400 hover:text-white" aria-label="해설 가이드 보기">
                            <QuestionMarkCircleIcon className="w-8 h-8" />
                        </button>
                        <button onClick={onNavigateToHistory} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg">과거 기록 보기</button>
                    </div>
                 </div>
            </div>

            <div className="flex flex-col gap-6 animate-fade-in flex-grow">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-6">
                    <TeamRoster teamName={matchState.teamA.name} color="#38bdf8" teamInfo={teamAData?.info || null} />

                    <div className="bg-slate-900/50 p-4 rounded-lg flex flex-col items-center justify-center gap-4 text-center">
                        <h2 className="text-4xl font-bold">{matchState.teamA.name} vs {matchState.teamB.name}</h2>
                        <div className="flex items-center justify-center gap-6 my-4">
                            <span className="text-8xl font-extrabold text-sky-400">{matchState.teamA.score}</span>
                            <span className="text-6xl font-bold">:</span>
                            <span className="text-8xl font-extrabold text-red-400">{matchState.teamB.score}</span>
                        </div>

                        {matchState.timeout && (
                            <div className="mt-2 bg-slate-800 p-3 rounded-lg animate-pulse border border-yellow-400 w-full">
                                <p className="text-xl font-bold text-yellow-300">
                                    {matchState.timeout.team === 'A' ? matchState.teamA.name : matchState.teamB.name} 작전 타임
                                </p>
                                <div className="flex items-center justify-center gap-4 mt-1">
                                    <p className="text-4xl font-mono">{matchState.timeout.timeLeft}</p>
                                    <button onClick={() => setShowGuideModal(true)} className="p-1 text-slate-400 hover:text-white" aria-label="해설 가이드 보기">
                                        <QuestionMarkCircleIcon className="w-7 h-7" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {matchState.gameOver && (
                             <div className="bg-yellow-400/20 border border-yellow-400 p-3 rounded-lg"><p className="text-2xl font-bold text-yellow-300">경기 종료!</p></div>
                        )}
                        {matchState.isDeuce && !matchState.gameOver && <p className="text-xl font-bold text-yellow-400 animate-pulse">듀스</p>}
                        
                        <div className="bg-slate-800 p-3 rounded-md text-slate-300">
                            <p>작전 타임: {matchState.teamA.name} ({matchState.teamA.timeouts}) / {matchState.teamB.name} ({matchState.teamB.timeouts})</p>
                            {matchState.servingTeam && !matchState.gameOver && <p>현재 서브: {matchState.servingTeam === 'A' ? matchState.teamA.name : matchState.teamB.name}</p>}
                        </div>
                    </div>

                    <TeamRoster teamName={matchState.teamB.name} color="#f87171" teamInfo={teamBData?.info || null} />
                </div>

                <div className="grid grid-cols-1 gap-6">
                   <ScoreTrendChart match={matchState} />
                </div>
            </div>
        </div>
    );
}

export default AnnouncerScreen;