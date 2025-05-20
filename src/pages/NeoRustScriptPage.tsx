import React, { useState } from 'react';
import NodeEditor from '../components/NeoRustEditor'; // Импортируем компонент под именем NodeEditor
import NeoRustReference from '../components/NeoRustReference';

const NeoRustScriptPage: React.FC = () => {
  const [editorData, setEditorData] = useState<any>(null);
  const [code, setCode] = useState<string>('// Создайте ваш скрипт, добавив узлы в редактор');
  const [showReference, setShowReference] = useState(false);
  
  // Обработчик сохранения
  const handleSave = () => {
    if (!editorData) return;
    
    const blob = new Blob([JSON.stringify(editorData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neorustscript.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Обработчик загрузки
  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          setEditorData(jsonData);
        } catch (error) {
          console.error('Ошибка при загрузке файла:', error);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };
  
  // Обработчик экспорта кода
  const handleExportCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neorustscript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="bg-gray-900 p-5 min-h-screen">
      <div className="flex flex-col mb-4">
        <h1 className="text-xl font-semibold text-white mb-2">NeoRust Script Editor</h1>
        <p className="text-gray-400 text-sm mb-4">
          Визуальный редактор для создания скриптов на языке NeoRust. Используйте узлы для построения 
          логики квестов, событий и диалогов без необходимости писать код вручную.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          <button 
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Сохранить JSON
          </button>
          <button 
            onClick={handleLoad}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            Загрузить JSON
          </button>
          <button 
            onClick={handleExportCode}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
          >
            Экспорт кода
          </button>
          <button 
            onClick={() => setShowReference(!showReference)}
            className={`px-3 py-1.5 ${showReference ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded text-sm ml-auto`}
          >
            {showReference ? 'Скрыть справочник' : 'Показать справочник'}
          </button>
        </div>
      </div>
      
      <div className={`flex flex-col ${showReference ? 'md:flex-row' : ''} gap-4 h-[calc(100vh-180px)]`}>
        <div className={`${showReference ? 'md:w-1/2 lg:w-2/3' : 'w-full'} bg-[#171923] border border-gray-700 rounded-lg overflow-hidden h-full`}>
          {/* Рабочая область редактора узлов */}
          <NodeEditor 
            onChange={setEditorData} 
            onCodeChange={setCode}
            initialData={editorData} 
          />
        </div>
        
        {showReference ? (
          <div className="md:w-1/2 lg:w-1/3 h-full flex flex-col">
            <NeoRustReference />
          </div>
        ) : (
          <div className="md:w-1/3 flex flex-col h-full">
            <div className="bg-gray-800 rounded-t-lg p-2 text-white font-medium">
              Сгенерированный код
            </div>
            <textarea
              value={code}
              readOnly
              className="w-full flex-1 p-3 font-mono text-sm text-gray-300 bg-gray-800 rounded-b-lg resize-none border-none focus:outline-none"
              placeholder="Здесь появится сгенерированный код..."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NeoRustScriptPage;