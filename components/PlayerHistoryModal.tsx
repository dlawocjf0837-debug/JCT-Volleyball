import React, { useState, useMemo } from 'react';
import { Player, PlayerStats, MatchState } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type CumulativeStats = PlayerStats & {
    matchesPlayed: number;
    serviceSuccessRate: number;
};

type MatchPerformance = {
    matchDate: string;
    opponent: string;
    stats: PlayerStats;
};

interface PlayerHistoryModalProps {
    player: Player;
    cumulativeStats: CumulativeStats;
    performanceHistory: MatchPerformance[];
    onClose: () => void;
}

const statOrder: (keyof PlayerStats)[] = ['points', 'serviceAces', 'spikeSuccesses', 'blockingPoints', 'serviceFaults'];
const statDisplayNames: Record<keyof PlayerStats, string> = {
    points: '득점',
    serviceAces: '서브 성공',
    spikeSuccesses: '스파이크 성공',
    blockingPoints: '블로킹',
    serviceFaults: '서브 범실',
};

const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({ player, cumulativeStats, performanceHistory, onClose }) => {
    const [chartStat, setChartStat] = useState<keyof PlayerStats>('points');

    const chartData = useMemo(() => {
        return performanceHistory.map((perf, index) => ({
            name: `경기 ${index + 1}`,
            value: perf.stats[chartStat] || 0,
        })).reverse(); // Show oldest match first
    }, [performanceHistory, chartStat]);

    const statCards = [
        { label: '총 경기 수', value: cumulativeStats.matchesPlayed, unit: '회' },
        { label: '총 득점', value: cumulativeStats.points, unit: '점' },
        { label: '서브 성공률', value: cumulativeStats.serviceSuccessRate.toFixed(1), unit: '%' },
        { label: '총 서브 성공', value: cumulativeStats.serviceAces, unit: '회' },
        { label: '총 스파이크', value: cumulativeStats.spikeSuccesses, unit: '회' },
        { label: '총 블로킹', value: cumulativeStats.blockingPoints, unit: '회' },
    ];

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-4xl text-white border border-[#00A3FF] max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-[#00A3FF]">{player.originalName} 선수 기록</h2>
                        <p className="text-slate-400">{player.class}반 {player.studentNumber}번</p>
                    </div>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>

                {/* Cumulative Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    {statCards.map(card => (
                        <div key={card.label} className="bg-slate-800 p-4 rounded-lg text-center">
                            <p className="text-sm text-slate-400">{card.label}</p>
                            <p className="text-3xl font-bold text-sky-400">{card.value}<span className="text-lg ml-1">{card.unit}</span></p>
                        </div>
                    ))}
                </div>

                {/* Performance Trend Chart */}
                <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-300">기록 추이</h3>
                        <select
                            value={chartStat}
                            onChange={(e) => setChartStat(e.target.value as keyof PlayerStats)}
                            className="bg-slate-700 border border-slate-600 rounded-md py-1 px-2 text-sm text-white"
                        >
                            {statOrder.map(key => (
                                <option key={key} value={key}>{statDisplayNames[key]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis allowDecimals={false} stroke="#94a3b8" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                <Legend />
                                <Line type="monotone" dataKey="value" name={statDisplayNames[chartStat]} stroke="#00A3FF" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Match History Table */}
                <div>
                    <h3 className="text-xl font-bold text-slate-300 mb-2">경기별 상세 기록</h3>
                    <div className="overflow-x-auto max-h-60">
                        <table className="w-full text-center text-sm">
                            <thead className="sticky top-0 bg-slate-800">
                                <tr className="border-b-2 border-slate-600 text-slate-300">
                                    <th className="p-2 text-left">날짜</th>
                                    <th className="p-2 text-left">상대팀</th>
                                    {statOrder.map(key => <th key={key} className="p-2">{statDisplayNames[key]}</th>)}
                                </tr>
                            </thead>
                            <tbody className="font-mono text-slate-200">
                                {performanceHistory.map((perf, index) => (
                                    <tr key={index} className="border-b border-slate-700">
                                        <td className="p-2 text-left font-sans text-slate-400">{new Date(perf.matchDate).toLocaleDateString('ko-KR')}</td>
                                        <td className="p-2 text-left font-sans text-slate-400">{perf.opponent}</td>
                                        {statOrder.map(key => <td key={key} className="p-2">{perf.stats[key] || 0}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerHistoryModal;