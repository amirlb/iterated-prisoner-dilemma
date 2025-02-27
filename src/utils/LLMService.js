/**
 * Service for interacting with the LLM server
 */
import LLMServiceMock from './LLMServiceMock.js';

// Helper function for sleeping
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const LLMService = {
  // Track if the server is available
  isServerAvailable: true,
  
  /**
   * Check if the server is running
   * @returns {Promise<boolean>}
   */
  async checkServerAvailability() {
    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await fetch('http://localhost:3001/api/health', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Add mode and credentials to help with CORS
          mode: 'cors',
          credentials: 'include'
        });
        
        this.isServerAvailable = response.ok;
        return response.ok;
      } catch (error) {
        retryCount++;
        
        if (retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
          console.log(`Server check failed. Retrying in ${delay}ms (${retryCount}/${maxRetries})`);
          await sleep(delay);
        } else {
          console.log('LLM server is not available after retries, falling back to mock implementation');
          this.isServerAvailable = false;
          return false;
        }
      }
    }
    
    return false;
  },
  
  /**
   * Query the LLM with a system prompt and user prompt
   * @param {string} systemPrompt - The system instructions for the LLM
   * @param {string} userPrompt - The user input for the LLM
   * @returns {Promise<string>} - The LLM's response
   */
  async queryLLM(systemPrompt, userPrompt) {
    // Add a small delay to prevent hammering the API
    await sleep(100);
    
    // Check server availability if we haven't already determined it's unavailable
    if (this.isServerAvailable) {
      await this.checkServerAvailability();
    }
    
    // If server is not available, use the mock service
    if (!this.isServerAvailable) {
      console.log('Server unavailable, using mock LLM service');
      return LLMServiceMock.queryLLM(systemPrompt, userPrompt);
    }
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await fetch('http://localhost:3001/api/llm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add mode and credentials to help with CORS
          mode: 'cors',
          credentials: 'include',
          body: JSON.stringify({ systemPrompt, userPrompt }),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`LLM API error: ${errorData.error || response.statusText}`);
        }
  
        const data = await response.json();
        
        // Check for the special error code
        if (data.response === 'LLM_ERROR_USE_MOCK') {
          console.log('LLM server returned error code, using mock implementation');
          console.log('Error details:', data.error);
          return LLMServiceMock.queryLLM(systemPrompt, userPrompt);
        }
        
        return data.response;
      } catch (error) {
        retryCount++;
        
        if (retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`LLM query failed. Retrying in ${delay}ms (${retryCount}/${maxRetries})`);
          console.log('Error:', error.message);
          await sleep(delay);
        } else {
          console.error('Error querying LLM after retries:', error);
          console.log('Falling back to mock LLM service');
          // Fall back to the mock service
          return LLMServiceMock.queryLLM(systemPrompt, userPrompt);
        }
      }
    }
    
    // This shouldn't be reached because of the above return, but just in case
    return LLMServiceMock.queryLLM(systemPrompt, userPrompt);
  },
  
  /**
   * Get the source code of all strategies
   * @returns {Promise<string>} - The source code
   */
  async getStrategiesCode() {
    // Check server availability if we haven't already determined it's unavailable
    if (this.isServerAvailable) {
      await this.checkServerAvailability();
    }
    
    // If server is not available, use the mock service
    if (!this.isServerAvailable) {
      console.log('Server unavailable, using mock implementation for strategies code');
      return LLMServiceMock.getStrategiesCode();
    }
    
    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await fetch('http://localhost:3001/api/strategies', { 
          mode: 'cors',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Strategy API error: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        return data.code;
      } catch (error) {
        retryCount++;
        
        if (retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
          console.log(`Strategies fetch failed. Retrying in ${delay}ms (${retryCount}/${maxRetries})`);
          await sleep(delay);
        } else {
          console.error('Error getting strategies code after retries:', error);
          console.log('Falling back to mock implementation for strategies code');
          // Fall back to the mock service
          return LLMServiceMock.getStrategiesCode();
        }
      }
    }
    
    // This shouldn't be reached because of the above return, but just in case
    return LLMServiceMock.getStrategiesCode();
  }
};

export default LLMService; 