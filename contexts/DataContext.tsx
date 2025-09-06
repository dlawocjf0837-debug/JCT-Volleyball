import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useReducer, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { MatchState, TeamSet } from '../types';

const TEAM_SETS_KEY = 'jct_volleyball_team_sets';
const MATCH_HISTORY_KEY = 'jct_volleyball_match_history';

// --- P2P and Match State Types ---
type P2PState = {
    peer: Peer | null;
    connections: DataConnection[];
    sessionId: string | null;
    isHost: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
};

type LiveMatchData = {
    match: MatchState | null; // Match can be null if no game is active
    time: number;
    teamSets: TeamSet[];
};

type ToastState = {
    message: string;
    type: 'success' | 'error';
};

// --- Match Reducer Logic (moved from ScoreboardScreen) ---
const SCORE_TO_WIN = 11;

const getInitialState = (teams: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string, teamACheerUrl?: string, teamBCheerUrl?: string }): MatchState => ({
    teamA: { name: teams.teamA, key: teams.teamAKey, cheerUrl: teams.teamACheerUrl, score: 0, setsWon: 0, timeouts: 2, fairPlay: 0, threeHitPlays: 0, serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0 },
    teamB: { name: teams.teamB, key: teams.teamBKey, cheerUrl: teams.teamBCheerUrl, score: 0, setsWon: 0, timeouts: 2, fairPlay: 0, threeHitPlays: 0, serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0 },
    servingTeam: null,
    currentSet: 1,
    isDeuce: false,
    gameOver: false,
    winner: null,
    scoreHistory: [{ a: 0, b: 0 }],
    scoreLocations: [],
    status: 'in_progress',
    timeout: null,
});

type Action =
    | { type: 'SCORE'; team: 'A' | 'B'; amount: number }
    | { type: 'SERVICE_ACE'; team: 'A' | 'B' }
    | { type: 'SERVICE_FAULT'; team: 'A' | 'B' }
    | { type: 'BLOCKING_POINT'; team: 'A' | 'B' }
    | { type: 'SPIKE_SUCCESS'; team: 'A' | 'B' }
    | { type: 'TAKE_TIMEOUT'; team: 'A' | 'B' }
    | { type: 'ADJUST_FAIR_PLAY'; team: 'A' | 'B'; amount: number }
    | { type: 'INCREMENT_3_HIT'; team: 'A' | 'B' }
    | { type: 'SET_SERVING_TEAM'; team: 'A' | 'B' }
    | { type: 'RESET_STATE' }
    | { type: 'LOAD_STATE'; state: MatchState }
    | { type: 'END_TIMEOUT' }
    | { type: 'UPDATE_TIMEOUT_TIMER'; timeLeft: number };

