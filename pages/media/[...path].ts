import { GetServerSideProps } from 'next';

// Redirect /media/* pages to the API streaming route at /api/media/*
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
  return null;
}
