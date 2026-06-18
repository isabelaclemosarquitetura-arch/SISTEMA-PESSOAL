# Como subir no Vercel

## Passo 1 — Criar repositório no GitHub

1. Acesse github.com e faça login
2. Clique em **New repository**
3. Dê um nome (ex: `sistema-pessoal`)
4. Deixe como **Private** e clique em **Create repository**
5. Faça upload da pasta `sistema-pessoal` inteira para esse repositório

## Passo 2 — Conectar ao Vercel

1. Acesse vercel.com e faça login com sua conta GitHub
2. Clique em **Add New Project**
3. Selecione o repositório `sistema-pessoal`
4. Clique em **Deploy** (o Vercel detecta Next.js automaticamente)
5. Aguarde ~1 minuto e seu site estará no ar!

## Passo 3 — Acessar

Após o deploy, o Vercel gera uma URL como:
`https://sistema-pessoal.vercel.app`

---

## Estrutura de pastas

```
sistema-pessoal/
├── package.json          ← dependências
├── next.config.js        ← configuração Next.js
├── .gitignore
├── pages/
│   ├── _app.js           ← configuração global
│   └── index.js          ← página principal
├── components/
│   ├── Dashboard.js
│   ├── Agenda.js
│   ├── Financeiro.js
│   ├── Habitos.js
│   ├── Metas.js
│   ├── Exercicios.js
│   └── Anotacoes.js
└── styles/
    └── globals.css
```

## Observações importantes

- Os dados são salvos no **localStorage** do navegador (ficam no seu computador/celular)
- Não há banco de dados externo — é 100% pessoal e privado
- Para acessar no celular, basta abrir a URL do Vercel no browser
- Se trocar de dispositivo, os dados não são transferidos automaticamente
