import React, { useState, useCallback, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import Header from './components/common/Header';
import Toast from './components/common/Toast';
import MenuScreen from './screens/MenuScreen';
import MatchSetupScreen from './screens/MatchSetupScreen';
import { ScoreboardScreen } from './screens/ScoreboardScreen';
import RecordScreen from './screens/RecordScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import { Player, MatchState } from './types';
import ConfirmationModal from './components/common/ConfirmationModal';

const AppContent: React.FC = () => {
    const [view, setView] = useState<'menu' | 'matchSetup' | 'attendance' | 'scoreboard' | 'history'>('menu');
    const { toast, hideToast, isLoading, startMatch, recoveryData, handleRestoreFromBackup, dismissRecovery } = useData();
    const [teamsForAttendance, setTeamsForAttendance] = useState<{ teamA: string, teamB: string, teamAKey?: string, teamBKey?: string } | null>(null);

    const handleGoToAttendance = (teams: { teamA: string, teamB: string, teamAKey?: string, teamBKey?: string }) => {
        setTeamsForAttendance(teams);
        setView('attendance');
    };

    const handleStartMatchFromAttendance = (attendingPlayers: { teamA: Record<string, Player>, teamB: Record<string, Player>}) => {
        if (!teamsForAttendance) return;
        startMatch(teamsForAttendance, undefined, attendingPlayers);
        setView('scoreboard');
    };
    
    const handleContinueGame = (gameState: MatchState & { time?: number }) => {
        startMatch(undefined, gameState);
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
            case 'matchSetup':
                return <MatchSetupScreen onStartMatch={handleGoToAttendance} />;
            case 'attendance':
                if (!teamsForAttendance) {
                    setView('matchSetup');
                    return null;
                }
                return <AttendanceScreen teamSelection={teamsForAttendance} onStartMatch={handleStartMatchFromAttendance} />;
            case 'scoreboard':
                return <ScoreboardScreen onBackToMenu={navigateToMenu} mode={'record'} />;
            case 'history':
                return <RecordScreen onContinueGame={handleContinueGame} />;
            case 'menu':
            default:
                return (
                    <MenuScreen
                        onStartMatch={() => setView('matchSetup')}
                        onShowHistory={() => setView('history')}
                    />
                );
        }
    };

    const getHeaderTitle = () => {
        switch (view) {
            case 'matchSetup': return '경기 설정';
            case 'attendance': return '출전 선수 선택';
            case 'scoreboard': return 'VOLLEYBALL SCOREBOARD';
            case 'history': return '경기 기록';
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