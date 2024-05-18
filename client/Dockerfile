# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /usr/src/client

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Set environment variables
ENV VITE_API_BASE_URL = "http://16.170.231.74:4000/api"

# Build the production-ready assets (if needed)
RUN npm run build

# Expose the port on which your application will run
EXPOSE 5173

# Command to start your application
CMD ["npm", "run", "dev"]
