ARG NODE_VERSION

FROM node:${NODE_VERSION}-slim

WORKDIR /usr/src/app

COPY . .

# Install OpenSSL and generate test certs
RUN apt-get update && \
    apt-get install -y openssl && \
    mkdir cert && \
    openssl req -x509 -newkey rsa:4096 -keyout ./cert/key.pem -out ./cert/cert.pem -days 365 -nodes -subj "/C=US/ST=Houston/L=Texas/O=Teknoir/OU=Platform/CN=teknoir.dev"

RUN npm install

# Run the application
CMD ["npm", "start"]


