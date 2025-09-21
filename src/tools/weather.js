const BaseTool = require('./base');
const axios = require('axios');

class WeatherTool extends BaseTool {
  constructor() {
    super(
      'weather',
      'Gets current weather information for a specified city',
      {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'Name of the city to get weather for',
          },
          units: {
            type: 'string',
            description: 'Temperature units (metric, imperial, or kelvin)',
            enum: ['metric', 'imperial', 'kelvin'],
            default: 'metric',
          },
        },
        required: ['city'],
      }
    );
  }

  async execute(args) {
    const { city, units = 'metric' } = args;

    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: 'OpenWeather API key not configured. Set OPENWEATHER_API_KEY environment variable.',
        };
      }

      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: city,
          appid: apiKey,
          units: units,
        },
        timeout: 10000,
      });

      const weather = response.data;
      const unitSymbol = this.getUnitSymbol(units);

      return {
        success: true,
        data: {
          city: weather.name,
          country: weather.sys.country,
          temperature: `${weather.main.temp}${unitSymbol}`,
          description: weather.weather[0].description,
          humidity: `${weather.main.humidity}%`,
          windSpeed: `${weather.wind.speed} ${this.getWindSpeedUnit(units)}`,
          pressure: `${weather.main.pressure} hPa`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  getUnitSymbol(units) {
    switch (units) {
      case 'imperial':
        return '°F';
      case 'kelvin':
        return 'K';
      case 'metric':
      default:
        return '°C';
    }
  }

  getWindSpeedUnit(units) {
    switch (units) {
      case 'imperial':
        return 'mph';
      case 'metric':
      case 'kelvin':
      default:
        return 'm/s';
    }
  }
}

module.exports = WeatherTool;