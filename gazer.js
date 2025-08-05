/**
 * Gazer.js - MediaPipe-based Gaze Tracking Library
 * A standalone library for face detection and gaze tracking using MediaPipe
 * 
 * @version 1.1.0
 * @author Gazer.js
 * @license MIT
 */

class Gazer {
  constructor(videoElementId, options = {}) {
    // Default configuration
    this.config = {
      // Performance settings
      targetFps: 15,
      frameSkip: 1,
      pauseOnIdle: true,
      reducedCanvas: false,
      idleTimeout: 3000,
      
      // Gaze sensitivity
      horizontalThreshold: 0.3,
      verticalThreshold: 0.15,
      gazeHistorySize: 5,
      
      // Display options
      showGazeVector: true,
      showEyePoints: true,
      showFaceRectangle: true,
      enableLogs: true,
      
      // MediaPipe settings
      faceDetectionModel: "short",
      faceDetectionConfidence: 0.5,
      faceMeshConfidence: 0.5,
      faceMeshTracking: 0.5,
      maxNumFaces: 1,
      refineLandmarks: true,
      
      // Camera settings
      cameraWidth: 640,
      cameraHeight: 480,
      
      // Callbacks
      onFaceDetected: null,
      onGazeChange: null,
      onAttentionChange: null,
      onStatsUpdate: null,
      onError: null,
      onModelLoaded: null,
      
      ...options
    };

    // Get video element
    this.video = document.getElementById(videoElementId);
    if (!this.video) {
      throw new Error(`Video element with id "${videoElementId}" not found`);
    }

    // Create canvas for overlays
    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext("2d");

    // Initialize state
    this.initializeState();
    
    // Initialize MediaPipe
    this.initializeMediaPipe();
  }

  createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "10";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    
    // Insert canvas after video element
    this.video.parentNode.insertBefore(canvas, this.video.nextSibling);
    
