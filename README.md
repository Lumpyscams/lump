# Heart Rate Monitor (Client-only) online at lumpo.ca

This repository hosts a client-only Progressive Web App (PWA) designed for real-time heart rate monitoring. It runs entirely in your browser, allowing users to connect their own Bluetooth heart-rate devices and track their workouts locally.

Mobile Bluetooth requires HTTPS and a browser with Web Bluetooth support, such as Chrome or Edge on Android. iOS Safari does not currently expose Web Bluetooth, so the Connect button cannot pair with a heart-rate monitor there.

## Running the PWA

Serve this folder from `http://localhost` (for example, with VS Code Live Server) or from an HTTPS host. Do not open `index.html` directly with a `file://` URL: browsers do not allow service workers to register from local files. After loading the page, check the browser's Application/Storage tools to confirm that the service worker is activated and controlling the page before installing the app.

## Key Features

*   **Web Bluetooth API:** Connects directly to compatible Bluetooth Heart Rate Profile (HRP) devices.
*   **Client-only:** No server is required for the core functionality; all processing and data display happen in your browser.
*   **PWA Capabilities:** Installable on your device for an app-like experience, with offline caching via a Service Worker.
*   **Modular Architecture:** The application is structured into distinct JavaScript modules for better maintainability, readability, and scalability.
*   **Added Audio prompts

## Core Functionality & Mathematical Insights

The application provides several key metrics derived from your heart rate data:

### 1. Heart Rate Processing
Raw heart rate (BPM) values from the Bluetooth sensor are continuously processed to provide various statistics. Invalid or zero readings are filtered out to ensure data accuracy.

### 2. Rolling Average (RollAvg)
This displays the average heart rate over the last 30 samples (default). The implementation uses a configurable rolling window (default size 30) to show short-term trends and immediate workout intensity. If your device reports approximately one sample per second, this corresponds to about a 30-second window.

### 3. Total Average (TotAvg)
Calculated using an **incremental running average** method, this represents your average heart rate for the entire workout session. This method is memory-efficient, updating the average with each new reading without storing all historical values.

### 4. Maximum Heart Rate (MaxHR)
To prevent single "glitch" spikes from skewing your maximum, the `MaxHR` is determined using a **median filter**. The app maintains a buffer of the last 5 heart rate readings, sorts them, and takes the median (the middle value). The `MaxHR` is only updated if this median value is higher than the previously recorded maximum.

### 5. Cardiovascular Drift (Drift%)
This metric indicates how much your heart rate is increasing over time for the same workload, often a sign of fatigue or dehydration. It's calculated as the percentage difference between the current rolling average and the session's total average. A positive drift suggests your heart is working harder to maintain performance.

### 6. Quartile Analysis (Q1, Q2, Q3, Q4 & Q-Drift%)
The workout session is divided into four equal time blocks (quartiles). The average heart rate for each quartile (Q1, Q2, Q3, Q4) is calculated.
- **Q-Drift%** specifically measures the cardiovascular drift between the first half (Q1+Q2 average) and the second half (Q3+Q4 average) of your workout. This provides a more structured view of how your heart rate performance changes throughout the session. Quartiles are calculated every 60 samples by default (approximately 1 minute if the device reports ~1 sample/sec).

### 7. Standard Deviation (StdDev)
Standard deviation provides a measure of variability in your session heart rate — how consistent or variable your BPM readings are. This app computes the session standard deviation using an incremental (online) algorithm (Welford's method), which is numerically stable and memory efficient. The stored value is the sample standard deviation (uses n-1 in the variance denominator), and it is updated as new samples arrive. The UI displays the rounded standard deviation value and it becomes available once there are at least two samples in the session.

## Project Structure

The application's logic is split into several modules:

*   **`uiManager.js`**: Manages all interactions with the Document Object Model (DOM), updating elements like BPM display, status messages, and button states.
*   **`dataProcessor.js`**: Handles all heart rate mathematics, including rolling averages, total averages, drift calculations, and quartile analysis.
*   **`app.js`**: The main orchestrator, importing other modules, setting up event listeners, and coordinating data flow between the UI and data processing.
*   **`bluetoothManager.js`**:  Manages the Web Bluetooth connection, device discovery, and heart rate characteristic notifications.
*   **`timerManager.js`**:  Controls the workout timer, elapsed time, and related state.
*   **`utils.js`**:  Contains shared helper functions like time formatting and logging.

