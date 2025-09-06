import React from 'react';

interface TimeoutModalProps {
    timeLeft: number;
    onClose: () => void;
}

const TimeoutModal: React.FC<TimeoutModalProps> = ({ timeLeft, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
        >
            <div 
                className="bg-slate-900 rounded-lg shadow-2xl p-8 w-full max-w-sm mx-4 text-white border-2 border-[#00A3FF] text-center"
            >
                <h2 className="text-3xl font-bold text-[#00A3FF] mb-4">작전 타임</h2>
                <p className="text-8xl font-mono font-extrabold mb-6">{timeLeft}</p>
                <button 
                    onClick={onClose}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-8 rounded-lg transition duration-200 text-lg"
                >
                    닫기
                </button>
            </div>
        </div>
    );
};

export default TimeoutModal;