/**
 * Row-Based Masonry Layout with JavaScript
 * Combines true masonry effect with left-to-right ordering
 */

class RowMasonry {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      gap: 16, // Default gap in pixels
      breakpoints: {
        480: 2,   // 2 columns from 480px
        768: 2,   // 2 columns from 768px  
        1024: 3,  // 3 columns from 1024px
        1280: 4,  // 4 columns from 1280px
        1536: 4   // 4 columns from 1536px+
      },
      ...options
    };
    
    this.items = [];
    this.columnHeights = [];
    this.currentColumns = 1;
    
    this.init();
  }

  init() {
    if (!this.container) return;
    
    // Add JavaScript class to container
    this.container.classList.add('js-masonry');
    
    // Get all masonry items
    this.items = Array.from(this.container.querySelectorAll('.masonry-item'));
    
    // Wait for images to load, then layout
    this.waitForImages().then(() => {
      this.layout();
    });
    
    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.layout(), 150);
    });
  }

  async waitForImages() {
    const images = this.container.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      
      return new Promise((resolve) => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
        // Fallback timeout
        setTimeout(resolve, 3000);
      });
    });
    
    await Promise.all(promises);
  }

  getColumnsCount() {
    const width = window.innerWidth;
    const breakpoints = this.options.breakpoints;
    
    // Find the appropriate number of columns
    let columns = 1;
    for (const [breakpoint, cols] of Object.entries(breakpoints)) {
      if (width >= parseInt(breakpoint)) {
        columns = cols;
      }
    }
    
    return columns;
  }

  getGap() {
    const width = window.innerWidth;
    
    if (width >= 1536) return 32; // 2rem
    if (width >= 768) return 24;  // 1.5rem
    if (width < 640) return 12;   // 0.75rem
    return 16; // 1rem default
  }

  layout() {
    if (!this.items.length) return;
    
    const columns = this.getColumnsCount();
    const gap = this.getGap();
    const containerWidth = this.container.clientWidth;
    
    // Calculate column width
    const columnWidth = (containerWidth - (gap * (columns - 1))) / columns;
    
    // Initialize column heights
    this.columnHeights = new Array(columns).fill(0);
    
    // Position items in row order (left to right, then next row)
    let currentRow = 0;
    let itemsInCurrentRow = 0;
    
    this.items.forEach((item, index) => {
      // Calculate row and column for this item
      const itemsPerRow = Math.min(columns, this.items.length - (currentRow * columns));
      const columnInRow = itemsInCurrentRow;
      
      // Find the actual column index (accounting for shorter rows)
      let columnIndex = columnInRow;
      
      // If we're at the start of a new row, reset tracking
      if (itemsInCurrentRow === 0) {
        // For rows with fewer items than columns, center them
        const emptyColumns = columns - itemsPerRow;
        const startOffset = Math.floor(emptyColumns / 2);
        columnIndex = startOffset;
      }
      
      // Calculate position
      const x = columnIndex * (columnWidth + gap);
      const y = this.columnHeights[columnIndex];
      
      // Apply position and size
      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
      item.style.width = `${columnWidth}px`;
      
      // Update column height
      const itemHeight = item.offsetHeight;
      this.columnHeights[columnIndex] += itemHeight + gap;
      
      // Move to next item in row
      itemsInCurrentRow++;
      
      // Check if we need to move to next row
      if (itemsInCurrentRow >= itemsPerRow) {
        currentRow++;
        itemsInCurrentRow = 0;
        
        // For masonry effect: find the shortest column for next row start
        if (currentRow * columns < this.items.length) {
          const minHeight = Math.min(...this.columnHeights);
          this.columnHeights = this.columnHeights.map(h => Math.max(h, minHeight));
        }
      }
    });
    
    // Set container height to the tallest column
    const maxHeight = Math.max(...this.columnHeights);
    this.container.style.height = `${maxHeight}px`;
  }

  refresh() {
    this.layout();
  }
}

// Auto-initialize masonry grids
document.addEventListener('DOMContentLoaded', () => {
  const masonryContainers = document.querySelectorAll('.masonry-grid');
  
  masonryContainers.forEach(container => {
    new RowMasonry(container);
  });
});

// Export for manual initialization
window.RowMasonry = RowMasonry;