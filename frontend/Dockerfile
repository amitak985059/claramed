FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
