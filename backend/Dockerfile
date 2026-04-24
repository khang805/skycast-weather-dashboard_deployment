FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

# Expose port and run the server
EXPOSE 5000
CMD ["node", "server.js"]
