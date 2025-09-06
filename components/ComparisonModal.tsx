import React, { useMemo } from 'react';
import { Player, STAT_KEYS, STAT_NAMES } from '../types.ts';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ComparisonModalProps {
    player1: Player;
    player2: Player;
    onClose: () => void;
    showRealNames: boolean;
}

const player1Color = "#00A3FF"; // electric-blue
const player2Color = "#fb923c"; // orange-400

const ComparisonModal: React.FC<ComparisonModalProps> = ({ player1, player2, onClose, showRealNames }) => {
    const chartData = useMemo(() => {
        if (!player1 || !player2) return [];
        return STAT_KEYS.map(key => ({
            subject: STAT_NAMES[key],
            [player1.anonymousName]: player1.stats[key],
            [player2.anonymousName]: player2.stats[key],
            fullMark: 100,
        }));
    }, [player1, player2]);

    if (!player1 || !player2) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-2xl text-white border border-slate-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#00A3FF]">선수 능력치 비교</h2>
                         <div className="flex items-center gap-4 mt-1 text-slate-300">
                           <p><span className="font-bold text-lg" style={{color: player1Color}}>■</span> {player1.anonymousName}</p>
                           <p><span className="font-bold text-lg" style={{color: player2Color}}>■</span> {player2.anonymousName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>

                {showRealNames && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-400 mb-4 bg-slate-800/50 p-3 rounded-md">
                        <p className="truncate">정보: {player1.class}반 {player1.studentNumber}번 {player1.originalName} ({player1.gender})</p>
                        <p className="truncate">정보: {player2.class}반 {player2.studentNumber}번 {player2.originalName} ({player2.gender})</p>
                    </div>
                )}
                
                <div style={{ width: '100%', height: 350 }}>
                     <ResponsiveContainer>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid stroke="#475569" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                            <Radar name={player1.anonymousName} dataKey={player1.anonymousName} stroke={player1Color} fill={player1Color} fillOpacity={0.5} />
                            <Radar name={player2.anonymousName} dataKey={player2.anonymousName} stroke={player2Color} fill={player2Color} fillOpacity={0.5} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 15, 31, 0.9)', borderColor: '#475569', borderRadius: '0.5rem' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4">
                    <h3 className="font-bold text-lg text-slate-300 mb-2">상세 능력치</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="p-2">능력치</th>
                                    <th className="p-2 text-center" style={{color: player1Color}}>{player1.anonymousName}</th>
                                    <th className="p-2 text-center" style={{color: player2Color}}>{player2.anonymousName}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.map(data => (
                                    <tr key={data.subject} className="border-b border-slate-700">
                                        <td className="p-2 font-semibold text-slate-400">{data.subject}</td>
                                        {/* FIX: Cast to number as TypeScript infers a wider `string | number` type for the indexed properties due to the `subject` property being a string. */}
                                        <td className="p-2 text-center font-mono">{(data[player1.anonymousName] as number).toFixed(1)}</td>
                                        <td className="p-2 text-center font-mono">{(data[player2.anonymousName] as number).toFixed(1)}</td>
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
export default ComparisonModal;