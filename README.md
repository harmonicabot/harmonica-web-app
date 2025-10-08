[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](code_of_conduct.md) 

# Harmonica Web App

<div style="text-align: center;">
  <img src="https://cdn.prod.website-files.com/64dfc629196d88e82c09c82d/6523ec9417dc8dd31db0e531_Asset%201.svg" alt="Harmonica Icon" width="32" height="32" style="transform: rotate(-45deg);" />

Welcome to **Superfast sensemaking and deliberation!**  

</div>

This is the entry point to start an LLM-powered chatbot enabling groups to co-ordinate, reduce friction and move forward.

Please check [harmonica.chat](https://www.harmonica.chat) for more information.



## Development Instructions

### Prerequisites

Make sure you have the following installed on your machine:

- Node.js
- npm (Node Package Manager)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/harmonicabot/harmonica-web-app.git
   cd harmonica-web-app
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

### Databases

This project is hosted on vercel and is using neon postgres databases.
To update the databases, create a new `migration file` (`/db/migrations/`), then run `npm run migrate`.
The database schema is in the `/lib/schema.ts` file. 

## Available Scripts

In the project directory, you can run the following scripts:

`npm run dev`

Starts the development server. Open [http://localhost:3000](http://localhost:3000) to view it in your browser. The page will reload if you make edits. You will also see any lint errors in the console.

`npm run build`

Builds the app for production. It correctly bundles React in production mode and optimizes the build for the best performance. The build is minified and the filenames include the hashes. Your app is ready to be deployed!

`npm start`

Runs the built app in production mode. This command should be run after building the app using `npm run build`.

---
