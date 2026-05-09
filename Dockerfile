FROM node:24-bookworm

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build

CMD ["npm", "start"]