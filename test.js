import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

async function checkOpenAIAPIKey(apiKey) {
  // Use the new client with the API key
  const client = new OpenAI({ apiKey: apiKey });

  try {
    console.log("Attempting to list OpenAI models...");
    
    // The list function returns a response object with a 'data' array of models
    const models = await client.models.list();
    
    console.log("Successfully authenticated with a valid OpenAI API key.");
    console.log(`Found ${models.data.length} models.`);
    return true;
  } catch (error) {
    if (error.status === 401) {
      console.error(`Authentication failed: ${error.message}`);
      console.error("Please check your API key.");
    } else {
      console.error(`An unexpected error occurred: ${error.message}`);
    }
    return false;
  }
}

// Get the API key from an environment variable for security
const API_KEY_TO_TEST = process.env.OPENAI_API_KEY;

if (API_KEY_TO_TEST) {
  if (checkOpenAIAPIKey(API_KEY_TO_TEST)) {
    console.log("\n✅ API key check completed. Please review the logs above for details.");
  } else {
    console.log("\n❌ API key check completed. Please review the logs above for details on the failure.");
  }
} else {
  console.log("API key not found. Please set the OPENAI_API_KEY environment variable in a .env file.");
}