function matchReducer(state: MatchState | null, action: Action): MatchState | null {
    if (!state && action.type !== 'LOAD_STATE') return null;
    if (state && state.gameOver && !['LOAD_STATE', 'RESET_STATE'].includes(action.type)) return state;

    switch (action.type) {
        case 'LOAD_STATE':
            return action.state;
        case 'RESET_STATE':
            return null;
        default:
            if (!state) return null;
            let newState = { ...state };
            let scoreChanged = false;

            switch (action.type) {
                case 'SCORE': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    const newScore = Math.max(0, newState[target].score + action.amount);
                    if (newState[target].score !== newScore) {
                        newState[target] = { ...newState[target], score: newScore };
                        if (action.amount > 0) newState.servingTeam = action.team;
                        scoreChanged = true;
                    }
                    break;
                }
                // ... (other cases similar to ScoreboardScreen's reducer)
                 case 'SERVICE_ACE': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    newState[target] = { ...newState[target], score: newState[target].score + 1, serviceAces: newState[target].serviceAces + 1 };
                    newState.servingTeam = action.team;
                    scoreChanged = true;
                    break;
                }
                case 'SERVICE_FAULT': {
                    const faulting = action.team === 'A' ? 'teamA' : 'teamB';
                    const scoring = action.team === 'A' ? 'teamB' : 'teamA';
                    newState[faulting] = { ...newState[faulting], serviceFaults: newState[faulting].serviceFaults + 1 };
                    newState[scoring] = { ...newState[scoring], score: newState[scoring].score + 1 };
                    newState.servingTeam = action.team === 'A' ? 'B' : 'A';
                    scoreChanged = true;
                    break;
                }
                case 'BLOCKING_POINT': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    newState[target] = { ...newState[target], score: newState[target].score + 1, blockingPoints: newState[target].blockingPoints + 1 };
                    newState.servingTeam = action.team;
                    scoreChanged = true;
                    break;
                }
                case 'SPIKE_SUCCESS': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    newState[target] = { ...newState[target], score: newState[target].score + 1, spikeSuccesses: newState[target].spikeSuccesses + 1 };
                    newState.servingTeam = action.team;
                    scoreChanged = true;
                    break;
                }
                case 'TAKE_TIMEOUT': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    if (newState[target].timeouts > 0) {
                        newState[target] = { ...newState[target], timeouts: newState[target].timeouts - 1 };
                        newState.timeout = { team: action.team, timeLeft: 30 };
                    }
                    break;
                }
                case 'END_TIMEOUT': {
                    newState.timeout = null;
                    break;
                }
                case 'UPDATE_TIMEOUT_TIMER': {
                    if (newState.timeout) {
                        newState.timeout = { ...newState.timeout, timeLeft: action.timeLeft };
                    }
                    break;
                }
                case 'ADJUST_FAIR_PLAY': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    newState[target] = { ...newState[target], fairPlay: newState[target].fairPlay + action.amount };
                    break;
                }
                case 'INCREMENT_3_HIT': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    newState[target] = { ...newState[target], threeHitPlays: newState[target].threeHitPlays + 1 };
                    break;
                }
                case 'SET_SERVING_TEAM': {
                    newState.servingTeam = action.team;
                    break;
                }
            }
            if (scoreChanged) {
                newState.scoreHistory = [...newState.scoreHistory, { a: newState.teamA.score, b: newState.teamB.score }];
            }

            newState.isDeuce = newState.teamA.score >= SCORE_TO_WIN - 1 && newState.teamA.score === newState.teamB.score;
            
            const { teamA, teamB } = newState;
            // FIX: Corrected typo from `a.score` to `teamA.score`
            if ((teamA.score >= SCORE_TO_WIN && teamA.score >= teamB.score + 2) || (teamB.score >= SCORE_TO_WIN && teamB.score >= teamA.score + 2)) {
                const winner = teamA.score > teamB.score ? 'A' : 'B';
                newState.winner = winner;
                newState.gameOver = true;
                newState[winner === 'A' ? 'teamA' : 'teamB'].setsWon += 1;
            }
            return newState;
    }
}


