'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying Device...');

  useEffect(() => {
    checkDevice();
  }, []);

  async function checkDevice() {
    const token = localStorage.getItem('aakb_device_token');

    if (!token) {
      setStatus('No device registered. Redirecting...');
      setTimeout(() => router.push('/login'), 500);
      return;
    }

    setStatus('Checking device authorization...');

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('device_token', token)
        .single();

      if (error || !data) {
        localStorage.removeItem('aakb_device_token');
        setStatus('Device not recognized. Redirecting...');
        setTimeout(() => router.push('/login'), 500);
      } else {
        setStatus(`Welcome! Redirecting to ${data.role} dashboard...`);
        setTimeout(() => {
          if (data.role === 'worker') router.push('/worker');
          else if (data.role === 'admin') router.push('/admin');
          else if (data.role === 'swamiji') router.push('/swamiji');
          else router.push('/login');
        }, 500);
      }
    } catch (err) {
      console.error('Error verifying device:', err);
      setStatus('Connection error. Redirecting to login...');
      setTimeout(() => router.push('/login'), 1000);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-sm mx-4">
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <Image
            src="/logo.png"
            alt="AAKB Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-1">Arsh Adhyayan Kendra</h1>
        <p className="text-xs text-gray-400 mb-3">AAKB, Bhuj</p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="animate-pulse">{status}</span>
        </div>
      </div>
    </div>
  );
}
