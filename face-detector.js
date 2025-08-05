class FaceDetector extends EventTarget {
    constructor() {
        super();
        this.faceDetection = null;
        this.faceLandmarker = null;
        this.camera = null;
        this.isInitialized = false;
        this.animationId = null;
        this.lastPoseState = null;
        
        // Configuration options
        this.config = {
            horizontalThreshold: 0.15,  // Sensitivity for left/right detection
            verticalThreshold: 0.08,    // Sensitivity for up/down detection
            smoothing: true,            // Enable pose smoothing
            smoothingFrames: 3          // Number of frames for smoothing
        };
        
        this.poseHistory = [];
    }

    async init(cameraDiv, options = {}) {
        try {
            // Merge configuration options
            this.config = { ...this.config, ...options.config };
            
            if (!cameraDiv) {
                throw new Error('Camera div element is required');
            }

            // Initialize MediaPipe Face Detection and Face Mesh
            const { FaceDetector: MPFaceDetector, FaceLandmarker, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3');
            
            // Initialize the wasm fileset
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
            );
            
            // Initialize face detector first (this is critical)
            this.faceDetection = await MPFaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                    delegate: "GPU"
                },
                runningMode: "VIDEO"
            });

            // Initialize face landmarker for pose detection (optional - can fail)
            try {
                this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 1
                });
                console.log('Face landmarker initialized successfully');
            } catch (error) {
                console.warn('Face landmarker failed to initialize, pose detection will be unavailable:', error);
                this.faceLandmarker = null;
            }

            // Setup camera
            await this.setupCamera(cameraDiv);
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('initialized', {
                detail: { 
                    hasLandmarker: !!this.faceLandmarker,
                    message: this.faceLandmarker ? 
                        'Face detector with pose tracking initialized' : 
                        'Face detector initialized (pose tracking unavailable)'
                }
            }));
            
            // Start detection loop
            this.startDetection();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.dispatchEvent(new CustomEvent('error', { 
                detail: { type: 'initialization', message: error.message } 
            }));
        }
    }

    async setupCamera(cameraDiv) {
        // Hide placeholder text
        const placeholder = cameraDiv.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Create video element
        this.camera = document.createElement('video');
        this.camera.setAttribute('playsinline', '');
        this.camera.setAttribute('autoplay', '');
        this.camera.setAttribute('muted', '');

        // Add video to DOM
        cameraDiv.appendChild(this.camera);

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });

        this.camera.srcObject = stream;
        
        return new Promise((resolve, reject) => {
            this.camera.onloadedmetadata = () => {
                this.camera.play().then(() => {
                    resolve();
                }).catch(reject);
            };
            
            this.camera.onerror = (e) => {
                reject(new Error('Failed to load video'));
            };
        });
    }

    startDetection() {
        if (!this.isInitialized || !this.camera) return;

        const detect = () => {
            if (this.camera.readyState === 4) {
                try {
                    const startTimeMs = performance.now();
                    const detections = this.faceDetection.detectForVideo(this.camera, startTimeMs);
                    
                    // If exactly one person is detected, also check pose
                    if (detections.detections.length === 1) {
                        try {
                            const landmarks = this.faceLandmarker.detectForVideo(this.camera, startTimeMs);
                            this.processDetections(detections, landmarks);
                        } catch (error) {
                            console.warn('Landmark detection failed, falling back to face detection only:', error);
                            this.processDetections(detections, null);
                        }
                    } else {
                        this.processDetections(detections, null);
                    }
                } catch (error) {
                    console.error('Detection error:', error);
                    this.dispatchEvent(new CustomEvent('error', { 
                        detail: { type: 'detection', message: error.message } 
                    }));
                }
            }
            
            this.animationId = requestAnimationFrame(detect);
        };

        detect();
    }

    processDetections(detections, landmarks) {
        const faceCount = detections.detections.length;

        // Check person count and emit events
        if (faceCount === 0) {
            this.dispatchEvent(new CustomEvent('noPerson', {
                detail: { count: faceCount, message: 'No person detected on screen' }
            }));
            this.lastPoseState = null;
            this.poseHistory = [];
        } else if (faceCount > 1) {
            this.dispatchEvent(new CustomEvent('multiplePeople', {
                detail: { count: faceCount, message: `${faceCount} people detected. Only 1 person should be on screen` }
            }));
            this.lastPoseState = null;
            this.poseHistory = [];
        } else {
            // Exactly 1 person - check pose if landmarks are available
            if (landmarks && landmarks.faceLandmarks && landmarks.faceLandmarks.length > 0) {
                const poseState = this.analyzeFacePose(landmarks.faceLandmarks[0]);
                
                // Apply smoothing if enabled
                const smoothedPose = this.config.smoothing ? this.smoothPose(poseState) : poseState;
                
                if (smoothedPose.lookingAway) {
                    this.dispatchEvent(new CustomEvent('lookingAway', {
                        detail: { 
                            direction: smoothedPose.direction,
                            confidence: smoothedPose.confidence,
                            message: `Person is looking ${smoothedPose.direction}. Please look straight at the monitor.`,
                            detection: detections.detections[0],
                            pose: smoothedPose
                        }
                    }));
                } else {
                    this.dispatchEvent(new CustomEvent('lookingStraight', {
                        detail: { 
                            message: 'Person is looking straight at the monitor',
                            confidence: smoothedPose.confidence,
                            detection: detections.detections[0],
                            pose: smoothedPose
                        }
                    }));
                }
                
                this.lastPoseState = smoothedPose;
            } else {
                // Fallback for when landmarks aren't available but we have one face
                this.dispatchEvent(new CustomEvent('singlePerson', {
                    detail: { 
                        count: faceCount, 
                        detection: detections.detections[0],
                        message: 'Single person detected (pose analysis unavailable)'
                    }
                }));
            }
        }

        // Always emit detection event with raw data
        this.dispatchEvent(new CustomEvent('detection', {
            detail: { detections: detections.detections, count: faceCount, landmarks: landmarks }
        }));
    }

    analyzeFacePose(landmarks) {
        // Key landmark indices for pose estimation
        const noseTip = landmarks[1];           // Nose tip
        const leftEyeCorner = landmarks[33];    // Left eye inner corner
        const rightEyeCorner = landmarks[263];  // Right eye inner corner
        const leftMouthCorner = landmarks[61];  // Left mouth corner
        const rightMouthCorner = landmarks[291]; // Right mouth corner
        const chinBottom = landmarks[18];       // Bottom of chin
        const foreheadCenter = landmarks[9];    // Center of forehead

        // Calculate face center
        const faceCenter = {
            x: (leftEyeCorner.x + rightEyeCorner.x) / 2,
            y: (leftEyeCorner.y + rightEyeCorner.y) / 2
        };

        // Calculate horizontal deviation (left/right)
        const horizontalDeviation = noseTip.x - faceCenter.x;
        const eyeDistance = Math.abs(leftEyeCorner.x - rightEyeCorner.x);
        const horizontalRatio = Math.abs(horizontalDeviation) / eyeDistance;

        // Calculate vertical deviation (up/down)
        const verticalDeviation = noseTip.y - faceCenter.y;
        const faceHeight = Math.abs(foreheadCenter.y - chinBottom.y);
        const verticalRatio = Math.abs(verticalDeviation) / faceHeight;

        // Use configured thresholds
        const horizontalThreshold = this.config.horizontalThreshold;
        const verticalThreshold = this.config.verticalThreshold;

        let direction = null;
        let lookingAway = false;
        let confidence = 0;

        // Determine direction and confidence
        if (horizontalRatio > horizontalThreshold) {
            if (horizontalDeviation > 0) {
                direction = 'right';
            } else {
                direction = 'left';
            }
            lookingAway = true;
            confidence = Math.min((horizontalRatio - horizontalThreshold) / horizontalThreshold, 1);
        } else if (verticalRatio > verticalThreshold) {
            if (verticalDeviation > 0) {
                direction = 'down';
            } else {
                direction = 'up';
            }
            lookingAway = true;
            confidence = Math.min((verticalRatio - verticalThreshold) / verticalThreshold, 1);
        } else {
            // Looking straight - calculate confidence based on how centered they are
            const maxDeviation = Math.max(
                horizontalRatio / horizontalThreshold,
                verticalRatio / verticalThreshold
            );
            confidence = 1 - maxDeviation;
        }

        return {
            lookingAway,
            direction,
            confidence: Math.max(0, Math.min(1, confidence)),
            horizontalRatio,
            verticalRatio,
            horizontalDeviation,
            verticalDeviation,
            noseTip,
            faceCenter,
            eyeDistance,
            faceHeight
        };
    }

    smoothPose(currentPose) {
        if (!this.config.smoothing) return currentPose;

        // Add current pose to history
        this.poseHistory.push(currentPose);
        
        // Keep only the required number of frames
        if (this.poseHistory.length > this.config.smoothingFrames) {
            this.poseHistory.shift();
        }

        // If we don't have enough history, return current pose
        if (this.poseHistory.length < this.config.smoothingFrames) {
            return currentPose;
        }

        // Count occurrences of each state
        const straightCount = this.poseHistory.filter(p => !p.lookingAway).length;
        const awayCount = this.poseHistory.length - straightCount;

        // Determine smoothed state based on majority
        if (straightCount > awayCount) {
            return {
                ...currentPose,
                lookingAway: false,
                direction: null
            };
        } else {
            // Find most common direction in recent frames
            const directions = this.poseHistory
                .filter(p => p.lookingAway)
                .map(p => p.direction);
            
            const directionCounts = {};
            directions.forEach(dir => {
                directionCounts[dir] = (directionCounts[dir] || 0) + 1;
            });

            const mostCommonDirection = Object.keys(directionCounts)
                .reduce((a, b) => directionCounts[a] > directionCounts[b] ? a : b);

            return {
                ...currentPose,
                lookingAway: true,
                direction: mostCommonDirection
            };
        }
    }

    // Configuration methods
    setHorizontalThreshold(threshold) {
        this.config.horizontalThreshold = threshold;
    }

    setVerticalThreshold(threshold) {
        this.config.verticalThreshold = threshold;
    }

    enableSmoothing(enabled) {
        this.config.smoothing = enabled;
        if (!enabled) {
            this.poseHistory = [];
        }
    }

    setSmoothingFrames(frames) {
        this.config.smoothingFrames = frames;
        // Trim history if needed
        if (this.poseHistory.length > frames) {
            this.poseHistory = this.poseHistory.slice(-frames);
        }
    }

    getConfiguration() {
        return { ...this.config };
    }

    // Utility methods
    getPoseHistory() {
        return [...this.poseHistory];
    }

    getLastPoseState() {
        return this.lastPoseState ? { ...this.lastPoseState } : null;
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.camera && this.camera.srcObject) {
            const tracks = this.camera.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

        // Show placeholder text again
        const cameraDiv = this.camera?.parentElement;
        if (cameraDiv) {
            const placeholder = cameraDiv.querySelector('.placeholder-text');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
        }

        this.isInitialized = false;
        this.lastPoseState = null;
        this.poseHistory = [];
        this.dispatchEvent(new CustomEvent('stopped'));
    }

    destroy() {
        this.stop();
        
        if (this.camera) {
            this.camera.remove();
        }

        this.faceDetection = null;
        this.faceLandmarker = null;
        this.camera = null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceDetector;
} else if (typeof window !== 'undefined') {
    window.FaceDetector = FaceDetector;
}