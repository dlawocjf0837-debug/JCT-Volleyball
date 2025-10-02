import React, { useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { resizeAndCompressImage } from '../utils/imageUtils';
import { PhotoIcon, VolleyballIcon, FireIcon, ShieldIcon, BoltIcon, SunIcon, StarIcon } from './icons';
import TeamEmblem from './TeamEmblem';

interface EmblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (emblem: string) => void;
}

const defaultIcons: { [key: string]: React.FC<{className?: string}> } = {
    'icon_volleyball': VolleyballIcon,
    'icon_fire': FireIcon,
    'icon_shield': ShieldIcon,
    'icon_bolt': BoltIcon,
    'icon_sun': SunIcon,
    'icon_star': StarIcon,
};

const EmblemModal: React.FC<EmblemModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { userEmblems, saveUserEmblems, showToast } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('이미지 파일만 업로드할 수 있습니다.', 'error');
                return;
            }

            setIsProcessing(true);
            try {
                const base64Data = await resizeAndCompressImage(file, 128, 128);
                const newEmblemId = `user_${Date.now()}`;
                const newEmblems = [...userEmblems, { id: newEmblemId, data: base64Data }];
                await saveUserEmblems(newEmblems);
                onSelect(newEmblemId);
            } catch (error) {
                console.error("Image processing failed:", error);
                showToast('이미지 처리 중 오류가 발생했습니다.', 'error');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-lg text-white border border-[#00A3FF]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[#00A3FF]">앰블럼 선택</h2>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>

                {userEmblems.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-300 mb-2">나만의 앰블럼</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                            {userEmblems.map((emblem) => (
                                <button
                                    key={emblem.id}
                                    onClick={() => onSelect(emblem.id)}
                                    className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center p-2 hover:bg-slate-700 hover:ring-2 ring-sky-500 transition-all"
                                    aria-label={`사용자 앰블럼 선택`}
                                >
                                    <TeamEmblem emblem={emblem.id} className="w-full h-full" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">기본 아이콘</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {Object.entries(defaultIcons).map(([key, IconComponent]) => (
                            <button
                                key={key}
                                onClick={() => onSelect(key)}
                                className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center p-2 hover:bg-slate-700 hover:ring-2 ring-sky-500 transition-all"
                                aria-label={`아이콘 ${key.split('_')[1]} 선택`}
                            >
                                <IconComponent className="w-full h-full text-slate-300" />
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">이미지 업로드</h3>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-lg transition duration-200 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white"></div>
                                처리 중...
                            </>
                        ) : (
                            <>
                                <PhotoIcon className="w-6 h-6" />
                                내 컴퓨터에서 이미지 선택
                            </>
                        )}
                    </button>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                        * 이미지는 128x128 픽셀로 자동 최적화되어 저장됩니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmblemModal;