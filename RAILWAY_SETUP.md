# Railway Deployment Guide for AI Transcriber

This guide explains how to deploy the AI Transcriber application on Railway using the free tier.

## Prerequisites
- A GitHub account.
- A free account on [Railway.app](https://railway.app/).
- A free Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

## Step 1: Push your code to GitHub
1. Commit all your changes in the `ai-transcriber` folder.
2. Push the repository to a new GitHub repository.

## Step 2: Set up Railway Project & Database
1. Go to the Railway dashboard and click **New Project**.
2. Select **Provision PostgreSQL**.
3. Wait for the database to be provisioned.

## Step 3: Deploy the Next.js App
1. In the same Railway project, click **New** -> **GitHub Repo** and select your repository.
2. Railway will automatically detect it as a Next.js application.

## Step 4: Configure Environment Variables
1. Click on your deployed app service in the Railway dashboard.
2. Go to the **Variables** tab.
3. Add the following environment variables:
   - `DATABASE_URL`: Click "Add Reference" and select the `DATABASE_URL` from your PostgreSQL service.
   - `AUTH_SECRET`: Generate a random string (e.g., using `openssl rand -base64 32` or just a secure random password) and paste it here.
   - `NEXT_PUBLIC_APP_URL`: Your application's public Railway URL (e.g., `https://your-app-url.up.railway.app`). You can get this by going to the Settings tab -> Networking -> Generate Domain.
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.

## Step 5: Database Migration and Seeding
In a typical Next.js deployment, you might run migrations during the build step. In this project, we've configured standard Drizzle.
1. Run `npx drizzle-kit push` from your local machine, pointing to the Railway `DATABASE_URL`. Ensure your local `.env.local` contains the remote Railway `DATABASE_URL` and run:
   ```bash
   npx drizzle-kit push
   ```
2. **Seed the Admin Account**: Start the app locally pointing to the remote database, or simply navigate to your deployed app's seed endpoint:
   ```
   https://your-app-url.up.railway.app/api/seed
   ```
   *This will create the admin user (`admin@example.com` / `password123`).* After verifying the account is created, you should remove the `app/api/seed/route.js` file and commit/push to prevent others from hitting it.

## Step 6: Test the Application
1. Go to your public domain: `https://your-app-url.up.railway.app/login`
2. Log in with the admin credentials:
   - **Email:** `admin@example.com`
   - **Password:** `password123`
3. Upload an audio file and test the transcription!
