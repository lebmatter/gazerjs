# Gazer.js 👁️

**A powerful, lightweight JavaScript library for real-time gaze tracking and attention monitoring using MediaPipe.**

Gazer.js enables developers to easily integrate face detection and gaze tracking capabilities into web applications. Perfect for educational platforms, video conferencing, productivity tools, and attention monitoring systems.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Compatible-blue.svg)](https://mediapipe.dev/)

## ✨ Features

- 🎯 **Real-time Gaze Tracking** - Detect when users are looking at or away from the screen
- 👤 **Face Detection** - Robust face detection with confidence scoring
- 📊 **Attention Analytics** - Track attention time, distraction periods, and engagement metrics
- 🚀 **Performance Modes** - Pre-configured Low/Medium/High performance settings for optimal CPU usage
- 🎛️ **Sensitivity Modes** - Strict/Medium/Relaxed gaze detection presets for different use cases
- ⚙️ **Highly Configurable** - 30+ configuration options with smart preset management
- ⚡ **Performance Optimized** - Frame skipping, idle detection, and efficient canvas updates
- 🔄 **Event-Driven** - Real-time callbacks for all major events
- 🎨 **Visual Overlays** - Optional face rectangles, gaze vectors, and eye tracking indicators
- 📱 **Browser Compatible** - Works in all modern browsers with webcam access
- �️ **Easy Integration** - Drop-in solution with minimal setup required
- 🔧 **Smart Canvas Alignment** - Automatic canvas sizing and positioning for accurate overlays

## 🚀 Quick Start

### 1. Include Dependencies

```html
<!-- MediaPipe dependencies -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>

<!-- Gazer.js library -->
<script src="gazer.js"></script>
```

### 2. Create Video Element

```html
<video id="webcam" autoplay muted playsinline style="width: 640px; height: 480px;"></video>
```

### 3. Initialize and Start

```javascript
// Simple initialization with defaults (Medium performance & sensitivity)
const gazer = new Gazer('webcam', {
  onGazeChange: (gazeState, gazeData) => {
    console.log('Gaze direction:', gazeState); // 'screen', 'away', 'unknown'
  },
  onStatsUpdate: (stats) => {
    console.log('Attention stats:', stats);
  }
});

// Advanced initialization with performance and sensitivity modes
const gazer = new Gazer('webcam', {
  performanceMode: 'high',        // 'low', 'medium', 'high'
  sensitivityMode: 'strict',      // 'strict', 'medium', 'relaxed'
  onGazeChange: (gazeState, gazeData) => {
    console.log('Gaze direction:', gazeState);
  }
});

// Start tracking
await gazer.start();
```

## 🚀 Performance & Sensitivity Modes

### Performance Modes
Gazer.js includes three pre-configured performance modes for optimal CPU usage:

```javascript
// Low Performance - Basic tracking (10 FPS)
const gazer = new Gazer('webcam', {
  performanceMode: 'low'    // Best for low-end devices or battery saving
});

// Medium Performance - Balanced (15 FPS) - DEFAULT
const gazer = new Gazer('webcam', {
  performanceMode: 'medium' // Recommended for most applications
});

// High Performance - Smooth tracking (25 FPS)
const gazer = new Gazer('webcam', {
  performanceMode: 'high'   // Best for high-end devices requiring smooth tracking
});
```

### Sensitivity Modes  
Choose gaze detection sensitivity based on your use case:

```javascript
// Strict Sensitivity - Precise alignment required
const gazer = new Gazer('webcam', {
  sensitivityMode: 'strict'   // Best for focused work scenarios
});

// Medium Sensitivity - Balanced detection - DEFAULT
const gazer = new Gazer('webcam', {
  sensitivityMode: 'medium'   // Recommended for most users
});

// Relaxed Sensitivity - Forgiving detection
const gazer = new Gazer('webcam', {
  sensitivityMode: 'relaxed'  // Good for casual use or accessibility
});
```

### Manual Override
You can still use manual settings, but modes take precedence unless overridden:

```javascript
// This will use high performance mode settings
const gazer = new Gazer('webcam', {
  performanceMode: 'high',
  targetFps: 10  // This will override the high mode's 25 FPS (with console warning)
});
```

## 📖 API Reference

### Constructor

```javascript
const gazer = new Gazer(videoElementId, options)
```

**Parameters:**
- `videoElementId` (string): ID of the video element
- `options` (object): Configuration options (see Configuration section)

### Methods

#### `start()`
Starts the camera and begins gaze tracking.
```javascript
await gazer.start();
```

#### `stop()`
Stops the camera and pauses tracking.
```javascript
await gazer.stop();
```

#### `setPerformanceMode(mode)`
Changes performance mode at runtime.
```javascript
gazer.setPerformanceMode('high');  // 'low', 'medium', 'high', 'manual'
```

#### `setSensitivityMode(mode)`
Changes sensitivity mode at runtime.
```javascript
gazer.setSensitivityMode('strict'); // 'strict', 'medium', 'relaxed', 'manual'
```

#### `getPerformanceModes()`
Returns available performance modes.
```javascript
const modes = gazer.getPerformanceModes();
// [{ value: 'low', label: 'Low', description: '...' }, ...]
```

#### `getSensitivityModes()`
Returns available sensitivity modes.
```javascript
const modes = gazer.getSensitivityModes();
// [{ value: 'strict', label: 'Strict', description: '...' }, ...]
```

#### `updateConfig(options)`
#### `updateSettings(settings)`
Updates multiple settings at once, including modes.
```javascript
gazer.updateSettings({
  performanceMode: 'high',
  sensitivityMode: 'relaxed',
  targetFps: 20,
  showFaceRectangle: false
});
```

#### `updateConfig(options)`
Updates configuration in real-time (legacy method).
```javascript
gazer.updateConfig({
  targetFps: 20,
  showFaceRectangle: false
});
```

#### `getStats()`
Returns current tracking statistics.
```javascript
const stats = gazer.getStats();
console.log(stats.faceCount, stats.awayTime, stats.distractedTime);
```

#### `isReady()`
Checks if MediaPipe models are loaded.
```javascript
if (gazer.isReady()) {
  await gazer.start();
}
```

#### `isActive()`
Checks if tracking is currently active.
```javascript
console.log('Tracking active:', gazer.isActive());
```

#### `destroy()`
Cleans up resources and removes canvas overlay.
```javascript
gazer.destroy();
```

## ⚙️ Configuration Options

### Mode-Based Configuration (Recommended)
```javascript
{
  performanceMode: 'medium',     // 'low', 'medium', 'high', null/manual
  sensitivityMode: 'medium'      // 'strict', 'medium', 'relaxed', null/manual
}
```

**Performance Mode Presets:**
- `low`: 10 FPS, skip 3 frames, pause on idle, reduced canvas
- `medium`: 15 FPS, skip 2 frames, pause on idle, normal canvas
- `high`: 25 FPS, skip 1 frame, no pause, normal canvas

**Sensitivity Mode Presets:**
- `strict`: Horizontal 0.2, Vertical 0.1, Smoothing 3 frames
- `medium`: Horizontal 0.3, Vertical 0.15, Smoothing 5 frames  
- `relaxed`: Horizontal 0.5, Vertical 0.25, Smoothing 7 frames

### Manual Performance Settings
```javascript
{
  targetFps: 15,           // Target processing frame rate
  frameSkip: 1,            // Process every N frames
  pauseOnIdle: true,       // Pause processing when no faces detected
  reducedCanvas: false,    // Reduce canvas update frequency
  idleTimeout: 3000        // Idle timeout in milliseconds
}
```

### Manual Gaze Sensitivity
```javascript
{
  horizontalThreshold: 0.3,  // Left/right gaze sensitivity (0.1-1.0)
  verticalThreshold: 0.15,   // Up/down gaze sensitivity (0.05-0.5)
  gazeHistorySize: 5         // Frames to smooth gaze detection (2-10)
}
```

### Display Options
```javascript
{
  showGazeVector: true,      // Show gaze direction arrow
  showEyePoints: true,       // Show eye center indicators
  showFaceRectangle: true,   // Show face detection rectangle
  enableLogs: true           // Enable console logging
}
```

### MediaPipe Settings
```javascript
{
  faceDetectionModel: "short",        // "short" or "full"
  faceDetectionConfidence: 0.5,       // Detection confidence (0-1)
  faceMeshConfidence: 0.5,            // Face mesh confidence (0-1)
  faceMeshTracking: 0.5,              // Face mesh tracking confidence (0-1)
  maxNumFaces: 1,                     // Maximum faces to detect
  refineLandmarks: true               // Use refined landmarks
}
```

### Camera Settings
```javascript
{
  cameraWidth: 640,          // Camera resolution width
  cameraHeight: 480          // Camera resolution height
}
```

## 🎯 Event Callbacks

### onGazeChange
Triggered when gaze direction changes.
```javascript
onGazeChange: (gazeState, gazeData) => {
  // gazeState: 'screen', 'away', 'unknown'
  // gazeData: { direction, horizontal, vertical, confidence, ... }
  console.log(`User is looking ${gazeState}`);
}
```

### onStatsUpdate
Triggered periodically with tracking statistics.
```javascript
onStatsUpdate: (stats) => {
  console.log(`Faces: ${stats.faceCount}`);
  console.log(`Away time: ${stats.awayTime}s`);
  console.log(`Distracted time: ${stats.distractedTime}s`);
  console.log(`Confidence: ${stats.confidence}%`);
}
```

### onFaceDetected
Triggered when faces are detected or lost.
```javascript
onFaceDetected: (faces) => {
  console.log(`${faces.length} face(s) detected`);
}
```

### onModelLoaded
Triggered when MediaPipe models finish loading.
```javascript
onModelLoaded: () => {
  console.log('Ready to start tracking!');
}
```

### onError
Triggered when errors occur.
```javascript
onError: (error) => {
  console.error('Gazer error:', error);
}
```

## 📊 Statistics Object

The `stats` object contains:

```javascript
{
  faceCount: 1,           // Number of faces currently detected
  awayTime: 15,           // Total time away from screen (seconds)
  distractedTime: 8,      // Total time looking away (seconds)
  confidence: 87,         // Average detection confidence (%)
  processingFps: 14.2,    // Actual processing frame rate
  framesSkipped: 42,      // Number of frames skipped
  canvasUpdates: 156,     // Number of canvas updates
  gazeState: 'screen',    // Current gaze state
  isRunning: true,        // Whether tracking is active
  isIdle: false          // Whether in idle mode
}
```

## 🎮 Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Gazer.js Demo</title>
</head>
<body>
  <div style="display: flex; gap: 20px;">
    <div>
      <video id="webcam" autoplay muted playsinline style="width: 640px; height: 480px;"></video>
      <div>
        <button onclick="startTracking()">Start</button>
        <button onclick="stopTracking()">Stop</button>
        
        <!-- Performance Mode Controls -->
        <select id="performanceMode" onchange="changePerformanceMode()">
          <option value="low">Low Performance</option>
          <option value="medium" selected>Medium Performance</option>
          <option value="high">High Performance</option>
          <option value="manual">Manual</option>
        </select>
        
        <!-- Sensitivity Mode Controls -->
        <select id="sensitivityMode" onchange="changeSensitivityMode()">
          <option value="strict">Strict Sensitivity</option>
          <option value="medium" selected>Medium Sensitivity</option>
          <option value="relaxed">Relaxed Sensitivity</option>
          <option value="manual">Manual</option>
        </select>
      </div>
    </div>
    
    <div>
      <div id="stats"></div>
      <div id="gaze-status"></div>
    </div>
  </div>

  <!-- Include dependencies -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
  <script src="gazer.js"></script>

  <script>
    let gazer;

    // Initialize with performance and sensitivity modes
    function init() {
      gazer = new Gazer('webcam', {
        performanceMode: 'medium',    // Default performance mode
        sensitivityMode: 'medium',    // Default sensitivity mode
        showFaceRectangle: true,
        showGazeVector: true,
        
        onGazeChange: (gazeState, gazeData) => {
          document.getElementById('gaze-status').innerHTML = `
            <h3>Gaze Status: ${gazeState.toUpperCase()}</h3>
            <p>Confidence: ${Math.round((gazeData?.confidence || 0) * 100)}%</p>
            <p>Horizontal: ${(gazeData?.horizontal || 0).toFixed(3)}</p>
            <p>Vertical: ${(gazeData?.vertical || 0).toFixed(3)}</p>
          `;
        },
        
        onStatsUpdate: (stats) => {
          document.getElementById('stats').innerHTML = `
            <h3>Statistics</h3>
            <p><strong>Faces Detected:</strong> ${stats.faceCount}</p>
            <p><strong>Away Time:</strong> ${stats.awayTime}s</p>
            <p><strong>Distracted Time:</strong> ${stats.distractedTime}s</p>
            <p><strong>Processing FPS:</strong> ${stats.processingFps.toFixed(1)}</p>
            <p><strong>Frames Skipped:</strong> ${stats.framesSkipped}</p>
            <p><strong>Canvas Updates:</strong> ${stats.canvasUpdates}</p>
            <p><strong>Average Confidence:</strong> ${stats.confidence}%</p>
          `;
        },
        
        onModelLoaded: () => {
          console.log('✅ Models loaded successfully!');
          document.querySelector('button').disabled = false;
        },
        
        onError: (error) => {
          alert('Error: ' + error.message);
        }
      });
    }

    async function startTracking() {
      if (gazer.isReady()) {
        await gazer.start();
        console.log('🎯 Tracking started');
      } else {
        alert('Please wait for models to load');
      }
    }

    async function stopTracking() {
      await gazer.stop();
      console.log('⏹️ Tracking stopped');
    }
    
    function changePerformanceMode() {
      const mode = document.getElementById('performanceMode').value;
      gazer.setPerformanceMode(mode);
    }
    
    function changeSensitivityMode() {
      const mode = document.getElementById('sensitivityMode').value;
      gazer.setSensitivityMode(mode);
    }

    // Initialize when page loads
    window.onload = init;
  </script>
</body>
</html>
```

## 🎯 Use Cases

- **📚 Educational Platforms** - Monitor student attention during online classes
- **💼 Video Conferencing** - Track engagement in meetings and presentations  
- **🎮 Gaming Applications** - Eye-tracking controls and attention-based gameplay
- **🔬 Research Studies** - Attention and behavior analysis
- **💻 Productivity Tools** - Focus tracking and distraction alerts
- **♿ Accessibility** - Gaze-based navigation for disabled users
- **📱 Mobile Apps** - Attention monitoring in mobile web applications

## ⚡ Performance Tips

1. **Optimize Frame Rate**: Lower `targetFps` for better performance
2. **Use Frame Skipping**: Set `frameSkip > 1` for resource-constrained devices
3. **Enable Idle Detection**: Use `pauseOnIdle: true` to save resources
4. **Reduce Visual Updates**: Enable `reducedCanvas: true` for minimal UI updates
5. **Disable Unnecessary Features**: Turn off visual overlays you don't need

## 🔧 Browser Compatibility

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

**Requirements:**
- WebRTC/getUserMedia support
- WebAssembly support
- Modern JavaScript (ES6+)

## 📄 License

MIT License - see LICENSE file for details.
