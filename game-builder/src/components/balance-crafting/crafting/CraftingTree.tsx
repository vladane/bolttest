import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '../../../contexts/AppStateContext';
import { formatCraftTime, calculateCraftTime, isValidRecipe } from '../../../utils/craftingCalculations';
import EChartWrapper from '../../common/EChartWrapper';
import * as echarts from 'echarts';

// Интерфейс для узла дерева (обновлен для использования имен)
interface TreeNode {
  id: string;
  itemName: string;
  amount: number;
  children: TreeNode[];
  level: number;
  imageId?: string | null; // Добавляем поле для хранения ID изображения
}

// Интерфейс для суммарных ресурсов
interface ResourceSummary {
  [key: string]: {
    amount: number;
    tier: number;
    isLeaf: boolean;
  };
}

// Интерфейс для пропсов EnhancedGraph
interface EnhancedGraphProps {
  options: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  onChartInit?: (chart: echarts.ECharts) => void;
  [key: string]: any; // Для остальных props
}

// Расширенный компонент для работы с изображениями в графе
const EnhancedGraph: React.FC<EnhancedGraphProps> = ({ options, ...props }) => {
  const chartRef = useRef<echarts.ECharts | null>(null);
  
  useEffect(() => {
    if (chartRef.current) {
      // Применяем опции к графу
      chartRef.current.setOption(options);
      
      // Обработчик события перемещения и масштабирования графа
      chartRef.current.on('graphroam', () => {
        // Получаем данные узлов - используем приведение типа для обхода private метода
        const seriesModel = (chartRef.current as any)?.getModel?.()?.getSeriesByIndex(0);
        if (!seriesModel) return;
        
        const nodeData = seriesModel.getData();
        if (!nodeData) return;
        
        // Обновляем позиции графических элементов изображений
        if (options.graphic && (options.graphic as any).elements) {
          const elements = (options.graphic as any).elements;
          if (Array.isArray(elements)) {
            elements.forEach((element) => {
              if (element && element.type === 'image' && element.id) {
                // Извлекаем ID узла из ID элемента изображения (img_nodeId)
                const nodeId = element.id.replace('img_', '');
                const nodeIndex = nodeData.indexOfName(nodeId);
                
                if (nodeIndex >= 0) {
                  // Получаем новую позицию узла
                  const itemLayout = nodeData.getItemLayout(nodeIndex);
                  if (itemLayout && chartRef.current) {
                    // Обновляем позицию изображения
                    const imgWidth = element.style?.width || 0;
                    const imgHeight = element.style?.height || 0;
                    
                    chartRef.current.setOption({
                      graphic: {
                        elements: [
                          {
                            $action: 'merge',
                            id: element.id,
                            style: {
                              x: itemLayout.x - imgWidth / 2,
                              y: itemLayout.y - imgHeight / 2
                            }
                          }
                        ]
                      }
                    }, false);
                  }
                }
              }
            });
          }
        }
      });
    }
  }, [options]);
  
  return (
    <EChartWrapper
      options={options}
      style={props.style}
      className={props.className}
      onChartInit={(chart: echarts.ECharts) => {
        chartRef.current = chart;
        if (props.onChartInit) props.onChartInit(chart);
      }}
    />
  );
};

