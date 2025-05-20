export const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return '#B0B0B0';
      case 'uncommon': return '#87CEEB';
      case 'rare': return '#5174ED';
      case 'exotic': return '#4CAF50';
      case 'epic': return '#D16EFF';
      case 'mythical': return '#9C27B0';
      case 'legendary': return '#FFEB3B';
      case 'relic': return '#FF9800';
      case 'immortal': return '#FFD700';
      case 'ancient': return '#F44336';
      default: return '#B0B0B0';
    }
  };
  
  export const getRarityClass = (rarity: string): string => {
    return `rarity-${rarity}`;
  };