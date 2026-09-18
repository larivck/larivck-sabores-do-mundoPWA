# Sabores do Mundo

Progressive Web App (PWA) responsiva que consome a API pública e gratuita [TheMealDB](https://www.themealdb.com/api.php) para explorar receitas por categoria, busca (nome/ingrediente) ou pela cozinha da região do usuário (via geolocalização), exibindo ingredientes e modo de preparo em um painel de detalhes.

## Stack

HTML, CSS e JavaScript puros (vanilla) — sem build step, sem dependências. Isso mantém o projeto leve e rápido, o que ajuda bastante na nota do Lighthouse.

## Recursos de PWA

- **Instalável**: `manifest.json` com ícones (192px, 512px e versão maskable) + botão "Instalar aplicativo" que aparece quando o navegador permite a instalação
- **Funciona offline**: um service worker (`sw.js`) guarda em cache o HTML, CSS, JS e ícones (o "app shell"), então a interface abre mesmo sem internet — só as receitas (que vêm da API) precisam de conexão
- **Recurso de hardware usado — Geolocalização**: o botão "📍 Cozinha da sua região" pede a localização do dispositivo, identifica o país via geocodificação reversa (API gratuita BigDataCloud) e já filtra as receitas pela cozinha correspondente na TheMealDB. Quando o país não tem uma cozinha específica cadastrada na base (ela não cobre todos os países), o app avisa isso claramente e mostra a opção geograficamente mais próxima disponível.

## Rodando localmente

Não precisa de instalação. Basta abrir `index.html` no navegador, ou servir a pasta com qualquer servidor estático, por exemplo:

```bash
npx serve .
# ou
python3 -m http.server
```

## Funcionalidades

- Busca por nome ou ingrediente (`search.php?s=`)
- Filtro por categoria (`categories.php` + `filter.php?c=`)
- Filtro pela cozinha da região do usuário via geolocalização (`filter.php?a=`)
- Painel de detalhes com ingredientes e modo de preparo (`lookup.php?i=`)
- Layout responsivo (grid de 3 → 2 → 1 colunas)
- Acessibilidade: skip link, foco visível, `aria-live` nos resultados, painel com `role="dialog"`, fechamento com Esc, `prefers-reduced-motion` respeitado
- Imagens com `loading="lazy"` e tamanhos/`aspect-ratio` definidos, além de altura mínima reservada nas seções carregadas via API, para reduzir o layout shift (CLS)

## Como publicar (entregáveis da atividade)

### 1. Repositório público no GitHub

```bash
git init
git add .
git commit -m "Sabores do Mundo: app de receitas com TheMealDB"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/sabores-do-mundo.git
git push -u origin main
```

Lembre de deixar o repositório como **público**.

### 2. Deploy (escolha uma opção)

**GitHub Pages** (mais simples, já que o projeto é 100% estático):
1. No repositório, vá em `Settings → Pages`
2. Em "Source", selecione a branch `main` e a pasta `/root`
3. Salve — em alguns minutos o link fica disponível em `https://SEU-USUARIO.github.io/sabores-do-mundo/`

**Vercel** ou **Netlify**: importe o repositório do GitHub direto no painel deles, sem configuração adicional (não há build).

Depois de publicar, roda o Lighthouse (aba *Lighthouse* do DevTools do Chrome, ou https://pagespeed.web.dev/) na URL publicada para conferir desempenho, acessibilidade e boas práticas.
