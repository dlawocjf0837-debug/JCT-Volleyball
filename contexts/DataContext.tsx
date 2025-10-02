import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useReducer, useRef } from 'react';
import { MatchState, TeamSet, TeamMatchState, Player, PlayerStats, Action, UserEmblem, ScoreEvent } from '../types';

const TEAM_SETS_KEY = 'jct_volleyball_team_sets';
const MATCH_HISTORY_KEY = 'jct_volleyball_match_history';
const USER_EMBLEMS_KEY = 'jct_volleyball_user_emblems';
const BACKUP_KEY = 'jct_volleyball_backup_autosave';


// FIX: Hoisted staticTeamSets and created a standalone getLatestTeamInfo function
// to resolve type errors and avoid attaching properties to the React Context object.
let staticTeamSets: TeamSet[] = [];
const getLatestTeamInfo = (teamKey: string) => {
    if (!teamKey) return null;
    const [setId, teamName] = teamKey.split('___');
    const set = staticTeamSets.find(s => s.id === setId);
    return set?.teams.find(t => t.teamName === teamName) || null;
};


type ToastState = {
    message: string;
    type: 'success' | 'error';
};

// --- Match Reducer Logic (moved from ScoreboardScreen) ---
const SCORE_TO_WIN = 11;

const getInitialState = (teams: {
    teamA: string;
    teamB: string;
    teamAKey?: string;
    teamBKey?: string;
    teamAPlayers: Record<string, Player>;
    teamBPlayers: Record<string, Player>;
    teamADetails?: Partial<TeamMatchState>;
    teamBDetails?: Partial<TeamMatchState>;
}): MatchState => {
    const initPlayerStats = (players: Record<string, Player>): Record<string, PlayerStats> =>
        Object.keys(players).reduce((acc, playerId) => {
            acc[playerId] = { points: 0, serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0 };
            return acc;
        }, {} as Record<string, PlayerStats>);

    const teamADetails = { ...teams.teamADetails };
    const teamBDetails = { ...teams.teamBDetails };

    // Fetch the latest branding info for the teams
    // FIX: Use the standalone getLatestTeamInfo function.
    const teamAInfo = teams.teamAKey ? getLatestTeamInfo(teams.teamAKey) : null;
    // FIX: Use the standalone getLatestTeamInfo function.
    const teamBInfo = teams.teamBKey ? getLatestTeamInfo(teams.teamBKey) : null;

    return {
        teamA: { name: teams.teamA, key: teams.teamAKey, ...teamAInfo, ...teamADetails, score: 0, setsWon: 0, timeouts: 2, fairPlay: 0, threeHitPlays: 0, serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0, players: teams.teamAPlayers, playerStats: initPlayerStats(teams.teamAPlayers) },
        teamB: { name: teams.teamB, key: teams.teamBKey, ...teamBInfo, ...teamBDetails, score: 0, setsWon: 0, timeouts: 2, fairPlay: 0, threeHitPlays: 0, serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0, players: teams.teamBPlayers, playerStats: initPlayerStats(teams.teamBPlayers) },
        servingTeam: null,
        currentSet: 1,
        isDeuce: false,
        gameOver: false,
        winner: null,
        scoreHistory: [{ a: 0, b: 0 }],
        eventHistory: [],
        scoreLocations: [],
        status: 'in_progress',
        timeout: null,
    };
};
    
