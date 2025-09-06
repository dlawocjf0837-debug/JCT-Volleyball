import React from 'react';

interface RulesModalProps {
    onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
    const rules = [
        { title: '1. 경기 진행', content: '한 세트는 11점을 먼저 내는 팀이 승리합니다. 단, 10-10 동점(듀스)일 경우 2점을 먼저 앞서야 승리합니다.' },
        { title: '2. 서브', content: '서브는 코트 뒤쪽에서 진행합니다. 서브권은 득점한 팀에게 주어집니다.' },
        { title: '3. 득점', content: '상대방 코트에 공을 떨어뜨리거나, 상대팀이 범실(파울)을 했을 경우 1점을 획득합니다.' },
        { title: '4. 4단 플레이', content: '한 팀은 공을 상대 코트로 넘기기 전까지 최대 4번까지 공을 터치할 수 있습니다. 남학생 또는 여학생의 터치로 한 번만에 넘길 수는 있지만, 나머지 경우는 여학생의 터치가 1회 포함되어야 합니다.' },
        { title: '5. 터치 네트', content: '경기 중 신체 일부를 네트에 고의로 닿으면 실점으로 간주한다. 고의가 아닌 상황에서는 경기에 방해가 되지 않는 이상 경기를 정상적으로 진행한다.' },
        { title: '6. 주요 범실 (파울)', content: '오버 네트(네트 위로 손이 넘어가는 행위), 캐치 볼(공을 잡거나 던지는 행위), 라인 아웃 등이 있습니다.' },
        { title: '7. 점수판 기능', content: '서브 득점/범실, 3단 플레이 성공, 페어플레이 점수를 기록하여 경기를 더 상세하게 분석할 수 있습니다.' },
        { title: '8. 원바운드', content: '배구 라인 안에 1번 바운드된 공은 정상 플레이로 간주한다.' },
    ];

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
                    <h2 className="text-2xl font-bold text-[#00A3FF]">간이 배구 규칙</h2>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>
                <div className="space-y-4">
                    {rules.map((rule, index) => (
                        <div key={index} className="bg-slate-800/50 p-3 rounded-lg">
                            <h3 className="font-bold text-lg text-sky-300">{rule.title}</h3>
                            <p className="text-slate-300 mt-1">{rule.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RulesModal;