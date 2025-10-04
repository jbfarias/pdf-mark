# Deploy do PDF Cite

Guia para publicar o site estático em diferentes plataformas.

## Preparação
- Projeto estático: `index.html`, `app.js`, `styles.css`.
- `base href="./"` garante funcionamento em subpaths.
- PDF.js worker via CDN configurado em `app.js`.

## GitHub Pages
1. Inicialize o repositório:
   ```bash
   git init
   git add .
   git commit -m "publish"
   ```
2. Crie o repo no GitHub e conecte:
   ```bash
   git remote add origin <url>
   git branch -M main
   git push -u origin main
   ```
3. Ative Pages: Settings → Pages → "Deploy from a branch" → branch `main` → folder `/`.
4. Acesse: `https://<usuario>.github.io/<repo>/`.

## Netlify
- "New site from Git" → conecte ao repo → sem build → publish dir `.`.
- Deploy automático a cada push.
- CLI (opcional):
  ```bash
  npm i -g netlify-cli
  netlify login
  netlify init
  netlify deploy --dir . --prod
  ```

## Vercel
- "New Project" → conecte ao repo → Framework: None → Output Dir `.`.
- Deploy automático.
- CLI (opcional):
  ```bash
  npm i -g vercel
  vercel login
  vercel --prod
  ```

## AWS S3 + CloudFront
1. Crie bucket S3 e habilite "Static website hosting".
2. Suba os arquivos:
   ```bash
   aws s3 sync . s3://<bucket> --delete
   ```
3. Opcional: CloudFront na frente do bucket; configure OAI/OAC e origem S3.

## Dicas e Problemas Comuns
- **CORS**: PDFs remotos exigem CORS no servidor de origem; PDFs locais via `<input>` não têm essa restrição.
- **Worker do PDF.js**: se houver bloqueio por CSP/CORS, o sistema tenta fallback sem worker.
- **Cache**: remova cache agressivo no CDN ao atualizar; Netlify/Vercel resolvem automaticamente.
- **Subpath**: verifique paths relativos; o `base href` já está definido.