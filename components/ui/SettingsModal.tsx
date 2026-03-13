import React from 'react';
import { Gamepad2, X, RotateCcw as ResetIcon, Music, Zap } from 'lucide-react';
import { ControllerAction } from '../../types';

interface SettingsModalProps {
  onClose: () => void;
  bgmOn: boolean;
  seOn: boolean;
  onBgmToggle: (on: boolean) => void;
  onSeToggle: (on: boolean) => void;
  mapping: Record<ControllerAction, number>;
  isRemapping: boolean;
  remapAction: ControllerAction | null;
  startRemap: (action: ControllerAction) => void;
  cancelRemap: () => void;
  resetMapping: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose, bgmOn, seOn, onBgmToggle, onSeToggle,
  mapping, isRemapping, remapAction, startRemap, cancelRemap, resetMapping,
}) => (
  <div className="fixed inset-0 bg-neutral-950/95 flex flex-col items-center z-[120] p-4 animate-in fade-in duration-200">
    <div className="w-full max-w-md flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
        <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
          <Gamepad2 /> Controller Settings
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
          <X className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {/* Audio */}
        <div className="mb-4 pb-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 font-bold tracking-widest mb-3 uppercase">Audio</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'BGM', icon: <Music size={15} className="text-cyan-400" />, checked: bgmOn, onChange: onBgmToggle },
              { label: 'SE',  icon: <Zap  size={15} className="text-yellow-400" />, checked: seOn,  onChange: onSeToggle },
            ].map(({ label, icon, checked, onChange }) => (
              <label key={label} className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-800 cursor-pointer select-none">
                <span className="text-gray-300 text-sm flex items-center gap-2">{icon} {label}</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
                  <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Controller Remap */}
        {isRemapping && (
          <div className="mb-4 p-4 bg-purple-900/50 border border-purple-500 rounded-lg text-center animate-pulse">
            <p className="font-bold text-white mb-1">Waiting for input...</p>
            <p className="text-sm text-purple-200">Press button for {remapAction}</p>
            <button onClick={cancelRemap} className="mt-2 text-xs bg-black/30 px-3 py-1 rounded hover:bg-black/50">Cancel</button>
          </div>
        )}
        {(Object.keys(mapping) as ControllerAction[]).map(action => (
          <div key={action} className="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-800">
            <span className="text-gray-300 font-mono text-sm">{action.replace('_', ' ')}</span>
            <button
              onClick={() => startRemap(action)}
              disabled={isRemapping}
              className="bg-gray-800 hover:bg-gray-700 text-cyan-400 px-4 py-1.5 rounded text-xs font-mono border border-gray-700 min-w-[80px]"
            >
              BTN {mapping[action]}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between">
        <button onClick={resetMapping} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-4 py-2">
          <ResetIcon size={14} /> Reset Defaults
        </button>
        <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-full">
          Done
        </button>
      </div>
    </div>
  </div>
);

export default SettingsModal;
