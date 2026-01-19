FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste du code
COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p src/uploads

# Exposer le port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production

# Commande de démarrage
CMD ["npm", "start"]