const updatePlayerStat = (
    playerStats: Record<string, PlayerStats>,
    playerId: string,
    stat: keyof PlayerStats,
    amount: number
): Record<string, PlayerStats> => {
    const newStats = { ...(playerStats[playerId] || { points: 0, serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0 }) };
    newStats[stat] = (newStats[stat] || 0) + amount;
    return { ...playerStats, [playerId]: newStats };
};


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
            let newState = { ...state, eventHistory: [...(state.eventHistory || [])] };
            let scoreChanged = false;

            switch (action.type) {
                case 'SCORE': {
                    const target = action.team === 'A' ? 'teamA' : 'teamB';
                    const newScore = Math.max(0, newState[target].score + action.amount);
                    if (newState[target].score !== newScore) {
                        newState[target] = { ...newState[target], score: newScore };
                        scoreChanged = true;
                        if (action.amount > 0) {
                            newState.servingTeam = action.team;
                            const event: ScoreEvent = {
                                team: action.team,
                                type: 'SCORE',
                                description: `${newState[target].name}이(가) 득점했습니다.`,
                                score: { a: newState.teamA.score, b: newState.teamB.score }
                            };
                            newState.eventHistory.push(event);
                        }
                    }
                    break;
                }
                 case 'SERVICE_ACE': {
                    const { team, playerId } = action;
                    const target = team === 'A' ? 'teamA' : 'teamB';
                    
                    newState[target] = {
                        ...newState[target],
                        score: newState[target].score + 1,
                        serviceAces: newState[target].serviceAces + 1,
                        playerStats: updatePlayerStat(
                            updatePlayerStat(newState[target].playerStats, playerId, 'serviceAces', 1),
                            playerId, 'points', 1
                        )
                    };
                    newState.servingTeam = team;
                    scoreChanged = true;
                    
                    const scoringPlayer = newState[target].players[playerId];
                    if (scoringPlayer) {
                        const event: ScoreEvent = {
                            team: team,
                            scoringPlayerId: playerId,
                            type: 'SERVICE_ACE',
                            description: `${scoringPlayer.originalName} 선수가 서브 에이스로 득점했습니다!`,
                            score: { a: newState.teamA.score, b: newState.teamB.score }
                        };
                        newState.eventHistory.push(event);
                    }
                    break;
                }
                case 'SERVICE_FAULT': {
                    const { team: faultingTeamKey, playerId } = action;
                    const scoringTeamKey = faultingTeamKey === 'A' ? 'B' : 'A';
                    const faultingTarget = faultingTeamKey === 'A' ? 'teamA' : 'teamB';
                    const scoringTarget = scoringTeamKey === 'A' ? 'teamA' : 'teamB';

                    newState[faultingTarget] = {
                        ...newState[faultingTarget],
                        serviceFaults: newState[faultingTarget].serviceFaults + 1,
                        playerStats: updatePlayerStat(newState[faultingTarget].playerStats, playerId, 'serviceFaults', 1),
                    };
                    
                    newState[scoringTarget] = { ...newState[scoringTarget], score: newState[scoringTarget].score + 1 };
                    newState.servingTeam = scoringTeamKey;
                    scoreChanged = true;

                    const faultingPlayer = newState[faultingTarget].players[playerId];
                    if (faultingPlayer) {
                        const event: ScoreEvent = {
                            team: scoringTeamKey,
                            type: 'OPPONENT_FAULT',
                            description: `${faultingPlayer.originalName} 선수의 서브 범실로 ${newState[scoringTarget].name}이(가) 득점했습니다.`,
                            score: { a: newState.teamA.score, b: newState.teamB.score }
                        };
                        newState.eventHistory.push(event);
                    }
                    break;
                }
                case 'BLOCKING_POINT': {
                    const { team, playerId } = action;
                    const target = team === 'A' ? 'teamA' : 'teamB';
                    
                    newState[target] = {
                        ...newState[target],
                        score: newState[target].score + 1,
                        blockingPoints: newState[target].blockingPoints + 1,
                        playerStats: updatePlayerStat(
                            updatePlayerStat(newState[target].playerStats, playerId, 'blockingPoints', 1),
                            playerId, 'points', 1
                        )
                    };
                    newState.servingTeam = team;
                    scoreChanged = true;
                    
                    const scoringPlayer = newState[target].players[playerId];
                    if (scoringPlayer) {
                        const event: ScoreEvent = {
                            team: team,
                            scoringPlayerId: playerId,
                            type: 'BLOCKING_POINT',
                            description: `${scoringPlayer.originalName} 선수가 블로킹으로 득점했습니다!`,
                            score: { a: newState.teamA.score, b: newState.teamB.score }
                        };
                        newState.eventHistory.push(event);
                    }
                    break;
                }
                case 'SPIKE_SUCCESS': {
                    const { team, playerId } = action;
                    const target = team === 'A' ? 'teamA' : 'teamB';

                    newState[target] = {
                        ...newState[target],
                        score: newState[target].score + 1,
                        spikeSuccesses: newState[target].spikeSuccesses + 1,
                        playerStats: updatePlayerStat(
                            updatePlayerStat(newState[target].playerStats, playerId, 'spikeSuccesses', 1),
                            playerId, 'points', 1
                        )
                    };
                    newState.servingTeam = team;
                    scoreChanged = true;
                    
                    const scoringPlayer = newState[target].players[playerId];
                    if (scoringPlayer) {
                        const event: ScoreEvent = {
                            team: team,
                            scoringPlayerId: playerId,
                            type: 'SPIKE_SUCCESS',
                            description: `${scoringPlayer.originalName} 선수가 스파이크로 득점했습니다!`,
                            score: { a: newState.teamA.score, b: newState.teamB.score }
                        };
                        newState.eventHistory.push(event);
                    }
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
            if ((teamA.score >= SCORE_TO_WIN && teamA.score >= teamB.score + 2) || (teamB.score >= SCORE_TO_WIN && teamB.score >= teamA.score + 2)) {
                const winner = teamA.score > teamB.score ? 'A' : 'B';
                newState.winner = winner;
                newState.gameOver = true;
                newState[winner === 'A' ? 'teamA' : 'teamB'].setsWon += 1;
            }
            return newState;
    }
}


