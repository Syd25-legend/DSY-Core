import { X, FileText, Link as LinkIcon, Image } from 'lucide-react';
import { useCode } from '../context/CodeContext';

export default function AssetPreview() {
  const { assets, removeAsset } = useCode();

  if (assets.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'image':
        return 'image';
      case 'pdf':
        return 'description';
      case 'link':
        return 'link';
      default:
        return 'description';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          Uploaded Assets ({assets.length}/15)
        </label>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {assets.map((asset) => {
          const iconName = getIcon(asset.type);
          
          return (
            <div
              key={asset.id}
              className="relative group aspect-square rounded-lg border border-[#C5A059]/20 flex items-center justify-center bg-[#1A1625]/40 overflow-hidden backdrop-blur-sm"
            >
              {asset.type === 'image' && asset.data ? (
                <img
                  src={asset.data}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-2">
                  <span className="material-icons-round text-[#C5A059]/60 text-2xl">{iconName}</span>
                  <span className="text-[8px] text-slate-500 mt-1 truncate max-w-full text-center px-1">
                    {asset.name.length > 12 ? asset.name.substring(0, 12) + '...' : asset.name}
                  </span>
                </div>
              )}
              
              {/* Remove Button */}
              <button
                onClick={() => removeAsset(asset.id)}
                className="absolute top-1 right-1 p-1 rounded-md bg-black/60 border border-[#C5A059]/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#C5A059]/20"
              >
                <span className="material-icons-round text-xs text-slate-300">close</span>
              </button>
              
              {/* Overlay with name on hover */}
              <div className="absolute inset-0 bg-black/70 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg">
                <span className="text-[9px] text-slate-300 truncate w-full font-medium">
                  {asset.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
