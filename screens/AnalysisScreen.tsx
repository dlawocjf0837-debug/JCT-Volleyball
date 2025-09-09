import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Player, Team, STAT_KEYS, STAT_NAMES } from '../types';
import { GoogleGenAI } from '@google/genai';
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis } from 'recharts';
import { SparklesIcon } from '../components/icons';

type Tab = 'player' | 'team' | 'viz' | 'ai';

type RankedPlayer = Player & { rank: number };
type RankedTeam = {
    key: string;
    rank: number;
    teamName: string;
    className: string;
    playerCount: number;
    avgScore: number;
    avgStats: { [key in keyof typeof STAT_NAMES]: number };
};

const AnalysisScreen: React.FC = () => {
    const { teamSets, showToast } = useData();
    const [activeTab, setActiveTab] = useState<Tab>('player');
    const [filterClass, setFilterClass] = useState<string>('all');
    const [playerSearch, setPlayerSearch] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const { allPlayers, allTeams, availableClasses, classComparisonData } = useMemo(() => {
        const players: Player[] = [];
        const teams: Omit<RankedTeam, 'rank'>[] = [];
        const classSet = new Set<string>();

        teamSets.forEach(set => {
            if (set.className) classSet.add(set.className);
            Object.values(set.players).forEach(p => players.push(p));
            set.teams.forEach(team => {
                const teamPlayers = team.playerIds.map(id => set.players[id]).filter(Boolean);
                if (teamPlayers.length > 0) {
                    const totalScore = teamPlayers.reduce((sum, p) => sum + p.totalScore, 0);
                    const avgScore = totalScore / teamPlayers.length;

                    const avgStats = STAT_KEYS.reduce((acc, key) => {
                        const totalStat = teamPlayers.reduce((sum, p) => sum + p.stats[key], 0);
                        acc[key] = totalStat / teamPlayers.length;
                        return acc;
                    }, {} as { [key in keyof typeof STAT_NAMES]: number });
                    
                    teams.push({
                        key: `${set.id}___${team.teamName}`,
                        teamName: team.teamName,
                        className: set.className,
                        playerCount: teamPlayers.length,
                        avgScore,
                        avgStats
                    });
                }
            });
        });

        const rankedPlayers = players
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((p, i) => ({ ...p, rank: i + 1 }));
        
        const rankedTeams = teams
            .sort((a,b) => b.avgScore - a.avgScore)
            .map((t, i) => ({ ...t, rank: i + 1}));

        const classData: Record<string, { stats: Record<string, number[]>, count: number }> = {};
        players.forEach(p => {
            const className = p.class ? `${p.class}반` : '기타';
            if (!classData[className]) {
                classData[className] = { stats: STAT_KEYS.reduce((acc, key) => ({...acc, [key]: []}), {}), count: 0 };
            }
            STAT_KEYS.forEach(key => classData[className].stats[key].push(p.stats[key]));
            classData[className].count++;
        });

        const finalClassData = Object.entries(classData).map(([className, data]) => {
            const avgStats = { name: className };
            STAT_KEYS.forEach(key => {
                const sum = data.stats[key].reduce((a, b) => a + b, 0);
                avgStats[STAT_NAMES[key]] = sum / data.count;
            });
            return avgStats;
        });

        return {
            allPlayers: rankedPlayers,
            allTeams: rankedTeams,
            availableClasses: Array.from(classSet).sort(),
            classComparisonData: finalClassData,
        };
    }, [teamSets]);
    
    const filteredPlayers = useMemo(() => {
        return allPlayers.filter(p => {
            const classMatch = filterClass === 'all' || p.class === filterClass;
            const searchMatch = playerSearch === '' || p.originalName.toLowerCase().includes(playerSearch.toLowerCase());
            return classMatch && searchMatch;
        });
    }, [allPlayers, filterClass, playerSearch]);

    const filteredTeams = useMemo(() => {
        return allTeams.filter(t => filterClass === 'all' || t.className.startsWith(filterClass));
    }, [allTeams, filterClass]);

    const handleAiAnalysis = useCallback(async () => {
        setIsAiLoading(true);
        setAiAnalysis('');
        
        const hasApiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY;
        if (!hasApiKey) {
            setAiAnalysis("AI 분석 기능을 사용하려면 API 키가 설정되어야 합니다. 현재 환경에서는 사용할 수 없습니다.");
            setIsAiLoading(false);
            return;
        }

        const promptData = `
            You are a professional volleyball coach and data analyst reviewing student data.
            Here is the data for all players, ranked by a calculated total score:
            ${filteredPlayers.slice(0, 20).map(p => `- ${p.originalName} (Class ${p.class}, Score: ${p.totalScore.toFixed(1)})`).join('\n')}

            Here are the team rankings based on average player score:
            ${filteredTeams.slice(0, 10).map(t => `- ${t.teamName} (Class ${t.className}, Avg Score: ${t.avgScore.toFixed(1)})`).join('\n')}

            Based on this data, please provide a concise analysis covering these points in Korean using markdown for formatting (e.g., ### Title, - List item):
            1.  **### 핵심 선수 분석**: 상위 3명의 선수를 선정하고, 높은 종합 점수에 기반한 그들의 핵심 강점을 설명해줘.
            2.  **### 상위 팀 전략 분석**: 랭킹 1위 팀을 분석해줘. 이 팀의 전략적 강점은 무엇이며, 잠재적인 약점은 무엇일까?
            3.  **### 주목할 만한 선수 (Hidden Gems)**: 종합 순위 5위권 밖이지만, 특정 능력치(예: 가장 높은 서브 점수, 최고의 유연성)가 눈에 띄게 높은 선수 1~2명을 찾아줘. 그들의 잠재력과 팀에서의 역할을 설명해줘.
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: promptData });
            setAiAnalysis(response.text);
        } catch (error) {
            console.error("AI Analysis Error:", error);
            showToast("AI 분석 중 오류가 발생했습니다.", 'error');
            setAiAnalysis("오류가 발생하여 분석을 완료할 수 없었습니다.");
        } finally {
            setIsAiLoading(false);
        }
    }, [filteredPlayers, filteredTeams, showToast]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'player': return <PlayerRankingTable players={filteredPlayers} />;
            case 'team': return <TeamRankingTable teams={filteredTeams} />;
            case 'viz': return <DataVisualization players={filteredPlayers} classData={classComparisonData} />;
            case 'ai': return <AiAnalysisPanel onAnalyze={handleAiAnalysis} isLoading={isAiLoading} result={aiAnalysis} />;
            default: return null;
        }
    };
    
    const TabButton: React.FC<{tab: Tab, label: string}> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-semibold rounded-t-lg transition-colors ${activeTab === tab ? 'bg-[#00A3FF] text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="w-full mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-4 sm:p-6 rounded-lg shadow-2xl flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex border-b border-slate-600">
                    <TabButton tab="player" label="선수 랭킹" />
                    <TabButton tab="team" label="팀 랭킹" />
                    <TabButton tab="viz" label="데이터 시각화" />
                    <TabButton tab="ai" label="AI 분석" />
                </div>
                <div className="flex items-center gap-4">
                    {activeTab === 'player' && (
                        <input
                            type="text"
                            placeholder="선수 이름 검색..."
                            value={playerSearch}
                            onChange={e => setPlayerSearch(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00A3FF]"
                        />
                    )}
                    {(activeTab === 'player' || activeTab === 'team') && (
                        <select
                            value={filterClass}
                            onChange={e => setFilterClass(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00A3FF]"
                        >
                            <option value="all">전체</option>
                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-b-lg rounded-r-lg flex-grow min-h-[60vh]">
                {renderTabContent()}
            </div>
        </div>
    );
};

const PlayerRankingTable: React.FC<{ players: RankedPlayer[] }> = ({ players }) => (
    <div className="overflow-y-auto max-h-[65vh]">
        <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                <tr>
                    <th className="px-4 py-3">순위</th><th className="px-4 py-3">이름</th><th className="px-4 py-3">반</th><th className="px-4 py-3">번호</th><th className="px-4 py-3 text-right">종합 점수</th>
                </tr>
            </thead>
            <tbody>
                {players.map(p => (
                    <tr key={p.id} className="border-b border-slate-700 hover:bg-slate-800">
                        <td className="px-4 py-2 font-bold">{p.rank}</td><td className="px-4 py-2 font-semibold">{p.originalName}</td><td className="px-4 py-2">{p.class}</td><td className="px-4 py-2">{p.studentNumber}</td><td className="px-4 py-2 text-right font-mono text-sky-400">{p.totalScore.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TeamRankingTable: React.FC<{ teams: RankedTeam[] }> = ({ teams }) => (
     <div className="overflow-y-auto max-h-[65vh]">
        <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                <tr>
                    <th className="px-4 py-3">순위</th><th className="px-4 py-3">팀 이름</th><th className="px-4 py-3">소속</th><th className="px-4 py-3">인원</th><th className="px-4 py-3 text-right">평균 점수</th>
                </tr>
            </thead>
            <tbody>
                {teams.map(t => (
                    <tr key={t.key} className="border-b border-slate-700 hover:bg-slate-800">
                        <td className="px-4 py-2 font-bold">{t.rank}</td><td className="px-4 py-2 font-semibold">{t.teamName}</td><td className="px-4 py-2">{t.className}</td><td className="px-4 py-2">{t.playerCount}</td><td className="px-4 py-2 text-right font-mono text-sky-400">{t.avgScore.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const DataVisualization: React.FC<{ players: Player[], classData: any[] }> = ({ players, classData }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-y-auto max-h-[65vh]">
        <div className="bg-slate-800/50 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-center text-slate-300 mb-4">반별 평균 능력치 비교</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="name" tick={{ fill: '#94a3b8' }} /><YAxis tick={{ fill: '#94a3b8' }} /><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} /><Legend /><Bar dataKey={STAT_NAMES.height} fill="#8884d8" /><Bar dataKey={STAT_NAMES.serve} fill="#82ca9d" /><Bar dataKey={STAT_NAMES.underhand} fill="#ffc658" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg">
             <h3 className="text-lg font-bold text-center text-slate-300 mb-4">키 & 셔틀런 상관관계</h3>
            <ResponsiveContainer width="100%" height={300}>
                <ScatterChart><CartesianGrid stroke="#334155" /><XAxis type="number" dataKey="stats.height" name="키" unit="cm" tick={{ fill: '#94a3b8' }} /><YAxis type="number" dataKey="stats.shuttleRun" name="셔틀런" unit="회" tick={{ fill: '#94a3b8' }} /><ZAxis dataKey="originalName" name="이름" /><Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} /><Scatter name="선수" data={players} fill="#00A3FF" /></ScatterChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const AiAnalysisPanel: React.FC<{ onAnalyze: () => void, isLoading: boolean, result: string }> = ({ onAnalyze, isLoading, result }) => {
    // A simple markdown to HTML converter for display
    const formattedResult = result.split('\n').map((line, index) => {
        if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-bold text-sky-400 mt-4 mb-2">{line.substring(4)}</h3>;
        if (line.startsWith('- ')) return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
        return <p key={index} className="mb-2">{line}</p>;
    });

    const hasApiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY;
    
    return (
        <div className="flex flex-col h-full">
            <div className="text-center mb-4">
                <button 
                    onClick={onAnalyze} 
                    disabled={!hasApiKey || isLoading} 
                    title={!hasApiKey ? "API 키가 설정되지 않아 AI 기능을 사용할 수 없습니다." : ""}
                    className="bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-3 px-8 rounded-lg transition duration-200 text-lg disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2 mx-auto">
                    <SparklesIcon className="w-5 h-5" />
                    {isLoading ? '분석 중...' : 'AI로 데이터 분석하기'}
                </button>
                <p className="text-xs text-slate-500 mt-2">현재 필터링된 데이터를 기반으로 AI가 전략적 분석을 제공합니다.</p>
            </div>
            <div className="flex-grow bg-slate-800/50 p-4 rounded-lg overflow-y-auto">
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-sky-400 mx-auto mb-4"></div>
                            <p className="text-slate-300">Gemini API가 데이터를 분석하고 있습니다...</p>
                        </div>
                    </div>
                )}
                {result && !isLoading && (
                    <div className="prose prose-invert max-w-none text-slate-300">
                        {formattedResult}
                    </div>
                )}
                 {!result && !isLoading && (
                     <div className="flex items-center justify-center h-full">
                         <p className="text-slate-500">분석 결과가 여기에 표시됩니다.</p>
                     </div>
                 )}
            </div>
        </div>
    );
};


export default AnalysisScreen;