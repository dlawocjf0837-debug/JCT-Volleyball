import React from 'react';

interface HeaderProps {
    title: string;
    showBackButton: boolean;
    onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, showBackButton, onBack }) => {
    return (
        <header className="text-center mb-8 relative flex items-center justify-center">
             {showBackButton && (
                <button 
                    onClick={onBack}
                    className="absolute left-0 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                    aria-label="메인화면으로 돌아가기"
                >
                    메인화면으로
                </button>
            )}
            <div className="flex-grow">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-[#00A3FF] tracking-wider uppercase transform -skew-x-12">
                    JCT <span className="text-white">{title}</span>
                </h1>
                <p className="text-slate-400 mt-2 text-sm tracking-widest">By JCT</p>
            </div>
        </header>
    );
};

export default Header;