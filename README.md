# Weather App

A modern and user-friendly weather application that provides real-time weather information and forecasts.

## Features

- Multi-city weather tracking
- Real-time weather updates
- 5-day weather forecast
- Dark/Light theme support
- System theme synchronization
- Temperature units (Celsius/Fahrenheit)
- Time format options (12/24 hour)
- Responsive design for all devices
- Multi-language support (English/Turkish)
- Offline support with PWA
- Local data caching
- Location search with autocomplete

## Installation

1. Clone the repository:

```bash
git clone [repo-url]
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file in the root directory and add your OpenWeather API key:

```env
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

4. Start development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- OpenWeather API
- Vite (Build tool)
- Progressive Web App (PWA)
- Local Storage for caching
- Service Workers

## Project Structure

```
weather-app/
├── src/
│   ├── script.js
│   ├── styles.css
│   └── index.html
├── public/
│   ├── icons/
│   └── manifest.json
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenWeather API for weather data
- Icons from OpenWeather
