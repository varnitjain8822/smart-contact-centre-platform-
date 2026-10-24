# glibc base (not alpine): onnxruntime-node (local KB embeddings) ships glibc binaries only
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
# onnxruntime-node ships every OS/arch (~290 MB) and transformers.js bundles its own onnxruntime-web (~140 MB unused in node):
# keep only this platform's runtime. The embedding model is not baked in: it downloads once into EMBED_CACHE_DIR (volume).
RUN ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci --omit=dev \
  && arch=$(node -p process.arch) \
  && rm -rf node_modules/onnxruntime-web \
  && find node_modules/onnxruntime-node/bin/napi-v*/ -mindepth 1 -maxdepth 1 ! -name linux -exec rm -rf {} + \
  && find node_modules/onnxruntime-node/bin/napi-v*/linux -mindepth 1 -maxdepth 1 ! -name "$arch" -exec rm -rf {} + \
  && npm cache clean --force
COPY src ./src
COPY seed ./seed
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
