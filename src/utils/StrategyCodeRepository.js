/**
 * StrategyCodeRepository - A central in-memory repository for storing and retrieving
 * dynamically generated strategy code
 */
class StrategyCodeRepository {
  constructor() {
    // Map to store strategy code by strategy instance ID
    this.codeMap = new Map();
    
    // Counter for generating unique IDs
    this.idCounter = 0;
  }
  
  /**
   * Register a new strategy and get a unique ID
   * @returns {string} A unique ID for the strategy
   */
  registerStrategy() {
    const id = `strategy_${this.idCounter++}`;
    this.codeMap.set(id, null);
    return id;
  }
  
  /**
   * Register a standard strategy by extracting its code
   * @param {Strategy} strategy - The strategy instance
   * @returns {string} A unique ID for the strategy
   */
  registerStandardStrategy(strategy) {
    const id = `strategy_${this.idCounter++}`;
    
    // Extract code from the strategy's makeDecision method
    const code = this.extractStrategyCode(strategy);
    
    // Store the code
    this.storeCode(id, code, strategy.name);
    
    return id;
  }
  
  /**
   * Extract code from a strategy's makeDecision method
   * @param {Strategy} strategy - The strategy instance
   * @returns {string} The extracted code
   */
  extractStrategyCode(strategy) {
    // Get the string representation of the makeDecision function
    const funcStr = strategy.makeDecision.toString();
    
    // Extract the function body (everything between the first { and the last })
    const match = funcStr.match(/\{([\s\S]*)\}/);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Default code if we couldn't extract
    return `
      // Extracted code for ${strategy.name}
      // NOTE: Code extraction failed, this is a placeholder
      return true; // Default to cooperation
    `;
  }
  
  /**
   * Store generated code for a strategy
   * @param {string} id - The strategy ID
   * @param {string} code - The generated code
   * @param {string} name - The strategy name
   */
  storeCode(id, code, name) {
    this.codeMap.set(id, { code, name, timestamp: Date.now() });
  }
  
  /**
   * Get code for a specific strategy
   * @param {string} id - The strategy ID
   * @returns {Object|null} The stored code object or null if not found
   */
  getCode(id) {
    return this.codeMap.get(id) || null;
  }
  
  /**
   * Get all strategy code except for the specified ID
   * @param {string} excludeId - The strategy ID to exclude
   * @returns {Array} Array of code objects
   */
  getAllCodeExcept(excludeId) {
    const result = [];
    this.codeMap.forEach((value, key) => {
      if (key !== excludeId && value !== null) {
        result.push({ id: key, ...value });
      }
    });
    return result;
  }
}

// Create a singleton instance
const repository = new StrategyCodeRepository();

export default repository; 