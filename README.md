## Madison Book Library Chatbot

This repository contains a development environment for the Madison Book Library Chatbot. A broad goal of this project is to leverage the reasoning skills of LLMs while solely relying on information provided to it. Within the Madison Library lies many books that have a combined length far greater than the context window of any current available model. Effectively handling this long context is one of the main goals of this project. Ideally, the chatbot would be able to provide a time-accurate legal opinion relying solely on the information found in Madison's Library.

We tackle this with two different backend versions with a streamlined user interface. Users can specify which books should be scanned or searched, and the retrieved context can optionally be exposed to the end user, allowing them to verify that the cited passages are accurate, relevant, and properly interpreted.

### Traditional RAG using OpenAI’s Responses API
All books are uploaded to OpenAI’s servers, where they are converted into vector embeddings. When a user submits a query, the API performs a similarity-based search over the vector store and retrieves the most relevant passages, which are then used to generate the final response. This approach is the most cost-effective option.

### Long Context Window Model
This approach uses a two-stage pipeline that leverages long-context models. In the first stage, each selected book is scanned to extract passages relevant to the user’s question. This per-book scanning is performed using Gemini-2.5-Flash, which offers a long context window and is among the more cost-effective options for long-context processing.
In the second stage, the extracted passages are provided as context to GPT-5 to generate the final answer. 

### UI/UX
We introduced a two-step onboarding process to establish a clear foundation for new users. In the first step, users review and acknowledge a consent statement before proceeding. In the second step, we collect basic demographic information to better understand our audience.

We also incorporated a multi-level feedback experience: users can rate individual AI-generated responses using a thumbs-up or thumbs-down mechanism, and after three rounds of conversation, an inline notification prompts them to provide more detailed feedback through a pop-up modal.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
