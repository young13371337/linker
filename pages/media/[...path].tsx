import { GetServerSideProps } from 'next';
import React from 'react';

// Server-side redirect page: forwards /media/... requests to the API handler
// which streams files from storage. This keeps a friendly /media/ URL while
// keeping the streaming logic in an API route (server-only).

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { params } = context;
  let parts: string[] = [];
  if (Array.isArray(params?.path)) parts = params?.path as string[];
  else if (typeof params?.path === 'string') parts = [params.path as string];

  const dest = `/api/media/${parts.map(encodeURIComponent).join('/')}`;
  return {
    redirect: {
      destination: dest,
      permanent: false,
    },
  };
};

export default function MediaPage() {
  // This component is never rendered because we always redirect server-side.
  return null;
}
