# SafeStep – AI Child Guardian

SafeStep is an AI-powered child internet-safety and parental monitoring web application. It provides guardians with a dashboard to monitor a child's online activity, identify potentially unsafe content, view alerts, and understand safety risks.

## 🌐 Live Demo

https://safestep-henna.vercel.app/

## 🎯 Problem

Children can encounter unsafe or inappropriate content while using the internet. Parents and guardians may not always have enough visibility into what their children are accessing.

SafeStep aims to provide a simple and easy-to-understand safety dashboard that helps guardians monitor online activity and respond to potential risks.

## 💡 Solution

SafeStep provides a guardian-focused dashboard with:

- Child activity monitoring
- Safety alerts
- Risk and safety indicators
- AI-based safety classification and explanations
- Activity filtering
- Guardian recommendations
- Child/device management
- Reports and activity information
- Authentication
- Supabase database integration

## 🤖 AI / Safety System

SafeStep includes a safety classification and reasoning layer that analyzes online activity and categorizes potentially unsafe content.

The system can:

- Identify potentially unsafe activity
- Classify safety-related content
- Assign safety/risk information
- Provide explanations for detected risks
- Present safety information to guardians in an understandable format

## 🛠️ Technologies Used

- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Supabase
- Vercel

## 📁 Project Structure

```text
src/
├── components/
├── context/
├── data/
├── lib/
├── pages/
├── App.jsx
├── index.css
└── main.jsx

supabase/
├── schema.sql
└── notifications.sql
