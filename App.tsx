import React, { useState, useCallback, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import Header from './components/common/Header';
import Toast from './components/common/Toast';
import MenuScreen from './screens/MenuScreen';
import PlayerInputScreen from './screens/PlayerInputScreen';
import TeamBuilderScreen from './screens/TeamBuilderScreen';
import MatchSetupScreen from './screens/MatchSetupScreen';
import { ScoreboardScreen } from './screens/ScoreboardScreen';
import RecordScreen from './screens/RecordScreen';
import RefereeScreen from './screens/RefereeScreen';
import AnnouncerScreen from './screens/AnnouncerScreen';
import CameraDirectorScreen from './screens/CameraDirectorScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import { Player, Screen, Stats, STAT_KEYS, MatchState } from './types';

const AppContent: React.FC = () => {
    const [view, setView] = useState<'menu' | 'teamBuilder' | 'matchSetup' | 'scoreboard' | 'history' | 'referee' | 'announcer' | 'cameraDirector' | 'analysis'>('menu');
    const [scoreboardMode, setScoreboardMode] = useState<'record' | 'referee'>('record');
    const { toast, hideToast, isLoading, exportData, importData, startHostSession, matchState, p2p } = useData();

    // --- State and Logic for Team Builder ---
    const [builderScreen, setBuilderScreen] = useState<Screen>(Screen.Input);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentClass, setCurrentClass] = useState<string>('all');
    
    // This effect handles navigation for peers, ensuring they don't access host-only screens.
    useEffect(() => {
        // This logic only applies to clients who have successfully connected as a peer.
        if (p2p.isHost || !p2p.isConnected) {
            return;
        }

        // A peer (non-host) should only be on one of these allowed screens.
        const allowedPeerViews: Set<string> = new Set(['menu', 'announcer', 'cameraDirector', 'history']);

        // If a peer finds themselves on a screen that is NOT in the allowed list
        // (e.g., a host-exclusive screen), we immediately navigate them back to the main menu.
        // This is more robust than checking against a list of "host-only" screens.
        if (!allowedPeerViews.has(view)) {
            setView('menu');
        }
    }, [p2p.isHost, p2p.isConnected, view]);

    const handleStartBuilding = useCallback((newPlayers: Omit<Player, 'id' | 'anonymousName' | 'isCaptain' | 'totalScore'>[], selectedClass: string) => {
        const statsRange: Record<keyof Stats, { min: number, max: number }> = STAT_KEYS.reduce((acc, key) => {
            acc[key] = { min: Infinity, max: -Infinity };
            return acc;
        }, {} as Record<keyof Stats, { min: number, max: number }>);

        newPlayers.forEach(p => {
            STAT_KEYS.forEach(key => {
                statsRange[key].min = Math.min(statsRange[key].min, p.stats[key]);
                statsRange[key].max = Math.max(statsRange[key].max, p.stats[key]);
            });
        });

        const playersWithScores = newPlayers.map(p => {
            let totalNormalizedScore = 0;
            const normalizedStats: Partial<Stats> = {};
            STAT_KEYS.forEach(key => {
                const { min, max } = statsRange[key];
                const value = p.stats[key];
                let normalizedValue = 0;
                if (max - min > 0) {
                    if (key === 'fiftyMeterDash') {
                        normalizedValue = ((max - value) / (max - min)) * 100;
                    } else {
                        normalizedValue = ((value - min) / (max - min)) * 100;
                    }
                } else {
                    normalizedValue = 50;
                }
                normalizedStats[key] = normalizedValue;
                totalNormalizedScore += normalizedValue;
            });
            const totalScore = totalNormalizedScore / STAT_KEYS.length;
            return { ...p, stats: normalizedStats as Stats, totalScore };
        });

        const finalPlayers: Player[] = playersWithScores
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((p, index) => ({
                ...p,
                id: `${Date.now()}-${p.class}-${p.studentNumber}-${index}`,
                anonymousName: `플레이어 ${index + 1}`,
                isCaptain: false,
            }));
        
        setPlayers(finalPlayers);
        setCurrentClass(selectedClass);
        setBuilderScreen(Screen.Builder);
    }, []);

    const handleResetBuilder = useCallback(() => {
        setPlayers([]);
        setBuilderScreen(Screen.Input);
        setView('menu');
    }, []);

    const handleStartRecordMatch = (teams: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }) => {
        startHostSession(teams);
        setScoreboardMode('record');
        setView('scoreboard');
    };
    
    const handleStartRefereeMatch = (teams: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }) => {
        startHostSession(teams);
        setScoreboardMode('referee');
        setView('scoreboard');
    };
    
    const handleContinueGame = (gameState: MatchState) => {
        startHostSession(undefined, gameState);
        setScoreboardMode('record'); // Continuing a game always goes to record mode
        setView('scoreboard');
    };
    
    const navigateToMenu = () => setView('menu');

    const renderView = () => {
        if (isLoading) {
            return (
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#00A3FF]"></div>
                        <p className="mt-4 text-lg">데이터 로딩 중...</p>
                    </div>
                </div>
            );
        }

        switch (view) {
            case 'teamBuilder':
                if (builderScreen === Screen.Input) {
                    return <PlayerInputScreen onStart={handleStartBuilding} />;
                } else {
                    return <TeamBuilderScreen initialPlayers={players} onReset={handleResetBuilder} selectedClass={currentClass} />;
                }
            case 'matchSetup':
                return <MatchSetupScreen onStartMatch={handleStartRecordMatch} />;
            case 'scoreboard':
                return <ScoreboardScreen onBackToMenu={navigateToMenu} mode={scoreboardMode} />;
            case 'history':
                return <RecordScreen onContinueGame={handleContinueGame} />;
            case 'referee':
                 return <RefereeScreen onStartMatch={handleStartRefereeMatch} />;
            case 'announcer':
                 return <AnnouncerScreen onNavigateToHistory={() => setView('history')} />;
            case 'cameraDirector':
                 return <CameraDirectorScreen />;
            case 'analysis':
                return <AnalysisScreen />;
            case 'menu':
            default:
                return (
                    <MenuScreen
                        onStartTeamBuilder={() => {
                            setBuilderScreen(Screen.Input);
                            setPlayers([]);
                            setView('teamBuilder');
                        }}
                        onStartMatch={() => setView('matchSetup')}
                        onShowHistory={() => setView('history')}
                        onStartAnalysis={() => setView('analysis')}
                        onStartReferee={() => setView('referee')}
                        onStartAnnouncer={() => setView('announcer')}
                        onStartCameraDirector={() => setView('cameraDirector')}
                        onExportData={exportData}
                        onImportData={importData}
                    />
                );
        }
    };

    const getHeaderTitle = () => {
        switch (view) {
            case 'teamBuilder': return 'VOLLEYBALL TEAM BUILDER';
            case 'matchSetup': return '경기 설정';
            case 'scoreboard': return 'VOLLEYBALL SCOREBOARD';
            case 'history': return '경기 기록';
            case 'referee': return '주심용 점수판';
            case 'announcer': return '아나운서 프로그램';
            case 'cameraDirector': return '카메라 감독 프로그램';
            case 'analysis': return '종합 데이터 분석';
            default: return 'MAIN MENU';
        }
    }

    return (
        <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8 flex flex-col">
            <Header title={getHeaderTitle()} showBackButton={view !== 'menu'} onBack={navigateToMenu} />
            <main className="flex-grow flex flex-col">
                {renderView()}
            </main>
            <footer className="text-center mt-12 text-xs text-slate-500">
                <p>&copy; 2025. <span className="font-semibold text-[#00A3FF]">JCT</span>. All Rights Reserved.</p>
            </footer>
            {toast.message && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    );
};


const App: React.FC = () => {
    return (
        <DataProvider>
            <AppContent />
        </DataProvider>
    );
};

export default App;