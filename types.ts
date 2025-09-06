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
}

// --- Types for saved Team Sets ---
export interface SavedTeamInfo {
    teamName: string;
    captainId: string;
    playerIds: string[];
    cheerUrl?: string;
}
export interface TeamSet {
    id: string;
    className: string;
    savedAt: string;
    teams: SavedTeamInfo[];
    players: Record<string, Player>;
}


// --- New types for Scoreboard ---
export interface TeamMatchState {
    name: string;
    key?: string; // Unique key to identify the saved team data
    cheerUrl?: string;
    score: number;
    setsWon: number;
    timeouts: number;
    fairPlay: number;
    threeHitPlays: number;
    serviceAces: number;
    serviceFaults: number;
    blockingPoints: number;
    spikeSuccesses: number;
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