import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import ConfirmationModal from '../components/common/ConfirmationModal';

interface MenuScreenProps {
    onStartMatch: () => void;
    onShowHistory: () => void;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ 
    onStartMatch, 
    onShowHistory, 
}) => {
    const { exportData, resetAllData, saveImportedData } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') {
                    throw new Error("File could not be read as text.");
                }
                const data = JSON.parse(result);
                // Simple validation can be added here if needed
                if (data.teamSets && data.matchHistory) {
                    saveImportedData(data);
                } else {
                    alert('유효하지 않은 파일 형식입니다.');
                }
            } catch (error) {
                console.error("Error parsing imported file:", error);
                alert('파일을 가져오는 중 오류가 발생했습니다.');
            }
        };
        reader.readAsText(file);

        // Reset file input to allow selecting the same file again
        if (event.target) {
            event.target.value = '';
        }
    };
    
    const handleResetConfirm = () => {
        resetAllData();
        setIsResetModalOpen(false);
    }

    return (
        <>
            <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-4 h-full animate-fade-in py-10">
                <button
                    onClick={onStartMatch}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    주심용 점수판
                </button>
                <button
                    onClick={onShowHistory}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-8 rounded-lg transition duration-200 text-2xl shadow-lg transform hover:scale-105"
                >
                    기록 보기
                </button>

                <div className="w-full border-t border-slate-700 my-4"></div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button
                        onClick={handleImportClick}
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 px-6 rounded-lg transition duration-200 text-lg"
                    >
                        데이터 가져오기
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelected}
                        className="hidden"
                        accept=".json"
                    />
                    <button
                        onClick={exportData}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-lg transition duration-200 text-lg"
                    >
                        데이터 내보내기
                    </button>
                </div>
                 <button
                    onClick={() => setIsResetModalOpen(true)}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg mt-4"
                >
                    모든 데이터 초기화
                </button>
            </div>
            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetConfirm}
                title="데이터 초기화 확인"
                message="정말로 모든 팀 정보와 경기 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmText="초기화"
            />
        </>
    );
};

export default MenuScreen;