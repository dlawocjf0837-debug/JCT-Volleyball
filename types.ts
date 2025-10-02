// FIX: Removed incorrect self-import of Player.
export interface Stats {
    height: number;
    shuttleRun: number;
    flexibility: number;
    fiftyMeterDash: number;
    underhand: number;
    serve: number;
}

export const STAT_KEYS: (keyof Stats)[] = ['height', 'shuttleRun', 'flexibility', 'fiftyMeterDash', 'underhand', 'serve'];

export const STAT_NAMES: Record<keyof Stats, string> = {
    height: '키',
    shuttleRun: '셔틀런',
    flexibility: '유연성',
    fiftyMeterDash: '50m 달리기',
    underhand: '언더핸드',
    serve: '서브',
};


export interface Player {
    id: string;
    originalName: string;
    anonymousName: string;
    class: string;
    studentNumber: string;
    gender: string;
    stats: Stats;
    isCaptain: boolean;
    totalScore: number;
}

export enum Screen {
    Input = 'INPUT',
    Builder = 'BUILDER',
}

export type TeamId = string;

export interface Team {
    id: TeamId;
    name: string;
    captainId: string;
    playerIds: string[];
    color: string;
    emblem?: string;
}

// --- Types for saved Team Sets ---
export interface SavedTeamInfo {
    teamName: string;
    captainId: string;
    playerIds: string[];
    cheerUrl?: string;
    cheerUrl2?: string;
    cheerName2?: string;
    emblem?: string; // Icon name, user emblem ID, or Base64 string
    color?: string; // Hex color code for primary color
    slogan?: string; // Team slogan
}
export interface TeamSet {
    id: string;
    className: string;
    savedAt: string;
    teams: SavedTeamInfo[];
    players: Record<string, Player>;
}

// --- New type for user-uploaded emblems ---
export type UserEmblem = {
    id: string; // e.g., "user_1678886400000"
    data: string; // Base64 data URL
};

// --- New types for individual player stats in a match ---
export interface PlayerStats {
    points: number;
    serviceAces: number;
    serviceFaults: number;
    blockingPoints: number;
    spikeSuccesses: number;
}

// --- New types for Scoreboard ---
export interface TeamMatchState {
    name: string;
    key?: string; // Unique key to identify the saved team data
    cheerUrl?: string;
    cheerUrl2?: string;
    cheerName2?: string;
    emblem?: string;
    color?: string;
    slogan?: string;
    score: number;
    setsWon: number;
    timeouts: number;
    fairPlay: number;
    threeHitPlays: number;
    serviceAces: number;
    serviceFaults: number;
    blockingPoints: number;
    spikeSuccesses: number;
    players: Record<string, Player>;
    playerStats: Record<string, PlayerStats>;
}

export interface MatchState {
    teamA: TeamMatchState;
    teamB: TeamMatchState;
    servingTeam: 'A' | 'B' | null;
    currentSet: number;
    isDeuce: boolean;
    gameOver: boolean;
    winner: 'A' | 'B' | null;
    scoreHistory: { a: number, b: number }[];
    scoreLocations: any[];
    status?: 'in_progress' | 'completed';
    timeout: { team: 'A' | 'B', timeLeft: number } | null;
}

// --- Action type for match reducer ---
export type Action =
    | { type: 'SCORE'; team: 'A' | 'B'; amount: number }
    | { type: 'SERVICE_ACE'; team: 'A' | 'B'; playerId: string }
    | { type: 'SERVICE_FAULT'; team: 'A' | 'B'; playerId: string }
    | { type: 'BLOCKING_POINT'; team: 'A' | 'B'; playerId: string }
    | { type: 'SPIKE_SUCCESS'; team: 'A' | 'B'; playerId: string }
    | { type: 'TAKE_TIMEOUT'; team: 'A' | 'B' }
    | { type: 'ADJUST_FAIR_PLAY'; team: 'A' | 'B'; amount: number }
    | { type: 'INCREMENT_3_HIT'; team: 'A' | 'B' }
    | { type: 'SET_SERVING_TEAM'; team: 'A' | 'B' }
    | { type: 'RESET_STATE' }
    | { type: 'LOAD_STATE'; state: MatchState }
    | { type: 'END_TIMEOUT' }
    | { type: 'UPDATE_TIMEOUT_TIMER'; timeLeft: number };