// --- Data Context ---
interface DataContextType {
    teamSets: TeamSet[];
    matchHistory: (MatchState & { date: string; time?: number })[];
    matchState: MatchState | null;
    matchTime: number;
    timerOn: boolean;
    dispatch: React.Dispatch<Action>;
    setTimerOn: (on: boolean) => void;
    isLoading: boolean;
    toast: ToastState;
    saveTeamSets: (newTeamSets: TeamSet[]) => Promise<void>;
    saveMatchHistory: (newHistory: (MatchState & { date: string; time?: number })[]) => Promise<void>;
    clearInProgressMatch: () => void;
    reloadData: () => Promise<void>;
    exportData: () => void;
    importData: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    hideToast: () => void;
    p2p: P2PState;
    startHostSession: (teams?: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }, existingState?: MatchState) => Promise<string | undefined>;
    joinPeerSession: (sessionId: string) => void;
    endSession: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
    const [matchHistory, setMatchHistory] = useState<(MatchState & { date: string; time?: number })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>({ message: '', type: 'success' });

    // Centralized match state for the HOST
    const [matchState, dispatch] = useReducer(matchReducer, null);
    const [matchTime, setMatchTime] = useState(0);
    const [timerOn, setTimerOn] = useState(false);

    // P2P state
    const [p2p, setP2p] = useState<P2PState>({ peer: null, connections: [], sessionId: null, isHost: false, isConnected: false, isConnecting: false, error: null });
    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]);
    
    // New state for CLIENTS to ensure atomic updates
    const [clientLiveData, setClientLiveData] = useState<LiveMatchData | null>(null);

    // Refs to hold the latest state for immediate sending to new peers (for host)
    const matchStateRef = useRef(matchState);
    const matchTimeRef = useRef(matchTime);
    const teamSetsRef = useRef(teamSets);
    
    useEffect(() => { matchStateRef.current = matchState; }, [matchState]);
    useEffect(() => { matchTimeRef.current = matchTime; }, [matchTime]);
    useEffect(() => { teamSetsRef.current = teamSets; }, [teamSets]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    const hideToast = () => setToast({ message: '', type: 'success' });

    // --- Data Persistence ---
    const loadAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            setTeamSets(JSON.parse(localStorage.getItem(TEAM_SETS_KEY) || '[]'));
            setMatchHistory(JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY) || '[]'));
        } catch (error: any) {
            showToast(`데이터 로딩 실패: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleSaveTeamSets = async (newTeamSets: TeamSet[]) => {
        localStorage.setItem(TEAM_SETS_KEY, JSON.stringify(newTeamSets));
        setTeamSets(newTeamSets);
    };

    const handleSaveMatchHistory = async (newHistory: (MatchState & { date: string; time?: number })[]) => {
        localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(newHistory));
        setMatchHistory(newHistory);
    };
    
    const clearInProgressMatch = useCallback(() => {
        dispatch({ type: 'RESET_STATE' });
        setMatchTime(0);
        setTimerOn(false);
    }, []);
    
    // --- P2P Logic ---
    const endSession = useCallback(() => {
        if (peerRef.current) {
            peerRef.current.destroy();
        }
        connectionsRef.current.forEach(conn => conn.close());
        connectionsRef.current = [];
        peerRef.current = null;
        setP2p({ peer: null, connections: [], sessionId: null, isHost: false, isConnected: false, isConnecting: false, error: null });
        clearInProgressMatch();
        setClientLiveData(null); // Clear client data on session end
        showToast('세션이 종료되었습니다.');
    }, [showToast, clearInProgressMatch]);

    const initializePeer = useCallback((id?: string) => new Promise<Peer>((resolve, reject) => {
        if (peerRef.current) {
            peerRef.current.destroy();
        }
        const newPeer = id ? new Peer(id) : new Peer();
        peerRef.current = newPeer;
        newPeer.on('open', peerId => {
            setP2p(prev => ({ ...prev, peer: newPeer, sessionId: peerId, error: null }));
            resolve(newPeer);
        });
        newPeer.on('error', err => {
            console.error('PeerJS Error:', err);
            setP2p(prev => ({ ...prev, error: err.message, isConnecting: false }));
            showToast(`연결 오류: ${err.message}`, 'error');
            reject(err);
        });
        newPeer.on('disconnected', () => {
             showToast('연결 서버와의 접속이 끊겼습니다. 재연결을 시도합니다...');
             if (!newPeer.destroyed) {
                newPeer.reconnect();
             }
        });
    }), [showToast]);

    const startHostSession = useCallback(async (teams?: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }, existingState?: MatchState) => {
        try {
            const peer = await initializePeer();

            let stateToLoad: MatchState | null = null;

            if (existingState) {
                stateToLoad = existingState;
            } else if (teams) {
                let teamACheerUrl: string | undefined;
                let teamBCheerUrl: string | undefined;

                if (teams.teamAKey) {
                    const [setId, teamName] = teams.teamAKey.split('___');
                    const set = teamSets.find(s => s.id === setId);
                    const teamInfo = set?.teams.find(t => t.teamName === teamName);
                    if (teamInfo?.cheerUrl) {
                        teamACheerUrl = teamInfo.cheerUrl;
                    }
                }
                 if (teams.teamBKey) {
                    const [setId, teamName] = teams.teamBKey.split('___');
                    const set = teamSets.find(s => s.id === setId);
                    const teamInfo = set?.teams.find(t => t.teamName === teamName);
                     if (teamInfo?.cheerUrl) {
                        teamBCheerUrl = teamInfo.cheerUrl;
                    }
                }

                stateToLoad = getInitialState({ ...teams, teamACheerUrl, teamBCheerUrl });
            }

            if (stateToLoad) {
                dispatch({ type: 'LOAD_STATE', state: stateToLoad });
            }
            setMatchTime(0);
            setTimerOn(!!stateToLoad?.servingTeam && !stateToLoad?.gameOver);

            // Set up hosting state and connection listeners
            setP2p(prev => ({ ...prev, isHost: true, isConnected: true, isConnecting: false }));
            
            peer.on('connection', (conn) => {
                showToast(`'${conn.peer}'님이 참가했습니다.`, 'success');
                
                conn.on('close', () => {
                    connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
                    setP2p(prev => ({ ...prev, connections: connectionsRef.current }));
                    showToast(`'${conn.peer}'님과의 연결이 끊어졌습니다.`);
                });
                
                conn.on('open', () => {
                    // Send the most up-to-date full data immediately upon connection
                    const initialPayload: LiveMatchData = {
                        match: matchStateRef.current,
                        time: matchTimeRef.current,
                        teamSets: teamSetsRef.current,
                    };
                    conn.send(initialPayload);

                    connectionsRef.current = [...connectionsRef.current, conn];
                    setP2p(prev => ({ ...prev, connections: connectionsRef.current }));
                });
            });
            
            return peer.id;
        } catch (error) {
            console.error("Failed to start host session:", error);
            return undefined;
        }
    }, [initializePeer, showToast, teamSets]);

    const joinPeerSession = useCallback(async (sessionId: string) => {
        try {
            setP2p(prev => ({ ...prev, isConnecting: true }));
            const peer = await initializePeer();
            const conn = peer.connect(sessionId, { reliable: true });

            conn.on('open', () => {
                showToast(`호스트 '${sessionId}'에 연결되었습니다.`, 'success');
                setP2p(prev => ({ ...prev, isHost: false, isConnected: true, isConnecting: false, connections: [conn] }));
                connectionsRef.current = [conn];
            });

            conn.on('data', (data: any) => {
                const liveData = data as LiveMatchData;
                if (liveData) {
                    setClientLiveData(liveData);
                    if (liveData.teamSets !== undefined) {
                        setTeamSets(liveData.teamSets);
                    }
                }
            });

            conn.on('close', () => {
                showToast('호스트와의 연결이 끊어졌습니다.', 'error');
                setP2p(prev => ({ ...prev, isConnected: false, isConnecting: false }));
                setClientLiveData(null);
                connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
            });

            conn.on('error', (err) => {
                console.error("Connection error:", err);
                showToast(`연결 오류: ${err.message}`, 'error');
                endSession();
            });
        } catch (error: any) {
            console.error("Failed to join session:", error);
            showToast(`세션 참여 실패: ${error.message}`, 'error');
            setP2p(prev => ({ ...prev, isConnecting: false }));
        }
    }, [initializePeer, showToast, endSession]);

    // Host broadcast effect for real-time match state UPDATES to all connected peers.
    useEffect(() => {
        if (p2p.isHost && connectionsRef.current.length > 0) {
            const payload: LiveMatchData = {
                match: matchState,
                time: matchTime,
                teamSets: teamSets,
            };
            connectionsRef.current.forEach(conn => conn.send(payload));
        }
    }, [matchState, matchTime, teamSets, p2p.isHost]);

    // Timer effect for HOST only
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (p2p.isHost && timerOn && matchState && !matchState.gameOver) {
            interval = setInterval(() => setMatchTime(prev => prev + 1), 1000);
        } else if (interval) {
            clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerOn, matchState, p2p.isHost]);

    const exportData = () => {
        try {
            const dataToExport = {
                teamSets: JSON.parse(localStorage.getItem(TEAM_SETS_KEY) || '[]'),
                matchHistory: JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY) || '[]'),
            };
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jct_volleyball_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('데이터를 성공적으로 내보냈습니다.', 'success');
        } catch (error) {
            showToast('데이터 내보내기 중 오류가 발생했습니다.', 'error');
            console.error("Export failed:", error);
        }
    };
    
    const importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const text = e.target?.result;
                        if (typeof text !== 'string') throw new Error("File is not readable");
                        const importedData = JSON.parse(text);
                        if (importedData.teamSets && importedData.matchHistory) {
                            if (confirm('현재 데이터를 덮어쓰고 가져오시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                localStorage.setItem(TEAM_SETS_KEY, JSON.stringify(importedData.teamSets));
                                localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(importedData.matchHistory));
                                loadAllData();
                                showToast('데이터를 성공적으로 가져왔습니다.', 'success');
                            }
                        } else {
                            throw new Error("유효하지 않은 파일 형식입니다.");
                        }
                    } catch (error: any) {
                        showToast(`데이터 가져오기 실패: ${error.message}`, 'error');
                        console.error("Import failed:", error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const providedMatchState = p2p.isHost ? matchState : clientLiveData?.match ?? null;
    const providedMatchTime = p2p.isHost ? matchTime : clientLiveData?.time ?? 0;
    const isClientTimerOn = clientLiveData?.match ? (!clientLiveData.match.gameOver && !!clientLiveData.match.servingTeam) : false;
    const providedTimerOn = p2p.isHost ? timerOn : isClientTimerOn;
    
    const value: DataContextType = {
        teamSets: teamSets,
        matchHistory,
        isLoading,
        toast,
        saveTeamSets: handleSaveTeamSets,
        saveMatchHistory: handleSaveMatchHistory,
        reloadData: loadAllData,
        exportData,
        importData,
        showToast,
        hideToast,
        matchState: providedMatchState,
        matchTime: providedMatchTime,
        timerOn: providedTimerOn,
        dispatch,
        setTimerOn,
        clearInProgressMatch,
        p2p,
        startHostSession,
        joinPeerSession,
        endSession,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};