import React, { useState } from 'react';

interface ReferenceItem {
  id: string;
  name: string;
  description: string;
  syntax?: string;
  example?: string;
  category: 'basics' | 'actions' | 'conditions' | 'values';
}

const referenceData: ReferenceItem[] = [
  {
    id: 'do',
    name: 'do',
    description: 'Контейнер для выполнения последовательности действий.',
    syntax: 'do\n(\n  // действия\n)',
    example: 'do\n(\n  playdialog "100"\n)',
    category: 'basics'
  },
  {
    id: 'condition',
    name: 'condition',
    description: 'Проверка условия для выполнения действий.',
    syntax: 'condition\n(\n  // условие\n) description "описание"',
    example: 'condition\n(\n  in "DialogsEnded" (\n    "DialogId" == "dialog001"\n  )\n) description "wait_for_dialog"',
    category: 'basics'
  },
  {
    id: 'playdialog',
    name: 'playdialog',
    description: 'Воспроизвести диалог с указанным ID.',
    syntax: 'playdialog "dialogId"',
    example: 'playdialog "dialog001"',
    category: 'actions'
  },
  {
    id: 'showpopup',
    name: 'showpopup',
    description: 'Показать всплывающую подсказку с указанным ID.',
    syntax: 'showpopup "popupId"',
    example: 'showpopup "TutorialDay1Farming"',
    category: 'actions'
  },
  {
    id: 'showvfx',
    name: 'showvfx',
    description: 'Показать визуальный эффект с указанным ID.',
    syntax: 'showvfx "vfxId"',
    example: 'showvfx "Seedbed_All_VFX"',
    category: 'actions'
  },
  {
    id: 'hidevfx',
    name: 'hidevfx',
    description: 'Скрыть визуальный эффект с указанным ID.',
    syntax: 'hidevfx "vfxId"',
    example: 'hidevfx "Seedbed_All_VFX"',
    category: 'actions'
  },
  {
    id: 'teleportnpcactortopoint',
    name: 'teleportnpcactortopoint',
    description: 'Телепортировать NPC к указанной точке.',
    syntax: 'teleportnpcactortopoint "npcId" "pointId"',
    example: 'teleportnpcactortopoint "NPC_Mayor" "TownHall"',
    category: 'actions'
  },
  {
    id: 'givequest',
    name: 'givequest',
    description: 'Выдать квест с указанным ID.',
    syntax: 'givequest "questId"',
    example: 'givequest "TutorialDay1Branches"',
    category: 'actions'
  },
  {
    id: 'isinrange',
    name: 'isinrange',
    description: 'Проверка, находится ли игрок в зоне указанной сущности.',
    syntax: 'isinrange "entityId"',
    example: 'isinrange "GhostLake"',
    category: 'conditions'
  },
  {
    id: 'in',
    name: 'in',
    description: 'Проверка наличия записи в коллекции с указанными параметрами.',
    syntax: 'in "collectionName"\n(\n  "fieldName" operator value\n)',
    example: 'in "DialogsEnded"\n(\n  "DialogId" == "Монолог 1.2"\n)',
    category: 'conditions'
  }
];

const NeoRustReference: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basics' | 'actions' | 'conditions' | 'values'>('basics');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Фильтруем данные по поисковому запросу и активной вкладке
  const filteredData = searchTerm
    ? referenceData.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : referenceData.filter(item => item.category === activeTab);
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Справочник NeoRust</h2>
      
      {/* Поиск */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:border-blue-500"
        />
      </div>
      
      {/* Вкладки */}
      <div className="flex mb-4 border-b border-gray-700">
        <button
          onClick={() => { setActiveTab('basics'); setSearchTerm(''); }}
          className={`py-2 px-4 ${activeTab === 'basics' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-400'}`}
        >
          Основы языка
        </button>
        <button
          onClick={() => { setActiveTab('actions'); setSearchTerm(''); }}
          className={`py-2 px-4 ${activeTab === 'actions' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-400'}`}
        >
          Действия
        </button>
        <button
          onClick={() => { setActiveTab('conditions'); setSearchTerm(''); }}
          className={`py-2 px-4 ${activeTab === 'conditions' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-400'}`}
        >
          Условия
        </button>
        <button
          onClick={() => { setActiveTab('values'); setSearchTerm(''); }}
          className={`py-2 px-4 ${activeTab === 'values' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-400'}`}
        >
          Значения и константы
        </button>
      </div>
      
      {/* Содержимое справочника */}
      <div className="flex-1 overflow-y-auto">
        {filteredData.map(item => (
          <div key={item.id} className="mb-6 pb-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">{item.name}</h3>
            <p className="text-gray-300 mb-3">{item.description}</p>
            
            {item.syntax && (
              <div className="mb-3">
                <h4 className="text-sm text-gray-400 uppercase mb-1">СИНТАКСИС:</h4>
                <pre className="bg-gray-900 p-3 rounded text-green-300 whitespace-pre-wrap overflow-x-auto">
                  {item.syntax}
                </pre>
              </div>
            )}
            
            {item.example && (
              <div>
                <h4 className="text-sm text-gray-400 uppercase mb-1">ПРИМЕР:</h4>
                <pre className="bg-gray-900 p-3 rounded text-green-300 whitespace-pre-wrap overflow-x-auto">
                  {item.example}
                </pre>
              </div>
            )}
          </div>
        ))}
        
        {filteredData.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            {searchTerm 
              ? 'Ничего не найдено. Попробуйте изменить поисковый запрос.' 
              : 'В этом разделе пока нет данных.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeoRustReference;