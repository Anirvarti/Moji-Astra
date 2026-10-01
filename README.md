# Moji Astra - AI Hand & Face Emoji Studio 🚀✨

Moji Astra is an on-device, high-performance web application that uses your webcam to recognize hand gestures and facial expressions, turning them into live emojis. It runs completely inside the browser using Google MediaPipe WebAssembly vision models—no server backend, no telemetry, and zero camera data ever leaving the device.

Built for both **Classroom Educational Gaming (Class 7 level)** and **Live Video Meeting Reactions (Zoom / Google Meet / OBS Virtual Camera)**.

---

## 🌟 Key Features

1. **🎮 Play Mode (Classroom Game Arena):**
   - 10-round dynamic gesture matching game with difficulty modes: *Easy* (8s), *Medium* (5s), *Timed Challenge* (3s), and *Memory Sequence*.
   - Built-in gestures: 👍 (Thumb Up), ✌️ (Victory), ✋ (Open Palm), ✊ (Fist), ☝️ (Point Up), 👎 (Thumb Down).
   - Custom geometric landmark gestures: 👌 (OK Sign), 🤟 (Love-You), 🤞 (Crossed Fingers), and 🫰 (Finger Heart).
   - **Hero Bonus Gesture:** ❤️ Two-Hand Heart detected by thumb-to-thumb and index-to-index Euclidean proximity.
   - **Hold-to-Confirm (~0.5s):** Eliminates flickering via a 10-frame temporal moving average and visual circular SVG progress ring.
   - Score, combo streaks (up to 4x), Web Audio synthesizer sound effects, confetti bursts, and local high score board.

2. **🔍 Explore Mode (Touchless Spatial Emoji Picker):**
   - 4,000+ Unicode emoji directory categorized by Smileys, People, Animals, Food, Activities, Travel, Objects, Symbols, and Flags.
   - Skin tone modifiers (Default, Light, Medium-Light, Medium, Medium-Dark, Dark).
   - **Spatial Computing Hand Control:**
     - Point index finger to guide the on-screen cursor.
     - Pinch thumb and index finger (<0.08 normalized distance) to click and select emojis.
     - Closed fist acts as backspace / clear.
   - Voice Search powered by the browser's Web Speech API + keyword fuzzy matching.
   - Message tray with copy-to-clipboard and Text-to-Speech (TTS) pronunciation.

3. **💬 Meeting Mode (Live Presenter & OBS Overlay):**
   - Clean transparent dock with floating emoji reaction physics.
   - Detects hand gestures and 16 facial expressions (Smile 😀, Big Laugh 😆, Surprise 😮, Screaming Shock 😱, Wink 😉, Tongue 😛, Winking Tongue 😜, Sad 😢, Angry 😠, Skeptical 🤨, Kiss 😚, Wide Eyes 😳, Sleepy 😴, Eye Roll 🙄, Yawn 🥱, Sealed Lips 🤐, Clapping 👏, Two-Hand Heart ❤️).
   - **Raise Hand Detection:** Hold open palm ✋ for 1.5 seconds to sound the virtual doorbell and display the persistent "Hand Raised" banner.
   - User-editable gesture-to-emoji mapping with cooldown to prevent spam.
   - **OBS Chroma Green Screen (`#00FF00`):** Presenter view with green screen for transparent OBS Chroma Key broadcasting.
   - **Privacy Mode:** Turns off video stream and displays only a glowing digital cyber skeleton.

4. **🧠 Learn Mode ("How Does AI See This?"):**
   - 21 3D hand landmark anatomy visualizer with optional joint indices (0-20).
   - Interactive 6-stage AI pipeline visualizer showing real-time processing:
     `Camera RGB -> BlazePalm Bounding Box -> 21 3D Landmarks -> Vector Angles & Distances -> Classification -> Output Emoji`.
     The active stage lights up as frames are analyzed.
   - Live probability confidence bars demonstrating that AI outputs probability distributions, not binary certainty.
   - Educational failure mode analysis (low light, motion blur, self-occlusion, edge clipping).
   - **Train Your Own Gesture (kNN):** Record 20 landmark samples of a custom hand shape, assign an emoji, and classify live using an in-browser k-Nearest-Neighbors classifier.

5. **⚡ Extra: Secret Gesture Sequences (Combos):**
   - Multi-gesture combo detector with decaying buffer.
   - Default combos: ✌️ + 👍 &rarr; 🚀 Rocket Blast Off!, ✊ + ✋ + ✌️ &rarr; 🏆 Rock-Paper-Scissors Champion!, ☝️ + ☝️ &rarr; ✨ Magic Sparkle!

---

## 💻 How to Run Locally

### Option 1: Standard Development Server
```bash
# 1. Install dependencies
npm install

# 2. Start the dev server on port 3000
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Production Build & Simple Python HTTP Server
```bash
# 1. Build the production package
npm run build

# 2. Serve the static dist directory using Python 3
cd dist
python3 -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🌐 Browser Compatibility Notes

- **macOS Chrome:** Recommended for optimal WebAssembly SIMD execution, WebGL GPU acceleration, and Web Speech API.
- **macOS Safari:** Fully supported for MediaPipe hand tracking and `getUserMedia`. Ensure camera permission is granted in *Safari &rarr; Settings &rarr; Websites &rarr; Camera*.
- **Camera Security Notice:** Browsers only permit camera access on `localhost`, `127.0.0.1`, or secure `https://` origins.
- **Fallback Test Simulator:** If running in an environment without a camera, Moji Astra includes an instant simulator panel so you can test all features immediately.

---

## 🎥 OBS Virtual Camera Setup for Zoom / Google Meet

1. Open Moji Astra and switch to **Meeting Mode**.
2. Click **OBS Chroma** in the top dock to turn the canvas into pure green (`#00FF00`).
3. Open **OBS Studio**:
   - In the **Sources** panel, click **+** and choose **Window Capture**.
   - Select the browser window running Moji Astra.
   - Right-click the source &rarr; **Filters** &rarr; **+** under *Effect Filters* &rarr; select **Chroma Key**.
   - Set Key Color Type to **Green**. Your webcam video and floating emojis now float seamlessly over your background!
4. In OBS, click **Start Virtual Camera** (bottom-right controls).
5. In **Zoom**, **Google Meet**, or **Microsoft Teams**, open Video Settings and select **OBS Virtual Camera** as your camera input.

---

## 🎙️ 60-Second Demo Presentation Script (Class 7 Level)

*(Speak at a natural, enthusiastic pace while gesturing to the camera!)*

> "Hello everyone! Today, I want to show you **Moji Astra** — an AI web application that turns our hand gestures and facial expressions into live emojis right inside our browser.
>
> What makes this special is that everything runs **100% on-device** using Google's MediaPipe neural networks through WebAssembly. That means no video ever leaves our computer, protecting our privacy completely.
>
> First, in **Play Mode**, we have a fast classroom game. When a target emoji appears — like thumbs up, victory, or finger heart — I make the gesture. Watch the circular progress ring: it holds the gesture steady for half a second across a 10-frame sliding window to prevent accidental flickers. Watch this: peace sign, OK sign, and the two-hand heart!
>
> Next, in **Explore Mode**, we have touchless spatial computing! My index fingertip moves the cursor across 4,000 emojis, and pinching my thumb and index finger selects one.
>
> In **Meeting Mode**, we can react silently during video calls with floating reactions, or hold our palm up for 1.5 seconds to trigger the 'Raise Hand' banner.
>
> Finally, in **Learn Mode**, we can see how the computer actually sees my hand as 21 three-dimensional coordinate points, and we can even train our own custom gesture using k-Nearest-Neighbors!
>
> Thank you, and let's try it out!"

---

## ⚠️ Known Limitations & 5 Future Improvements

### Known Limitations
1. **Monocular Depth Ambiguity:** Because standard webcams only capture a 2D RGB image, fingers hidden directly behind the palm along the camera's line of sight must be estimated through statistical priors.
2. **Lighting Sensitivity:** Low-light environments and strong backlighting flatten pixel contrast gradients, reducing landmark confidence.
3. **Motion Blur:** Fast hand whips blur pixel edges during the camera's ~33ms shutter window, causing momentary tracking jitter.

### 5 Future Improvements
1. **Continuous American Sign Language (ASL) Sentences:** Expand gesture sequences into a continuous sentence translator using temporal attention networks.
2. **Two-Player WebRTC Collaborative Arena:** Allow two students in different classrooms to compete against each other in real time over peer-to-peer WebRTC data channels.
3. **3D Three.js Skeletal Emoji Rigging:** Render 3D emoji characters whose hands and facial features match the user's bone rotations in real-time.
4. **Trajectory & Motion Gesture Recognition:** Use Hidden Markov Models (HMM) to detect moving gestures such as waving, drawing shapes in the air, or snapping.
5. **Classroom Teacher Dashboard:** A local classroom hub where teachers can set custom spelling and math gesture challenges for students without collecting student data.
