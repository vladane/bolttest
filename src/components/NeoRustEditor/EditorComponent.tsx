import React, { useCallback, useEffect, useRef, useState } from 'react';

// Типы данных
interface Position {
  x: number;
  y: number;
}

interface Port {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'flow' | 'string' | 'number' | 'boolean';
  nodeId: string;
}

interface Node {
  id: string;
  type: 'condition' | 'do' | 'in' | 'isinrange' | 'action';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: Record<string, any>;
  ports: Port[];
}

interface Connection {
  id: string;
  from: {
    nodeId: string;
    portId: string;
  };
  to: {
    nodeId: string;
    portId: string;
  };
}

interface EditorState {
  nodes: Node[];
  connections: Connection[];
  selectedNode: string | null;
  hoveredPort: string | null;
  tempConnection: {
    fromNodeId: string;
    fromPortId: string;
    toPosition: Position;
  } | null;
}

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
}

export interface NodeEditorProps {
  onChange?: (data: any) => void;
  onCodeChange?: (code: string) => void;
  initialData?: any;
  className?: string;
  onSaveJSON?: () => void;
  onLoadJSON?: () => void;
  onExportCode?: () => void;
  onShowHelp?: () => void;
}

// Генератор кода NeoRust
const generateNeoRustCode = (state: EditorState): string => {
  if (!state.nodes.length) return '// Создайте ваш скрипт, добавив узлы в редактор';
  
  let code = '// NeoRust Script\n\n';
  
  // Функция для рекурсивной генерации кода
  const generateNodeCode = (nodeId: string, indent: string = ''): string => {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return '';
    
    let nodeCode = '';
    
    switch (node.type) {
      case 'do':
        nodeCode += `${indent}do\n${indent}(\n`;
        
        // Получаем все узлы, которые соединены с выходным портом этого узла
        const doActionNodes = state.connections
          .filter(conn => conn.from.nodeId === node.id)
          .map(conn => state.nodes.find(n => n.id === conn.to.nodeId))
          .filter(Boolean) as Node[];
        
        // Генерируем код для каждого действия в блоке do
        doActionNodes.forEach((actionNode, index) => {
          if (actionNode.type === 'action') {
            switch (actionNode.data.actionType) {
              case 'playdialog':
                nodeCode += `${indent}  playdialog "${actionNode.data.dialogId || ''}"\n`;
                break;
              case 'showpopup':
                nodeCode += `${indent}  showpopup "${actionNode.data.popupId || ''}"\n`;
                break;
              case 'showvfx':
                nodeCode += `${indent}  showvfx "${actionNode.data.vfxId || ''}"\n`;
                break;
              case 'hidevfx':
                nodeCode += `${indent}  hidevfx "${actionNode.data.vfxId || ''}"\n`;
                break;
              case 'teleportnpcactortopoint':
                nodeCode += `${indent}  teleportnpcactortopoint "${actionNode.data.npcId || ''}" "${actionNode.data.pointId || ''}"\n`;
                break;
              case 'givequest':
                nodeCode += `${indent}  givequest "${actionNode.data.questId || ''}"\n`;
                break;
              case 'grant':
                nodeCode += `${indent}  grant "${actionNode.data.rewardId || ''}"\n`;
                break;
              case 'skiptimeto':
                nodeCode += `${indent}  skiptimeto "${actionNode.data.time || ''}"\n`;
                break;
              case 'setdialoggiverstate':
                nodeCode += `${indent}  setdialoggiverstate "${actionNode.data.npcId || ''}" "${actionNode.data.dialogId || ''}"\n`;
                break;
              case 'shownotification':
                nodeCode += `${indent}  shownotification "${actionNode.data.notificationId || ''}"\n`;
                break;
              case 'playbubblescenario':
                nodeCode += `${indent}  playbubblescenario "${actionNode.data.bubbleId || ''}"\n`;
                break;
              case 'blocknpcactor':
                nodeCode += `${indent}  blocknpcactor "${actionNode.data.npcId || ''}"\n`;
                break;
              case 'unblocknpcactor':
                nodeCode += `${indent}  unblocknpcactor "${actionNode.data.npcId || ''}"\n`;
                break;
              case 'highlighttutorialelements':
                nodeCode += `${indent}  highlighttutorialelements "${actionNode.data.categoryId || ''}"\n`;
                break;
              case 'unhighlighttutorialelements':
                nodeCode += `${indent}  unhighlighttutorialelements "${actionNode.data.categoryId || ''}"\n`;
                break;
              case 'showtutorialuiview':
                nodeCode += `${indent}  showtutorialuiview\n`;
                break;
              case 'hidetutorialuiview':
                nodeCode += `${indent}  hidetutorialuiview\n`;
                break;
              case 'giveagift':
                nodeCode += `${indent}  giveagift "${actionNode.data.fromId || ''}" "${actionNode.data.toId || ''}" "${actionNode.data.giftId || ''}" ${actionNode.data.isSpecial || 'false'}\n`;
                break;
              case 'addrelationshippoints':
                nodeCode += `${indent}  addrelationshippoints "${actionNode.data.fromId || ''}" "${actionNode.data.toId || ''}" ${actionNode.data.points || 0}\n`;
                break;
              case 'setfriendshiplevel':
                nodeCode += `${indent}  setfriendshiplevel "${actionNode.data.fromId || ''}" "${actionNode.data.toId || ''}" ${actionNode.data.level || 0}\n`;
                break;
              case 'setdialogvariable':
                nodeCode += `${indent}  setdialogvariable "${actionNode.data.variable || ''}" ${actionNode.data.value || ''}\n`;
                break;
              default:
                nodeCode += `${indent}  ${actionNode.data.actionType || 'action'} "${actionNode.data.value || ''}"\n`;
            }
          }
        });
        
        nodeCode += `${indent})`;
        break;
        
      case 'condition':
        nodeCode += `${indent}condition\n${indent}(\n`;
        
        // Получаем все узлы условий, которые соединены с выходным портом этого узла
        const conditionNodes = state.connections
          .filter(conn => conn.from.nodeId === node.id)
          .map(conn => state.nodes.find(n => n.id === conn.to.nodeId))
          .filter(Boolean) as Node[];
        
        // Генерируем код для каждого условия
        conditionNodes.forEach((condNode, index) => {
          if (condNode.type === 'in') {
            nodeCode += `${indent}  in "${condNode.data.tableName || ''}"\n${indent}  (\n`;
            
            // Добавляем условия для оператора in
            if (condNode.data.conditions && condNode.data.conditions.length > 0) {
              condNode.data.conditions.forEach((condition: any, i: number) => {
                if (i > 0) {
                  nodeCode += `${indent}    ${condition.join || 'and'}\n`;
                }
                nodeCode += `${indent}    "${condition.field || ''}" ${condition.operator || '=='} "${condition.value || ''}"\n`;
              });
            }
            
            nodeCode += `${indent}  )`;
            
            // Добавляем rows, если они указаны
            if (condNode.data.rows && condNode.data.rows > 0) {
              nodeCode += ` ${condNode.data.rows} rows`;
            }
            
            nodeCode += '\n';
          } else if (condNode.type === 'isinrange') {
            nodeCode += `${indent}  isinrange "${condNode.data.entityId || ''}"\n`;
          }
          
          // Добавляем оператор and между условиями, кроме последнего
          if (index < conditionNodes.length - 1) {
            nodeCode += `${indent}  and\n`;
          }
        });
        
        nodeCode += `${indent})`;
        
        // Добавляем description, если он есть
        if (node.data.description) {
          nodeCode += ` description "${node.data.description}"`;
        }
        break;
    }
    
    return nodeCode;
  };
  
  // Находим корневые узлы (начало квеста)
  const rootNodes = state.nodes.filter(node => {
    const incomingConnections = state.connections.filter(conn => conn.to.nodeId === node.id);
    return incomingConnections.length === 0 && (node.type === 'condition' || node.type === 'do');
  });
  
  // Генерируем код для каждого корневого узла
  rootNodes.forEach((rootNode, index) => {
    code += generateNodeCode(rootNode.id);
    if (index < rootNodes.length - 1) {
      code += '\n\n';
    }
  });
  
  return code;
};

