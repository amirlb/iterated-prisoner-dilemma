/**
 * Utility for safely executing dynamic strategy code
 */
class CodeExecutor {
  /**
   * Execute a strategy function with safety measures
   * @param {string} code - The JavaScript code to execute
   * @param {Object} context - The context (this) to use for execution
   * @param {Array} args - Arguments to pass to the function
   * @returns {boolean} - The decision (true for cooperate, false for defect)
   */
  executeStrategy(code, context, args) {
    try {
      // Create a function that will execute with the strategy object as 'this'
      // We avoid passing context properties as function parameters to prevent variable conflicts
      const argsKeys = Object.keys(args);
      const argsValues = Object.values(args);
      
      // Create a function with a proper scope that doesn't redeclare variables
      // that already exist in the context (like 'history')
      const strategyFunction = new Function(...argsKeys, `
        // Execute the strategy code with the context bound as 'this'
        try {
          with (this) {
            // Avoid variable redeclarations by using a wrapper function
            const executeStrategyCode = function() {
              ${code}
            };
            
            return executeStrategyCode.call(this);
          }
        } catch (error) {
          console.error('Error in strategy code:', error);
          return true; // Default to cooperation on error
        }
      `);
      
      // Bind the context and call the function with the arguments
      return strategyFunction.apply(context, argsValues);
    } catch (error) {
      console.error('Error executing strategy code:', error);
      return true; // Default to cooperation on error
    }
  }
  
  /**
   * Validate that the code is safe to execute
   * @param {string} code - The code to validate
   * @returns {boolean} - Whether the code passed validation
   */
  validateCode(code) {
    // Check for dangerous keywords
    const dangerousKeywords = [
      'eval(',
      'new Function(',
      'setTimeout(',
      'setInterval(',
      'document.',
      'window.',
      'process.',
      'require(',
      'import(',
      'localStorage',
      'sessionStorage',
      'fetch(',
      'XMLHttpRequest',
      'WebSocket',
      '__proto__',
      'constructor.prototype',
      'prototype[',
      'prototype.'
    ];
    
    for (const keyword of dangerousKeywords) {
      if (code.includes(keyword)) {
        console.error(`Code contains dangerous keyword: ${keyword}`);
        return false;
      }
    }
    
    // Ensure the code contains a return statement
    if (!code.includes('return ')) {
      console.error('Code doesn\'t contain a return statement');
      return false;
    }
    
    return true;
  }
}

export default new CodeExecutor(); 