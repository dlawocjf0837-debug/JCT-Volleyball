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
import TeamManagementScreen from './screens/TeamManagementScreen';
import TeamAnalysisScreen from './screens/TeamAnalysisScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import { Player, Screen, Stats, STAT_KEYS, MatchState } from './types';
import ConfirmationModal from './components/common/ConfirmationModal';

const AppContent: React.FC = () => {
    const [view, setView] = useState<'menu' | 'teamBuilder' | 'matchSetup' | 'attendance' | 'scoreboard' | 'history' | 'referee' | 'announcer' | 'cameraDirector' | 'teamManagement' | 'teamAnalysis'>('menu');
    const [scoreboardMode, setScoreboardMode] = useState<'record' | 'referee'>('record');
    const { toast, hideToast, isLoading, exportData, saveImportedData, startHostSession, p2p, resetAllData, recoveryData, handleRestoreFromBackup, dismissRecovery } = useData();
    const [teamsForAttendance, setTeamsForAttendance] = useState<{ teamA: string, teamB: string, teamAKey?: string, teamBKey?: string } | null>(null);

    // --- State and Logic for Team Builder ---
    const [builderScreen, setBuilderScreen] = useState<Screen>(Screen.Input);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentClass, setCurrentClass] = useState<string>('all');
    
    // This effect handles navigation for peers, ensuring they don't access host-only screens.
    useEffect(() => {
        if (p2p.isHost || !p2p.isConnected) return;
        const allowedPeerViews: Set<string> = new Set(['menu', 'announcer', 'cameraDirector', 'history']);
        if (!allowedPeerViews.has(view)) setView('menu');
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

                if (key === 'fiftyMeterDash') {
                    // Lower is better. Best score (min) gets 100.
                    // The score is relative to the best performance (min value).
                    if (value > 0) {
                        normalizedValue = (min / value) * 100;
                    } else {
                        normalizedValue = 0;
                    }
                } else {
                    // Higher is better. Best score (max) gets 100.
                    // The score is relative to the best performance (max value).
                    if (max > 0) {
                        normalizedValue = (value / max) * 100;
                    } else {
                        normalizedValue = 0; // If max is 0, all values must be 0.
                    }
                }
                
                // Ensure scores are within the 0-100 range.
                normalizedStats[key] = Math.max(0, Math.min(normalizedValue, 100));
                totalNormalizedScore += normalizedStats[key]!;
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

    const handleGoToAttendance = (teams: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }) => {
        setTeamsForAttendance(teams);
        setView('attendance');
    };

    const handleStartMatchFromAttendance = (attendingPlayers: { teamA: Record<string, Player>, teamB: Record<string, Player>}) => {
        if (!teamsForAttendance) return;
        startHostSession(teamsForAttendance, undefined, attendingPlayers);
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
        setScoreboardMode('record');
        setView('scoreboard');
    };
    
    const navigateToMenu = () => {
        setTeamsForAttendance(null);
        setView('menu');
    }

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
                return <MatchSetupScreen onStartMatch={handleGoToAttendance} />;
            case 'attendance':
                if (!teamsForAttendance) {
                    setView('matchSetup');
                    return null;
                }
                return <AttendanceScreen teamSelection={teamsForAttendance} onStartMatch={handleStartMatchFromAttendance} />;
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
            case 'teamManagement':
                return <TeamManagementScreen />;
            case 'teamAnalysis':
                return <TeamAnalysisScreen />;
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
                        onStartTeamAnalysis={() => setView('teamAnalysis')}
                        onStartTeamManagement={() => setView('teamManagement')}
                        onStartAnnouncer={() => setView('announcer')}
                        onStartCameraDirector={() => setView('cameraDirector')}
                        onExportData={exportData}
                        onSaveImportedData={saveImportedData}
                        onResetAllData={resetAllData}
                    />
                );
        }
    };

    const getHeaderTitle = () => {
        switch (view) {
            case 'teamBuilder': return 'VOLLEYBALL TEAM BUILDER';
            case 'matchSetup': return '경기 설정';
            case 'attendance': return '출전 선수 선택';
            case 'scoreboard': return 'VOLLEYBALL SCOREBOARD';
            case 'history': return '경기 기록';
            case 'referee': return '주심용 점수판';
            case 'announcer': return '아나운서 프로그램';
            case 'cameraDirector': return '카메라 감독 프로그램';
            case 'teamManagement': return '팀 관리';
            case 'teamAnalysis': return '팀 성과 분석';
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
            <ConfirmationModal
                isOpen={!!recoveryData}
                onClose={dismissRecovery}
                onConfirm={handleRestoreFromBackup}
                title="데이터 복구"
                message="자동으로 저장된 최신 백업 데이터를 찾았습니다. 이 데이터를 복구하시겠습니까?"
                confirmText="복구하기"
            />
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