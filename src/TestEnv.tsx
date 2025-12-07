import React, { useEffect } from 'react';

const TestEnv = () => {
  useEffect(() => {
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('All environment variables:', import.meta.env);
  }, []);

  return <div>Check the browser console for environment variables</div>;
};

export default TestEnv;
