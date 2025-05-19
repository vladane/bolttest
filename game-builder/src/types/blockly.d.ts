// src/types/blockly.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    xml: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    category: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 
      name?: string; 
      colour?: string;
    }, HTMLElement>;
    block: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 
      type: string;
    }, HTMLElement>;
  }
}

// Расширение определения для Blockly
declare namespace Blockly {
  // Определяем Theme
  namespace Theme {
    const Dark: any;
    const Classic: any;
  }
  
  // Для обратной совместимости
  namespace Themes {
    const Dark: any;
    const Classic: any;
  }
  
  // Определение для toolbox
  interface ToolboxDefinition {
    kind?: string;
    contents?: any[];
    [key: string]: any;
  }
}