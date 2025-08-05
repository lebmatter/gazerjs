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
- 🎛️ **Highly Configurable** - 25+ configuration options for fine-tuning
- ⚡ **Performance Optimized** - Frame skipping, idle detection, and efficient canvas updates
- 🔄 **Event-Driven** - Real-time callbacks for all major events
- 🎨 **Visual Overlays** - Optional face rectangles, gaze vectors, and eye tracking indicators
- 📱 **Browser Compatible** - Works in all modern browsers with webcam access
- 🚀 **Easy Integration** - Drop-in solution with minimal setup required

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
// Create Gazer instance
const gazer = new Gazer('webcam', {
  onGazeChange: (gazeState, gazeData) => {
    console.log('Gaze direction:', gazeState); // 'screen', 'away', 'unknown'
  },
  onStatsUpdate: (stats) => {
    console.log('Attention stats:', stats);
  }
});

// Start tracking
await gazer.start();
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

#### `updateConfig(options)`
Updates configuration in real-time.
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

### Performance Settings
```javascript
{
  targetFps: 15,           // Target processing frame rate
  frameSkip: 1,            // Process every N frames
  pauseOnIdle: true,       // Pause processing when no faces detected
  reducedCanvas: false,    // Reduce canvas update frequency
  idleTimeout: 3000        // Idle timeout in milliseconds
}
```

### Gaze Sensitivity
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
  <video id="webcam" autoplay muted playsinline></video>
  <button onclick="startTracking()">Start</button>
  <button onclick="stopTracking()">Stop</button>
  
  <div id="stats"></div>
  <div id="gaze-status"></div>

  <!-- Include dependencies -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
  <script src="gazer.js"></script>

  <script>
    let gazer;

    // Initialize
    function init() {
      gazer = new Gazer('webcam', {
        targetFps: 20,
        showFaceRectangle: true,
        
        onGazeChange: (gazeState, gazeData) => {
          document.getElementById('gaze-status').textContent = 
            `Looking: ${gazeState} (${Math.round(gazeData.confidence * 100)}% confidence)`;
        },
        
        onStatsUpdate: (stats) => {
          document.getElementById('stats').innerHTML = `
            <p>Faces: ${stats.faceCount}</p>
            <p>Away Time: ${stats.awayTime}s</p>
            <p>Distracted Time: ${stats.distractedTime}s</p>
            <p>FPS: ${stats.processingFps.toFixed(1)}</p>
          `;
        },
        
        onError: (error) => {
          alert('Error: ' + error.message);
        }
      });
    }

    async function startTracking() {
      if (gazer.isReady()) {
        await gazer.start();
      } else {
        alert('Please wait for models to load');
      }
    }

    async function stopTracking() {
      await gazer.stop();
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
