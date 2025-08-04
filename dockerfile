# Use Node.js 20 LTS with Ubuntu base for better Playwright compatibility and stability
FROM node:20-bullseye

# Set the working directory
WORKDIR /app

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium firefox
RUN npx playwright install-deps

# Copy the rest of your application source code
COPY . .

# Create a non-root user for security
RUN groupadd -r mpaka && useradd -r -g mpaka -G audio,video mpaka
RUN chown -R mpaka:mpaka /app
USER mpaka

# Expose the port your app runs on
EXPOSE 3000

# Run the application
CMD ["node", "server.js"]
