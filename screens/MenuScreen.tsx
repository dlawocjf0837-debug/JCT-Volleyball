import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { TeamSet, MatchState, TeamMatchState } from '../types';

interface MenuScreenProps {
    onStartTeamBuilder: () => void;
    onStartMatch: () => void;
    onShowHistory: () => void;
    onStartTeamAnalysis: () => void;
    onStartTeamManagement: () => void;
    onStartAnnouncer: () => void;
    onStartCameraDirector: () => void;
    onExportData: () => void;
    onSaveImportedData: (data: { teamSets: TeamSet[], matchHistory: (MatchState & { date: string; time?: number })[] }) => void;
    onResetAllData: () => void;
}

// Data validation helpers
const isValidTeamSet = (set: any): set is TeamSet => {
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

const isValidMatchState = (match: any): match is MatchState => {
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

const MenuScreen: React.FC<MenuScreenProps> = ({ 
    onStartTeamBuilder, 
    onStartMatch, 
    onShowHistory, 
    onStartTeamAnalysis,
    onStartTeamManagement,
    onStartAnnouncer, 
    onStartCameraDirector,
    onExportData,
    onSaveImportedData,
    onResetAllData
}) => {
    const { p2p, joinPeerSession, endSession, matchState, showToast } = useData();
    const [showJoinUI, setShowJoinUI] = useState(false);
    const [joinSessionId, setJoinSessionId] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [resetStep, setResetStep] = useState<'password' | 'finalConfirm'>('password');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [dataToImport, setDataToImport] = useState<any>(null);

    const handleJoin = () => {
        const trimmedId = joinSessionId.trim();
        if (!trimmedId) {
            alert('참여 코드를 입력해주세요.');
            return;
        }

        // Prevent users from entering a full URL as the session ID
        if (trimmedId.includes('/') || trimmedId.startsWith('http')) {
            alert('잘못된 참여 코드 형식입니다. URL이 아닌, 호스트에게 전달받은 짧은 ID를 입력해주세요.');
            setJoinSessionId(''); // Clear the invalid input
            return;
        }

        joinPeerSession(trimmedId);
    };

    const handleOpenResetModal = () => {
        setPasswordInput('');
        setPasswordError('');
        setResetStep('password');
        setIsResetModalOpen(true);
    };

    const handleResetConfirm = () => {
        if (resetStep === 'password') {
            if (passwordInput === '9999') {
                setResetStep('finalConfirm');
                setPasswordError('');
            } else {
                setPasswordError('비밀번호가 올바르지 않습니다.');
            }
        } else if (resetStep === 'finalConfirm') {
            onResetAllData();
            setIsResetModalOpen(false);
        }
    };

    const handleImportConfirm = () => {
        if (dataToImport) {
            onSaveImportedData(dataToImport);
        }
        setIsImportModalOpen(false);
        setDataToImport(null);
    };

    const handleImportDataClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const text = e.target?.result;
                        if (typeof text !== 'string') throw new Error("파일을 읽을 수 없습니다.");
                        const importedData = JSON.parse(text);
                        
                        const teamSetsAreValid = importedData.teamSets && Array.isArray(importedData.teamSets) && importedData.teamSets.every(isValidTeamSet);
                        const historyIsValid = importedData.matchHistory && Array.isArray(importedData.matchHistory) && importedData.matchHistory.every((m: any) => m && typeof m.date === 'string' && isValidMatchState(m));

                        if (teamSetsAreValid && historyIsValid) {
                            setDataToImport(importedData);
                            setIsImportModalOpen(true);
                        } else {
                            throw new Error("유효하지 않은 파일 형식입니다.");
                        }
                    } catch (error: any) {
                        showToast(`데이터 가져오기 실패: ${error.message}`, 'error');
                        console.error("Import failed:", error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };
    
    const isClientConnected = p2p.isConnected && !p2p.isHost;

    if (isClientConnected) {
        return (
            <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-4 h-full animate-fade-in py-10">
                <div className="w-full text-center bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-xl font-bold text-[#00A3FF]">세션 참여 중</h2>
                    <p className="text-slate-400">호스트: <span className="font-mono">{p2p.connections[0]?.peer}</span></p>
                    <p className="text-sm mt-2">{matchState ? '경기 데이터를 수신 중입니다.' : '데이터를 기다리는 중...'}</p>
                </div>
                <button
                    onClick={onStartAnnouncer}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    아나운서 프로그램
                </button>
                <button
                    onClick={onStartCameraDirector}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    카메라 감독 프로그램
                </button>
                 <button onClick={endSession} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg mt-4">
                    세션 나가기
                </button>
            </div>
        );
    }

    if (showJoinUI) {
        return (
            <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-4 h-full animate-fade-in py-10">
                <h2 className="text-2xl font-bold text-slate-300">실시간 세션 참여</h2>
                <input
                    type="text"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    placeholder="공유받은 참여 코드를 입력하세요"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md p-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#00A3FF]"
                    disabled={p2p.isConnecting}
                />
                <button
                    onClick={handleJoin}
                    disabled={p2p.isConnecting}
                    className="w-full bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold py-4 px-8 rounded-lg transition duration-200 text-xl disabled:bg-slate-600"
                >
                    {p2p.isConnecting ? '연결 중...' : '참여하기'}
                </button>
                <button
                    onClick={() => setShowJoinUI(false)}
                    className="text-slate-400 hover:text-white"
                    disabled={p2p.isConnecting}
                >
                    뒤로가기
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-4 h-full animate-fade-in py-10">
                {p2p.isHost && p2p.sessionId && (
                     <div className="w-full text-center bg-slate-800 p-4 rounded-lg border border-green-500">
                        <h2 className="text-xl font-bold text-green-400">호스트로 세션 진행 중</h2>
                        <p className="text-slate-400">다른 참가자에게 코드를 공유하세요.</p>
                        <p className="font-mono text-2xl bg-slate-900 p-2 rounded-md mt-2 text-white tracking-widest">{p2p.sessionId}</p>
                         <button onClick={endSession} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg mt-3 text-sm">
                            세션 종료하기
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setShowJoinUI(true)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg shadow-green-500/20 transform hover:scale-105"
                >
                    실시간 세션 참여
                </button>
                <button
                    onClick={onStartTeamBuilder}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    팀 구성하기
                </button>
                <button
                    onClick={onStartMatch}
                    disabled={p2p.isConnecting}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105 disabled:bg-slate-800 disabled:text-slate-500 disabled:transform-none disabled:cursor-not-allowed"
                >
                    {p2p.isConnecting ? '연결 중...' : '경기 시작하기 (호스트)'}
                </button>
                <button
                    onClick={onShowHistory}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    기록 보기
                </button>
                <button
                    onClick={onStartTeamAnalysis}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    팀 분석
                </button>
                <button
                    onClick={onStartTeamManagement}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    팀 관리
                </button>
                 <div className="w-full pt-4 mt-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-center gap-4">
                     <button
                        onClick={handleImportDataClick}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                    >
                        데이터 가져오기 (Import)
                    </button>
                     <button
                        onClick={onExportData}
                        className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                    >
                        데이터 내보내기 (Export)
                    </button>
                </div>
                <div className="w-full pt-2 mt-2">
                    <button
                        onClick={handleOpenResetModal}
                        className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg shadow-red-500/20"
                    >
                        모든 데이터 초기화
                    </button>
                </div>
            </div>
            <ConfirmationModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onConfirm={handleImportConfirm}
                title="데이터 가져오기 확인"
                message="가져온 데이터로 현재 모든 데이터를 덮어쓰시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmText="가져오기"
            />
            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetConfirm}
                title="데이터 초기화 확인"
                message={resetStep === 'password'
                    ? "정말로 모든 팀 데이터와 경기 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다. 진행하려면 비밀번호를 입력하세요."
                    : "모든 데이터가 영구적으로 삭제됩니다. 정말로 진행하시겠습니까?"}
                confirmText="삭제"
            >
                {resetStep === 'password' && (
                    <div className="my-4">
                        <label htmlFor="password-confirm" className="block text-sm font-medium text-slate-400 mb-2">
                            비밀번호
                        </label>
                        <input
                            id="password-confirm"
                            type="password"
                            value={passwordInput}
                            onChange={(e) => {
                                setPasswordInput(e.target.value);
                                if (passwordError) setPasswordError('');
                            }}
                            placeholder="비밀번호 입력"
                            className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            autoComplete="off"
                            autoFocus
                        />
                        {passwordError && <p className="text-red-500 text-sm mt-2 text-center">{passwordError}</p>}
                    </div>
                )}
            </ConfirmationModal>
        </>
    );
};

export default MenuScreen;
