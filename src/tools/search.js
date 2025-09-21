const BaseTool = require('./base');
const axios = require('axios');

class SearchTool extends BaseTool {
  constructor() {
    super(
      'search',
      'Searches the web for information using a search query',
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to look up information',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5,
          },
        },
        required: ['query'],
      }
    );
  }

  async execute(args) {
    const { query, maxResults = 5 } = args;

    try {
      const apiKey = process.env.SEARCH_API_KEY;
      const searchEngineId = process.env.SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        return {
          success: false,
          error: 'Search API credentials not configured. Set SEARCH_API_KEY and SEARCH_ENGINE_ID environment variables.',
        };
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: query,
          num: Math.min(maxResults, 10),
        },
        timeout: 15000,
      });

      const results = response.data.items || [];

      return {
        success: true,
        query,
        results: results.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        query,
      };
    }
  }
}

module.exports = SearchTool;