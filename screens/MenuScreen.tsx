import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

interface MenuScreenProps {
    onStartTeamBuilder: () => void;
    onStartMatch: () => void;
    onShowHistory: () => void;
    onStartReferee: () => void;
    onStartAnnouncer: () => void;
    onStartCameraDirector: () => void;
    onExportData: () => void;
    onImportData: () => void;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ 
    onStartTeamBuilder, 
    onStartMatch, 
    onShowHistory, 
    onStartReferee, 
    onStartAnnouncer, 
    onStartCameraDirector,
    onExportData,
    onImportData
}) => {
    const { p2p, joinPeerSession, endSession, matchState } = useData();
    const [showJoinUI, setShowJoinUI] = useState(false);
    const [joinSessionId, setJoinSessionId] = useState('');

    const handleJoin = () => {
        if (joinSessionId.trim()) {
            joinPeerSession(joinSessionId.trim());
        }
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
                onClick={onStartReferee}
                disabled={p2p.isConnecting}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105 disabled:bg-slate-800 disabled:text-slate-500 disabled:transform-none disabled:cursor-not-allowed"
            >
                {p2p.isConnecting ? '연결 중...' : '주심용 점수판 (호스트)'}
            </button>
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
             <div className="w-full pt-4 mt-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button
                    onClick={onImportData}
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
        </div>
    );
};

export default MenuScreen;
