import React from 'react';
import { Player } from '../types';

interface PlayerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (playerId: string) => void;
    players: Record<string, Player>;
    teamName: string;
    teamColor: string;
}

const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    players,
    teamName,
    teamColor,
}) => {
    if (!isOpen) return null;
    
    // Sort players by student number
    // FIX: Add explicit type `Player` to sort callback parameters `a` and `b` to resolve them being inferred as `unknown`.
    const sortedPlayers = Object.values(players).sort((a: Player, b: Player) => {
        return parseInt(a.studentNumber, 10) - parseInt(b.studentNumber, 10);
    });

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-sm text-white border-2"
                style={{ borderColor: teamColor }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold" style={{ color: teamColor }}>{teamName}</h2>
                    <p className="text-slate-300">어떤 선수가 기록했나요?</p>
                </div>
                <div className="max-h-80 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* FIX: Add explicit type `Player` to map callback parameter `player` to resolve it being inferred as `unknown`. */}
                    {sortedPlayers.map((player: Player) => (
                        <button
                            key={player.id}
                            onClick={() => onSelect(player.id)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-center transition-colors"
                        >
                            <span className="block text-lg font-semibold">{player.originalName}</span>
                            <span className="text-xs text-slate-400">{player.class}반 {player.studentNumber}번</span>
                        </button>
                    ))}
                </div>
                 <div className="mt-6 text-center">
                    <button onClick={onClose} className="text-slate-400 hover:text-white">취소</button>
                </div>
            </div>
        </div>
    );
};

export default PlayerSelectionModal;