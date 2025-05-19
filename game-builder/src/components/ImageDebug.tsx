import { useEffect, useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { getImageUrl } from '../utils/imageUtils';

export default function ImageDebug() {
  const { state } = useAppState();
  const [diagnostics, setDiagnostics] = useState<string>('');
  
  useEffect(() => {
    // Анализ Map с изображениями
    try {
      const unitsImageCount = state.units.imageMap instanceof Map ? state.units.imageMap.size : 0;
      const resourcesImageCount = state.resources.imageMap instanceof Map ? state.resources.imageMap.size : 0;
      
      let report = `Units Image Count: ${unitsImageCount}\n`;
      report += `Resources Image Count: ${resourcesImageCount}\n\n`;
      
      // Анализ изображений в units.imageMap
      if (unitsImageCount > 0) {
        report += "Units Images:\n";
        state.units.imageMap.forEach((image, id) => {
          const url = getImageUrl(id, state);
          report += `- ${id}: ${url ? 'Valid URL' : 'Invalid URL'}\n`;
          if (image.data) {
            if (typeof image.data === 'string') {
              report += `  Data Type: ${typeof image.data}, Length: ${image.data.length}, Starts with: ${image.data.substring(0, 30)}...\n`;
            } else {
              report += `  Data Type: ${typeof image.data}\n`;
            }
          } else {
            report += '  No data\n';
          }
        });
      }
      
      // Анализ comparisonItems с imageId
      const itemsWithImages = state.balance.comparisonItems.filter(item => item.imageId);
      report += `\nItems with ImageId: ${itemsWithImages.length}\n`;
      itemsWithImages.forEach(item => {
        const imageExists = item.imageId ? (
                                              state.units.imageMap.has(item.imageId) || 
                                              state.resources.imageMap.has(item.imageId)
                                            ) : false;
        const url = getImageUrl(item.imageId, state);
        report += `- ${item.name} (${item.imageId}): ${imageExists ? 'Image exists' : 'Image missing'}, URL: ${url ? 'Valid' : 'Invalid'}\n`;
      });
      
      setDiagnostics(report);
    } catch (error) {
      setDiagnostics(`Error running diagnostics: ${error}`);
    }
  }, [state]);
  
  return (
    <div className="mt-4 p-4 border rounded bg-white/10">
      <h3 className="font-bold text-lg">Image Diagnostics</h3>
      <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-black/20 rounded">
        {diagnostics}
      </pre>
      
      <div className="mt-4">
        <h4 className="font-semibold">Sample Image Display Test</h4>
        {state.units.imageMap.size > 0 && (
          <div className="mt-2 flex flex-wrap gap-4">
            {Array.from(state.units.imageMap.keys()).map(imageId => (
              <div key={imageId} className="flex flex-col items-center">
                <div className="text-xs mb-1">{imageId}</div>
                <div className="w-24 h-24 bg-gray-800 flex items-center justify-center overflow-hidden">
                  <img 
                    src={getImageUrl(imageId, state) || undefined} 
                    alt={`Image ${imageId}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error(`Error loading image ${imageId}`);
                      e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}