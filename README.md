# Twist Math Solver

A fresh project (separate from Twist Calc) for a mobile-friendly math-solving app.

## Included in this starter
- Responsive web interface
- Scientific calculator
- Arithmetic expression evaluation
- Simple linear and quadratic polynomial equation solving
- Step-by-step solution summaries
- Local calculation history
- Dark/light theme
- GitHub Actions workflow to package a debug Android APK using Capacitor

## Important notes
- The app uses Math.js from a CDN for expression evaluation, so the scientific calculator currently needs an internet connection to load that library.
- Camera OCR and online AI solving are not implemented yet; they are planned for later stages.
- This is a starter build. Test all results and supported equation formats carefully before relying on it for schoolwork.
- The APK produced by GitHub Actions is a debug APK for testing, not a Play Store release build.

## Build APK
Push these files to a new GitHub repository on the `main` branch. Open the repository's **Actions** tab and select **Build Twist Math Solver APK** if the workflow does not start automatically. When it finishes successfully, open the run and download the artifact named `twist-math-solver-debug-apk`.
