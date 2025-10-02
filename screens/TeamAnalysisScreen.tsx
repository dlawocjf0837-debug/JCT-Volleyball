import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon } from '../components/icons';
import TeamEmblem from '../components/TeamEmblem';
import { SavedTeamInfo } from '../types';

type TeamStats = {
    teamName: string;
    className: string;
    emblem?: string;
    slogan?: string;
    color?: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    pointsFor: number;
    pointsAgainst: number;
    avgPointsFor: number;
    avgPointsAgainst: number;
    serviceAces: number;
    serviceFaults: number;
    blockingPoints: number;
    spikeSuccesses: number;
    threeHitPlays: number;
    fairPlay: number;
};

type SortConfig = {
    key: keyof TeamStats;
    direction: 'ascending' | 'descending';
};

const TeamAnalysisScreen: React.FC = () => {
    const { matchHistory, teamSets } = useData();
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'winRate', direction: 'descending' });
    const [chartMetric, setChartMetric] = useState<keyof TeamStats>('winRate');

    const teamDetailsMap = useMemo(() => {
        const map = new Map<string, SavedTeamInfo & { className: string }>();
        teamSets.forEach(set => {
            set.teams.forEach(team => {
                map.set(team.teamName, { ...team, className: set.className });
            });
        });
        return map;
    }, [teamSets]);

    const teamPerformanceData = useMemo((): TeamStats[] => {
        const stats: { [teamName: string]: Omit<TeamStats, 'teamName' | 'winRate' | 'avgPointsFor' | 'avgPointsAgainst' | 'className' | 'emblem' | 'color' | 'slogan'> } = {};

        matchHistory
            .filter(match => match.status === 'completed' && match.winner)
            .forEach(match => {
                const processTeam = (team: 'teamA' | 'teamB') => {
                    const teamData = match[team];
                    const opponentData = team === 'teamA' ? match.teamB : match.teamA;
                    const teamName = teamData.name;

                    if (!stats[teamName]) {
                        stats[teamName] = {
                            gamesPlayed: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0,
                            serviceAces: 0, serviceFaults: 0, blockingPoints: 0, spikeSuccesses: 0, threeHitPlays: 0, fairPlay: 0
                        };
                    }

                    stats[teamName].gamesPlayed += 1;
                    if (match.winner === (team === 'teamA' ? 'A' : 'B')) {
                        stats[teamName].wins += 1;
                    } else {
                        stats[teamName].losses += 1;
                    }
                    stats[teamName].pointsFor += teamData.score;
                    stats[teamName].pointsAgainst += opponentData.score;
                    stats[teamName].serviceAces += teamData.serviceAces;
                    stats[teamName].serviceFaults += teamData.serviceFaults;
                    stats[teamName].blockingPoints += teamData.blockingPoints;
                    stats[teamName].spikeSuccesses += teamData.spikeSuccesses;
                    stats[teamName].threeHitPlays += teamData.threeHitPlays;
                    stats[teamName].fairPlay += teamData.fairPlay;
                };

                processTeam('teamA');
                processTeam('teamB');
            });

        return Object.entries(stats).map(([teamName, data]) => {
            const gamesPlayed = data.gamesPlayed;
            const details = teamDetailsMap.get(teamName);

            return {
                teamName,
                className: details?.className || '기타',
                emblem: details?.emblem,
                slogan: details?.slogan,
                color: details?.color,
                gamesPlayed: data.gamesPlayed,
                wins: data.wins,
                losses: data.losses,
                winRate: gamesPlayed > 0 ? (data.wins / gamesPlayed) * 100 : 0,
                pointsFor: data.pointsFor,
                pointsAgainst: data.pointsAgainst,
                avgPointsFor: gamesPlayed > 0 ? data.pointsFor / gamesPlayed : 0,
                avgPointsAgainst: gamesPlayed > 0 ? data.pointsAgainst / gamesPlayed : 0,
                serviceAces: gamesPlayed > 0 ? data.serviceAces / gamesPlayed : 0,
                spikeSuccesses: gamesPlayed > 0 ? data.spikeSuccesses / gamesPlayed : 0,
                threeHitPlays: gamesPlayed > 0 ? data.threeHitPlays / gamesPlayed : 0,
                fairPlay: gamesPlayed > 0 ? data.fairPlay / gamesPlayed : 0,
                serviceFaults: data.serviceFaults,
                blockingPoints: data.blockingPoints,
            };
        });
    }, [matchHistory, teamDetailsMap]);

    const availableClasses = useMemo(() => {
        const classSet = new Set(teamPerformanceData.map(t => t.className));
        return Array.from(classSet).sort();
    }, [teamPerformanceData]);

    const filteredData = useMemo(() => {
        if (selectedClass === 'all') return teamPerformanceData;
        return teamPerformanceData.filter(team => team.className === selectedClass);
    }, [teamPerformanceData, selectedClass]);

    const sortedData = useMemo(() => {
        const sortableData = [...filteredData];
        if (sortConfig.key) {
            sortableData.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [filteredData, sortConfig]);

    const handleSort = (key: keyof TeamStats) => {
        let direction: 'ascending' | 'descending' = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };
    
    const tooltips: Partial<Record<keyof TeamStats, string>> = {
        gamesPlayed: '팀이 치른 총 경기 수입니다.',
        wins: '총 승리 횟수입니다.',
        losses: '총 패배 횟수입니다.',
        winRate: '승리 확률입니다. (승리 / 총 경기 수)',
        avgPointsFor: '경기당 평균 득점입니다. (서브, 스파이크 등 순수 경기 점수)',
        avgPointsAgainst: '경기당 평균 실점입니다.',
        serviceAces: '경기당 평균 서브 에이스 횟수입니다.',
        spikeSuccesses: '경기당 평균 스파이크 성공 횟수입니다.',
        threeHitPlays: '경기당 평균 3단 플레이 성공 횟수입니다.',
        fairPlay: '경기당 평균 페어플레이 점수입니다.',
    };

    const maxValues = useMemo(() => {
        if (sortedData.length === 0) return {};
    
        const maxVals: Partial<Record<keyof TeamStats, number>> = {};
        const keysToCompare: (keyof TeamStats)[] = [
            'gamesPlayed', 'wins', 'winRate', 'avgPointsFor', 
            'serviceAces', 'spikeSuccesses', 'threeHitPlays', 'fairPlay'
        ];
    
        keysToCompare.forEach(key => {
            maxVals[key] = Math.max(...sortedData.map(team => team[key] as number));
        });
    
        return maxVals;
    }, [sortedData]);

    const tableHeaders: { key: keyof TeamStats; label: string; format?: (value: number) => string }[] = [
        { key: 'teamName', label: '팀 이름' },
        { key: 'gamesPlayed', label: '경기 수' },
        { key: 'wins', label: '승' },
        { key: 'losses', label: '패' },
        { key: 'winRate', label: '승률', format: v => `${v.toFixed(1)}%` },
        { key: 'avgPointsFor', label: '평균 득점', format: v => v.toFixed(1) },
        { key: 'avgPointsAgainst', label: '평균 실점', format: v => v.toFixed(1) },
        { key: 'serviceAces', label: '평균 서브 득점', format: v => v.toFixed(1) },
        { key: 'spikeSuccesses', label: '평균 스파이크', format: v => v.toFixed(1) },
        { key: 'threeHitPlays', label: '평균 3단 플레이', format: v => v.toFixed(1) },
        { key: 'fairPlay', label: '평균 페어플레이', format: v => v.toFixed(1) },
    ];

    const chartOptions: { key: keyof TeamStats; label: string }[] = [
        { key: 'winRate', label: '승률 (%)' },
        { key: 'avgPointsFor', label: '평균 득점' },
        { key: 'avgPointsAgainst', label: '평균 실점' },
        { key: 'serviceAces', label: '평균 서브 득점' },
        { key: 'spikeSuccesses', label: '평균 스파이크 성공' },
        { key: 'threeHitPlays', label: '평균 3단 플레이' },
        { key: 'fairPlay', label: '평균 페어플레이' },
    ];
    
    return (
        <div className="max-w-7xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-2xl space-y-6 animate-fade-in w-full">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-[#00A3FF]">팀별 종합 분석</h2>
                <div>
                    <label htmlFor="class-select-analysis" className="sr-only">반 선택</label>
                    <select
                        id="class-select-analysis"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00A3FF]"
                    >
                        <option value="all">-- 전체 보기 --</option>
                        {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {sortedData.length === 0 ? (
                <div className="text-center text-slate-400 py-16">
                    <p>분석할 경기 기록이 없습니다.</p>
                    <p className="text-sm">경기를 완료하면 데이터가 여기에 표시됩니다.</p>
                </div>
            ) : (
                <>
                    {/* Stats Table */}
                    <div className="overflow-x-auto bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <table className="w-full text-center text-sm">
                            <thead className="text-slate-300">
                                <tr className="border-b-2 border-slate-600">
                                    {tableHeaders.map(({ key, label }) => (
                                        <th key={key} className="p-3 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => key !== 'teamName' && handleSort(key as keyof TeamStats)} title={tooltips[key]}>
                                            <div className="flex items-center justify-center gap-1">
                                                {label}
                                                {sortConfig.key === key ? (
                                                    sortConfig.direction === 'descending' ? <ArrowDownIcon className="w-4 h-4" /> : <ArrowUpIcon className="w-4 h-4" />
                                                ) : null}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="font-mono">
                                {sortedData.map((team) => (
                                    <tr key={team.teamName} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-800/50">
                                        {tableHeaders.map(({ key, format }) => {
                                            const value = team[key];
                                            const isMax = maxValues[key] !== undefined && typeof value === 'number' && value > 0 && value === maxValues[key];
                                            const highlightClass = isMax ? 'bg-sky-900/50 text-sky-300 font-bold' : '';
                                            
                                            if (key === 'teamName') {
                                                return (
                                                    <td key={key} className="p-3 font-sans font-semibold text-slate-200" title={team.slogan}>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <TeamEmblem emblem={team.emblem} color={team.color} className="w-6 h-6" />
                                                            <span className="text-white">{team.teamName}</span>
                                                        </div>
                                                    </td>
                                                )
                                            }

                                            return (
                                                <td key={key} className={`p-3 text-slate-300 ${highlightClass}`}>
                                                    {format && typeof value === 'number' ? format(value) : value}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Comparison Chart */}
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-300">팀별 성과 비교</h3>
                            <select
                                value={chartMetric}
                                onChange={(e) => setChartMetric(e.target.value as keyof TeamStats)}
                                className="bg-slate-700 border border-slate-600 rounded-md py-1 px-2 text-sm text-white"
                            >
                                {chartOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sortedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="teamName" tick={{ fill: '#94a3b8', fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={50} />
                                    <YAxis tick={{ fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                    <Legend />
                                    <Bar dataKey={chartMetric} name={chartOptions.find(o => o.key === chartMetric)?.label}>
                                        {sortedData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TeamAnalysisScreen;