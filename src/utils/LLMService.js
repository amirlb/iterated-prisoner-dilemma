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
    try {
      const response = await fetch('http://localhost:3001/api/health', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      this.isServerAvailable = response.ok;
      return response.ok;
    } catch (error) {
      // console.log('Server unavailable, using mock LLM service');
      this.isServerAvailable = false;
      return false;
    }
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
      return LLMServiceMock.queryLLM(systemPrompt, userPrompt);
    }
    
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

      console.log({ response: data.response });
      return data.response;
    } catch (error) {
      console.error('Error querying LLM:', error);
      console.log('Falling back to mock LLM service');
      // Fall back to the mock service
      return LLMServiceMock.queryLLM(systemPrompt, userPrompt);
    }
  }
};

export default LLMService; 