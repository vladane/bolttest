declare namespace NeoRust {
    interface BlockInfo {
      id: string;
      type: string;
      inputs: Record<string, BlockInfo | BlockInfo[] | null>;
      next: BlockInfo | null;
      fields: Record<string, any>;
    }
    
    interface ReferenceItem {
      name: string;
      description: string;
      syntax: string;
      example: string;
    }
    
    interface ReferenceCategory {
      title: string;
      items: ReferenceItem[];
    }
    
    interface ReferenceData {
      [key: string]: ReferenceCategory;
    }
  }