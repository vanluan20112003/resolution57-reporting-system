FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY resources/react/package*.json ./

# Install dependencies
RUN npm install

# Copy app files
COPY resources/react .

# Expose port 5000
EXPOSE 5000

# Start app
CMD ["npm", "run", "dev"]
