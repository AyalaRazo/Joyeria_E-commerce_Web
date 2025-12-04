import React, { useEffect } from 'react';
import UnsubscribeForm from '../components/UnsubscribeForm';
import { useSearchParams } from 'react-router-dom';

const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Scroll al principio al cargar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <UnsubscribeForm token={token || undefined} />
      </div>
    </div>
  );
};

export default UnsubscribePage;