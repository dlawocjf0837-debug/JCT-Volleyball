import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { PlayIcon, PauseIcon, VolleyballIcon, StopwatchIcon, QuestionMarkCircleIcon } from '../components/icons.tsx';
import RulesModal from '../components/RulesModal.tsx';
import TimeoutModal from '../components/TimeoutModal.tsx';

interface ScoreboardProps {
    onBackToMenu: () => void;
    mode: 'record' | 'referee';
}

export const ScoreboardScreen: React.FC<ScoreboardProps> = ({ onBackToMenu, mode }) => {
    const { 
        matchState, matchTime, timerOn, dispatch, setTimerOn,
        p2p,
        matchHistory, saveMatchHistory, showToast, endSession
    } = useData();

    const [showRulesModal, setShowRulesModal] = useState(false);

    useEffect(() => {
        // Auto-start timer when game begins (first serve is set)
        if (matchState?.servingTeam && !timerOn && matchTime === 0 && !matchState.gameOver) {
            setTimerOn(true);
        }
    }, [matchState?.servingTeam, timerOn, matchTime, matchState?.gameOver, setTimerOn]);
    
    // Host-only effect to manage the timeout countdown
    useEffect(() => {
        if (!p2p.isHost || !matchState?.timeout) {
            return;
        }

        const timerId = setInterval(() => {
            const newTimeLeft = matchState.timeout.timeLeft - 1;
            if (newTimeLeft >= 0) {
                dispatch({ type: 'UPDATE_TIMEOUT_TIMER', timeLeft: newTimeLeft });
            } else {
                dispatch({ type: 'END_TIMEOUT' });
                showToast('작전 타임이 종료되었습니다.', 'success');
                if (!matchState.gameOver) {
                    setTimerOn(true); // Resume game timer automatically
                }
            }
        }, 1000);

        return () => clearInterval(timerId);
    }, [p2p.isHost, matchState?.timeout, dispatch, setTimerOn, matchState?.gameOver, showToast]);


    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const seconds = (timeInSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const handleTimeout = (team: 'A' | 'B') => {
        const teamState = team === 'A' ? matchState?.teamA : matchState?.teamB;
        if (teamState && teamState.timeouts > 0 && !matchState?.gameOver && !matchState.timeout) {
            setTimerOn(false); // Pause game clock
            dispatch({ type: 'TAKE_TIMEOUT', team });
            showToast(`${teamState.name} 작전 타임 사용!`, 'success');
        }
    };
    
    const handleSaveFinalResult = async () => {
        if (!matchState) return;
        const finalResult = { ...matchState, status: 'completed' as const, date: new Date().toISOString(), time: matchTime };
        const newHistory = [finalResult, ...matchHistory];
        await saveMatchHistory(newHistory);
        showToast('최종 경기 기록이 저장되었습니다!', 'success');
        endSession(); // End the P2P session on game completion
    };

    const handleCloseTimeout = () => {
        dispatch({ type: 'END_TIMEOUT' });
        if (matchState && !matchState.gameOver) {
            setTimerOn(true); // Resume game clock if closed manually
        }
    };

    if (!matchState) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-slate-400">경기 정보를 불러오는 중...</p>
                    <button onClick={onBackToMenu} className="mt-4 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                        메뉴로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const TeamColumn: React.FC<{ teamKey: 'A' | 'B' }> = ({ teamKey }) => {
        const team = teamKey === 'A' ? matchState.teamA : matchState.teamB;
        const isServing = matchState.servingTeam === teamKey;
        const color = teamKey === 'A' ? 'border-sky-500' : 'border-red-500';
        const servingClasses = isServing && !matchState.gameOver ? 'glowing-border' : 'border-solid border-slate-700';

        return (
            <div className={`p-4 flex flex-col items-center gap-4 bg-slate-900/50 rounded-lg border-2 transition-all duration-300 ${servingClasses}`}>
                <h2 className={`text-3xl font-bold text-center truncate ${color.replace('border', 'text')}`}>{team.name}</h2>
                <div className="text-9xl font-extrabold">{team.score}</div>
                <div className="flex gap-4">
                    <button onClick={() => dispatch({type: 'SCORE', team: teamKey, amount: 1})} disabled={matchState.gameOver || !!matchState.timeout} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">+</button>
                    <button onClick={() => dispatch({type: 'SCORE', team: teamKey, amount: -1})} disabled={matchState.gameOver || !!matchState.timeout} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">-</button>
                </div>
                
                { !matchState.servingTeam && !matchState.gameOver && <button onClick={() => dispatch({type: 'SET_SERVING_TEAM', team: teamKey})} className="flex items-center gap-2 bg-[#00A3FF] hover:bg-[#0082cc] py-2 px-4 rounded-lg font-semibold"><VolleyballIcon className="w-5 h-5"/> 서브 시작</button> }
                { isServing && !matchState.gameOver && <div className="flex items-center gap-2 text-[#00A3FF] font-bold text-lg"><VolleyballIcon className="w-6 h-6"/> SERVE</div> }

                <div className="w-full space-y-3 mt-4 border-t border-slate-700 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => dispatch({type: 'SERVICE_ACE', team: teamKey})} disabled={!isServing || matchState.gameOver || !!matchState.timeout} className="bg-slate-700 hover:bg-slate-600 font-semibold py-2 px-4 rounded disabled:opacity-50">서브 득점</button>
                        <button onClick={() => dispatch({type: 'SERVICE_FAULT', team: teamKey})} disabled={!isServing || matchState.gameOver || !!matchState.timeout} className="w-full bg-slate-700 hover:bg-slate-600 font-semibold py-2 px-4 rounded disabled:opacity-50">서브 범실</button>
                        <button onClick={() => dispatch({type: 'SPIKE_SUCCESS', team: teamKey})} disabled={matchState.gameOver || !!matchState.timeout} className="w-full bg-slate-700 hover:bg-slate-600 font-semibold py-2 px-4 rounded disabled:opacity-50">스파이크 성공</button>
                        <button onClick={() => dispatch({type: 'BLOCKING_POINT', team: teamKey})} disabled={matchState.gameOver || !!matchState.timeout} className="w-full bg-slate-700 hover:bg-slate-600 font-semibold py-2 px-4 rounded disabled:opacity-50">블로킹 득점</button>
                    </div>
                     <button onClick={() => handleTimeout(teamKey)} disabled={team.timeouts === 0 || matchState.gameOver || !!matchState.timeout} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"><StopwatchIcon className="w-5 h-5" /> 작전 타임 ({team.timeouts})</button>
                    <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                        <span className="font-semibold">페어플레이</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => dispatch({type: 'ADJUST_FAIR_PLAY', team: teamKey, amount: -1})} disabled={matchState.gameOver || !!matchState.timeout} className="w-8 h-8 rounded-full bg-slate-600 disabled:opacity-50">-</button>
                            <span className="font-mono text-lg w-8 text-center">{team.fairPlay}</span>
                            <button onClick={() => dispatch({type: 'ADJUST_FAIR_PLAY', team: teamKey, amount: 1})} disabled={matchState.gameOver || !!matchState.timeout} className="w-8 h-8 rounded-full bg-slate-600 disabled:opacity-50">+</button>
                        </div>
                    </div>
                     <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                        <span className="font-semibold">3단 플레이</span>
                        <div className="flex items-center gap-2">
                             <span className="font-mono text-lg w-8 text-center">{team.threeHitPlays}</span>
                            <button onClick={() => dispatch({type: 'INCREMENT_3_HIT', team: teamKey})} disabled={matchState.gameOver || !!matchState.timeout} className="w-8 h-8 rounded-full bg-slate-600 disabled:opacity-50">+</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 flex-grow animate-fade-in relative">
            {matchState.timeout && p2p.isHost && (
                <TimeoutModal 
                    timeLeft={matchState.timeout.timeLeft} 
                    onClose={handleCloseTimeout} 
                />
            )}
            {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
            
            <button onClick={() => setShowRulesModal(true)} className="absolute top-0 right-0 p-2 text-slate-400 hover:text-white transition-colors" aria-label="규칙 보기">
                <QuestionMarkCircleIcon className="w-8 h-8" />
            </button>
            
            <div className="text-center bg-slate-900/50 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 items-center gap-2">
                <div className="flex items-center justify-center md:justify-start gap-4">
                     <button onClick={() => setTimerOn(!timerOn)} disabled={matchState.gameOver || !!matchState.timeout}>
                        {timerOn ? <PauseIcon className={`w-8 h-8 ${matchState.gameOver || !!matchState.timeout ? 'text-slate-600' : 'text-yellow-500 hover:text-yellow-400'}`}/> : <PlayIcon className={`w-8 h-8 ${matchState.gameOver || !!matchState.timeout ? 'text-slate-600' : 'text-green-500 hover:text-green-400'}`}/>}
                    </button>
                    <p className="text-2xl font-mono">경기 시간: {formatTime(matchTime)}</p>
                </div>
                <div className="text-center">
                    {matchState.isDeuce && !matchState.gameOver && <p className="text-yellow-400 font-bold text-lg animate-pulse mt-2 md:mt-0">듀스! 2점 차로 승리!</p>}
                </div>
                 {p2p.isHost && (
                    <div className="flex items-center justify-center md:justify-end gap-2 mt-2 md:mt-0">
                        {matchState.gameOver && mode === 'record' ? (
                            <button onClick={handleSaveFinalResult} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg">
                                최종 기록 저장
                            </button>
                        ) : p2p.sessionId && (
                             <div className="text-center bg-slate-800 p-2 rounded-lg">
                                 <label className="text-xs text-slate-400">참여 코드</label>
                                 <p className="font-mono text-lg text-white tracking-widest">{p2p.sessionId}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {matchState.gameOver && (
                <div className="text-center bg-[#00A3FF]/20 border border-[#00A3FF] p-4 rounded-lg">
                    <h3 className="text-2xl font-bold text-[#00A3FF]">경기 종료! 최종 승자: {matchState.winner === 'A' ? matchState.teamA.name : matchState.teamB.name}!</h3>
                    <p className="text-lg mt-1">{matchState.teamA.name} {matchState.teamA.score} : {matchState.teamB.score} {matchState.teamB.name}</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
                <TeamColumn teamKey="A" />
                <TeamColumn teamKey="B" />
            </div>
        </div>
    );
};