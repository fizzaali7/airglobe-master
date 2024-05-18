# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /usr/src/api

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Set environment variables
ENV CLOUDINARY_CLOUD_NAME=dw7u2svrb
ENV CLOUDINARY_API_KEY=678721661399533
ENV CLOUDINARY_API_SECRET=J1zV4QJHEJXv7tJxRMKTfbyuHYI
ENV MONGO_URL=mongodb+srv://admin:airglobe123@ag-cluster.58vdwse.mongodb.net/airglobe
ENV SECRET_KEY=airglobe

# Expose the port on which your application will run
EXPOSE 4000

# Command to run your application using nodemon
CMD ["node", "index.js"]
