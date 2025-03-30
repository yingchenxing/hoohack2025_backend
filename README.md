# HooHack 2025 Backend

A powerful educational platform that generates AI-powered mathematical animations with synchronized voiceovers and explanations.

## Prerequisites

- Node.js (v14 or higher)
- Python 3.9
- Anaconda or Miniconda
- FFmpeg

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd hoohack2025_backend
   ```

2. **Install Node.js dependencies**

   ```bash
   npm install
   ```

3. **Set up Python environment**

   ```bash
   # Create a new conda environment
   conda create -n manim_env python=3.9
   conda activate manim_env

   # Install Manim and required packages
   pip install manim
   pip install manim-voiceover
   ```

4. **Configure environment variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your API keys:
   # - ANTHROPIC_API_KEY (for Claude AI)
   # - GOOGLE_API_KEY (for Gemini AI)
   # - OPENAI_API_KEY (for voiceover service)
   ```

5. **Start the server**
   ```bash
   npm start
   ```

The server will start running on port 5001.

## API Endpoints

- `POST /script` - Generate Manim animation code
- `POST /api/execute-manim` - Execute Manim animation and get video
- `POST /api/note` - Generate educational script (streaming response)

## Important Notes

- Ensure FFmpeg is installed and accessible in your system PATH
- The Manim environment path is configured to `/opt/anaconda3/envs/manim_env`. Update this path in `app.js` if your installation location is different
- Make sure you have sufficient disk space for video generation
- The temporary files are stored in the `temp` directory

## Error Handling

The system includes automatic retry mechanisms for animation generation:

- Automatically attempts to fix failed animations up to 3 times
- Uses AI to revise code when errors occur
- Provides detailed error messages for debugging

## Environment Variables

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```
