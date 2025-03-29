require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const { Anthropic } = require('@anthropic-ai/sdk')
const { GoogleGenAI } = require('@google/genai')

const app = express()
const port = 5001
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}))
app.use(bodyParser.json())

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Initialize Google AI (updated import and initialization)
const genAI = new GoogleGenAI(process.env.GOOGLE_API_KEY)

// Function to revise Manim code using Claude
async function reviseManimCode (code, errorMessage) {
  try {
    const systemPrompt = `You are a Manim code expert. The following code failed to execute with the given error message. 
    Please fix the code by only modifying the existing code, without adding any new libraries or dependencies.
    Keep the same functionality but make it work correctly.
    Return the fixed code completely without any explanations.`

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-latest',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Original code:\n${code}\n\nError message:\n${errorMessage}` }
      ],
      temperature: 0.7
    })

    const reply = response.content[0].text
    const codeMatch = reply.match(/```python\n([\s\S]*?)```/)
    if (!codeMatch) {
      return reply
    }

    return codeMatch[1].trim()
  } catch (err) {
    console.error('Failed to revise code:', err)
    throw err
  }
}

// Function to generate script from Manim code (updated function)
async function generateScriptFromCode (code) {
  try {
    const ai = genAI

    const prompt = `You are an expert at explaining mathematical and scientific concepts. 
    Below is a Manim animation code. Please analyze it and create a detailed note in English that:
    1. Explains what the animation demonstrates
    2. Provides additional context and details not shown in the animation
    3. Includes relevant examples and real-world applications
    4. Explains complex concepts in an engaging and clear way
    5. Adds interesting facts and deeper insights related to the topic
    
    Please format the output as a well-structured script, with clear sections and natural transitions.
    
    Manim Code:
    ${code}`

    const response = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: prompt,
    })

    return response
  } catch (error) {
    console.error('Failed to generate script:', error)
    throw error
  }
}

// Create a temporary directory for storing Manim code
const TEMP_DIR = path.join(__dirname, 'temp')
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR)
}

