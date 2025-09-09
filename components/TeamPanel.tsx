import React, { useState, useEffect } from 'react';
import { TeamId } from '../types';
import { UserGroupIcon } from './icons';

interface TeamPanelProps {
    teamId: TeamId;
    name: string;
    playerCount: number;
    color: string;
    onDrop: (playerId: string, teamId: TeamId) => void;
    children: React.ReactNode;
    onNameChange?: (teamId: TeamId, newName: string) => void;
    isCurrentPick: boolean;
    headerControls?: React.ReactNode;
}

const TeamPanel: React.FC<TeamPanelProps> = ({ teamId, name, playerCount, color, onDrop, children, onNameChange, isCurrentPick, headerControls }) => {
    const [isOver, setIsOver] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentName, setCurrentName] = useState(name);

    useEffect(() => {
        if (!isEditing) {
            setCurrentName(name);
        }
    }, [name, isEditing]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
        const playerId = e.dataTransfer.getData('playerId');
        if (playerId && teamId !== 'unassigned') {
            onDrop(playerId, teamId);
        }
    };

    const handleNameUpdate = () => {
        if (onNameChange && currentName.trim()) {
            onNameChange(teamId, currentName.trim());
        } else {
            setCurrentName(name);
        }
        setIsEditing(false);
    };
    
    const borderColor = isOver ? '#00A3FF' : (isCurrentPick ? '#fde047' : color);
    const currentPickClasses = isCurrentPick ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-[#0a0f1f] shadow-yellow-300/30 shadow-lg' : '';

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-slate-900/50 p-4 rounded-xl border-2 border-dashed ${isOver ? 'bg-slate-800/70' : ''} ${currentPickClasses} transition-all duration-300 min-h-[200px] flex flex-col`}
            style={{ borderColor: borderColor }}
        >
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h2 className="text-2xl font-bold text-slate-300 flex items-center gap-2">
                    <UserGroupIcon className="w-6 h-6"/>
                    {isEditing ? (
                        <input
                            type="text"
                            value={currentName}
                            onChange={(e) => setCurrentName(e.target.value)}
                            onBlur={handleNameUpdate}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleNameUpdate(); }}
                            autoFocus
                            className="bg-slate-700 text-white text-2xl font-bold text-center rounded-md outline-none w-48"
                        />
                    ) : (
                        <span
                            onClick={() => onNameChange && setIsEditing(true)}
                            className={onNameChange ? 'cursor-pointer p-1 rounded-md hover:bg-slate-700' : ''}
                        >
                            {name}
                        </span>
                    )}
                     <span className="text-lg font-medium text-slate-400">({playerCount}명)</span>
                </h2>
                {headerControls}
            </div>

            <div className="space-y-3 flex-grow">
                {children}
                {React.Children.count(children) === 0 && (
                    <div className="text-center text-slate-500 p-8 flex items-center justify-center h-full">
                        선수를 이곳으로 드래그하세요
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamPanel;