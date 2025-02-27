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
      // Clean and validate the code first
      if (!this.validateCode(code)) {
        console.warn('Code validation failed, returning default (cooperate)');
        return true;
      }
      
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
      'require',
      'import',
      'localStorage',
      'sessionStorage',
      'fetch(',
      'XMLHttpRequest',
      'WebSocket',
      '__proto__',
      'prototype',
    ];
    
    for (const keyword of dangerousKeywords) {
      if (code.includes(keyword)) {
        console.error(`Code contains dangerous keyword: ${keyword}`);
        return false;
      }
    }
    
    // Ensure the code contains a return statement
    if (!code.includes('return ')) {
      code = code.trim();

      // If the code is just a simple expression, we can wrap it in a return statement
      if (!code.includes(';') && !code.includes('{')) {
        console.log('Adding return statement to simple expression');
        code = `return ${code};`;
      } else {
        // See if the last statement might be intended as a return
        const lines = code.split('\n');
        const lastNonEmptyLine = lines.filter(line => line.trim().length > 0).pop();
        
        if (lastNonEmptyLine && !lastNonEmptyLine.includes(';') && !lastNonEmptyLine.includes('{')) {
          // Replace the last line with a return statement
          const lastLineIndex = lines.lastIndexOf(lastNonEmptyLine);
          lines[lastLineIndex] = `return ${lastNonEmptyLine};`;
          code = lines.join('\n');
          console.log('Converted last line to return statement');
        } else {
          console.error('Code doesn\'t contain a return statement and couldn\'t be fixed automatically');
          return false;
        }
      }
    }
    
    // Look for syntax errors
    try {
      // Simple syntax check by trying to create a function
      new Function(code);
    } catch (syntaxError) {
      console.error('Code contains syntax errors:', syntaxError.message);
      console.log('Problematic code:', code);
      return false;
    }
    
    return true;
  }
}

export default new CodeExecutor(); 