app.post('/script', async (req, res) => {
  let { prompt, temperature, maxDuration } = req.body
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' })
  temperature = temperature || 0.7
  maxDuration = maxDuration || 60
  try {
    const systemPrompt = `You are a manim bot, who can generate manim animations code for users to help them understand the difficult question.
- Create a concise and engaging Manim animation (under ${maxDuration} seconds) to visually explain a concept to students. The animation should be clear, well-structured, and use effective visual techniques to enhance understanding. Follow these guidelines:
- Use a Clear Color Scheme: Choose colors that improve visualization and engagement.
- Use vivid icons, effects to make the video cool and attractive to gen z.
- Keep It Simple: Use smooth transitions, transformations, and minimal animations to keep the video short and impactful.
- Do not use global variables like 'FRAME_WIDTH' ...
- Your answer must include the code for using manim in python.
- Add Voiceover: Use VoiceoverScene to generate a voiceover that clearly explains the animation. Ensure the narration is engaging and easy to follow.
- Voiceover Implementation:
Use from manim_voiceover.services.openai import OpenAIService to set up the voiceover service.
Initialize it with self.set_speech_service(OpenAIService(transcription_model=None)).
Generate voiceover with with self.voiceover(text="Your narration here").
- You must show the captions in the video and make sure they match the audio.
- If the captions are too long, you need to break it into several parts to make sure all of them are in the video. Sometimes you need to display one sentence in multiple lines.
Here's an example of a well-structured Manim animation:
'''from manim import *
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.openai import OpenAIService

class BlackHoleExplainer(VoiceoverScene):
    def construct(self):
        # Initialize voiceover service
        self.set_speech_service(OpenAIService(transcription_model=None))

        # Colors
        blackhole_color = BLACK
        event_horizon_color = BLUE
        accretion_disk_color = ORANGE

        # Create black hole (circle with no light escaping)
        black_hole = Circle(radius=1.5, color=blackhole_color, fill_opacity=1)

        # Create event horizon (boundary around the black hole)
        event_horizon = Circle(radius=1.6, color=event_horizon_color, stroke_width=4)

        # Create accretion disk (rotating ring around the black hole)
        accretion_disk = Annulus(inner_radius=1.7, outer_radius=2.3, color=accretion_disk_color, fill_opacity=0.7)
        accretion_disk.rotate(PI/4)

        # Function to add subtitles with auto-breaking
        def add_subtitle(text, wait_time=3):
            parts = text.split(". ")
            subtitles = [Text(part + ".", font_size=36).to_edge(DOWN) for part in parts]
            for subtitle in subtitles:
                self.play(Write(subtitle))
                self.wait(wait_time / len(subtitles))
                self.play(FadeOut(subtitle))

        # Voiceover introduction
        with self.voiceover(text="A black hole is a region in space where gravity is so strong that nothing, not even light, can escape.") as _:
            add_subtitle("A black hole is a region in space. Gravity is so strong that nothing, not even light, can escape.")

        # Show black hole and event horizon
        self.play(Create(black_hole), Create(event_horizon), run_time=2)

        # Voiceover for event horizon
        with self.voiceover(text="The event horizon is the invisible boundary around a black hole. Once something crosses it, there's no way back.") as _:
            add_subtitle("The event horizon is the boundary of a black hole. Once you cross it, there's no way back.")

        # Show accretion disk
        self.play(FadeIn(accretion_disk), run_time=2)

        # Voiceover for accretion disk
        with self.voiceover(text="Matter falling into a black hole forms a spinning ring called an accretion disk. It gets extremely hot and emits bright radiation.") as _:
            add_subtitle("Matter falls into a black hole and forms a spinning ring. This is called an accretion disk.")
            add_subtitle("It gets extremely hot and emits bright radiation.")

        # Rotate the accretion disk to simulate movement
        self.play(Rotate(accretion_disk, angle=PI, run_time=4))

        # Voiceover for singularity
        with self.voiceover(text="At the center of the black hole lies the singularity—a point of infinite density where the laws of physics break down.") as _:
            add_subtitle("At the center is the singularity. A point of infinite density.")
            add_subtitle("Here, the laws of physics break down.")

        # Ending scene with dramatic fade-out
        self.wait(1)
        self.play(FadeOut(black_hole, accretion_disk, event_horizon), run_time=3)

        with self.voiceover(text="Black holes are one of the universe's most mysterious objects, stretching the limits of our understanding of space and time.") as _:
            add_subtitle("Black holes are mysterious objects.")
            add_subtitle("They stretch the limits of our understanding of space and time.")

        self.wait(1)
'''
`

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-latest',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `${prompt}` }
      ],
      temperature: temperature
    })

    const reply = response.content[0].text

    // Extract the code part
    const codeMatch = reply.match(/```python\n([\s\S]*?)```/)
    if (!codeMatch) {
      return res.status(500).json({ error: 'No valid Python code found in response' })
    }

    const code = codeMatch[1].trim()

    // console.log('Extracted code:', code)
    res.json({
      success: true,
      code: code
    })

  } catch (err) {
    console.error('Anthropic API call failed:', err)
    res.status(500).json({ error: 'Failed to generate script via Anthropic' })
  }
})

