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

## Environment variables and S3/MinIO

If you want to use S3/MinIO object storage for media uploads, set the following environment variables in your `.env` file:

- `MINIO_ENDPOINT` or `S3_ENDPOINT` (full URL with protocol is recommended, e.g., `https://minio.example.com`)
- `MINIO_PORT` (optional when endpoint includes protocol)
- `MINIO_SSL` (set `true` if using `https`)
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` (or `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`)
- `MINIO_BUCKET` / `S3_BUCKET` (the bucket name)

If you'd prefer to always store media files in the database rather than S3/MinIO (e.g., for development or to avoid external storage), set:

- `FORCE_DB_MEDIA=true` — this will bypass S3/MinIO entirely and store optimized bytes in the database `media` table (provider `db`).

Additionally, for development you can set `S3_FAIL_OPEN=true` to enable a DB fallback for uploads when S3/MinIO is unreachable — this helps creating posts while debugging the storage.

