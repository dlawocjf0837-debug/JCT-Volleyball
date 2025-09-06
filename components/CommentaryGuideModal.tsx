import React from 'react';

interface CommentaryGuideModalProps {
    onClose: () => void;
}

const commentaryData = [
    {
        title: '공격 성공 시',
        phrases: [
            "수비에서부터 3단 공격까지 완벽한 3단 플레이에 이어 득점까지, A팀 정말 완벽한 공격 성공입니다.",
            "빈틈을 놓치지 않는 날카로운 공격, 득점으로 연결되네요!",
            "상대 수비수들을 속이는 페인트 공격! 득점입니다!",
        ]
    },
    {
        title: '서브 성공 시 (서브 에이스)',
        phrases: [
            "상대 코트를 흔드는 강력한 서브! 서브 에이스로 득점을 만들어냅니다.",
            "정확한 서브로 상대 리시브 라인을 무너뜨리며 득점에 성공합니다.",
            "아무도 예상치 못한 방향으로 들어가는 절묘한 서브, 그대로 득점입니다!",
        ]
    },
    {
        title: '블로킹 성공 시',
        phrases: [
            "상대 공격을 완벽히 차단하는 거대한 벽! 블로킹 성공입니다!",
            "수비의 꽃이라고 불리는 블로킹! 상대의 강한 공격을 완벽히 막아냅니다.",
        ]
    },
    {
        title: '수비 성공 시',
        phrases: [
            "상대의 강한 스파이크를 정확한 리시브로 받아냅니다! 이어진 반격 찬스!",
            "디그(dig) 수비로 공을 살려냅니다. 정말 포기하지 않는 모습이네요!",
        ]
    },
    {
        title: '범실 시',
        phrases: [
            "아쉽게도 공이 라인을 벗어났습니다. 범실로 상대에게 득점을 내주네요.",
            "네트를 넘지 못하는 서브, 아쉽게도 범실입니다.",
        ]
    },
    {
        title: '작전 타임 시',
        phrases: [
            "양 팀의 감독이 작전 타임을 요청했습니다. 치열한 접전이 펼쳐지고 있네요.",
            "잠시 숨을 고를 시간입니다. 다음 작전이 기대됩니다.",
        ]
    },
];

const CommentaryGuideModal: React.FC<CommentaryGuideModalProps> = ({ onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-2xl text-white border border-slate-700 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[#00A3FF]">해설 가이드</h2>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>
                <div className="space-y-4">
                    {commentaryData.map((category, index) => (
                        <div key={index} className="bg-slate-800/50 p-3 rounded-lg">
                            <h3 className="font-bold text-lg text-sky-300">{category.title}</h3>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300">
                                {category.phrases.map((phrase, pIndex) => (
                                    <li key={pIndex}>{phrase}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommentaryGuideModal;