export default function CraftingTree() {
  const { state } = useAppState();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree');
  
  // Улучшенная функция для получения URL изображения по ID
  const getImageUrl = (imageId: string | null): string | null => {
    if (!imageId) return null;
    
    try {
      // Проверяем imageMap в resources
      const resourceImage = state.resources.imageMap?.get(imageId);
      if (resourceImage) {
        // Проверяем, содержит ли данные уже data:image формат
        if (typeof resourceImage.data === 'string' && resourceImage.data.startsWith('data:')) {
          return resourceImage.data;
        }
        return `data:${resourceImage.type};base64,${resourceImage.data}`;
      }
      
      // Проверяем imageMap в units
      const unitImage = state.units.imageMap?.get(imageId);
      if (unitImage) {
        // Проверяем, содержит ли данные уже data:image формат
        if (typeof unitImage.data === 'string' && unitImage.data.startsWith('data:')) {
          return unitImage.data;
        }
        return `data:${unitImage.type};base64,${unitImage.data}`;
      }
      
      console.log(`Изображение с ID ${imageId} не найдено ни в одном хранилище`);
      return null;
    } catch (error) {
      console.error(`Ошибка при получении URL изображения:`, error);
      return null;
    }
  };
  
  // Отладочная информация и проверка рецептов
  useEffect(() => {
    console.log("CraftingTree: Загружены рецепты", state.craftSystem.recipes);
    
    // Проверка структуры рецептов
    const invalidRecipes = state.craftSystem.recipes.filter(r => !isValidRecipe(r));
    if (invalidRecipes.length > 0) {
      console.error("Найдены некорректные рецепты:", invalidRecipes);
      setError("Некоторые рецепты имеют неправильную структуру. Проверьте консоль для подробностей.");
    } else {
      setError(null);
    }
  }, [state.craftSystem.recipes]);
  
  // Получение информации о предмете по имени
  const getItemInfo = (itemName: string) => {
    if (!itemName) {
      return { tier: 1, complexity: 'Средне', imageId: null };
    }
    
    try {
      // Проверяем в предметах баланса
      const item = state.balance.comparisonItems.find(i => i.name === itemName);
      if (item) {
        return {
          tier: item.tier || 1,
          complexity: item.craftComplexity || 'Средне',
          imageId: item.imageId || null
        };
      }
      
      // Проверяем в ресурсах
      const resource = state.resources.items.find(r => r.name === itemName);
      if (resource) {
        return {
          tier: resource.value || 1,
          complexity: 'Средне',
          imageId: resource.imageId || null
        };
      }
      
      // Проверяем в рецептах
      const recipe = state.craftSystem.recipes.find(r => r.resultItemName === itemName);
      if (recipe) {
        return {
          tier: recipe.level || 1,
          complexity: 'Средне',
          imageId: recipe.imageId || null
        };
      }
      
      return { tier: 1, complexity: 'Средне', imageId: null };
    } catch (err) {
      console.error(`Ошибка получения информации для ${itemName}:`, err);
      return { tier: 1, complexity: 'Средне', imageId: null };
    }
  };
  
  // Проверяем, существует ли рецепт для предмета
  const hasRecipe = (itemName: string): boolean => {
    if (!itemName) return false;
    
    try {
      return state.craftSystem.recipes.some(recipe => recipe.resultItemName === itemName);
    } catch (err) {
      console.error(`Ошибка проверки рецепта для ${itemName}:`, err);
      return false;
    }
  };
  
  // Строим дерево рецептов с упрощенной генерацией ID
  const buildTreeData = (itemName: string, amount: number, level: number = 0, idPrefix: string = ''): TreeNode | null => {
    try {
      if (!itemName) {
        console.error("Попытка построить дерево для пустого имени предмета");
        return null;
      }
      
      // Упрощенная генерация ID для более надежного сопоставления узлов
      const uniqueId = `${idPrefix}_${itemName.replace(/\s+/g, '_')}_${level}`;
      
      // Получаем информацию о предмете, включая imageId
      const { imageId } = getItemInfo(itemName);
      
      const node: TreeNode = {
        id: uniqueId,
        itemName,
        amount,
        children: [],
        level,
        imageId // Сохраняем ID изображения
      };
      
      // Для предотвращения бесконечной рекурсии, ограничиваем уровень вложенности
      if (level >= 5) return node;
      
      // Ищем рецепт для данного предмета
      const recipe = state.craftSystem.recipes.find(r => r.resultItemName === itemName);
      
      if (recipe && recipe.variants && recipe.variants.length > 0) {
        // Для простоты берем первый вариант рецепта
        const variant = recipe.variants[0];
        
        if (variant && variant.ingredients && Array.isArray(variant.ingredients)) {
          // Для каждого ингредиента строим поддерево
          variant.ingredients.forEach((ingredient, index) => {
            if (!ingredient || !ingredient.itemName) return;
            
            // Расчет необходимого количества ингредиента
            const requiredAmount = Math.ceil((ingredient.amount * amount) / (recipe.resultAmount || 1));
            
            // Используем индекс для создания уникального префикса ID дочернего узла
            const childIdPrefix = `${uniqueId}_${index}`;
            
            // Если для ингредиента тоже есть рецепт, строим поддерево
            if (hasRecipe(ingredient.itemName)) {
              const childNode = buildTreeData(ingredient.itemName, requiredAmount, level + 1, childIdPrefix);
              if (childNode) {
                node.children.push(childNode);
              }
            } else {
              // Получаем информацию для листового узла, включая imageId
              const { imageId: childImageId } = getItemInfo(ingredient.itemName);
              
              // Если нет рецепта, это листовой узел
              node.children.push({
                id: `${childIdPrefix}_leaf`,
                itemName: ingredient.itemName,
                amount: requiredAmount,
                children: [],
                level: level + 1,
                imageId: childImageId // Сохраняем ID изображения
              });
            }
          });
        }
      }
      
      return node;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Ошибка при построении дерева: ${errorMessage}`);
      return null;
    }
  };
  
  // Обновляем дерево при выборе рецепта
  useEffect(() => {
    if (selectedRecipeId) {
      try {
        const recipe = state.craftSystem.recipes.find(r => r.id === selectedRecipeId);
        if (recipe && recipe.resultItemName) {
          const tree = buildTreeData(recipe.resultItemName, recipe.resultAmount || 1);
          setTreeData(tree);
          
          if (tree) {
            // По умолчанию разворачиваем первый уровень
            const expanded = new Set<string>();
            expanded.add(tree.id);
            setExpandedNodes(expanded);
          }
        } else {
          setTreeData(null);
          setError("Выбран некорректный рецепт. Не найдено имя результата.");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(`Ошибка при создании дерева: ${errorMessage}`);
        setTreeData(null);
      }
    } else {
      setTreeData(null);
      setError(null);
    }
  }, [selectedRecipeId, state.craftSystem.recipes]);
  
  // Переключение состояния узла (свернут/развернут)
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  // Получение общего времени крафта для узла
  const getNodeCraftTime = (node: TreeNode): number => {
    try {
      const { complexity } = getItemInfo(node.itemName);
      const recipe = state.craftSystem.recipes.find(r => r.resultItemName === node.itemName);
      
      if (!recipe) return 0;
      
      // Рассчитываем время крафта
      return calculateCraftTime(
        complexity,
        recipe.level || 1,
        state.balance.currentConfig
      ) * Math.ceil(node.amount / (recipe.resultAmount || 1));
    } catch (error) {
      console.error("Ошибка при расчете времени крафта:", error);
      return 0;
    }
  };
  
  // Анализируем и суммируем базовые ресурсы
  const resourceSummary = useMemo(() => {
    if (!treeData) return {};
    
    const summary: ResourceSummary = {};
    
    const collectResources = (node: TreeNode) => {
      if (!node) return;
      
      const isLeaf = !hasRecipe(node.itemName);
      
      if (isLeaf) {
        // Это базовый ресурс, добавляем его в сумму
        if (!summary[node.itemName]) {
          const { tier } = getItemInfo(node.itemName);
          summary[node.itemName] = { amount: 0, tier, isLeaf: true };
        }
        summary[node.itemName].amount += node.amount;
      } else {
        // Для крафтовых предметов тоже сохраняем информацию
        if (!summary[node.itemName]) {
          const { tier } = getItemInfo(node.itemName);
          summary[node.itemName] = { amount: 0, tier, isLeaf: false };
        }
        summary[node.itemName].amount += node.amount;
      }
      
      // Обрабатываем дочерние узлы
      for (const child of node.children) {
        collectResources(child);
      }
    };
    
    collectResources(treeData);
    
    return summary;
  }, [treeData]);
  
  // Данные для графа с более надежной обработкой изображений
  const graphData = useMemo(() => {
    if (!treeData) return { nodes: [], links: [] };
    
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Преобразуем дерево в плоскую структуру для графа
    function processTreeNode(node: TreeNode, parentId: string | null = null, level = 0) {
      const nodeId = node.id;
      const isLeaf = !hasRecipe(node.itemName);
      const { tier, imageId } = getItemInfo(node.itemName);
      
      // Получаем URL изображения, если оно есть
      const imgId = node.imageId || imageId;
      const imageUrl = getImageUrl(imgId);
      
      // Отладочное логирование для изображений
      if (imgId && !imageUrl) {
        console.warn(`Не удалось получить URL для изображения с ID ${imgId} для ${node.itemName}`);
      } else if (imageUrl) {
        console.log(`Загружен URL изображения для ${node.itemName}`);
      }
      
      // Добавляем узел с информацией о его уровне для правильного позиционирования
      nodes.push({
        id: nodeId,
        name: node.itemName,
        amount: node.amount,
        tier: tier,
        category: isLeaf ? 0 : 1,  // 0 - ресурс, 1 - крафтовый предмет
        level: level,              // Уровень в иерархии для структурированного отображения
        imageUrl: imageUrl,        // Добавляем URL изображения
        imageId: imgId             // Сохраняем ID изображения для отладки
      });
      
      // Если есть родитель, создаем связь
      if (parentId !== null) {
        links.push({
          source: nodeId,         // Ингредиент
          target: parentId,       // Результат
          amount: node.amount,    // Количество
          sourceLevel: level,
          targetLevel: level - 1  // Родительский узел всегда на уровень выше
        });
      }
      
      // Рекурсивно обрабатываем дочерние узлы
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          processTreeNode(child, nodeId, level + 1);
        }
      }
    }
    
    // Начинаем с корневого узла
    processTreeNode(treeData);
    
    return { nodes, links };
  }, [treeData]);

// Полностью переработанные опции для графа с изображениями только в тултипах
const graphOptions = useMemo((): echarts.EChartsOption => {
  const { nodes, links } = graphData;
  
  if (nodes.length === 0) return { series: [] };
  
  const isDark = document.documentElement.classList.contains('dark');
  const backgroundColor = isDark ? '#192231' : '#f8fafc';
  const textColor = isDark ? '#e5e7eb' : '#374151';
  
  // Находим максимальный уровень для корректного расположения узлов
  const maxLevel = Math.max(...nodes.map(node => node.level || 0), 0);
  
  // Умеренное расстояние между уровнями
  const levelSpacing = 180;
  
  // Заполняем узлы графа
  const processedNodes = nodes.map(node => {
    // Инвертируем уровни, чтобы конечный продукт был справа
    const x = 50 + (maxLevel - (node.level || 0)) * levelSpacing;
    
    // Вычисляем позицию по Y с учетом узлов на том же уровне
    const levelNodes = nodes.filter(n => n.level === node.level);
    const levelIndex = levelNodes.findIndex(n => n.id === node.id);
    const levelCount = levelNodes.length;
    
    // Устанавливаем вертикальное расстояние
    const verticalSpacing = 90 + levelCount * 30;
    
    // Равномерно распределяем узлы на одном уровне
    const y = levelCount > 1 
      ? 100 + (levelIndex / (levelCount - 1)) * verticalSpacing 
      : 350; // Центрируем единственный узел
          
    // Определяем, является ли узел ресурсом или крафтовым предметом
    const isResource = node.category === 0;
    
    // Форматируем текст названия для лучшей читаемости
    let formattedName = node.name;
    
    // Особая обработка для "Доска из сухой древесины"
    if (node.name === 'Доска из сухой древесины') {
      formattedName = 'Доска из\nсухой древесины';
    } 
    // Для длинных названий с пробелами делаем перенос
    else if (node.name.includes(' ') && node.name.length > 15) {
      const firstSpaceIndex = node.name.indexOf(' ');
      formattedName = node.name.substring(0, firstSpaceIndex) + 
                     '\n' + node.name.substring(firstSpaceIndex + 1);
    }
    
    // Размеры узлов
    const circleSize = isResource ? 70 : 60;
    const rectWidth = Math.min(150, 110 + node.name.length * 2);
    const rectHeight = 60;
    
    // Устанавливаем размер на основе типа узла
    const symbolSize = isResource ? circleSize : [rectWidth, rectHeight];
    
    // Определяем цвет и стиль узла на основе его типа
    const nodeColor = isResource ? '#3B82F6' : '#10B981'; // Синий для ресурсов, зеленый для предметов
    
    // Возвращаем настройки для узла
    return {
      ...node,
      x: x,
      y: y,
      symbol: isResource ? 'circle' : 'roundRect',
      symbolSize: symbolSize,
      itemStyle: {
        color: nodeColor,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        borderWidth: 2,
        shadowBlur: 3,
        shadowColor: 'rgba(0, 0, 0, 0.3)'
      },
      label: {
        show: true,
        position: 'inside',
        formatter: `${formattedName}\nx${node.amount}`,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFFFFF', // Белый текст для всех узлов
        padding: [3, 3],
        borderRadius: 3,
        width: isResource ? (typeof symbolSize === 'number' ? symbolSize * 0.8 : 0) : rectWidth - 10,
        height: isResource ? (typeof symbolSize === 'number' ? symbolSize * 0.8 : 0) : rectHeight - 8,
        overflow: 'break',
        lineHeight: 16
      }
    };
  });
  
  return {
    backgroundColor: backgroundColor,
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        if (!params) return '';
        
        if (params.dataType === 'node') {
          // Сохраняем информацию об изображении для тултипа
          const imageInfo = params.data.imageUrl 
            ? `<div style="color:lime">Изображение: Есть</div>` 
            : `<div style="color:red">Изображение: Нет${params.data.imageId ? ' (ID: ' + params.data.imageId + ')' : ''}</div>`;
          
          // Сохраняем предпросмотр изображения для тултипа
          const imagePreview = params.data.imageUrl 
            ? `<div style="text-align:center; margin-top:5px; margin-bottom:5px">
                <img src="${params.data.imageUrl}" style="max-width:120px; max-height:80px; border:2px solid white;" />
              </div>` 
            : '';
          
          return `<div style="padding: 10px; max-width:250px;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size:14px;">${params.data.name}</div>
            ${imagePreview}
            <div>Количество: x${params.data.amount}</div>
            <div>Тир: ${params.data.tier || '?'}</div>
            <div>Тип: ${params.data.category === 0 ? 'Ресурс' : 'Крафтовый предмет'}</div>
            ${imageInfo}
          </div>`;
        }
        if (params.dataType === 'edge') {
          return `<div style="padding: 8px;">
            <div>Требуется: x${params.data.amount || 1}</div>
          </div>`;
        }
        return '';
      },
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#555' : '#ddd',
      textStyle: {
        color: isDark ? '#fff' : '#333'
      }
    },
    // Отключаем графические элементы с изображениями
    graphic: {
      elements: []
    },
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    zoom: 0.95,
    series: [
      {
        type: 'graph',
        layout: 'none',
        data: processedNodes,
        links: links.map(link => ({
          source: link.source,
          target: link.target,
          lineStyle: {
            color: '#64748b',
            width: 2,
            curveness: 0.2,
            type: 'solid',
            opacity: 0.8
          },
          label: {
            show: true,
            formatter: `x${link.amount || 1}`,
            fontSize: 10,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            padding: [2, 4],
            borderRadius: 3,
            color: textColor,
            fontWeight: 'bold'
          },
          symbol: ['none', 'arrow'],
          symbolSize: [0, 8]
        })),
        categories: [
          { name: 'Resource' },
          { name: 'Craftable Item' }
        ],
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        emphasis: {
          scale: true,
          focus: 'adjacency'
        },
        force: {
          repulsion: 150,
          edgeLength: 90
        }
      }
    ]
  };
}, [graphData]);
  
  // Рендеринг узла дерева (текстовое представление) с поддержкой изображений
  const renderTreeNode = (node: TreeNode) => {
    if (!node) return null;
    
    try {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      const { tier, imageId } = getItemInfo(node.itemName);
      const recipe = state.craftSystem.recipes.find(r => r.resultItemName === node.itemName);
      
      // Получаем URL изображения 
      const imgId = node.imageId || imageId;
      const imageUrl = getImageUrl(imgId);
      
      // Получаем время крафта, если есть рецепт
      const craftTime = recipe ? getNodeCraftTime(node) : 0;
      
      return (
        <div key={node.id} className="ml-6">
          <div className="flex items-center py-2">
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="mr-2 h-5 w-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {isExpanded ? '−' : '+'}
              </button>
            )}
            
            {!hasChildren && <div className="mr-2 w-5"></div>}
            
            {/* Отображаем иконку, если она есть */}
            {imageUrl ? (
              <div className="w-6 h-6 mr-2 flex-shrink-0 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img 
                  src={imageUrl} 
                  alt={node.itemName} 
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              imgId && (
                <div className="w-6 h-6 mr-2 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xs text-gray-500">ID</span>
                </div>
              )
            )}
            
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium">{node.itemName}</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  (T{tier}) × {node.amount}
                </span>
                
                {craftTime > 0 && (
                  <span className="ml-3 text-sm text-blue-500 dark:text-blue-400">
                    {formatCraftTime(craftTime)}
                  </span>
                )}
              </div>
              
              {recipe && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Recipe: {recipe.name}
                </div>
              )}
            </div>
          </div>
          
          {isExpanded && hasChildren && (
            <div className="border-l-2 border-gray-300 dark:border-gray-700 pl-2">
              {node.children.map(childNode => renderTreeNode(childNode))}
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error("Ошибка рендеринга узла дерева:", error);
      return (
        <div className="ml-6 py-2 text-red-500">
          Error rendering node: {error instanceof Error ? error.message : String(error)}
        </div>
      );
    }
  };
  
  // Если произошла ошибка, показываем сообщение об ошибке
  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 rounded-lg shadow-sm p-4 border border-red-300 dark:border-red-700">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Ошибка дерева крафта</h2>
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-300 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Crafting Tree</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1 rounded ${
              viewMode === 'tree' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`px-3 py-1 rounded ${
              viewMode === 'graph' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Graph View
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Select Recipe</label>
        <select
          value={selectedRecipeId || ''}
          onChange={(e) => setSelectedRecipeId(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select a recipe</option>
          {state.craftSystem.recipes
            .filter(r => isValidRecipe(r))
            .map(recipe => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name} ({recipe.resultItemName})
              </option>
            ))}
        </select>
      </div>
      
      {selectedRecipeId && treeData ? (
        <div className="border border-gray-500 dark:border-gray-600 rounded-md p-4 bg-gray-50 dark:bg-gray-900/30">
          <div className="font-semibold mb-2">
            Recipe Tree: {state.craftSystem.recipes.find(r => r.id === selectedRecipeId)?.name}
          </div>
          
          {viewMode === 'tree' ? (
            // Текстовое представление дерева
            <div className="overflow-x-auto">
              {renderTreeNode(treeData)}
            </div>
          ) : (
            // Графическое представление дерева с поддержкой изображений
            <div 
              className="relative overflow-hidden border border-gray-600 dark:border-gray-700 rounded-lg"
              style={{ height: '650px', minHeight: '650px', width: '100%' }}
            >
              <EnhancedGraph
                options={graphOptions} 
                style={{ height: '100%', width: '100%', minHeight: '650px' }} 
              />
              
              {/* Легенда - более заметное оформление */}
              <div className="absolute top-4 right-4 p-3 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 border border-gray-300 dark:border-gray-600">
                <div className="font-semibold mb-2">Legend:</div>
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span>Resource</span>
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-4 h-3 rounded bg-green-500 mr-2"></div>
                  <span>Craftable Item</span>
                </div>
                <div className="flex items-center mb-1">
                  <hr className="w-5 border-blue-500 border-2 mr-2" />
                  <span>Resource Path</span>
                </div>
                <div className="flex items-center mb-1">
                  <hr className="w-5 border-green-500 border-2 mr-2" />
                  <span>Crafting Path</span>
                </div>
                <div className="flex items-center">
                  <hr className="w-5 border-purple-500 border-dashed border-2 mr-2" />
                  <span>Final Product Link</span>
                </div>
              </div>
              
              {/* Отладочная информация для изображений */}
              <div className="absolute top-4 left-4 p-3 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 border border-gray-300 dark:border-gray-600">
                <div className="font-semibold mb-1">Image Debug:</div>
                <div>• Hover на узел для просмотра информации об изображении</div>
                <div>• Красный текст означает отсутствие изображения</div>
                <div>• ID отображается, если есть идентификатор без изображения</div>
              </div>
              
              {/* Улучшенное описание взаимодействия */}
              <div className="absolute bottom-4 left-4 p-3 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 border border-gray-300 dark:border-gray-600">
                <div className="font-semibold mb-1">Tip:</div>
                <div>• Колесо мыши: масштабирование</div>
                <div>• Перетаскивание: перемещение узлов и графа</div>
                <div>• Клик на узел: подсветка связанных элементов</div>
                <div>• Двойной клик: центрирование на узле</div>
              </div>
            </div>
          )}
          
          {/* Суммарная информация о ресурсах */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm border border-blue-200 dark:border-blue-800">
            <div className="font-medium text-blue-800 dark:text-blue-300 mb-2">Resource Requirements Summary:</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(resourceSummary)
                .filter(([_, info]) => info.isLeaf) // Показываем только базовые ресурсы
                .sort(([a], [b]) => a.localeCompare(b)) // Сортируем по алфавиту
                .map(([itemName, info]) => {
                  // Получаем изображение для ресурса
                  const { imageId } = getItemInfo(itemName);
                  const imageUrl = getImageUrl(imageId);
                  
                  return (
                    <div key={itemName} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="flex items-center">
                        {/* Отображаем миниатюру, если есть */}
                        {imageUrl ? (
                          <div className="w-6 h-6 mr-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                            <img 
                              src={imageUrl} 
                              alt={itemName} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ) : imageId && (
                          <div className="w-6 h-6 mr-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-gray-500">ID</span>
                          </div>
                        )}
                        <span className="font-medium">{itemName}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(T{info.tier})</span>
                      </div>
                      <div className="font-bold text-blue-500 dark:text-blue-400">
                        x{info.amount}
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {Object.entries(resourceSummary).filter(([_, info]) => info.isLeaf).length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">
                No base resources found in this recipe.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 border border-dashed border-gray-500 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/30">
          Please select a recipe to view its crafting tree.
        </div>
      )}
    </div>
  );
}