// --- Data Validation Helpers ---
export const isValidTeamSet = (set: any): set is TeamSet => {
    return set && typeof set.id === 'string' &&
           typeof set.className === 'string' &&
           Array.isArray(set.teams) &&
           typeof set.players === 'object' && set.players !== null &&
           !Array.isArray(set.players) &&
           set.teams.every((t: any) => 
               t && typeof t.teamName === 'string' && 
               typeof t.captainId === 'string' &&
               Array.isArray(t.playerIds)
           );
};

export const isValidMatchState = (match: any): match is MatchState => {
    const isValidTeam = (team: any): team is TeamMatchState => {
        return team && typeof team.name === 'string' &&
               typeof team.score === 'number' &&
               typeof team.timeouts === 'number';
    };

    return match &&
           typeof match === 'object' &&
           isValidTeam(match.teamA) &&
           isValidTeam(match.teamB) &&
           (match.status === 'in_progress' || match.status === 'completed' || match.status === undefined);
};

const isValidUserEmblems = (emblems: any): emblems is UserEmblem[] => {
    return Array.isArray(emblems) && emblems.every(e => e && typeof e.id === 'string' && typeof e.data === 'string');
};


// --- Data Context ---
interface DataContextType {
    teamSets: TeamSet[];
    matchHistory: (MatchState & { date: string; time?: number })[];
    userEmblems: UserEmblem[];
    matchState: MatchState | null;
    matchTime: number;
    timerOn: boolean;
    dispatch: React.Dispatch<Action>;
    setTimerOn: (on: boolean) => void;
    isLoading: boolean;
    toast: ToastState;
    saveTeamSets: (newTeamSets: TeamSet[], successMessage?: string) => Promise<void>;
    saveMatchHistory: (newHistory: (MatchState & { date: string; time?: number })[], successMessage?: string) => Promise<void>;
    saveUserEmblems: (newUserEmblems: UserEmblem[]) => Promise<void>;
    clearInProgressMatch: () => void;
    reloadData: () => Promise<void>;
    exportData: () => void;
    importDataFromFile: (file: File) => void;
    saveImportedData: (data: { teamSets: TeamSet[], matchHistory: (MatchState & { date: string; time?: number })[], userEmblems?: UserEmblem[] }) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    hideToast: () => void;
    resetAllData: () => void;
    startMatch: (teams?: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }, existingState?: MatchState & { time?: number }, attendingPlayers?: { teamA: Record<string, Player>, teamB: Record<string, Player>}) => void;
    recoveryData: any | null;
    handleRestoreFromBackup: () => void;
    dismissRecovery: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
    const [matchHistory, setMatchHistory] = useState<(MatchState & { date: string; time?: number })[]>([]);
    const [userEmblems, setUserEmblems] = useState<UserEmblem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>({ message: '', type: 'success' });
    const [recoveryData, setRecoveryData] = useState<any | null>(null);

    // Centralized match state
    const [matchState, dispatch] = useReducer(matchReducer, null);
    const [matchTime, setMatchTime] = useState(0);
    const [timerOn, setTimerOn] = useState(false);
    
    // Refs to hold the latest state for immediate use in backups
    const teamSetsRef = useRef(teamSets);
    const userEmblemsRef = useRef(userEmblems);
    const matchHistoryRef = useRef(matchHistory);
    
    useEffect(() => { 
        teamSetsRef.current = teamSets;
        staticTeamSets = teamSets;
    }, [teamSets]);
    useEffect(() => { userEmblemsRef.current = userEmblems; }, [userEmblems]);
    useEffect(() => { matchHistoryRef.current = matchHistory; }, [matchHistory]);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    }, []);

    const hideToast = () => setToast({ message: '', type: 'success' });

    // --- Data Persistence ---
    const createBackup = useCallback(() => {
        try {
            const backupData = {
                teamSets: teamSetsRef.current,
                matchHistory: matchHistoryRef.current,
                userEmblems: userEmblemsRef.current,
            };
            localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
        } catch (error) {
            console.error("Auto backup failed:", error);
        }
    }, []);

    const saveTeamSets = async (newTeamSets: TeamSet[], successMessage?: string) => {
        try {
            localStorage.setItem(TEAM_SETS_KEY, JSON.stringify(newTeamSets));
            setTeamSets(newTeamSets);
            if (successMessage) {
                showToast(successMessage, 'success');
            }
            createBackup();
        } catch (error) {
            console.error("Error saving team sets:", error);
            showToast("데이터 저장 중 오류가 발생했습니다.", 'error');
            throw error;
        }
    };

    const saveMatchHistory = async (newHistory: (MatchState & { date: string; time?: number })[], successMessage?: string) => {
        try {
            localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(newHistory));
            setMatchHistory(newHistory);
             if (successMessage) {
                showToast(successMessage, 'success');
            }
            createBackup();
        } catch (error) {
            console.error("Error saving match history:", error);
            showToast("기록 저장 중 오류가 발생했습니다.", 'error');
            throw error;
        }
    };

    const saveUserEmblems = async (newUserEmblems: UserEmblem[]) => {
        try {
            localStorage.setItem(USER_EMBLEMS_KEY, JSON.stringify(newUserEmblems));
            setUserEmblems(newUserEmblems);
            createBackup();
        } catch (error) {
            console.error("Error saving user emblems:", error);
            showToast("앰블럼 저장 중 오류가 발생했습니다.", 'error');
            throw error;
        }
    };
    
    const loadAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const teamSetsData = localStorage.getItem(TEAM_SETS_KEY);
            const matchHistoryData = localStorage.getItem(MATCH_HISTORY_KEY);
            const userEmblemsData = localStorage.getItem(USER_EMBLEMS_KEY);

            const parsedTeamSets = teamSetsData ? JSON.parse(teamSetsData) : [];
            const parsedMatchHistory = matchHistoryData ? JSON.parse(matchHistoryData) : [];
            const parsedUserEmblems = userEmblemsData ? JSON.parse(userEmblemsData) : [];

            const isMainDataEmpty = (!parsedTeamSets || parsedTeamSets.length === 0) && (!parsedMatchHistory || parsedMatchHistory.length === 0);

            if (isMainDataEmpty) {
                const backupData = localStorage.getItem(BACKUP_KEY);
                if (backupData) {
                    try {
                        const parsedBackup = JSON.parse(backupData);
                        const teamSetsAreValid = parsedBackup.teamSets && Array.isArray(parsedBackup.teamSets) && parsedBackup.teamSets.every(isValidTeamSet);
                        const historyIsValid = parsedBackup.matchHistory && Array.isArray(parsedBackup.matchHistory) && parsedBackup.matchHistory.every((m: any) => m && typeof m.date === 'string' && isValidMatchState(m));
                        
                        if (teamSetsAreValid || historyIsValid) {
                             setRecoveryData(parsedBackup);
                        }
                    } catch (e) {
                        console.error("Failed to parse or validate backup data:", e);
                    }
                }
            }
            
            if (Array.isArray(parsedTeamSets) && parsedTeamSets.every(isValidTeamSet)) setTeamSets(parsedTeamSets);
            if (Array.isArray(parsedMatchHistory) && parsedMatchHistory.every(m => m && typeof m.date === 'string' && isValidMatchState(m))) setMatchHistory(parsedMatchHistory);
            if (isValidUserEmblems(parsedUserEmblems)) setUserEmblems(parsedUserEmblems);
            
        } catch (error: any) {
            showToast(`데이터 로딩 중 오류 발생: ${error.message}`, 'error');
            setTeamSets([]);
            setMatchHistory([]);
            setUserEmblems([]);
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);
    
    const handleRestoreFromBackup = useCallback(() => {
        if (!recoveryData) return;
        try {
            const { teamSets = [], matchHistory = [], userEmblems = [] } = recoveryData;
            localStorage.setItem(TEAM_SETS_KEY, JSON.stringify(teamSets));
            localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(matchHistory));
            localStorage.setItem(USER_EMBLEMS_KEY, JSON.stringify(userEmblems));
            
            loadAllData();
            
            showToast('데이터가 성공적으로 복구되었습니다.', 'success');
            setRecoveryData(null);
        } catch (error) {
            console.error("Failed to restore from backup:", error);
            showToast('데이터 복구 중 오류가 발생했습니다.', 'error');
        }
    }, [recoveryData, loadAllData, showToast]);

    const dismissRecovery = useCallback(() => {
        setRecoveryData(null);
    }, []);

    const clearInProgressMatch = useCallback(() => {
        dispatch({ type: 'RESET_STATE' });
        setMatchTime(0);
        setTimerOn(false);
    }, []);

    const startMatch = useCallback((
        teams?: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string },
        existingState?: MatchState & { time?: number },
        attendingPlayers?: { teamA: Record<string, Player>, teamB: Record<string, Player> }
    ) => {
        let stateToLoad: MatchState | null = null;
        if (existingState) {
            stateToLoad = existingState;
        } else if (teams) {
            const getTeamDetails = (teamKey: string | undefined) => {
                if (!teamKey) return { players: {}, details: {} };
                const [setId, teamName] = teamKey.split('___');
                const set = teamSetsRef.current.find(s => s.id === setId);
                const teamInfo = set?.teams.find(t => t.teamName === teamName);
                if (!set || !teamInfo) return { players: {}, details: {} };

                const allPlayersInTeam = teamInfo.playerIds.reduce((acc, id) => {
                    if (set.players[id]) acc[id] = set.players[id];
                    return acc;
                }, {} as Record<string, Player>);

                const { teamName: _t, captainId: _c, playerIds: _p, ...details } = teamInfo;

                return { 
                    players: allPlayersInTeam,
                    details: details,
                };
            };
            const teamADetails = getTeamDetails(teams.teamAKey);
            const teamBDetails = getTeamDetails(teams.teamBKey);
            stateToLoad = getInitialState({
                ...teams,
                teamAPlayers: attendingPlayers ? attendingPlayers.teamA : teamADetails.players,
                teamBPlayers: attendingPlayers ? attendingPlayers.teamB : teamBDetails.players,
                teamADetails: teamADetails.details,
                teamBDetails: teamBDetails.details,
            });
        }
        if (stateToLoad) {
            dispatch({ type: 'LOAD_STATE', state: stateToLoad });
            setMatchTime(existingState?.time || 0);
            setTimerOn(!!stateToLoad?.servingTeam && !stateToLoad?.gameOver);
        }
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (timerOn && matchState && !matchState.gameOver) {
            interval = setInterval(() => setMatchTime(prev => prev + 1), 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [timerOn, matchState]);

    const exportData = () => {
        try {
            const dataToExport = {
                teamSets: teamSetsRef.current,
                matchHistory: matchHistoryRef.current,
                userEmblems: userEmblemsRef.current,
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
    
    const saveImportedData = (data: { teamSets: TeamSet[], matchHistory: (MatchState & { date: string; time?: number })[], userEmblems?: UserEmblem[] }) => {
        Promise.all([
            saveTeamSets(data.teamSets),
            saveMatchHistory(data.matchHistory),
            saveUserEmblems(data.userEmblems || [])
        ]).then(() => {
            showToast('데이터를 성공적으로 가져왔습니다.', 'success');
            loadAllData();
        }).catch((error) => {
            showToast('데이터를 적용하는 중 오류가 발생했습니다.', 'error');
        });
    };
    
    const importDataFromFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result;
                if (typeof text !== 'string') throw new Error("File could not be read.");
                const data = JSON.parse(text);

                const teamSetsAreValid = data.teamSets && Array.isArray(data.teamSets) && data.teamSets.every(isValidTeamSet);
                const historyIsValid = data.matchHistory && Array.isArray(data.matchHistory) && data.matchHistory.every((m: any) => m && typeof m.date === 'string' && isValidMatchState(m));
                const emblemsAreValid = !data.userEmblems || isValidUserEmblems(data.userEmblems);

                if (teamSetsAreValid && historyIsValid && emblemsAreValid) {
                    saveImportedData(data);
                } else {
                    showToast('파일 형식이 올바르지 않거나 데이터가 손상되었습니다.', 'error');
                }
            } catch (error) {
                console.error("Import failed:", error);
                showToast('데이터를 가져오는 중 오류가 발생했습니다.', 'error');
            }
        };
        reader.onerror = () => showToast('파일을 읽는 데 실패했습니다.', 'error');
        reader.readAsText(file);
    };

    const resetAllData = useCallback(() => {
        try {
            localStorage.removeItem(TEAM_SETS_KEY);
            localStorage.removeItem(MATCH_HISTORY_KEY);
            localStorage.removeItem(USER_EMBLEMS_KEY);
            localStorage.removeItem(BACKUP_KEY);
            setTeamSets([]);
            setMatchHistory([]);
            setUserEmblems([]);
            showToast('모든 데이터가 초기화되었습니다.', 'success');
        } catch (error) {
            console.error("Failed to reset all data:", error);
            showToast('데이터 초기화 중 오류가 발생했습니다.', 'error');
        }
    }, [showToast]);
    
    const value: DataContextType = {
        teamSets,
        matchHistory,
        userEmblems,
        isLoading,
        toast,
        saveTeamSets,
        saveMatchHistory,
        saveUserEmblems,
        reloadData: loadAllData,
        exportData,
        importDataFromFile,
        saveImportedData,
        showToast,
        hideToast,
        resetAllData,
        matchState,
        matchTime,
        timerOn,
        dispatch,
        setTimerOn,
        clearInProgressMatch,
        startMatch,
        recoveryData,
        handleRestoreFromBackup,
        dismissRecovery,
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