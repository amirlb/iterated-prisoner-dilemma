import express from 'express';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { existsSync } from 'fs';
import os from 'os';
import tmp from 'tmp';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure tmp to automatically remove files
tmp.setGracefulCleanup();

// Sleep function for implementing delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const app = express();
const PORT = 3001;

// Middleware
// Configure CORS with more specific options
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow requests from these origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

/**
 * Execute LLM command with exponential backoff for rate limit errors
 * @param {string} command - The shell command to execute
 * @param {Object} options - Options for child_process.exec
 * @returns {Promise<string>} - The command output
 */
async function executeWithBackoff(command, options = {}) {
  const maxRetries = 5;
  let retryCount = 0;
  let lastError = null;
  
  // Add a small initial delay to avoid immediate rate limits
  await sleep(200);
  
  while (retryCount < maxRetries) {
    try {
      return await new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
          if (error) {
            // Check if the error is a rate limit error (429)
            if (error.message.includes('429') || error.message.includes('rate limit')) {
              reject({ isRateLimit: true, error, stderr });
            } else {
              reject({ isRateLimit: false, error, stderr });
            }
          } else {
            resolve(stdout);
          }
        });
      });
    } catch (err) {
      lastError = err;
      
      // If it's a rate limit error, retry with exponential backoff
      if (err.isRateLimit) {
        const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.log(`Rate limit hit. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await sleep(delayMs);
        retryCount++;
      } else {
        // For other errors, don't retry
        throw err.error;
      }
    }
  }
  
  // If we've exhausted all retries
  console.error(`Failed after ${maxRetries} retries:`, lastError.error);
  throw lastError.error;
}

// Endpoint to query the LLM
app.post('/api/llm', async (req, res) => {
  let tempFileObj = null;
  
  try {
    const { systemPrompt, userPrompt } = req.body;
    
    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'System prompt and user prompt are required' });
    }
    
    try {
      // Create a temporary file that will be automatically cleaned up
      tempFileObj = tmp.fileSync({ prefix: 'llm_prompt_', postfix: '.txt', keep: false });
      
      // Make sure the user prompt is properly formatted for the llm CLI tool
      await fs.writeFile(tempFileObj.name, userPrompt);
      
      // Different format for the llm command that should work better with the CLI tool
      // Use --system instead of -s for better compatibility
      const command = `cat ${tempFileObj.name} | llm --system "${systemPrompt.replace(/"/g, '\\"')}"`;
      
      try {
        // Execute with backoff strategy
        const output = await executeWithBackoff(command, { 
          maxBuffer: 1024 * 1024 * 10, 
          timeout: 60000 // Increased timeout to 60 seconds
        });
        
        // Return the result
        res.json({ response: output });
      } catch (execError) {
        console.error(`Error executing LLM: ${execError.message}`);
        console.error(`Using mock implementation due to LLM error`);
        
        // Return a default response that tells the client to use the mock
        return res.json({ 
          response: 'LLM_ERROR_USE_MOCK', 
          error: execError.message 
        });
      }
    } catch (fileError) {
      console.error('File operation error:', fileError);
      return res.status(500).json({ 
        response: 'LLM_ERROR_USE_MOCK',
        error: `File operation error: ${fileError.message}` 
      });
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      response: 'LLM_ERROR_USE_MOCK',
      error: `Internal server error: ${err.message}` 
    });
  }
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LLM API Server is running' });
});

app.listen(PORT, () => {
  console.log(`LLM Server running on port ${PORT}`);
  console.log(`Access the health check at http://localhost:${PORT}/api/health`);
}); 