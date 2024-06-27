# Code Converter

A simple code conversion tool that transforms code from one programming language to another using the Gemini API. Built with Tauri and Vanilla TypeScript for a fast and efficient desktop application experience.

## Features

- Convert code between various programming languages
- Utilizes Google's Generative AI (Gemini API) for accurate translations
- Built with Tauri for a lightweight, cross-platform desktop application
- Vanilla TypeScript for improved performance and type safety
- Integrated Ace Editor for a rich code editing experience
- Smooth loading indicators with NProgress
- Light and Dark Themes

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (latest LTS version recommended)
- Rust (for Tauri)
- A Gemini API key from Google

## Install Binary

- Choose the latest release and download the corresponding binary. 

## Install from Source

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/code-converter.git
   cd code-converter
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

1. Start the development server:
   ```
   npm run tauri dev
   ```

2. Use the Ace Editor to input your source code.

3. Select the source and target programming languages.

4. Click the "Convert" button to transform your code.

5. View the converted code in the output editor.

## Building for Production

To create a production build of your application, run:

```
npm run tauri build
```

This will generate executable files for your operating system in the `src-tauri/target/release` folder.

## Dependencies

- [Tauri](https://tauri.app/): For building the desktop application
- [Ace Editor](https://ace.c9.io/): For code editing functionality
- [NProgress](https://ricostacruz.com/nprogress/): For displaying loading indicators
- [Google Generative AI](https://ai.google.dev/): For accessing the Gemini API

## Contributing

Contributions to the Code Converter project are welcome. Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Thanks to the Tauri team for providing an excellent framework for building desktop applications
- Gratitude to Google for the Gemini API, enabling powerful code conversions