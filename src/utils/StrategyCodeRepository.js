/**
 * StrategyCodeRepository - A central in-memory repository for storing and retrieving
 * dynamically generated strategy code
 */
class StrategyCodeRepository {
  constructor() {
    // Map to store strategy code by strategy name
    this.codeMap = new Map();
  }
  
  /**
   * Register a strategy in the repository
   * @param {string} name - The strategy name
   * @returns {string} The strategy name
   */
  registerStrategy(name) {
    if (!this.codeMap.has(name)) {
      this.codeMap.set(name, null);
    }
  }
  
  /**
   * Register a standard strategy by extracting its code
   * @param {Strategy} strategy - The strategy instance
   * @returns {string} The strategy name
   */
  registerStandardStrategy(strategy) {
    const name = strategy.name;
    
    // Extract code from the strategy's makeDecision method
    const code = this.extractStrategyCode(strategy);
    
    // Store the code
    this.storeCode(name, code);
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
    
    throw new Error(`Failed to extract code from ${strategy.name}`);
  }
  
  /**
   * Store generated code for a strategy
   * @param {string} name - The strategy name
   * @param {string} code - The generated code
   */
  storeCode(name, code) {
    this.codeMap.set(name, { code, name });
  }
  
  /**
   * Get code for a specific strategy
   * @param {string} name - The strategy name
   * @returns {Object|null} The stored code object or null if not found
   */
  getCode(name) {
    return this.codeMap.get(name) || null;
  }
  
  /**
   * Get all strategy code except for the specified name
   * @param {string} excludeName - The strategy name to exclude
   * @returns {Array} Array of code objects
   */
  getAllCodeExcept(excludeName) {
    const result = [];
    this.codeMap.forEach((value, key) => {
      if (key !== excludeName && value !== null) {
        result.push({ id: key, ...value });
      }
    });
    return result;
  }
}

// Create a singleton instance
const repository = new StrategyCodeRepository();

export default repository; 