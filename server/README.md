Retail Pricing Management

A full-stack application to upload, view, search, filter, and update retail pricing records.

Tech Stack

Frontend: React.js, Vite

Backend: Node.js, Express.js

Database: MongoDB, Mongoose

CSV Upload: Multer, csv-parser

Project Structure

retail-pricing-assignment

client/   # React frontend
server/   # Express backend

Prerequisites

Node.js 18+

npm

MongoDB running locally

Setup and Run

1. Backend

cd server
npm install

Create server/.env:

PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/retail_pricing

Start the backend:

npm run dev