# ✨ ContentGuard: Full Stack Realtime Content Moderation App ✨

ContentGuard is a powerful and efficient full-stack application designed for real-time content moderation. Built with a modern tech stack, it ensures seamless performance and a great user experience.

## Highlights

- 🌟 **Tech Stack**: MERN (MongoDB, Express, React, Node.js) + Socket.io + Python + TailwindCSS + Daisy UI
- 🤖 **Machine Learning**: A robust ML model that filters and flags inappropriate content in real-time for chat platforms
- 🔐 **Authentication & Authorization**: Secure your app with JWT
- 💬 **Real-time Messaging**: Powered by Socket.io for instant communication
- 🟢 **Online User Status**: Track user activity in real-time
- 🌍 **Global State Management**: Efficiently managed with Zustand
- 🐞 **Error Handling**: Robust error handling on both server and client sides
- ⏳ **And much more!**

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

Ensure you have the following installed:

- Node.js
- npm (Node Package Manager)
- MongoDB

### Setup .env File

Create a `.env` file in the root directory and add the following environment variables:

```env
MONGODB_URI=your_mongodb_uri
PORT=5001
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

NODE_ENV=development
```

### Installation

Install the dependencies:

```shell
cd backend
npm install
```

```shell
cd frontend
npm install
```

```shell
cd machine_learning
pip install -r requirements.txt
```

### Starting the Application

#### Frontend

```shell
cd frontend
npm run dev
```

#### Backend

```shell
cd backend/src
node index.js
```

#### Machine Learning

```shell
cd machine_learning
python content_moderation.py
```