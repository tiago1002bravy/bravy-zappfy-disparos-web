'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('zd_access_token');
    router.replace(t ? '/grupos' : '/login');
  }, [router]);
  return null;
}