    return canvas;
  }

  // Update canvas size to match video display size
  updateCanvasSize() {
    if (!this.video || !this.canvas) return;
    
    // Wait for video to have dimensions
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
      setTimeout(() => this.updateCanvasSize(), 100);
      return;
    }
    
    // Set canvas internal dimensions to match video resolution
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    
    // Reset transform to ensure proper scaling
    this.canvas.style.transform = "none";
    this.canvas.style.transformOrigin = "top left";
    
    this.log(`Canvas updated to ${this.canvas.width}x${this.canvas.height}`, "info");
  }

  initializeState() {
    // MediaPipe instances
    this.faceDetection = null;
    this.faceMesh = null;
    this.camera = null;
    
    // Running state
    this.isRunning = false;
    this.isModelLoaded = false;
    this.isIdle = false;
    
    // Event listeners
    this.resizeListener = null;
    
    // Tracking data
    this.currentFaces = [];
    this.lastFaceCount = -1;
    this.lastGazeState = null;
    this.gazeHistory = [];
    this.currentMeshResults = null;
    
    // Statistics
    this.faceCount = 0;
    this.awayStartTime = null;
    this.totalAwayTime = 0;
    this.distractedStartTime = null;
    this.totalDistractedTime = 0;
    
    // Performance tracking
    this.frameCounter = 0;
    this.lastFrameTime = Date.now();
    this.processingFps = 0;
    this.framesSkipped = 0;
    this.canvasUpdates = 0;
    this.lastIdleTime = Date.now();
  }

  // Logging function
  log(message, type = "info") {
    if (!this.config.enableLogs) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] [Gazer.js] ${message}`;
    
    switch (type) {
      case "warning":
        console.warn(logMessage);
        break;
      case "success":
        console.log(`✅ ${logMessage}`);
        break;
      case "gaze":
        console.log(`👁️ ${logMessage}`);
        break;
      case "error":
        console.error(`❌ ${logMessage}`);
        break;
      case "info":
      default:
        console.log(`ℹ️ ${logMessage}`);
        break;
    }
  }

  // Initialize MediaPipe models
  async initializeMediaPipe() {
    try {
      this.log("Loading MediaPipe Face Detection and Mesh...", "info");

      // Initialize face detection
      this.faceDetection = new FaceDetection({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
        },
      });

      this.faceDetection.setOptions({
        model: this.config.faceDetectionModel,
        minDetectionConfidence: this.config.faceDetectionConfidence,
      });

      // Initialize face mesh
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      this.faceMesh.setOptions({
        maxNumFaces: this.config.maxNumFaces,
        refineLandmarks: this.config.refineLandmarks,
        minDetectionConfidence: this.config.faceMeshConfidence,
        minTrackingConfidence: this.config.faceMeshTracking,
      });

      // Set up callbacks
      this.faceDetection.onResults(this.onFaceDetectionResults.bind(this));
      this.faceMesh.onResults(this.onFaceMeshResults.bind(this));

      this.isModelLoaded = true;
      this.log("MediaPipe models loaded successfully", "success");
      
      if (this.config.onModelLoaded) {
        this.config.onModelLoaded();
      }
      
    } catch (error) {
      this.log("Error loading MediaPipe: " + error.message, "error");
      if (this.config.onError) {
        this.config.onError(error);
      }
    }
  }

  // Calculate gaze direction from landmarks
  calculateGazeDirection(landmarks) {
    if (!landmarks || landmarks.length < 468) return null;

    const leftEyeOuter = landmarks[33] || null;
    const leftEyeInner = landmarks[133] || null;
    const rightEyeOuter = landmarks[362] || null;
    const rightEyeInner = landmarks[263] || null;
    const noseTip = landmarks[1] || null;
    const leftEyeTop = landmarks[159] || null;
    const leftEyeBottom = landmarks[145] || null;
    const rightEyeTop = landmarks[386] || null;
    const rightEyeBottom = landmarks[374] || null;

    if (!leftEyeOuter || !rightEyeOuter || !noseTip) return null;

    // Calculate eye centers
    const leftEyeCenter = {
      x: (leftEyeOuter.x + leftEyeInner.x) / 2,
      y: (leftEyeTop.y + leftEyeBottom.y) / 2,
    };

    const rightEyeCenter = {
      x: (rightEyeOuter.x + rightEyeInner.x) / 2,
      y: (rightEyeTop.y + rightEyeBottom.y) / 2,
    };

    // Calculate face center
    const faceCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };

    // Calculate gaze offsets
    const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x);
    const horizontalGaze = (faceCenter.x - 0.5) / eyeDistance;
    const verticalGaze = faceCenter.y - 0.4;

    // Determine gaze direction
    let gazeDirection = "screen";
    if (Math.abs(horizontalGaze) > this.config.horizontalThreshold) {
      gazeDirection = "away";
    } else if (Math.abs(verticalGaze) > this.config.verticalThreshold) {
      gazeDirection = "away";
    }

    return {
      direction: gazeDirection,
      horizontal: horizontalGaze,
      vertical: verticalGaze,
      confidence: Math.max(0.5, 1 - Math.abs(horizontalGaze) - Math.abs(verticalGaze)),
      leftEyeCenter,
      rightEyeCenter,
      faceCenter,
    };
  }

  // Smooth gaze detection
  smoothGazeDetection(currentGaze) {
    if (!currentGaze) return "unknown";

    this.gazeHistory.push(currentGaze.direction);
    if (this.gazeHistory.length > this.config.gazeHistorySize) {
      this.gazeHistory.shift();
    }

    const gazeCounts = this.gazeHistory.reduce((acc, gaze) => {
      acc[gaze] = (acc[gaze] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(gazeCounts).reduce((a, b) =>
      gazeCounts[a] > gazeCounts[b] ? a : b
    );
  }

  // Handle face detection results
  onFaceDetectionResults(results) {
    if (!this.ctx) return;

    // Update performance tracking
    this.frameCounter++;
    const now = Date.now();
    if (now - this.lastFrameTime >= 1000) {
      this.processingFps = this.frameCounter;
      this.frameCounter = 0;
      this.lastFrameTime = now;
    }

    this.currentFaces = results.detections || results.faces || [];

    // Check for idle state
    if (this.config.pauseOnIdle) {
      if (this.currentFaces.length === 0) {
        if (!this.isIdle && now - this.lastIdleTime > this.config.idleTimeout) {
          this.isIdle = true;
          this.log("Entering idle mode (no faces detected)", "info");
        }
      } else {
        if (this.isIdle) {
          this.isIdle = false;
          this.log("Exiting idle mode (faces detected)", "info");
        }
        this.lastIdleTime = now;
      }
    }

    if (this.isIdle && this.config.pauseOnIdle) {
      return;
    }

    // Update canvas
    const shouldUpdateCanvas =
      !this.config.reducedCanvas ||
      this.currentFaces.length !== this.lastFaceCount ||
      Math.abs(now - this.lastFrameTime) > 500;

    if (shouldUpdateCanvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.currentFaces.length > 0 && this.config.showFaceRectangle) {
        this.drawFaces(this.currentFaces);
      }
      this.canvasUpdates++;
    }

    this.updateStats(this.currentFaces);
  }

  // Handle face mesh results
  onFaceMeshResults(results) {
    if (this.frameCounter % this.config.frameSkip !== 0) {
      this.framesSkipped++;
      return;
    }

    this.currentMeshResults = results;

    if (this.isIdle && this.config.pauseOnIdle) {
      return;
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const gazeData = this.calculateGazeDirection(landmarks);

      if (gazeData) {
        const smoothedGaze = this.smoothGazeDetection(gazeData);
        this.updateGazeStatus(smoothedGaze, gazeData);

        if (this.config.showGazeVector || this.config.showEyePoints) {
          this.drawGazeIndicators(landmarks, gazeData);
        }
      }
    } else {
      this.updateGazeStatus("unknown", null);
    }
  }

  // Update gaze status
  updateGazeStatus(gazeState, gazeData) {
    const now = Date.now();

    if (gazeState !== this.lastGazeState) {
      if (gazeState === "screen") {
        this.log("Person looking at screen", "gaze");
      } else if (gazeState === "away") {
        this.log("Person looking away from screen", "gaze");
      } else {
        this.log("Gaze direction unknown", "info");
      }
      this.lastGazeState = gazeState;

      if (this.config.onGazeChange) {
        this.config.onGazeChange(gazeState, gazeData);
      }
    }

    // Track distracted time
    const isDistracted = gazeState === "away";

    if (isDistracted && this.distractedStartTime === null) {
      this.distractedStartTime = now;
    } else if (!isDistracted && this.distractedStartTime !== null) {
      this.totalDistractedTime += now - this.distractedStartTime;
      this.distractedStartTime = null;
    }

    let currentDistractedTime = this.totalDistractedTime;
    if (this.distractedStartTime !== null) {
      currentDistractedTime += now - this.distractedStartTime;
    }
  }

  // Draw face rectangles
  drawFaces(faces) {
    if (!this.config.showFaceRectangle) return;

    faces.forEach((detection, index) => {
      const bbox = detection.boundingBox || detection.bbox;
      if (!bbox) return;

      const x = bbox.xCenter * this.canvas.width - (bbox.width * this.canvas.width) / 2;
      const y = bbox.yCenter * this.canvas.height - (bbox.height * this.canvas.height) / 2;
      const width = bbox.width * this.canvas.width;
      const height = bbox.height * this.canvas.height;

      this.ctx.strokeStyle = "#00ff00";
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x, y, width, height);

      let confidence = 0;
      if (detection.score && detection.score.length > 0) {
        confidence = Math.round(detection.score[0] * 100);
      } else if (detection.score) {
        confidence = Math.round(detection.score * 100);
      } else if (detection.confidence) {
        confidence = Math.round(detection.confidence * 100);
      } else {
        confidence = 85;
      }

      this.ctx.fillStyle = "#00ff00";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(`Face ${index + 1}: ${confidence}%`, x, y - 10);
    });
  }

  // Draw gaze indicators
  drawGazeIndicators(landmarks, gazeData) {
    if (!landmarks || !gazeData) return;

    if (this.config.showEyePoints) {
      const leftEyeCenter = {
        x: gazeData.leftEyeCenter.x * this.canvas.width,
        y: gazeData.leftEyeCenter.y * this.canvas.height,
      };

      const rightEyeCenter = {
        x: gazeData.rightEyeCenter.x * this.canvas.width,
        y: gazeData.rightEyeCenter.y * this.canvas.height,
      };

      this.ctx.fillStyle = gazeData.direction === "screen" ? "#00ff00" : "#ff6600";
      this.ctx.beginPath();
      this.ctx.arc(leftEyeCenter.x, leftEyeCenter.y, 4, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(rightEyeCenter.x, rightEyeCenter.y, 4, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    if (this.config.showGazeVector && gazeData.faceCenter) {
      const faceCenter = {
        x: gazeData.faceCenter.x * this.canvas.width,
        y: gazeData.faceCenter.y * this.canvas.height,
      };

      this.ctx.strokeStyle = gazeData.direction === "screen" ? "#00ff00" : "#ff6600";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(faceCenter.x, faceCenter.y);
      this.ctx.lineTo(
        faceCenter.x + gazeData.horizontal * 50,
        faceCenter.y + gazeData.vertical * 50
      );
      this.ctx.stroke();
    }
  }

  // Update statistics
  updateStats(faces) {
    const now = Date.now();
    this.faceCount = faces.length;
    const isAway = this.faceCount === 0;

    if (this.faceCount !== this.lastFaceCount) {
      if (this.faceCount === 0) {
        this.log("No person detected (looking away or left)", "warning");
      } else if (this.faceCount > 1) {
        this.log(`Multiple people detected (${this.faceCount} faces)`, "info");
      } else if (this.faceCount === 1 && this.lastFaceCount !== 1) {
        this.log("Person detected and present", "success");
      }
      this.lastFaceCount = this.faceCount;

      if (this.config.onFaceDetected) {
        this.config.onFaceDetected(faces);
      }
    }

    let avgConfidence = 0;
    if (faces.length > 0) {
      let totalConfidence = 0;
      faces.forEach((face) => {
        if (face.score && face.score.length > 0) {
          totalConfidence += face.score[0];
        } else if (face.score) {
          totalConfidence += face.score;
        } else if (face.confidence) {
          totalConfidence += face.confidence;
        } else {
          totalConfidence += 0.85;
        }
      });
      avgConfidence = totalConfidence / faces.length;
    }

    if (isAway && this.awayStartTime === null) {
      this.awayStartTime = now;
    } else if (!isAway && this.awayStartTime !== null) {
      this.totalAwayTime += now - this.awayStartTime;
      this.awayStartTime = null;
    }

    let currentAwayTime = this.totalAwayTime;
    if (this.awayStartTime !== null) {
      currentAwayTime += now - this.awayStartTime;
    }

    let currentDistractedTime = this.totalDistractedTime;
    if (this.distractedStartTime !== null) {
      currentDistractedTime += now - this.distractedStartTime;
    }

    const stats = {
      faceCount: this.faceCount,
      awayTime: Math.floor(currentAwayTime / 1000),
      distractedTime: Math.floor(currentDistractedTime / 1000),
      confidence: Math.round(avgConfidence * 100),
      processingFps: this.processingFps,
      framesSkipped: this.framesSkipped,
      canvasUpdates: this.canvasUpdates,
      gazeState: this.lastGazeState,
      isIdle: this.isIdle
    };

    if (this.config.onStatsUpdate) {
      this.config.onStatsUpdate(stats);
    }
  }

  // Public API methods
  async start() {
    if (!this.isModelLoaded) {
      throw new Error("MediaPipe models not loaded yet");
    }

    try {
      this.log("Starting camera with gaze tracking...", "info");

      let lastProcessTime = 0;
      const frameInterval = 1000 / this.config.targetFps;

      this.camera = new Camera(this.video, {
        onFrame: async () => {
          if (!this.isRunning) return;

          const now = Date.now();
          if (now - lastProcessTime >= frameInterval) {
            await this.faceDetection.send({ image: this.video });
            await this.faceMesh.send({ image: this.video });
            lastProcessTime = now;
          }
        },
        width: this.config.cameraWidth,
        height: this.config.cameraHeight,
      });

      await this.camera.start();

      // Set canvas size to match video
      this.updateCanvasSize();
      
      // Add resize listener to keep canvas aligned
      this.resizeListener = () => this.updateCanvasSize();
      window.addEventListener('resize', this.resizeListener);
      
      // Also update canvas size when video metadata loads
      this.video.addEventListener('loadedmetadata', this.resizeListener);

      this.isRunning = true;
      this.log("Camera started successfully", "success");

    } catch (error) {
      this.log("Camera error: " + error.message, "error");
      if (this.config.onError) {
        this.config.onError(error);
      }
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;

    if (this.camera) {
      await this.camera.stop();
      this.camera = null;
    }

    // Remove event listeners
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.video.removeEventListener('loadedmetadata', this.resizeListener);
      this.resizeListener = null;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Reset stats
    this.faceCount = 0;
    this.lastFaceCount = -1;
    this.awayStartTime = null;
    this.totalAwayTime = 0;
    this.distractedStartTime = null;
    this.totalDistractedTime = 0;
    this.currentFaces = [];
    this.lastGazeState = null;
    this.gazeHistory = [];
    this.frameCounter = 0;
    this.framesSkipped = 0;
    this.canvasUpdates = 0;
    this.isIdle = false;

    this.log("Camera stopped", "info");
  }

  // Configuration methods
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log("Configuration updated", "info");
  }

  getConfig() {
    return { ...this.config };
  }

  // NEW: Live control methods for HTML interface
  setFrameRate(fps) {
    const newFps = Math.max(5, Math.min(30, parseInt(fps)));
    this.config.targetFps = newFps;
    this.log(`Frame rate changed to ${newFps} FPS`, "info");
  }

  setFrameSkip(skip) {
    const newSkip = Math.max(1, Math.min(5, parseInt(skip)));
    this.config.frameSkip = newSkip;
    this.log(`Frame skip changed to process every ${newSkip} frame(s)`, "info");
  }

  setPauseOnIdle(enabled) {
    this.config.pauseOnIdle = Boolean(enabled);
    this.log(`Pause on idle ${enabled ? 'enabled' : 'disabled'}`, "info");
  }

  setReducedCanvas(enabled) {
    this.config.reducedCanvas = Boolean(enabled);
    this.log(`Reduced canvas updates ${enabled ? 'enabled' : 'disabled'}`, "info");
  }

  setHorizontalThreshold(threshold) {
    const newThreshold = Math.max(0.1, Math.min(1.0, parseFloat(threshold)));
    this.config.horizontalThreshold = newThreshold;
    this.log(`Horizontal gaze threshold changed to ${newThreshold}`, "info");
  }

  setVerticalThreshold(threshold) {
    const newThreshold = Math.max(0.05, Math.min(0.5, parseFloat(threshold)));
    this.config.verticalThreshold = newThreshold;
    this.log(`Vertical gaze threshold changed to ${newThreshold}`, "info");
  }

  setGazeHistorySize(size) {
    const newSize = Math.max(2, Math.min(10, parseInt(size)));
    this.config.gazeHistorySize = newSize;
    // Clear existing history to apply new size immediately
    this.gazeHistory = [];
    this.log(`Gaze smoothing changed to ${newSize} frames`, "info");
  }

  setShowGazeVector(enabled) {
    this.config.showGazeVector = Boolean(enabled);
    this.log(`Gaze direction indicator ${enabled ? 'enabled' : 'disabled'}`, "info");
  }

  setShowEyePoints(enabled) {
    this.config.showEyePoints = Boolean(enabled);
    this.log(`Eye tracking points ${enabled ? 'enabled' : 'disabled'}`, "info");
  }

  setShowFaceRectangle(enabled) {
    this.config.showFaceRectangle = Boolean(enabled);
    this.log(`Face rectangle ${enabled ? 'enabled' : 'disabled'}`, "info");
  }

  setEnableLogs(enabled) {
    this.config.enableLogs = Boolean(enabled);
    this.log(`Console logging ${enabled ? 'enabled' : 'disabled'}`, "info");
  }

  // Batch update method for multiple settings
  updateSettings(settings) {
    const validSettings = {
      targetFps: (val) => this.setFrameRate(val),
      frameSkip: (val) => this.setFrameSkip(val),
      pauseOnIdle: (val) => this.setPauseOnIdle(val),
      reducedCanvas: (val) => this.setReducedCanvas(val),
      horizontalThreshold: (val) => this.setHorizontalThreshold(val),
      verticalThreshold: (val) => this.setVerticalThreshold(val),
      gazeHistorySize: (val) => this.setGazeHistorySize(val),
      showGazeVector: (val) => this.setShowGazeVector(val),
      showEyePoints: (val) => this.setShowEyePoints(val),
      showFaceRectangle: (val) => this.setShowFaceRectangle(val),
      enableLogs: (val) => this.setEnableLogs(val)
    };

    Object.keys(settings).forEach(key => {
      if (validSettings[key]) {
        validSettings[key](settings[key]);
      }
    });
  }

  getStats() {
    let currentAwayTime = this.totalAwayTime;
    if (this.awayStartTime !== null) {
      currentAwayTime += Date.now() - this.awayStartTime;
    }

    let currentDistractedTime = this.totalDistractedTime;
    if (this.distractedStartTime !== null) {
      currentDistractedTime += Date.now() - this.distractedStartTime;
    }

    return {
      faceCount: this.faceCount,
      awayTime: Math.floor(currentAwayTime / 1000),
      distractedTime: Math.floor(currentDistractedTime / 1000),
      processingFps: this.processingFps,
      framesSkipped: this.framesSkipped,
      canvasUpdates: this.canvasUpdates,
      gazeState: this.lastGazeState,
      isRunning: this.isRunning,
      isIdle: this.isIdle
    };
  }

  // Utility methods
  isReady() {
    return this.isModelLoaded;
  }

  isActive() {
    return this.isRunning;
  }

  destroy() {
    if (this.isRunning) {
      this.stop();
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.log("Gazer instance destroyed", "info");
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Gazer;
}

// Export for ES6 modules
if (typeof window !== 'undefined') {
  window.Gazer = Gazer;
}