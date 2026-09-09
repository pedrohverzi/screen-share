# Tela dos Amigos

App simples de compartilhamento de tela com audio para um grupo pequeno (5-6 pessoas). Sem chat, sem microfone — so a tela de uma pessoa por vez, que todo mundo assiste.

Usa [LiveKit Cloud](https://cloud.livekit.io) como SFU (recebe a tela de quem compartilha e distribui pros demais), entao quem esta compartilhando so precisa enviar o video uma vez, nao uma vez por espectador.

## 1. Criar o projeto no LiveKit Cloud

1. Crie uma conta gratuita em https://cloud.livekit.io
2. Crie um projeto
3. Em "Settings > Keys" copie: `API Key`, `API Secret` e a `URL` do projeto (formato `wss://SEUPROJETO.livekit.cloud`)

## 2. Configurar o servidor

```bash
cp .env.example .env
```

Edite `.env` e preencha `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` com os valores do passo 1.

## 3. Instalar e rodar

```bash
npm install
npm start
```

Abra http://localhost:3000

## 4. Usar com os amigos (fora da sua rede local)

Rodando so na sua maquina, `localhost:3000` so funciona pra voce. Pra seus amigos entrarem de outras casas, o projeto precisa estar hospedado em algum lugar publico. O video em si nunca passa por esse hospedeiro (isso e o LiveKit Cloud que faz) — ele so serve as paginas e gera o token de acesso.

### Deploy no Vercel (recomendado, gratuito)

O `server.js` exporta a funcao que trata os pedidos (`module.exports = handler`) e so chama `.listen()` quando roda direto (`node server.js`). O Vercel detecta esse arquivo como o entrypoint do projeto e o usa pra servir tudo: as paginas estaticas de `public/` e as rotas `/api/config` e `/api/token`.

1. Suba este repositorio pro GitHub.
2. Em https://vercel.com, clique em "Add New > Project" e importe o repositorio.
3. Em "Environment Variables", adicione `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` (os mesmos valores do seu `.env`). O `PORT` pode ficar em branco, nao e usado no Vercel.
4. Clique em "Deploy". A URL que o Vercel gerar (tipo `https://seu-projeto.vercel.app`) e o link que voce manda pros amigos.

Cada novo `git push` na branch principal publica uma atualizacao automaticamente.

### Alternativas

Render.com, Railway.app ou Fly.io tambem funcionam, rodando `node server.js` como um servidor Node comum.

## Como funciona o uso

- Cada pessoa entra com um nome e o nome da sala (todos usam a mesma sala, ex: `geral`).
- Qualquer um pode clicar em "Compartilhar minha tela" — mas so um por vez: o botao fica desabilitado pros outros enquanto alguem ja esta compartilhando.
- Quem compartilha escolhe a janela/tela e marca a opcao de compartilhar audio do sistema (no Chrome/Edge, ao escolher "Tela inteira").

## Limitacao importante: audio do sistema

A captura de audio da tela (nao so o video) depende do sistema operacional de quem esta **compartilhando**:

- **Windows + Chrome/Edge**: funciona escolhendo "Tela inteira" e marcando "Compartilhar audio do sistema".
- **macOS**: o Chrome nao consegue capturar o audio do sistema sem um driver de audio virtual (ex: [BlackHole](https://github.com/ExistentialAudio/BlackHole)) instalado na maquina de quem compartilha.

Quem so assiste (nao compartilha) nao precisa de nada especial — o audio toca normal no navegador.

## Proximo passo: versao desktop (Electron)

O frontend (`public/`) e HTML/JS puro, entao da pra empacotar o mesmo codigo num app Electron depois, sem reescrever nada — so adicionar uma casca do Electron que carrega essas paginas. Podemos fazer isso numa proxima etapa.