const getPortColor = (dataType: string): string => {
  switch (dataType) {
    case 'flow': return '#66ccff';
    case 'string': return '#ff9966';
    case 'number': return '#66ff99';
    case 'boolean': return '#ff66ff';
    default: return '#ddd';
  }
};

const createPort = (id: string, name: string, type: 'input' | 'output', dataType: 'flow' | 'string' | 'number' | 'boolean', nodeId: string): Port => {
  return {
    id,
    name,
    type,
    dataType,
    nodeId
  };
};

const NodeEditor: React.FC<NodeEditorProps> = ({ 
  onChange, 
  onCodeChange,
  initialData, 
  className,
  onSaveJSON,
  onLoadJSON,
  onExportCode,
  onShowHelp
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Состояние представления
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });
  
  // Состояние редактора
  const [editorState, setEditorState] = useState<EditorState>(() => {
    if (initialData?.nodes?.length > 0) {
      return {
        nodes: initialData.nodes,
        connections: initialData.connections || [],
        selectedNode: null,
        hoveredPort: null,
        tempConnection: null
      };
    }
    
    // Примеры узлов
    return {
      nodes: [
        {
          id: 'node_1',
          type: 'condition',
          label: 'Условие',
          x: 100,
          y: 100,
          width: 200,
          height: 120,
          data: {
            description: 'wait_dialog'
          },
          ports: [
            createPort('port_1_in', 'Вход', 'input', 'flow', 'node_1'),
            createPort('port_1_out', 'Условия', 'output', 'flow', 'node_1')
          ]
        },
        {
          id: 'node_2',
          type: 'in',
          label: 'In DialogsEnded',
          x: 400,
          y: 100,
          width: 220,
          height: 160,
          data: {
            tableName: 'DialogsEnded',
            conditions: [
              { field: 'DialogId', operator: '==', value: 'Монолог 2.1' }
            ],
            rows: 1
          },
          ports: [
            createPort('port_2_in', 'Вход', 'input', 'flow', 'node_2')
          ]
        },
        {
          id: 'node_3',
          type: 'do',
          label: 'Действие',
          x: 100,
          y: 300,
          width: 200,
          height: 100,
          data: {},
          ports: [
            createPort('port_3_in', 'Вход', 'input', 'flow', 'node_3'),
            createPort('port_3_out', 'Действия', 'output', 'flow', 'node_3')
          ]
        },
        {
          id: 'node_4',
          type: 'action',
          label: 'Проиграть диалог',
          x: 400,
          y: 300,
          width: 220,
          height: 120,
          data: {
            actionType: 'playdialog',
            dialogId: 'Монолог 2.2'
          },
          ports: [
            createPort('port_4_in', 'Вход', 'input', 'flow', 'node_4')
          ]
        }
      ],
      connections: [
        {
          id: 'conn_1',
          from: {
            nodeId: 'node_1',
            portId: 'port_1_out'
          },
          to: {
            nodeId: 'node_2',
            portId: 'port_2_in'
          }
        },
        {
          id: 'conn_2',
          from: {
            nodeId: 'node_3',
            portId: 'port_3_out'
          },
          to: {
            nodeId: 'node_4',
            portId: 'port_4_in'
          }
        }
      ],
      selectedNode: null,
      hoveredPort: null,
      tempConnection: null
    };
  });
  
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<boolean>(false);
  
  // Реф для перетаскивания узлов
  const dragNodeRef = useRef<{
    nodeId: string | null;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
  }>({
    nodeId: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0
  });
  
  // Реф для создания соединений
  const connectionRef = useRef<{
    isCreating: boolean;
    fromNodeId: string;
    fromPortId: string;
    toPosition: Position;
  }>({
    isCreating: false,
    fromNodeId: '',
    fromPortId: '',
    toPosition: { x: 0, y: 0 }
  });
  
  // Отправляем изменения во внешние обработчики
  useEffect(() => {
    if (onCodeChange) {
      const code = generateNeoRustCode(editorState);
      onCodeChange(code);
    }
    
    if (onChange) {
      const data = {
        nodes: editorState.nodes,
        connections: editorState.connections
      };
      onChange(data);
    }
  }, [editorState, onChange, onCodeChange]);
  
  // Обработчик нажатия клавиши пробел
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);
  
  // Обработчик колеса мыши для масштабирования
  useEffect(() => {
    const editorElement = editorRef.current;
    if (!editorElement) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = editorElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Преобразуем координаты мыши в координаты холста
      const canvasX = (mouseX - viewState.offsetX) / viewState.scale;
      const canvasY = (mouseY - viewState.offsetY) / viewState.scale;
      
      // Определяем направление и величину масштабирования
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.1, Math.min(3, viewState.scale + delta));
      
      // Вычисляем новые смещения, чтобы сохранить позицию курсора в том же месте холста
      const newOffsetX = mouseX - canvasX * newScale;
      const newOffsetY = mouseY - canvasY * newScale;
      
      setViewState(prev => ({
        ...prev,
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      }));
    };
    
    editorElement.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      editorElement.removeEventListener('wheel', handleWheel);
    };
  }, [viewState.offsetX, viewState.offsetY, viewState.scale]);
  
  // Преобразование клиентских координат в координаты холста
  const clientToCanvas = useCallback((clientX: number, clientY: number): Position => {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (clientX - rect.left - viewState.offsetX) / viewState.scale,
      y: (clientY - rect.top - viewState.offsetY) / viewState.scale
    };
  }, [viewState.offsetX, viewState.offsetY, viewState.scale]);
  
  // Добавление нового узла
  const addNode = useCallback((type: 'condition' | 'do' | 'in' | 'isinrange' | 'action', subtype: string = '') => {
    const id = `node_${Date.now()}`;
    let newNode: Node;
    
    switch (type) {
      case 'action': {
        let actionData = {};
        let label = 'Действие';
        let height = 120;
        
        switch (subtype) {
          case 'playdialog':
            actionData = { actionType: 'playdialog', dialogId: '' };
            label = 'Проиграть диалог';
            break;
          case 'showpopup':
            actionData = { actionType: 'showpopup', popupId: '' };
            label = 'Показать подсказку';
            break;
          case 'showvfx':
            actionData = { actionType: 'showvfx', vfxId: '' };
            label = 'Показать эффект';
            break;
          case 'hidevfx':
            actionData = { actionType: 'hidevfx', vfxId: '' };
            label = 'Скрыть эффект';
            break;
          case 'teleportnpcactortopoint':
            actionData = { actionType: 'teleportnpcactortopoint', npcId: '', pointId: '' };
            label = 'Телепорт NPC';
            height = 160;
            break;
          case 'givequest':
            actionData = { actionType: 'givequest', questId: '' };
            label = 'Выдать квест';
            break;
          case 'grant':
            actionData = { actionType: 'grant', rewardId: '' };
            label = 'Выдать награду';
            break;
          case 'skiptimeto':
            actionData = { actionType: 'skiptimeto', time: '06:00' };
            label = 'Пропустить время';
            break;
          case 'setdialoggiverstate':
            actionData = { actionType: 'setdialoggiverstate', npcId: '', dialogId: '' };
            label = 'Установить диалог NPC';
            height = 160;
            break;
          case 'shownotification':
            actionData = { actionType: 'shownotification', notificationId: '' };
            label = 'Показать уведомление';
            break;
          case 'playbubblescenario':
            actionData = { actionType: 'playbubblescenario', bubbleId: '' };
            label = 'Показать пузырь';
            break;
          case 'blocknpcactor':
            actionData = { actionType: 'blocknpcactor', npcId: '' };
            label = 'Блокировать NPC';
            break;
          case 'unblocknpcactor':
            actionData = { actionType: 'unblocknpcactor', npcId: '' };
            label = 'Разблокировать NPC';
            break;
          case 'addrelationshippoints':
            actionData = { actionType: 'addrelationshippoints', fromId: 'Player', toId: '', points: 0 };
            label = 'Добавить очки отношений';
            height = 180;
            break;
          case 'setfriendshiplevel':
            actionData = { actionType: 'setfriendshiplevel', fromId: 'Player', toId: '', level: 0 };
            label = 'Установить уровень отношений';
            height = 180;
            break;
          case 'giveagift':
            actionData = { actionType: 'giveagift', fromId: 'Player', toId: '', giftId: '', isSpecial: false };
            label = 'Дать подарок';
            height = 200;
            break;
          case 'showtutorialuiview':
            actionData = { actionType: 'showtutorialuiview' };
            label = 'Показать обучение';
            break;
          case 'hidetutorialuiview':
            actionData = { actionType: 'hidetutorialuiview' };
            label = 'Скрыть обучение';
            break;
          case 'highlighttutorialelements':
            actionData = { actionType: 'highlighttutorialelements', categoryId: '' };
            label = 'Подсветить элементы обучения';
            break;
          case 'unhighlighttutorialelements':
            actionData = { actionType: 'unhighlighttutorialelements', categoryId: '' };
            label = 'Убрать подсветку элементов';
            break;
          default:
            actionData = { actionType: subtype, value: '' };
            label = subtype || 'Действие';
        }
        
        newNode = {
          id,
          type: 'action',
          label,
          x: 200,
          y: 200,
          width: 220,
          height,
          data: actionData,
          ports: [
            createPort(`${id}_in`, 'Вход', 'input', 'flow', id)
          ]
        };
        break;
      }
      
      case 'condition':
        newNode = {
          id,
          type: 'condition',
          label: 'Условие',
          x: 200,
          y: 200,
          width: 200,
          height: 120,
          data: {
            description: ''
          },
          ports: [
            createPort(`${id}_in`, 'Вход', 'input', 'flow', id),
            createPort(`${id}_out`, 'Условия', 'output', 'flow', id)
          ]
        };
        break;
      
      case 'in':
        newNode = {
          id,
          type: 'in',
          label: 'In Таблица',
          x: 200,
          y: 200,
          width: 220,
          height: 160,
          data: {
            tableName: '',
            conditions: [
              { field: '', operator: '==', value: '' }
            ],
            rows: 1
          },
          ports: [
            createPort(`${id}_in`, 'Вход', 'input', 'flow', id)
          ]
        };
        break;
        
      case 'isinrange':
        newNode = {
          id,
          type: 'isinrange',
          label: 'Проверка расстояния',
          x: 200,
          y: 200,
          width: 220,
          height: 120,
          data: {
            entityId: '',
            needInteraction: false
          },
          ports: [
            createPort(`${id}_in`, 'Вход', 'input', 'flow', id)
          ]
        };
        break;
        
      case 'do':
        newNode = {
          id,
          type: 'do',
          label: 'Действие',
          x: 200,
          y: 200,
          width: 200,
          height: 100,
          data: {},
          ports: [
            createPort(`${id}_in`, 'Вход', 'input', 'flow', id),
            createPort(`${id}_out`, 'Действия', 'output', 'flow', id)
          ]
        };
        break;
    }
    
    setEditorState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      selectedNode: id
    }));
    
    setOpenMenu(null);
  }, []);
  
  // Удаление узла
  const removeNode = useCallback((id: string) => {
    setEditorState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      connections: prev.connections.filter(
        c => c.from.nodeId !== id && c.to.nodeId !== id
      ),
      selectedNode: prev.selectedNode === id ? null : prev.selectedNode
    }));
  }, []);
  
  // Обновление данных узла
  const updateNodeData = useCallback((nodeId: string, dataKey: string, value: any) => {
    setEditorState(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId 
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                [dataKey]: value 
              } 
            } 
          : node
      )
    }));
  }, []);
  
  // Обновление условия
  const updateInCondition = useCallback((nodeId: string, index: number, field: string, value: any) => {
    setEditorState(prev => {
      const node = prev.nodes.find(n => n.id === nodeId);
      if (!node || node.type !== 'in' || !node.data.conditions) return prev;
      
      const newConditions = [...node.data.conditions];
      
      if (index >= newConditions.length) {
        newConditions.push({ field: '', operator: '==', value: '' });
      }
      
      newConditions[index] = {
        ...newConditions[index],
        [field]: value
      };
      
      return {
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId 
            ? { 
                ...n, 
                data: { 
                  ...n.data, 
                  conditions: newConditions 
                } 
              } 
            : n
        )
      };
    });
  }, []);
  
  // Добавление условия
  const addInCondition = useCallback((nodeId: string) => {
    setEditorState(prev => {
      const node = prev.nodes.find(n => n.id === nodeId);
      if (!node || node.type !== 'in') return prev;
      
      const conditions = node.data.conditions || [];
      
      return {
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId 
            ? { 
                ...n, 
                data: { 
                  ...n.data, 
                  conditions: [...conditions, { field: '', operator: '==', value: '', join: 'and' }]
                },
                height: n.height + 40 // Увеличиваем высоту узла
              } 
            : n
        )
      };
    });
  }, []);
  
  // Начало перетаскивания узла
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLSelectElement ||
      (e.target as HTMLElement).tagName === 'LABEL' ||
      (e.target as HTMLElement).tagName === 'BUTTON'
    ) {
      return;
    }
    
    e.stopPropagation();
    
    const node = editorState.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setEditorState(prev => ({
      ...prev,
      selectedNode: nodeId
    }));
    
    dragNodeRef.current = {
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: node.x,
      nodeStartY: node.y
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragNodeRef.current.nodeId) return;
      
      const dx = e.clientX - dragNodeRef.current.startX;
      const dy = e.clientY - dragNodeRef.current.startY;
      
      setEditorState(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === dragNodeRef.current.nodeId
            ? {
                ...n,
                x: dragNodeRef.current.nodeStartX + dx / viewState.scale,
                y: dragNodeRef.current.nodeStartY + dy / viewState.scale
              }
            : n
        )
      }));
    };
    
    const handleMouseUp = () => {
      dragNodeRef.current.nodeId = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [editorState.nodes, viewState.scale]);
  
  // Начало создания соединения
  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, portId: string, portType: 'input' | 'output') => {
    e.stopPropagation();
    
    if (portType !== 'output') return;
    
    const canvasPos = clientToCanvas(e.clientX, e.clientY);
    
    connectionRef.current = {
      isCreating: true,
      fromNodeId: nodeId,
      fromPortId: portId,
      toPosition: canvasPos
    };
    
    setEditorState(prev => ({
      ...prev,
      tempConnection: {
        fromNodeId: nodeId,
        fromPortId: portId,
        toPosition: canvasPos
      }
    }));
    
    // Обработчик перемещения при создании соединения
    const handleMouseMove = (e: MouseEvent) => {
      if (!connectionRef.current.isCreating) return;
      
      // Предотвращаем выделение текста или других элементов при перемещении
      e.preventDefault();
      
      const canvasPos = clientToCanvas(e.clientX, e.clientY);
      
      setEditorState(prev => ({
        ...prev,
        tempConnection: prev.tempConnection
          ? { ...prev.tempConnection, toPosition: canvasPos }
          : null
      }));
    };
    
    // Обработчик отпускания кнопки мыши при создании соединения
    const handleMouseUp = (e: MouseEvent) => {
      if (!connectionRef.current.isCreating) return;
      
      // Получаем элемент под курсором
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      
      if (element && element.dataset.portType === 'input') {
        const toNodeId = element.dataset.nodeId;
        const toPortId = element.dataset.portId;
        
        if (toNodeId && toPortId) {
          const fromNode = editorState.nodes.find(n => n.id === connectionRef.current.fromNodeId);
          const toNode = editorState.nodes.find(n => n.id === toNodeId);
          
          let isValidConnection = false;
          
          if (fromNode && toNode) {
            if (fromNode.type === 'condition' && (toNode.type === 'in' || toNode.type === 'isinrange')) {
              isValidConnection = true;
            } else if (fromNode.type === 'do' && toNode.type === 'action') {
              isValidConnection = true;
            }
          }
          
          if (isValidConnection) {
            setEditorState(prev => ({
              ...prev,
              connections: [
                ...prev.connections,
                {
                  id: `conn_${Date.now()}`,
                  from: {
                    nodeId: connectionRef.current.fromNodeId,
                    portId: connectionRef.current.fromPortId
                  },
                  to: {
                    nodeId: toNodeId,
                    portId: toPortId
                  }
                }
              ],
              tempConnection: null
            }));
          } else {
            setEditorState(prev => ({
              ...prev,
              tempConnection: null
            }));
          }
        } else {
          setEditorState(prev => ({
            ...prev,
            tempConnection: null
          }));
        }
      } else {
        setEditorState(prev => ({
          ...prev,
          tempConnection: null
        }));
      }
      
      connectionRef.current.isCreating = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [clientToCanvas, editorState.nodes]);
  
  // Удаление соединения
  const deleteConnection = useCallback((connectionId: string) => {
    setEditorState(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId)
    }));
  }, []);
  
  // Начало перемещения холста
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Игнорируем, если клик был на узле или другом интерактивном элементе
    if (
      (e.target as HTMLElement).closest('.node') ||
      (e.target as HTMLElement).closest('.port') ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('input') ||
      (e.target as HTMLElement).closest('select')
    ) {
      return;
    }
    
    // Используем клавишу пробел или среднюю кнопку мыши для перемещения холста
    if (e.button === 1 || (e.button === 0 && (isSpacePressed || e.ctrlKey))) {
      e.preventDefault();
      
      setViewState(prev => ({
        ...prev,
        isDragging: true,
        lastMouseX: e.clientX,
        lastMouseY: e.clientY
      }));
      
      const handleMouseMove = (e: MouseEvent) => {
        setViewState(prev => {
          if (!prev.isDragging) return prev;
          
          const dx = e.clientX - prev.lastMouseX;
          const dy = e.clientY - prev.lastMouseY;
          
          return {
            ...prev,
            offsetX: prev.offsetX + dx,
            offsetY: prev.offsetY + dy,
            lastMouseX: e.clientX,
            lastMouseY: e.clientY
          };
        });
      };
      
      const handleMouseUp = () => {
        setViewState(prev => ({
          ...prev,
          isDragging: false
        }));
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [isSpacePressed]);
  
  // Сброс масштаба и позиции
  const resetView = useCallback(() => {
    setViewState({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    });
  }, []);
  
  // Центрирование всех узлов
  const fitAllNodes = useCallback(() => {
    if (editorState.nodes.length === 0) return;
    
    // Находим границы всех узлов
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    editorState.nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    
    // Добавляем отступ
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const editorWidth = editorRef.current?.clientWidth || 800;
    const editorHeight = editorRef.current?.clientHeight || 600;
    
    // Рассчитываем масштаб и смещение
    const scaleX = editorWidth / (maxX - minX);
    const scaleY = editorHeight / (maxY - minY);
    const scale = Math.min(scaleX, scaleY, 1);
    
    const offsetX = (editorWidth - (maxX - minX) * scale) / 2;
    const offsetY = (editorHeight - (maxY - minY) * scale) / 2;
    
    setViewState({
      scale,
      offsetX,
      offsetY,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    });
  }, [editorState.nodes]);
  
  // Рендеринг соединений
  const renderConnections = useCallback(() => {
    // Получение позиции порта
    const getPortPosition = (nodeId: string, portId: string, type: 'input' | 'output'): Position | null => {
      const node = editorState.nodes.find(n => n.id === nodeId);
      if (!node) return null;
      
      const port = node.ports.find(p => p.id === portId);
      if (!port) return null;
      
      const portIndex = node.ports.filter(p => p.type === type).indexOf(port);
      
      // Позиция порта относительно узла
      return {
        x: type === 'input' ? node.x : node.x + node.width,
        y: node.y + 40 + portIndex * 25
      };
    };
    
    // Рендеринг существующих соединений
    const connections = editorState.connections.map(conn => {
      const fromPos = getPortPosition(conn.from.nodeId, conn.from.portId, 'output');
      const toPos = getPortPosition(conn.to.nodeId, conn.to.portId, 'input');
      
      if (!fromPos || !toPos) return null;
      
      // Рассчитываем координаты для изогнутой линии
      const scaledFromX = fromPos.x * viewState.scale + viewState.offsetX;
      const scaledFromY = fromPos.y * viewState.scale + viewState.offsetY;
      const scaledToX = toPos.x * viewState.scale + viewState.offsetX;
      const scaledToY = toPos.y * viewState.scale + viewState.offsetY;
      
      // Контрольные точки для кривой Безье
      const dx = Math.abs(toPos.x - fromPos.x) * 0.5 * viewState.scale;
      
      const path = `M${scaledFromX},${scaledFromY} C${scaledFromX + dx},${scaledFromY} ${scaledToX - dx},${scaledToY} ${scaledToX},${scaledToY}`;
      
      // Определяем цвет на основе типа данных порта
      const fromNode = editorState.nodes.find(n => n.id === conn.from.nodeId);
      const fromPort = fromNode?.ports.find(p => p.id === conn.from.portId);
      const color = fromPort ? getPortColor(fromPort.dataType) : '#66ccff';
      
      return (
        <svg
          key={conn.id}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            pointerEvents: 'none' 
          }}
        >
          <path
            d={path}
            stroke={color}
            strokeWidth={2 * Math.min(1.5, viewState.scale)}
            fill="none"
            onClick={() => deleteConnection(conn.id)}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          />
        </svg>
      );
    });
    
    // Рендеринг временного соединения
    let tempConnection = null;
    if (editorState.tempConnection) {
      const fromPos = getPortPosition(
        editorState.tempConnection.fromNodeId,
        editorState.tempConnection.fromPortId,
        'output'
      );
      
      if (fromPos) {
        const toPos = editorState.tempConnection.toPosition;
        
        // Рассчитываем координаты для изогнутой линии
        const scaledFromX = fromPos.x * viewState.scale + viewState.offsetX;
        const scaledFromY = fromPos.y * viewState.scale + viewState.offsetY;
        const scaledToX = toPos.x * viewState.scale + viewState.offsetX;
        const scaledToY = toPos.y * viewState.scale + viewState.offsetY;
        
        // Контрольные точки для кривой Безье
        const dx = Math.abs(toPos.x - fromPos.x) * 0.5 * viewState.scale;
        
        const path = `M${scaledFromX},${scaledFromY} C${scaledFromX + dx},${scaledFromY} ${scaledToX - dx},${scaledToY} ${scaledToX},${scaledToY}`;
        
        tempConnection = (
          <svg
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              pointerEvents: 'none' 
            }}
          >
            <path
              d={path}
              stroke="#66ccff"
              strokeWidth={2 * Math.min(1.5, viewState.scale)}
              strokeDasharray={`${5 * viewState.scale},${5 * viewState.scale}`}
              fill="none"
            />
          </svg>
        );
      }
    }
    
    return (
      <>
        {connections}
        {tempConnection}
      </>
    );
  }, [editorState.connections, editorState.nodes, editorState.tempConnection, deleteConnection, viewState]);
  
  // Рендеринг узла
  const renderNode = useCallback((node: Node) => {
    const isSelected = editorState.selectedNode === node.id;
    
    // Определение цвета в зависимости от типа
    let bgColor = '#333';
    let borderColor = '#555';
    
    switch (node.type) {
      case 'do':
        bgColor = '#3a3768';
        borderColor = '#5b51a9';
        break;
      case 'action':
        bgColor = '#1e3a8a';
        borderColor = '#3b82f6';
        break;
      case 'condition':
        bgColor = '#166534';
        borderColor = '#22c55e';
        break;
      case 'in':
        bgColor = '#1e3a58';
        borderColor = '#3b82c6';
        break;
      case 'isinrange':
        bgColor = '#4c1d95';
        borderColor = '#8b5cf6';
        break;
    }
    
    // Осветляем цвета при отдалении
    if (viewState.scale < 0.3) {
      bgColor = lightenColor(bgColor, 20);
      borderColor = '#ffffff';
    }
    
    // Функция для осветления цвета
    function lightenColor(color: string, percent: number) {
      const num = parseInt(color.replace('#', ''), 16),
            amt = Math.round(2.55 * percent),
            R = Math.min(255, (num >> 16) + amt),
            G = Math.min(255, (num >> 8 & 0x00FF) + amt),
            B = Math.min(255, (num & 0x0000FF) + amt);
      return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }
    
    // Содержимое узла в зависимости от масштаба
    const renderNodeContent = () => {
      // При очень малом масштабе показываем только заголовок
      if (viewState.scale < 0.2) {
        return (
          <div style={{
            textAlign: 'center',
            padding: '5px',
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 0 3px rgba(0, 0, 0, 0.7)',
            color: '#ffffff'
          }}>
            {node.label}
          </div>
        );
      }
      
      // При низком масштабе показываем упрощенное содержимое
      if (viewState.scale < 0.4) {
        let info = '';
        
        switch (node.type) {
          case 'action':
            switch (node.data.actionType) {
              case 'playdialog': info = `ID: ${node.data.dialogId || ''}`; break;
              case 'showpopup': info = `ID: ${node.data.popupId || ''}`; break;
              case 'showvfx': 
              case 'hidevfx': info = `ID: ${node.data.vfxId || ''}`; break;
              case 'givequest': info = `ID: ${node.data.questId || ''}`; break;
            }
            break;
          case 'condition':
            info = node.data.description ? `description: ${node.data.description}` : '';
            break;
          case 'in':
            info = `table: ${node.data.tableName || ''}, rows: ${node.data.rows || 1}`;
            break;
          case 'isinrange':
            info = `entity: ${node.data.entityId || ''}`;
            break;
        }
        
        return (
          <div style={{
            padding: '5px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            opacity: 0.9
          }}>
            {info}
          </div>
        );
      }
      
      // При нормальном масштабе показываем полное содержимое
      switch (node.type) {
        case 'condition':
          return (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                Описание (description):
              </label>
              <input
                type="text"
                value={node.data.description || ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  updateNodeData(node.id, 'description', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
              />
            </div>
          );
          
        case 'in':
          return (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                Таблица:
              </label>
              <input
                type="text"
                value={node.data.tableName || ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  updateNodeData(node.id, 'tableName', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              />
              
              {node.data.conditions && node.data.conditions.map((condition: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  {index > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <select
                        value={condition.join || 'and'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          updateInCondition(node.id, index, 'join', e.target.value);
                        }}
                        style={{
                          padding: '2px 4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '12px',
                          width: '70px'
                        }}
                      >
                        <option value="and">and</option>
                        <option value="or">or</option>
                      </select>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={condition.field || ''}
                      placeholder="Field"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        updateInCondition(node.id, index, 'field', e.target.value);
                      }}
                      style={{
                        flex: 1,
                        padding: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                    />
                    
                    <select
                      value={condition.operator || '=='}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        updateInCondition(node.id, index, 'operator', e.target.value);
                      }}
                      style={{
                        width: '45px',
                        padding: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                    >
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                    
                    <input
                      type="text"
                      value={condition.value || ''}
                      placeholder="Value"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        updateInCondition(node.id, index, 'value', e.target.value);
                      }}
                      style={{
                        flex: 1,
                        padding: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                </div>
              ))}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addInCondition(node.id);
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  width: '100%'
                }}
              >
                + Добавить условие
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  Rows:
                </label>
                <input
                  type="number"
                  value={node.data.rows || 1}
                  min="1"
                  max="100"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    updateNodeData(node.id, 'rows', parseInt(e.target.value) || 1);
                  }}
                  style={{
                    width: '60px',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
          );
          
        case 'isinrange':
          return (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                ID объекта:
              </label>
              <input
                type="text"
                value={node.data.entityId || ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  updateNodeData(node.id, 'entityId', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={node.data.needInteraction || false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    updateNodeData(node.id, 'needInteraction', e.target.checked);
                  }}
                  style={{ marginRight: '8px' }}
                />
                <label style={{ fontSize: '12px' }}>
                  Требуется возможность интеракции
                </label>
              </div>
            </div>
          );
          
        case 'action':
          switch (node.data.actionType) {
            case 'playdialog':
              return (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                    ID диалога:
                  </label>
                  <input
                    type="text"
                    value={node.data.dialogId || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateNodeData(node.id, 'dialogId', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </div>
              );
            
            case 'showpopup':
              return (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                    ID подсказки:
                  </label>
                  <input
                    type="text"
                    value={node.data.popupId || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateNodeData(node.id, 'popupId', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </div>
              );
            
            case 'showvfx':
            case 'hidevfx':
              return (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                    ID эффекта:
                  </label>
                  <input
                    type="text"
                    value={node.data.vfxId || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateNodeData(node.id, 'vfxId', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </div>
              );
            
            case 'teleportnpcactortopoint':
              return (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                    ID NPC:
                  </label>
                  <input
                    type="text"
                    value={node.data.npcId || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateNodeData(node.id, 'npcId', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px',
                      marginBottom: '8px'
                    }}
                  />
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                    ID точки:
                  </label>
                  <input
                    type="text"
                    value={node.data.pointId || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateNodeData(node.id, 'pointId', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </div>
              );
            
            case 'givequest':
              return (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                    ID квеста:
                  </label>
                  <input
                    type="text"
                    value={node.data.questId || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateNodeData(node.id, 'questId', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </div>
              );
              
            // Другие типы действий...
            
            default:
              return (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                    Действие: {node.data.actionType}
                  </label>
                  <input
                    type="text"
                    value={node.data.value || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateNodeData(node.id, 'value', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </div>
              );
          }
          
        case 'do':
          return (
            <div style={{ 
              textAlign: 'center',
              fontSize: '12px',
              opacity: 0.8,
              padding: '4px'
            }}>
              Блок действий
            </div>
          );
          
        default:
          return null;
      }
    };
    
    // Рассчитываем позицию и размеры с учетом масштаба и смещения
    const x = node.x * viewState.scale + viewState.offsetX;
    const y = node.y * viewState.scale + viewState.offsetY;
    const width = node.width * viewState.scale;
    const height = node.height * viewState.scale;
    
    // Толщина границы и размер заголовка
    const borderWidth = viewState.scale < 0.3 ? 3 : 2;
    const headerHeight = Math.max(24, 30 * viewState.scale);
    
    return (
      <div
        key={node.id}
        className="node"
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          minHeight: `${height}px`,
          backgroundColor: bgColor,
          borderRadius: '8px',
          border: `${borderWidth}px solid ${isSelected ? 'white' : borderColor}`,
          color: 'white',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          zIndex: isSelected ? 10 : 1,
          cursor: 'move',
          overflow: 'hidden'
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
      >
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `4px 8px`,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: viewState.scale < 0.2 ? '11px' : '14px',
          fontWeight: 'bold',
          height: `${headerHeight}px`,
          boxSizing: 'border-box'
        }}>
          <span style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '80%'
          }}>
            {node.label}
          </span>
          
          {viewState.scale > 0.2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNode(node.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                opacity: 0.8,
                padding: 0,
                margin: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
          )}
        </div>
        
        {/* Содержимое */}
        <div style={{ 
          padding: '6px',
          fontSize: '12px'
        }}>
          {renderNodeContent()}
        </div>
      </div>
    );
  }, [
    addInCondition,
    editorState.selectedNode,
    handleNodeMouseDown,
    removeNode,
    updateInCondition,
    updateNodeData,
    viewState.scale,
    viewState.offsetX,
    viewState.offsetY
  ]);
  
  // Рендеринг портов
  const renderPorts = useCallback(() => {
    // Определяем, какие порты нужно отображать при текущем масштабе
    const shouldShowPorts = (node: Node): boolean => {
      return viewState.scale > 0.15 || editorState.selectedNode === node.id;
    };
    
    return editorState.nodes.flatMap(node => {
      // Если не нужно показывать порты, возвращаем пустой массив
      if (!shouldShowPorts(node)) return [];
      
      return node.ports.map(port => {
        const isInput = port.type === 'input';
        const portColor = getPortColor(port.dataType);
        const portIndex = node.ports.filter(p => p.type === port.type).indexOf(port);
        
        // Размер порта в зависимости от масштаба
        const portSize = Math.max(6, 12 * Math.min(1, viewState.scale));
        
        // Позиция порта
        const portX = isInput 
          ? node.x * viewState.scale + viewState.offsetX - portSize / 2
          : (node.x + node.width) * viewState.scale + viewState.offsetX - portSize / 2;
        
        const portY = (node.y + 40 + portIndex * 25) * viewState.scale + viewState.offsetY - portSize / 2;
        
        // Граница порта
        const portBorderWidth = Math.max(1, 2 * viewState.scale);
        
        // Показываем имя порта при определенном масштабе
        const showLabel = viewState.scale > 0.25 || editorState.selectedNode === node.id;
        
        return (
          <div
            key={`${node.id}-${port.id}`}
            className="port"
            data-node-id={node.id}
            data-port-id={port.id}
            data-port-type={port.type}
            style={{
              position: 'absolute',
              left: `${portX}px`,
              top: `${portY}px`,
              width: `${portSize}px`,
              height: `${portSize}px`,
              borderRadius: '50%',
              backgroundColor: portColor,
              border: `${portBorderWidth}px solid white`,
              cursor: 'pointer',
              zIndex: editorState.selectedNode === node.id ? 11 : 2
            }}
            onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, port.type)}
          >
            {showLabel && (
              <div style={{
                position: 'absolute',
                [isInput ? 'right' : 'left']: `${portSize + 5}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                color: 'white',
                textShadow: '0 0 4px black, 0 0 4px black',
                pointerEvents: 'none'
              }}>
                {port.name}
              </div>
            )}
          </div>
        );
      });
    });
  }, [
    editorState.nodes, 
    editorState.selectedNode, 
    handlePortMouseDown, 
    viewState.scale, 
    viewState.offsetX, 
    viewState.offsetY
  ]);
  
  // Рендеринг панели инструментов
  const renderToolbar = () => {
    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 100,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px'
      }}>
        <button
          onClick={() => addNode('condition')}
          style={{
            backgroundColor: '#166534',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          + Условие
        </button>
        
        <button
          onClick={() => addNode('do')}
          style={{
            backgroundColor: '#3a3768',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          + Действие (do)
        </button>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenMenu(openMenu === 'conditions' ? null : 'conditions')}
            style={{
              backgroundColor: '#1e3a58',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            + Условия ▾
          </button>
          {openMenu === 'conditions' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: '#1f2937',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                zIndex: 101,
                minWidth: '180px',
                marginTop: '2px'
              }}
            >
              <div
                onClick={() => {
                  addNode('in');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                In (Проверка в таблице)
              </div>
              <div
                onClick={() => {
                  addNode('isinrange');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                IsInRange (Проверка расстояния)
              </div>
            </div>
          )}
        </div>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenMenu(openMenu === 'actions' ? null : 'actions')}
            style={{
              backgroundColor: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            + Действия ▾
          </button>
          {openMenu === 'actions' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: '#1f2937',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                zIndex: 101,
                minWidth: '220px',
                marginTop: '2px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}
            >
              <div
                onClick={() => {
                  addNode('action', 'playdialog');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                PlayDialog (Проиграть диалог)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'showpopup');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                ShowPopup (Показать подсказку)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'showvfx');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                ShowVfx (Показать эффект)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'hidevfx');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                HideVfx (Скрыть эффект)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'teleportnpcactortopoint');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                TeleportNpcActorToPoint (Телепорт NPC)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'givequest');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                GiveQuest (Выдать квест)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'grant');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                Grant (Выдать награду)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'skiptimeto');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                SkipTimeTo (Пропустить время)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'giveagift');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                GiveAGift (Дать подарок)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'setfriendshiplevel');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                SetFriendshipLevel (Установить уровень дружбы)
              </div>
              <div
                onClick={() => {
                  addNode('action', 'addrelationshippoints');
                  setOpenMenu(null);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                AddRelationshipPoints (Добавить очки отношений)
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Рендеринг панели управления
  const renderControls = () => {
    return (
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: 100,
        display: 'flex',
        gap: '5px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '5px',
        borderRadius: '4px'
      }}>
        <button
          onClick={() => setViewState(prev => ({
            ...prev,
            scale: Math.max(0.1, prev.scale - 0.1)
          }))}
          style={{
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            width: '30px',
            height: '30px',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          -
        </button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          width: '60px',
          textAlign: 'center'
        }}>
          {Math.round(viewState.scale * 100)}%
        </div>
        <button
          onClick={() => setViewState(prev => ({
            ...prev,
            scale: Math.min(3, prev.scale + 0.1)
          }))}
          style={{
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            width: '30px',
            height: '30px',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </button>
        <button
          onClick={resetView}
          style={{
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '0 10px',
            height: '30px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Сброс
        </button>
      </div>
    );
  };
  
  // Рендеринг инструкций по управлению
  const renderInstructions = () => {
    return (
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '12px',
        pointerEvents: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '5px',
        borderRadius: '4px',
        zIndex: 90
      }}>
        Пробел+ЛКМ или Ctrl+ЛКМ: перемещение холста • Колесо мыши: масштабирование
      </div>
    );
  };
  
  return (
    <div className={`node-editor ${className || ''}`}
      style={{ 
        width: '100%', 
        height: '100vh',
        position: 'relative',
        backgroundColor: '#1a1a2e',
        overflow: 'hidden',
        cursor: viewState.isDragging
          ? 'grabbing' 
          : isSpacePressed
            ? 'grab'
            : 'default'
      }}
    >
      {/* Основная область редактора */}
      <div 
        ref={editorRef}
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onMouseDown={handleCanvasMouseDown}
        onClick={() => {
          setEditorState(prev => ({ ...prev, selectedNode: null }));
          setOpenMenu(null);
        }}
      >
        {/* Фоновая сетка */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `radial-gradient(circle, #333 1px, transparent 1px)`,
            backgroundSize: `${20 * viewState.scale}px ${20 * viewState.scale}px`,
            backgroundPosition: `${viewState.offsetX % (20 * viewState.scale)}px ${viewState.offsetY % (20 * viewState.scale)}px`,
            opacity: 0.2,
            pointerEvents: 'none'
          }}
        />
        
        {/* Соединения */}
        {renderConnections()}
        
        {/* Узлы */}
        {editorState.nodes.map(renderNode)}
        
        {/* Порты */}
        {renderPorts()}
      </div>
      
      {/* Панель инструментов */}
      {renderToolbar()}
      
      {/* Панель управления */}
      {renderControls()}
      
      {/* Инструкции по управлению */}
      {renderInstructions()}
      
      {/* Индикатор отдаленного режима */}
      {viewState.scale < 0.3 && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 90
        }}>
          Отдаленный вид (упрощенное отображение)
        </div>
      )}
    </div>
  );
};

export default NodeEditor;