app.post('/api/execute-manim', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    const fileName = `manim_${Date.now()}.py`
    const filePath = path.join(TEMP_DIR, fileName)

    fs.writeFileSync(filePath, code)

    const outputDir = path.join(TEMP_DIR, 'media')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const pythonPath = '/opt/anaconda3/envs/manim_env/bin/python'
    const manimEnvPath = '/opt/anaconda3/envs/manim_env'
    const command = `"${pythonPath}" -m manim -ql "${filePath}" --media_dir "${TEMP_DIR}"`

    const executeManim = () => {
      return new Promise((resolve, reject) => {
        const env = {
          ...process.env,
          PATH: `${manimEnvPath}/bin:${process.env.PATH}`,
          PYTHONPATH: `${manimEnvPath}/lib/python3.9/site-packages:${process.env.PYTHONPATH || ''}`,
          CONDA_PREFIX: manimEnvPath,
          CONDA_DEFAULT_ENV: 'manim_env'
        }
        exec(command, { env }, (error, stdout, stderr) => {
          if (error) {
            console.error('Manim execution error:', error)
            reject(error)
            return
          }
          setTimeout(() => resolve(stdout), 1000)
        })
      })
    }

    let attemptCount = 0
    const maxAttempts = 3
    let currentCode = code
    let lastError = null

    while (attemptCount < maxAttempts) {
      try {
        if (attemptCount > 0) {
          console.log(`Attempt ${attemptCount + 1}/${maxAttempts} with revised code...`)
        } else {
          console.log('Initial execution attempt...')
        }
        await executeManim()
        break // If successful, exit the loop
      } catch (error) {
        lastError = error
        attemptCount++
        if (attemptCount >= maxAttempts) {
          console.error(`Failed after ${maxAttempts} attempts. Last error:`, error.message)
          return res.status(500).json({
            error: 'Failed to execute Manim code after multiple attempts',
            details: error.message,
            attempts: attemptCount
          })
        }
        console.log(`Attempt ${attemptCount} failed`)
        console.log('Requesting code revision from Claude...')
        try {
          currentCode = await reviseManimCode(currentCode, error.message)
          fs.writeFileSync(filePath, currentCode)
        } catch (revisionError) {
          console.error('Failed to revise code:', revisionError)
          return res.status(500).json({
            error: 'Failed to revise code',
            details: revisionError.message
          })
        }
      }
    }

    try {
      // Find the generated video file
      const sceneDir = path.join(TEMP_DIR, 'videos', fileName.replace('.py', ''), '480p15')

      if (!fs.existsSync(sceneDir)) {
        throw new Error('Video output directory not found')
      }

      console.log('Looking in directory:', sceneDir)
      const files = fs.readdirSync(sceneDir)
      console.log('Found files:', files)

      if (files.length === 0) {
        throw new Error('No video file generated')
      }

      const videoFile = files.find(f => f.endsWith('.mp4'))
      if (!videoFile) {
        throw new Error('No mp4 file found')
      }

      const videoPath = path.join(sceneDir, videoFile)

      // Set response headers for video file
      res.setHeader('Content-Type', 'video/mp4')
      res.setHeader('Content-Disposition', `attachment; filename="${videoFile}"`)

      // Stream the video file
      const videoStream = fs.createReadStream(videoPath)
      videoStream.pipe(res)

      // Handle errors in the stream
      videoStream.on('error', (error) => {
        console.error('Error streaming video:', error)
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Error streaming video file',
            details: error.message
          })
        }
      })

      // Handle client disconnect
      req.on('close', () => {
        videoStream.destroy()
      })

    } catch (error) {
      console.error('Error handling video file:', error)
      return res.status(500).json({
        error: 'Failed to process video file',
        details: error.message
      })
    }

  } catch (error) {
    console.error('Error in execute-manim endpoint:', error)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to execute Manim code',
        details: error.message
      })
    }
  }
})

// Modified /api/note endpoint for streaming
app.post('/api/note', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    // Set headers for plain text streaming
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await generateScriptFromCode(code)

    // Stream the response as plain text
    for await (const chunk of stream) {
      res.write(chunk.text)
    }

    res.end()

  } catch (error) {
    console.error('Error generating script:', error)
    if (!res.headersSent) {
      res.status(500).send('Error: Failed to generate script\n' + error.message)
    } else {
      res.write('\nError: ' + error.message)
      res.end()
    }
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
